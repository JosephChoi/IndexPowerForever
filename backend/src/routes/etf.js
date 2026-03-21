import { Hono } from 'hono';
import { EtfService } from '../services/EtfService.js';
import { PriceService } from '../services/PriceService.js';

export const etfRoute = new Hono();

const VALID_PERIODS = ['1Y', '3Y', '5Y', '10Y', 'max'];

// ticker 검증 헬퍼
const validateTicker = (ticker) => {
  if (!ticker || typeof ticker !== 'string') {
    const err = new Error('ticker는 필수입니다.');
    err.name = 'ValidationError';
    throw err;
  }
  const upper = ticker.toUpperCase().trim();
  if (!/^[A-Z0-9^.]{1,10}$/.test(upper)) {
    const err = new Error('유효하지 않은 ticker 형식입니다. (영문+숫자, 최대 10자)');
    err.name = 'ValidationError';
    throw err;
  }
  return upper;
};

// GET /api/etf/search?q= — ETF 티커/종목명 자동완성
etfRoute.get('/search', async (c) => {
  const q = c.req.query('q')?.trim();
  if (!q || q.length < 1) {
    return c.json({ data: [], total: 0, hasNext: false });
  }
  if (q.length > 20) {
    const err = new Error('검색어는 20자 이하여야 합니다.');
    err.name = 'ValidationError';
    throw err;
  }

  const etfService = new EtfService(c.env);
  const results = await etfService.search(q);
  return c.json({ data: results, total: results.length, hasNext: false });
});

// GET /api/etf/:ticker — ETF 기본정보
etfRoute.get('/:ticker', async (c) => {
  const ticker = validateTicker(c.req.param('ticker'));
  const etfService = new EtfService(c.env);
  const info = await etfService.getInfo(ticker);
  return c.json({ data: info });
});

// GET /api/etf/:ticker/prices?period= — 일별 가격 데이터
etfRoute.get('/:ticker/prices', async (c) => {
  const ticker = validateTicker(c.req.param('ticker'));
  const period = c.req.query('period') ?? '5Y';
  if (!VALID_PERIODS.includes(period)) {
    const err = new Error(`period는 ${VALID_PERIODS.join(', ')} 중 하나여야 합니다.`);
    err.name = 'ValidationError';
    throw err;
  }

  const priceService = new PriceService(c.env);
  const prices = await priceService.get(ticker, period);
  return c.json({ data: prices, total: prices.length, hasNext: false });
});
