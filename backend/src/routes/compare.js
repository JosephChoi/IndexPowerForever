import { Hono } from 'hono';
import { CompareService } from '../services/CompareService.js';
import { PriceService } from '../services/PriceService.js';
import { CalculationService } from '../services/CalculationService.js';

export const compareRoute = new Hono();

const VALID_PERIODS = ['1Y', '3Y', '5Y', '10Y', 'max'];
const VALID_BENCHMARKS = ['SPY', 'QQQ'];
const VALID_HOLDINGS = ['1', '3', '5'];

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

// GET /api/etf/:ticker/rolling-detail?period=&benchmark=&holding= — 롤링 승률 상세
compareRoute.get('/:ticker/rolling-detail', async (c) => {
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

  const holding = c.req.query('holding') ?? '1';
  if (!VALID_HOLDINGS.includes(holding)) {
    const err = new Error('holding은 1, 3, 5 중 하나여야 합니다.');
    err.name = 'ValidationError'; throw err;
  }

  // KV 캐시 확인 (6h)
  const cacheKey = `rolling:${ticker}:${period}:${benchmark}:${holding}Y`;
  const cached = await c.env.KV.get(cacheKey);
  if (cached) {
    try { return c.json({ data: JSON.parse(cached) }); } catch { /* 캐시 파싱 실패 시 재계산 */ }
  }

  const priceService = new PriceService(c.env);
  const benchTicker = benchmark === 'QQQ' ? 'QQQ' : 'SPY';

  let [etfPrices, benchPrices] = await Promise.all([
    priceService.get(ticker, period),
    priceService.get(benchTicker, period),
  ]);

  // max: 벤치마크를 ETF 시작일 기준으로 자름
  if (period === 'max' && etfPrices.length > 0) {
    const startDate = etfPrices[0].date;
    benchPrices = benchPrices.filter(p => p.date >= startDate);
  }

  const result = CalculationService.calcRollingDetail(etfPrices, benchPrices, parseInt(holding));
  result.ticker = ticker;
  result.benchmark = benchTicker;
  result.holdingYears = parseInt(holding);

  await c.env.KV.put(cacheKey, JSON.stringify(result), { expirationTtl: 21600 });
  return c.json({ data: result });
});
