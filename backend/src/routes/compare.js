import { Hono } from 'hono';
import { CompareService } from '../services/CompareService.js';

export const compareRoute = new Hono();

const VALID_PERIODS = ['1Y', '3Y', '5Y', '10Y', 'max'];
const VALID_BENCHMARKS = ['SPY', 'QQQ'];

// GET /api/etf/:ticker/compare?period=&benchmark= — 지수 비교 분석
compareRoute.get('/:ticker/compare', async (c) => {
  const rawTicker = c.req.param('ticker');
  if (!rawTicker) {
    const err = new Error('ticker는 필수입니다.'); err.name = 'ValidationError'; throw err;
  }
  const ticker = rawTicker.toUpperCase().trim();
  if (!/^[A-Z0-9^.]{1,10}$/.test(ticker)) {
    const err = new Error('유효하지 않은 ticker 형식입니다.'); err.name = 'ValidationError'; throw err;
  }

  const period = c.req.query('period') ?? '5Y';
  if (!VALID_PERIODS.includes(period)) {
    const err = new Error(`period는 ${VALID_PERIODS.join(', ')} 중 하나여야 합니다.`);
    err.name = 'ValidationError'; throw err;
  }

  const benchmark = (c.req.query('benchmark') ?? 'SPY').toUpperCase();
  if (!VALID_BENCHMARKS.includes(benchmark)) {
    const err = new Error('benchmark는 SPY 또는 QQQ 중 하나여야 합니다.');
    err.name = 'ValidationError'; throw err;
  }

  const compareService = new CompareService(c.env);
  const result = await compareService.analyze(ticker, period, benchmark);
  return c.json({ data: result });
});
