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

    // 랭킹 대상 ETF 목록 조회
    const { results: etfList } = await this.env.DB.prepare(
      `SELECT ticker, name, category FROM ranking_etf WHERE is_active = 1 ORDER BY sort_order ASC`
    ).all();

    if (etfList.length === 0) return [];

    // 각 ETF 비교 분석 (순차 실행, Yahoo Finance 부하 방지)
    const rankings = [];
    for (const etf of etfList) {
      try {
        const compare = await this.compareService.analyze(etf.ticker, period, benchmark);
        rankings.push({
          ticker: etf.ticker,
          name: etf.name,
          category: etf.category,
          totalReturn: compare.stats.etf.totalReturn,
          excessReturn: parseFloat(
            (compare.stats.etf.totalReturn - compare.stats[benchmark.toLowerCase()]?.totalReturn || 0).toFixed(2)
          ),
          cagr: compare.stats.etf.cagr,
          mdd: compare.stats.etf.mdd,
          sharpe: compare.stats.etf.sharpe,
          winRate: compare.winAnalysis.winRate,
        });
      } catch {
        // 개별 ETF 오류는 무시하고 계속 진행
      }
    }

    // 초과수익률 기준 내림차순 정렬
    rankings.sort((a, b) => b.excessReturn - a.excessReturn);

    // 순위 부여
    const ranked = rankings.map((r, i) => ({ rank: i + 1, ...r }));

    await this.env.KV.put(cacheKey, JSON.stringify(ranked), { expirationTtl: 21600 });
    return ranked;
  }
}
