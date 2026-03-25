import { CompareService } from './CompareService.js';

// 기간별 ETF 성과 랭킹 서비스
export class RankingService {
  constructor(env) {
    this.env = env;
    this.compareService = new CompareService(env);
  }

  // 랭킹 계산 (KV 6h 캐시)
  async getRanking(period = '3Y', benchmark = 'SPY') {
    const cacheKey = `ranking:${period}:${benchmark}`;

    const cached = await this.env.KV.get(cacheKey);
    if (cached) {
      try { return JSON.parse(cached); } catch { /* 캐시 파싱 실패 시 재계산 */ }
    }

    // 랭킹 대상 ETF 목록 조회 (AUM은 etf_info에서 Yahoo 실시간 데이터 참조)
    const { results: etfList } = await this.env.DB.prepare(
      `SELECT r.ticker, r.name, r.category, e.aum
       FROM ranking_etf r
       LEFT JOIN etf_info e ON r.ticker = e.ticker
       WHERE r.is_active = 1
       ORDER BY r.sort_order ASC`
    ).all();

    if (etfList.length === 0) return [];

    // 각 ETF 비교 분석 (동시 3개씩 병렬 실행)
    const rankings = [];
    const CONCURRENCY = 3;
    for (let i = 0; i < etfList.length; i += CONCURRENCY) {
      const batch = etfList.slice(i, i + CONCURRENCY);
      const results = await Promise.allSettled(
        batch.map(etf => this.compareService.analyze(etf.ticker, period, benchmark))
      );
      results.forEach((result, idx) => {
        if (result.status !== 'fulfilled') return;
        const etf = batch[idx];
        const compare = result.value;
        rankings.push({
          ticker: etf.ticker,
          name: etf.name,
          category: etf.category,
          aum: etf.aum || null,
          totalReturn: compare.stats.etf.totalReturn,
          excessReturn: parseFloat(
            (compare.stats.etf.totalReturn - compare.stats[benchmark.toLowerCase()]?.totalReturn || 0).toFixed(2)
          ),
          cagr: compare.stats.etf.cagr,
          mdd: compare.stats.etf.mdd,
          sharpe: compare.stats.etf.sharpe,
          winRate: compare.winAnalysis.winRate,
        });
      });
    }

    // 초과수익률 기준 내림차순 정렬
    rankings.sort((a, b) => b.excessReturn - a.excessReturn);

    // 순위 부여
    const ranked = rankings.map((r, i) => ({ rank: i + 1, ...r }));

    await this.env.KV.put(cacheKey, JSON.stringify(ranked), { expirationTtl: 21600 });
    return ranked;
  }
}
