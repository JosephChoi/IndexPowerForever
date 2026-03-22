import { YahooService } from './YahooService.js';

// 가격 데이터 조회 서비스 — KV(1h) + D1 영구 캐시
export class PriceService {
  constructor(env) {
    this.env = env;
    this.yahoo = new YahooService(env);
  }

  // 가격 데이터 조회 (KV → D1 → Yahoo Finance 순)
  async get(ticker, period = '5Y') {
    const cacheKey = `price:${ticker}:${period}`;

    // KV 캐시 확인 (1h)
    const cached = await this.env.KV.get(cacheKey);
    if (cached) {
      try { return JSON.parse(cached); } catch { /* 캐시 파싱 실패 시 재조회 */ }
    }

    // max: D1에 충분한 데이터가 있으면 사용, 없으면 Yahoo 조회
    if (period === 'max') {
      const d1Prices = await this._getFromD1(ticker, 'max');
      // D1에 데이터가 있고, 최신 데이터가 2일 이내면 D1 사용
      if (d1Prices.length > 100 && this._isRecentEnough(d1Prices)) {
        await this.env.KV.put(cacheKey, JSON.stringify(d1Prices), { expirationTtl: 3600 });
        return d1Prices;
      }
      // Yahoo에서 전체 조회
      const prices = await this.yahoo.getChart(ticker, 'max');
      if (prices.length === 0) {
        // Yahoo 실패 시 D1 데이터라도 반환
        if (d1Prices.length > 0) return d1Prices;
        const err = new Error(`${ticker} 가격 데이터를 찾을 수 없습니다.`);
        err.name = 'NotFoundError';
        throw err;
      }
      // D1 저장은 백그라운드로 (응답 속도 우선)
      this._saveToD1(ticker, prices).catch(() => {});
      await this.env.KV.put(cacheKey, JSON.stringify(prices), { expirationTtl: 3600 });
      return prices;
    }

    // D1 캐시 확인 (max 이외 기간)
    const d1Prices = await this._getFromD1(ticker, period);
    if (d1Prices.length > 0) {
      await this.env.KV.put(cacheKey, JSON.stringify(d1Prices), { expirationTtl: 3600 });
      return d1Prices;
    }

    // Yahoo Finance 조회
    const prices = await this.yahoo.getChart(ticker, period);
    if (prices.length === 0) {
      const err = new Error(`${ticker} 가격 데이터를 찾을 수 없습니다.`);
      err.name = 'NotFoundError';
      throw err;
    }

    // D1 배치 저장 (500개씩)
    await this._saveToD1(ticker, prices);

    // KV 저장 (1h)
    await this.env.KV.put(cacheKey, JSON.stringify(prices), { expirationTtl: 3600 });

    return prices;
  }

  // D1에서 기간별 가격 조회
  async _getFromD1(ticker, period) {
    const fromDate = this._periodToFromDate(period);
    if (!fromDate) {
      // max: 전체 조회
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

  // D1 데이터가 최신(2일 이내)인지 확인
  _isRecentEnough(prices) {
    if (!prices.length) return false;
    const lastDate = new Date(prices.at(-1).date);
    const now = new Date();
    const diffDays = (now - lastDate) / (24 * 60 * 60 * 1000);
    return diffDays < 3;
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
