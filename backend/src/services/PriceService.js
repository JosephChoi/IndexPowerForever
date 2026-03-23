import { YahooService } from './YahooService.js';

// 가격 데이터 조회 서비스 — KV(1h) + D1 영구 캐시 + Yahoo 보충
export class PriceService {
  constructor(env) {
    this.env = env;
    this.yahoo = new YahooService(env);
  }

  // 가격 데이터 조회 (KV → D1 → Yahoo 보충)
  async get(ticker, period = '5Y') {
    const cacheKey = `price:${ticker}:${period}`;

    // KV 캐시 확인 (1h) — 기간 커버리지 + 최신성 검증
    const cached = await this.env.KV.get(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (this._coversRequestedPeriod(parsed, period) && this._isRecentEnough(parsed)) {
          return parsed;
        }
      } catch { /* 캐시 파싱 실패 시 재조회 */ }
    }

    // D1 캐시 확인
    const d1Prices = await this._getFromD1(ticker, period);
    const coversRange = period === 'max'
      ? this._coversMaxPeriod(d1Prices)
      : d1Prices.length > 0 && this._coversRequestedPeriod(d1Prices, period);

    // D1 데이터가 기간도 커버하고 최신이면 바로 반환
    if (coversRange && this._isRecentEnough(d1Prices)) {
      await this.env.KV.put(cacheKey, JSON.stringify(d1Prices), { expirationTtl: 3600 });
      return d1Prices;
    }

    // D1 데이터가 기간은 커버하지만 최신 데이터가 부족 → 부족분만 Yahoo에서 보충
    if (coversRange && d1Prices.length > 0) {
      const lastDate = d1Prices.at(-1).date;
      const newPrices = await this._fetchRecent(ticker, lastDate);
      if (newPrices.length > 0) {
        this._saveToD1(ticker, newPrices).catch(() => {});
        const merged = this._mergePrices(d1Prices, newPrices);
        await this.env.KV.put(cacheKey, JSON.stringify(merged), { expirationTtl: 3600 });
        return merged;
      }
      // 보충 실패 시 기존 D1 데이터라도 반환
      await this.env.KV.put(cacheKey, JSON.stringify(d1Prices), { expirationTtl: 3600 });
      return d1Prices;
    }

    // D1에 데이터가 없거나 기간을 커버 못함 → Yahoo에서 전체 조회
    const prices = await this.yahoo.getChart(ticker, period);
    if (prices.length === 0) {
      if (d1Prices.length > 0) return d1Prices;
      const err = new Error(`${ticker} 가격 데이터를 찾을 수 없습니다.`);
      err.name = 'NotFoundError';
      throw err;
    }

    // D1 저장 + KV 캐시
    this._saveToD1(ticker, prices).catch(() => {});
    await this.env.KV.put(cacheKey, JSON.stringify(prices), { expirationTtl: 3600 });
    return prices;
  }

  // D1에서 기간별 가격 조회
  async _getFromD1(ticker, period) {
    const fromDate = this._periodToFromDate(period);
    if (!fromDate) {
      const { results } = await this.env.DB.prepare(
        `SELECT date, close FROM price_cache WHERE ticker = ? ORDER BY date ASC`
      ).bind(ticker).all();
      return results;
    }

    const { results } = await this.env.DB.prepare(
      `SELECT date, close FROM price_cache WHERE ticker = ? AND date >= ? ORDER BY date ASC`
    ).bind(ticker, fromDate).all();
    return results;
  }

  // Yahoo에서 최근 데이터만 가져오기 (D1 마지막 날짜 이후)
  async _fetchRecent(ticker, lastDate) {
    try {
      const prices = await this.yahoo.getChartSince(ticker, lastDate);
      return prices.filter(p => p.date > lastDate);
    } catch {
      return [];
    }
  }

  // D1 데이터와 새 데이터 병합 (중복 제거, 날짜순 정렬)
  _mergePrices(existing, newPrices) {
    const dateSet = new Set(existing.map(p => p.date));
    const unique = newPrices.filter(p => !dateSet.has(p.date));
    return [...existing, ...unique].sort((a, b) => a.date.localeCompare(b.date));
  }

  // D1에 가격 배치 저장
  async _saveToD1(ticker, prices) {
    const BATCH_SIZE = 100;
    for (let i = 0; i < prices.length; i += BATCH_SIZE) {
      const batch = prices.slice(i, i + BATCH_SIZE);
      const statements = batch.map(p =>
        this.env.DB.prepare(
          `INSERT OR REPLACE INTO price_cache (ticker, date, close) VALUES (?, ?, ?)`
        ).bind(ticker, p.date, p.close)
      );
      await this.env.DB.batch(statements);
    }
  }

  // D1 데이터가 최신(2거래일 이내)인지 확인
  _isRecentEnough(prices) {
    if (!prices.length) return false;
    const lastDate = new Date(prices.at(-1).date);
    const now = new Date();
    const diffDays = (now - lastDate) / (24 * 60 * 60 * 1000);
    // 주말/공휴일 고려하여 4일까지 허용
    return diffDays < 4;
  }

  // D1 데이터가 요청 기간을 충분히 커버하는지 확인
  _coversRequestedPeriod(prices, period) {
    if (!prices.length) return false;
    if (period === 'max') return this._coversMaxPeriod(prices);
    const years = { '1Y': 1, '3Y': 3, '5Y': 5, '10Y': 10 }[period];
    if (!years) return true;
    const requestedStart = new Date();
    requestedStart.setFullYear(requestedStart.getFullYear() - years);
    const dataStart = new Date(prices[0].date);
    const diffDays = (dataStart - requestedStart) / (24 * 60 * 60 * 1000);
    return diffDays < 90;
  }

  // D1 데이터가 max 기간에 충분한지 확인 — 시작일 + 충전율 검증
  _coversMaxPeriod(prices) {
    if (prices.length < 100) return false;
    const firstDate = new Date(prices[0].date);
    const lastDate = new Date(prices.at(-1).date);
    // 충전율 검증: 날짜 범위 대비 실제 데이터 비율 (90% 미만이면 중간 구멍 있음)
    const spanYears = (lastDate - firstDate) / (365.25 * 24 * 60 * 60 * 1000);
    if (spanYears > 1 && prices.length / (spanYears * 252) < 0.9) return false;
    // 시작일 검증: 10Y 이전 데이터 존재 확인
    const tenYearsAgo = new Date();
    tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
    const diffDays = (firstDate - tenYearsAgo) / (24 * 60 * 60 * 1000);
    return diffDays < -90;
  }

  // period → 시작 날짜 변환
  _periodToFromDate(period) {
    if (period === 'max') return null;
    const now = new Date();
    const years = { '1Y': 1, '3Y': 3, '5Y': 5, '10Y': 10 }[period];
    if (!years) return null;
    now.setFullYear(now.getFullYear() - years);
    return now.toISOString().slice(0, 10);
  }
}
