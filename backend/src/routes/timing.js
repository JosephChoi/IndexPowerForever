import { Hono } from 'hono';
import { TimingService } from '../services/TimingService.js';

export const timingRoute = new Hono();

const VALID_MISSING_DAYS = [0, 10, 20, 30, 50];
const MIN_YEAR = 1993; // SPY 상장연도

// GET /api/timing?startYear=&endYear=&missing= — 타이밍 실패 시뮬레이션
timingRoute.get('/', async (c) => {
  const maxYear = new Date().getFullYear();
  const startYear = parseInt(c.req.query('startYear') ?? '2000');
  const endYear = parseInt(c.req.query('endYear') ?? String(maxYear - 1));
  const missingDays = parseInt(c.req.query('missing') ?? '0');

  if (isNaN(startYear) || startYear < MIN_YEAR || startYear > maxYear) {
    const err = new Error(`startYear는 ${MIN_YEAR}~${maxYear} 사이여야 합니다.`);
    err.name = 'ValidationError'; throw err;
  }
  if (isNaN(endYear) || endYear < startYear || endYear > maxYear) {
    const err = new Error(`endYear는 startYear 이상, ${maxYear} 이하여야 합니다.`);
    err.name = 'ValidationError'; throw err;
  }
  if (!VALID_MISSING_DAYS.includes(missingDays)) {
    const err = new Error(`missing은 ${VALID_MISSING_DAYS.join(', ')} 중 하나여야 합니다.`);
    err.name = 'ValidationError'; throw err;
  }

  const timingService = new TimingService(c.env);
  const result = await timingService.simulate(startYear, endYear, missingDays);
  return c.json({ data: result });
});
