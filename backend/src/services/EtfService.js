import { YahooService } from './YahooService.js';

// ETF 기본정보 조회 서비스 — KV(24h) + D1 영구 캐시
export class EtfService {
  constructor(env) {
    this.env = env;
    this.yahoo = new YahooService(env);
  }

  // ETF 기본정보 조회
  async getInfo(ticker) {
    const cacheKey = `info:${ticker}`;

    // KV 캐시 확인 (24h)
    const cached = await this.env.KV.get(cacheKey);
    if (cached) {
      try { return JSON.parse(cached); } catch { /* 캐시 파싱 실패 시 재조회 */ }
    }

    // D1 캐시 확인 (1일 이내)
    const row = await this.env.DB.prepare(
      `SELECT * FROM etf_info WHERE ticker = ? AND updated_at > datetime('now', '-1 day')`
    ).bind(ticker).first();

    if (row) {
      const info = this._parseRow(row);
      await this.env.KV.put(cacheKey, JSON.stringify(info), { expirationTtl: 86400 });
      return info;
    }

    // Yahoo Finance 조회
    const summary = await this.yahoo.getQuoteSummary(ticker);
    const info = this._parseSummary(ticker, summary);

    // D1 저장
    await this.env.DB.prepare(
      `INSERT OR REPLACE INTO etf_info
        (ticker, name, category, expense_ratio, inception_date, aum, description, top_holdings, sector_weights, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(
      info.ticker,
      info.name,
      info.category,
      info.expenseRatio,
      info.inceptionDate,
      info.aum,
      info.description,
      JSON.stringify(info.topHoldings),
      JSON.stringify(info.sectorWeights)
    ).run();

    // KV 저장 (24h)
    await this.env.KV.put(cacheKey, JSON.stringify(info), { expirationTtl: 86400 });

    // 검색 로그 기록
    await this.env.DB.prepare(
      `INSERT INTO search_log (query, ticker, created_at) VALUES (NULL, ?, datetime('now'))`
    ).bind(ticker).run();

    return info;
  }

  // ETF 검색 자동완성
  async search(query) {
    const cacheKey = `search:${query.toLowerCase()}`;

    const cached = await this.env.KV.get(cacheKey);
    if (cached) {
      try { return JSON.parse(cached); } catch { /* 캐시 파싱 실패 시 재조회 */ }
    }

    // D1에서 먼저 검색 (이미 캐시된 ETF)
    const { results } = await this.env.DB.prepare(
      `SELECT ticker, name FROM etf_info WHERE ticker LIKE ? OR name LIKE ? LIMIT 10`
    ).bind(`${query.toUpperCase()}%`, `%${query}%`).all();

    let searchResults = results.map(r => ({ ticker: r.ticker, name: r.name }));

    // D1에 없으면 Yahoo Finance 검색
    if (searchResults.length < 5) {
      const yahooResults = await this.yahoo.search(query);
      const existing = new Set(searchResults.map(r => r.ticker));
      const extra = yahooResults.filter(r => !existing.has(r.ticker));
      searchResults = [...searchResults, ...extra].slice(0, 10);
    }

    await this.env.KV.put(cacheKey, JSON.stringify(searchResults), { expirationTtl: 86400 });
    return searchResults;
  }

  // Yahoo Finance quoteSummary → 내부 포맷 변환
  _parseSummary(ticker, summary) {
    const detail = summary.summaryDetail || {};
    const profile = summary.summaryProfile || {};
    const stats = summary.defaultKeyStatistics || {};
    const holdings = summary.topHoldings || {};
    const quoteType = summary.quoteType || {};

    const topHoldings = (holdings.holdings || []).slice(0, 10).map(h => ({
      ticker: h.symbol,
      name: h.holdingName,
      weight: h.holdingPercent?.raw || 0,
    }));

    const sectorWeights = {};
    (holdings.sectorWeightings || []).forEach(s => {
      const entries = Object.entries(s);
      if (entries.length > 0) {
        const [key, val] = entries[0];
        sectorWeights[key] = val?.raw || 0;
      }
    });

    // 정식 펀드명: quoteType.longName > quoteType.shortName > ticker
    const fullName = quoteType.longName || quoteType.shortName || ticker;

    return {
      ticker,
      name: fullName,
      category: holdings.equityHoldings?.priceToEarnings?.fmt ? 'ETF' : 'ETF',
      expenseRatio: detail.annualReportExpenseRatio?.raw || null,
      inceptionDate: stats.fundInceptionDate?.fmt || null,
      aum: detail.totalAssets?.raw || null,
      description: profile.longBusinessSummary || null,
      topHoldings,
      sectorWeights,
    };
  }

  // D1 row → 내부 포맷 변환
  _parseRow(row) {
    return {
      ticker: row.ticker,
      name: row.name,
      category: row.category,
      expenseRatio: row.expense_ratio,
      inceptionDate: row.inception_date,
      aum: row.aum,
      description: row.description,
      topHoldings: (() => { try { return row.top_holdings ? JSON.parse(row.top_holdings) : []; } catch { return []; } })(),
      sectorWeights: (() => { try { return row.sector_weights ? JSON.parse(row.sector_weights) : {}; } catch { return {}; } })(),
    };
  }
}
