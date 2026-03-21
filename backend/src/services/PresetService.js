// 인기 프리셋 + 인기 검색 ETF 서비스
export class PresetService {
  constructor(env) {
    this.env = env;
  }

  // 인기 프리셋 목록 조회
  async getPresets() {
    const { results } = await this.env.DB.prepare(
      `SELECT id, name, description, tickers, sort_order FROM preset ORDER BY sort_order ASC`
    ).all();

    return results.map(r => ({
      id: r.id,
      name: r.name,
      description: r.description,
      tickers: JSON.parse(r.tickers),
    }));
  }

  // 인기 검색 ETF TOP 5 (최근 7일 기준)
  async getPopular() {
    const cacheKey = 'popular:etf';

    const cached = await this.env.KV.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const { results } = await this.env.DB.prepare(
      `SELECT ticker, COUNT(*) as count
       FROM search_log
       WHERE created_at > datetime('now', '-7 days')
       GROUP BY ticker
       ORDER BY count DESC
       LIMIT 5`
    ).all();

    // 검색 기록 없으면 기본 인기 ETF 반환
    const popular = results.length > 0
      ? results.map(r => ({ ticker: r.ticker, count: r.count }))
      : [
          { ticker: 'SPY', count: 0 },
          { ticker: 'QQQ', count: 0 },
          { ticker: 'SCHD', count: 0 },
          { ticker: 'TQQQ', count: 0 },
          { ticker: 'ARKK', count: 0 },
        ];

    await this.env.KV.put(cacheKey, JSON.stringify(popular), { expirationTtl: 3600 });
    return popular;
  }
}
