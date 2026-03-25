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
      tickers: (() => { try { return JSON.parse(r.tickers); } catch { return []; } })(),
    }));
  }

  // 인기 검색 ETF TOP 5 (최근 7일 기준)
  async getPopular() {
    const cacheKey = 'popular:etf';

    const cached = await this.env.KV.get(cacheKey);
    if (cached) {
      try { return JSON.parse(cached); } catch { /* 캐시 파싱 실패 시 재조회 */ }
    }

    const { results } = await this.env.DB.prepare(
      `SELECT ticker, COUNT(*) as count
       FROM search_log
       WHERE created_at > datetime('now', '-7 days')
       GROUP BY ticker
       ORDER BY count DESC
       LIMIT 5`
    ).all();

    // 벤치마크 ETF 제외 (SPY, QQQ, VOO는 비교 기준이므로 인기 검색에서 제외)
    const BENCHMARK_TICKERS = ['SPY', 'QQQ', 'VOO', 'IVV'];
    const filtered = results.filter(r => !BENCHMARK_TICKERS.includes(r.ticker));

    // 검색 기록 없으면 기본 인기 ETF 반환
    const popular = filtered.length > 0
      ? filtered.map(r => ({ ticker: r.ticker, count: r.count }))
      : [
          { ticker: 'ARKK', count: 0 },
          { ticker: 'SCHD', count: 0 },
          { ticker: 'VIG', count: 0 },
          { ticker: 'TQQQ', count: 0 },
          { ticker: 'VYM', count: 0 },
        ];

    await this.env.KV.put(cacheKey, JSON.stringify(popular), { expirationTtl: 3600 });
    return popular;
  }
}
