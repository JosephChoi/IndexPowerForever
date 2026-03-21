import { Hono } from 'hono';
import { RankingService } from '../services/RankingService.js';

export const rankingRoute = new Hono();

const VALID_PERIODS = ['1Y', '3Y', '5Y', '10Y'];
const VALID_BENCHMARKS = ['SPY', 'QQQ'];

// GET /api/ranking?period=&benchmark= — 기간별 ETF 성과 랭킹
rankingRoute.get('/', async (c) => {
  const period = c.req.query('period') ?? '3Y';
  if (!VALID_PERIODS.includes(period)) {
    const err = new Error(`period는 ${VALID_PERIODS.join(', ')} 중 하나여야 합니다.`);
    err.name = 'ValidationError'; throw err;
  }

  const benchmark = (c.req.query('benchmark') ?? 'SPY').toUpperCase();
  if (!VALID_BENCHMARKS.includes(benchmark)) {
    const err = new Error('benchmark는 SPY 또는 QQQ 중 하나여야 합니다.');
    err.name = 'ValidationError'; throw err;
  }

  const rankingService = new RankingService(c.env);
  const rankings = await rankingService.getRanking(period, benchmark);
  return c.json({ data: rankings, total: rankings.length, hasNext: false });
});
