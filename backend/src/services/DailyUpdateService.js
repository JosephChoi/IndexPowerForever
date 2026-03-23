import { YahooService } from './YahooService.js';

// 매일 KST 07:00 자동 실행 — 주요 종목 가격 데이터 D1 업데이트
const BATCH_SIZE = 100;
const FETCH_DELAY_MS = 1500;

export class DailyUpdateService {
  constructor(env) {
    this.env = env;
    this.yahoo = new YahooService(env);
  }

  // 메인 실행: 랭킹 종목 + 벤치마크 전체 업데이트
  async run() {
    const tickers = await this._getTargetTickers();
    const results = { success: [], failed: [], skipped: [] };

    for (const ticker of tickers) {
      try {
        const updated = await this._updateTicker(ticker);
        if (updated > 0) {
          results.success.push({ ticker, newRows: updated });
        } else {
          results.skipped.push(ticker);
        }
      } catch (e) {
        results.failed.push({ ticker, error: e.message });
      }
      // Yahoo API 부하 방지 딜레이
      await this._delay(FETCH_DELAY_MS);
    }

    // 업데이트 완료 후 관련 KV 캐시 무효화
    await this._invalidateKvCache(tickers);

    return results;
  }

  // ranking_etf + D1 price_cache에 있는 모든 종목 조회 (상한 200종목)
  async _getTargetTickers() {
    const MAX_TICKERS = 200;
    const { results } = await this.env.DB.prepare(
      `SELECT DISTINCT ticker FROM (
        SELECT ticker FROM ranking_etf
        UNION
        SELECT DISTINCT ticker FROM price_cache
      ) ORDER BY ticker LIMIT ?`
    ).bind(MAX_TICKERS).all();
    const tickers = results.map(r => r.ticker);

    // 벤치마크 SPY, QQQ 보장
    if (!tickers.includes('SPY')) tickers.push('SPY');
    if (!tickers.includes('QQQ')) tickers.push('QQQ');

    return tickers;
  }

  // 종목 1개 업데이트: D1 마지막 날짜 이후 데이터만 Yahoo에서 가져와 저장
  async _updateTicker(ticker) {
    // D1에서 최초/최신 날짜 + 건수 확인
    const dateRow = await this.env.DB.prepare(
      `SELECT MIN(date) as firstDate, MAX(date) as lastDate, COUNT(*) as totalRows FROM price_cache WHERE ticker = ?`
    ).bind(ticker).first();

    const firstDate = dateRow?.firstDate;
    const lastDate = dateRow?.lastDate;
    const totalRows = dateRow?.totalRows || 0;

    let prices;
    if (!lastDate) {
      // D1에 데이터 없음 → 전체 기간 조회
      prices = await this.yahoo.getChart(ticker, 'max');
    } else if (this._needsFullHistory(firstDate, lastDate, totalRows)) {
      // D1 데이터가 불완전 (시작일 부족 or 중간 구멍) → 전체 재조회
      prices = await this.yahoo.getChart(ticker, 'max');
    } else {
      // lastDate 이후 데이터만 Yahoo에서 직접 조회
      prices = await this.yahoo.getChartSince(ticker, lastDate);
      prices = prices.filter(p => p.date > lastDate);
    }

    if (prices.length === 0) return 0;

    // D1 배치 저장
    for (let i = 0; i < prices.length; i += BATCH_SIZE) {
      const batch = prices.slice(i, i + BATCH_SIZE);
      const statements = batch.map(p =>
        this.env.DB.prepare(
          `INSERT OR REPLACE INTO price_cache (ticker, date, close) VALUES (?, ?, ?)`
        ).bind(ticker, p.date, p.close)
      );
      await this.env.DB.batch(statements);
    }

    return prices.length;
  }

  // 업데이트 후 KV 캐시 무효화 (price, compare, ranking 키 삭제)
  async _invalidateKvCache(tickers) {
    const keys = [];
    const periods = ['1Y', '3Y', '5Y', '10Y', 'max'];
    const benchmarks = ['SPY', 'QQQ'];

    for (const ticker of tickers) {
      for (const period of periods) {
        keys.push(`price:${ticker}:${period}`);
        for (const bench of benchmarks) {
          keys.push(`compare:${ticker}:${period}:${bench}`);
        }
      }
    }

    // 랭킹 캐시도 무효화
    for (const period of periods) {
      for (const bench of benchmarks) {
        keys.push(`ranking:${period}:${bench}`);
      }
    }

    // KV 삭제 (에러 무시)
    for (const key of keys) {
      try { await this.env.KV.delete(key); } catch { /* noop */ }
    }
  }

  // D1 데이터가 전체 히스토리인지 확인 — 시작일 + 충전율 검증
  _needsFullHistory(firstDate, lastDate, totalRows) {
    if (!firstDate) return true;
    const first = new Date(firstDate);
    const last = new Date(lastDate);
    // 충전율 검증: 날짜 범위 대비 실제 데이터 비율 (90% 미만이면 중간 구멍)
    const spanYears = (last - first) / (365.25 * 24 * 60 * 60 * 1000);
    if (spanYears > 1 && totalRows / (spanYears * 252) < 0.9) return true;
    // 시작일 검증: 10Y 이전 데이터 없으면 불완전
    const tenYearsAgo = new Date();
    tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
    const diffDays = (first - tenYearsAgo) / (24 * 60 * 60 * 1000);
    return diffDays > -90;
  }

  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
