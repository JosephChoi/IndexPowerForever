import { Hono } from 'hono';
import { WithdrawalService } from '../services/WithdrawalService.js';

export const withdrawalRoute = new Hono();

const VALID_TICKERS = ['SPY', 'QQQ'];
const VALID_FREQUENCIES = ['monthly', 'annual'];
const MIN_YEAR = 1993;          // SPY 상장연도
const QQQ_MIN_YEAR = 1999;      // QQQ 상장연도
const MIN_INITIAL = 100;        // 100만원
const MAX_INITIAL = 1000000;    // 100억원
const MAX_WITHDRAWAL_RATIO = 0.5; // 초기자산 대비 연 인출률 상한

const throwValidation = (message) => {
  const err = new Error(message);
  err.name = 'ValidationError';
  throw err;
};

// 숫자 파라미터 파싱 + 범위 검증
const parseNumber = (raw, fallback, { min, max, label }) => {
  const value = raw === undefined || raw === '' ? fallback : parseFloat(raw);
  if (isNaN(value)) throwValidation(`${label}은(는) 숫자여야 합니다.`);
  if (value < min || value > max) throwValidation(`${label}은(는) ${min}~${max} 사이여야 합니다.`);
  return value;
};

// GET /api/withdrawal — 은퇴 후 인출전략 시뮬레이션
withdrawalRoute.get('/', async (c) => {
  const maxYear = new Date().getFullYear();

  const ticker = (c.req.query('ticker') ?? 'SPY').toUpperCase().trim();
  if (!VALID_TICKERS.includes(ticker)) {
    throwValidation(`ticker는 ${VALID_TICKERS.join(', ')} 중 하나여야 합니다.`);
  }

  const frequency = c.req.query('frequency') ?? 'monthly';
  if (!VALID_FREQUENCIES.includes(frequency)) {
    throwValidation(`frequency는 ${VALID_FREQUENCIES.join(', ')} 중 하나여야 합니다.`);
  }

  const initial = parseNumber(c.req.query('initial'), 40000, {
    min: MIN_INITIAL, max: MAX_INITIAL, label: '초기 자산',
  });
  // 기본 월 150만 = 연 1,800만 → 초기자산 4억 대비 4.5% (안전 인출률 4% 근처)
  const withdrawal = parseNumber(c.req.query('withdrawal'), 150, {
    min: 1, max: MAX_INITIAL, label: '인출액',
  });
  const inflation = parseNumber(c.req.query('inflation'), 0, {
    min: 0, max: 5, label: '물가상승률',
  });
  const years = parseNumber(c.req.query('years'), 0, {
    min: 0, max: 50, label: '운용 기간',
  });

  // 티커별 상장연도에 맞춰 시작 연도 하한 적용
  const tickerMinYear = ticker === 'QQQ' ? QQQ_MIN_YEAR : MIN_YEAR;
  const startYear = parseNumber(c.req.query('startYear'), 2002, {
    min: tickerMinYear, max: maxYear - 1, label: '시작 연도',
  });

  const reserve = c.req.query('reserve') === '1';
  const reserveYears = parseNumber(c.req.query('reserveYears'), 3, {
    min: 1, max: 5, label: '리저브 크기',
  });
  const reserveFloorYears = parseNumber(c.req.query('reserveFloorYears'), 1, {
    min: 0.5, max: 2, label: '리저브 하한선',
  });
  const reserveRate = parseNumber(c.req.query('reserveRate'), 3, {
    min: 0, max: 6, label: '리저브 이자율',
  });

  // 연 인출액 기준 교차 검증
  const annualWithdrawal = frequency === 'monthly' ? withdrawal * 12 : withdrawal;
  if (annualWithdrawal > initial * MAX_WITHDRAWAL_RATIO) {
    throwValidation('연 인출액이 초기 자산의 50%를 초과할 수 없습니다.');
  }
  if (reserve) {
    if (reserveFloorYears >= reserveYears) {
      throwValidation('리저브 하한선은 리저브 크기보다 작아야 합니다.');
    }
    if (annualWithdrawal * reserveYears >= initial) {
      throwValidation('리저브 총액이 초기 자산 이상일 수 없습니다. 리저브 크기를 줄여주세요.');
    }
  }

  const params = {
    ticker, initial, frequency, withdrawal, inflation, startYear, years,
    reserve, reserveYears, reserveFloorYears, reserveRate,
  };

  // KV 캐시 — 동일 입력 조합 6시간 재사용 (입력 재조정 대비)
  // v2: 응답 스키마 변경 시 버전을 올려 구버전 캐시를 자동 무효화한다
  const cacheKey = `withdrawal:v3:${Object.values(params).join(':')}`;
  const cached = await c.env.KV.get(cacheKey);
  if (cached) return c.json({ data: JSON.parse(cached) });

  const withdrawalService = new WithdrawalService(c.env);
  const result = await withdrawalService.simulate(params);

  await c.env.KV.put(cacheKey, JSON.stringify(result), { expirationTtl: 21600 });
  return c.json({ data: result });
});
