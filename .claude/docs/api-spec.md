# Backend API Specification — Index Power Forever

> 작성일: 2026-03-22 | 아키텍처 기반 도출
> 분할 파일: [api-spec-etf.md](./api-spec-etf.md) | [api-spec-compare.md](./api-spec-compare.md) | [api-spec-etc.md](./api-spec-etc.md)

---

## 1. API 규칙

- **Base path**: `/api/`
- **인증**: 없음 (모든 엔드포인트 공개)
- **요청/응답 형식**: JSON
- **에러 형식**: `{ "error": "ErrorName", "message": "설명" }`
- **CORS**: 허용 (`cors.js` 미들웨어 전역 적용)
- **런타임**: Cloudflare Workers + Hono
- **DB 파라미터**: `?` (D1/SQLite, PostgreSQL `$1/$2` 사용 금지)

---

## 2. 응답 포맷

**단건 성공 응답:**
```json
{ "data": { ... } }
```

**목록 성공 응답:**
```json
{ "data": [...], "hasNext": false, "total": 0 }
```

**에러 코드 → HTTP 상태 매핑:**

| error | HTTP | 발생 조건 |
|---|---|---|
| `ValidationError` | 400 | 잘못된 ticker 형식, 필수 파라미터 누락, 유효하지 않은 파라미터 값 |
| `NotFoundError` | 404 | Yahoo Finance에서 해당 ticker 없음 |
| `RateLimitError` | 429 | Yahoo Finance 쿼터 초과 |
| `ServerError` | 500 | Yahoo Finance API 타임아웃, D1 오류, 파싱 실패 |

---

## 3. 공통 입력 검증 (Route 레이어)

### ticker 검증

```javascript
const ticker = c.req.param('ticker').toUpperCase().trim();
if (!/^[A-Z0-9\^\.]{1,10}$/.test(ticker)) {
  const err = new Error('유효하지 않은 ticker 형식입니다.');
  err.name = 'ValidationError';
  throw err;
}
```

### period 검증

```javascript
const VALID_PERIODS = ['1Y', '3Y', '5Y', '10Y', 'max'];
const period = c.req.query('period') ?? '5Y';
if (!VALID_PERIODS.includes(period)) {
  const err = new Error(`period는 ${VALID_PERIODS.join(', ')} 중 하나여야 합니다.`);
  err.name = 'ValidationError';
  throw err;
}
```

### benchmark 검증

```javascript
const VALID_BENCHMARKS = ['SPY', 'QQQ'];
const benchmark = c.req.query('benchmark') ?? 'SPY';
if (!VALID_BENCHMARKS.includes(benchmark)) {
  const err = new Error('benchmark는 SPY 또는 QQQ 중 하나여야 합니다.');
  err.name = 'ValidationError';
  throw err;
}
```

---

## 4. 엔드포인트 그룹 개요

| Method | Path | 설명 | Route 파일 | FR-ID |
|---|---|---|---|---|
| GET | `/api/etf/search` | ETF 자동완성 | `routes/etf.js` | FR-001 |
| GET | `/api/etf/:ticker` | ETF 기본정보 | `routes/etf.js` | FR-002 |
| GET | `/api/etf/:ticker/prices` | 일별 가격 데이터 | `routes/etf.js` | FR-010 |
| GET | `/api/etf/:ticker/compare` | 지수 비교 분석 | `routes/compare.js` | FR-010~022 |
| GET | `/api/ranking` | 기간별 ETF 성과 랭킹 | `routes/ranking.js` | FR-040 |
| GET | `/api/presets` | 인기 프리셋 목록 | `routes/presets.js` | FR-041 |
| GET | `/api/presets/popular` | 인기 검색 ETF TOP 5 | `routes/presets.js` | FR-041 |
| GET | `/api/timing` | 타이밍 실패 시뮬레이션 | `routes/timing.js` | FR-032 |

---

## 5. 핵심 계산 로직 명세 (`CalculationService`)

모든 계산은 `services/CalculationService.js`의 정적 메서드로 구현한다.

```
누적 수익률(%) = (현재가 / 시작가 - 1) × 100
초과수익률(%)  = ETF 누적수익률 - 지수 누적수익률
CAGR           = (최종가 / 시작가)^(1 / 년수) - 1
MDD(%)         = (최저점 - 이전 최고점) / 이전 최고점 × 100   ← 일별 종가 기준
연환산 변동성  = 일별 수익률 표준편차 × √252
Sharpe         = (CAGR - 0.045) / 연환산 변동성              ← 무위험 수익률 4.5% 고정
롤링 N년 승률  = (N년 보유 후 지수를 이긴 시작점 수) / 전체 시작점 수 × 100
연도별 수익률  = 해당 연도 마지막 종가 / 전년도 마지막 종가 - 1
```

| 메서드 | 입력 | 출력 |
|---|---|---|
| `calcCumulativeReturns(prices)` | `[{date, close}]` | `[{date, return}]` (%) |
| `calcExcessReturns(etfReturns, benchReturns)` | 두 누적수익률 배열 | `[{date, excess}]` |
| `calcCAGR(startPrice, endPrice, years)` | 숫자 3개 | CAGR (소수) |
| `calcMDD(prices)` | `[{date, close}]` | MDD (%) |
| `calcSharpe(cagr, annualVolatility)` | 숫자 2개 | Sharpe (소수) |
| `calcAnnualVolatility(prices)` | `[{date, close}]` | 연환산 변동성 (소수) |
| `calcYearlyReturns(prices)` | `[{date, close}]` | `[{year, etfReturn, benchReturn, diff}]` |
| `calcRollingWinRate(etfPrices, benchPrices, years)` | 두 가격 배열 + 보유년수 | `{ winRate, totalWindows, winCount }` |

---

## 6. Yahoo Finance 연동 명세 (`YahooService`)

### 인증 흐름

```
1. Cookie 취득:  GET https://fc.yahoo.com
                 → Set-Cookie 헤더 저장
2. Crumb 취득:   GET https://query1.finance.yahoo.com/v1/test/getcrumb
                 Headers: Cookie: <위에서 받은 쿠키>
                 → 텍스트 응답 (crumb 문자열)
3. KV 저장:      KV.put('yahoo:crumb', JSON.stringify({ crumb, cookie }), { expirationTtl: 3600 })
```

### 가격 데이터 조회

```
GET https://query1.finance.yahoo.com/v8/finance/chart/{ticker}
  ?interval=1d&range={range}&crumb={crumb}
Headers: Cookie: {cookie}
```

period → Yahoo range 매핑:

| API period | Yahoo range |
|---|---|
| `1Y` | `1y` |
| `3Y` | `3y` |
| `5Y` | `5y` |
| `10Y` | `10y` |
| `max` | `max` |

### Yahoo Finance 에러 처리

| 응답 상태 | throw |
|---|---|
| HTTP 404 | `NotFoundError` |
| HTTP 429 | `RateLimitError` |
| HTTP 5xx / 타임아웃 | `ServerError` |
| `result` 배열 비어 있음 | `NotFoundError` |

---

## 7. 캐시 전략 요약

| KV Key 패턴 | TTL | D1 저장 |
|---|---|---|
| `yahoo:crumb` | 1h | 없음 |
| `search:{q}` | 24h | 없음 |
| `info:{ticker}` | 24h | `etf_info` 영구 |
| `price:{ticker}:{period}` | 1h | `price_cache` 영구 |
| `compare:{ticker}:{period}:{benchmark}` | 6h | 없음 |
| `ranking:{period}:{benchmark}` | 6h | 없음 |
| `popular:etf` | 1h | 없음 |

---

## 8. FR-ID 추적 매트릭스

| FR-ID | FR 제목 | 관련 엔드포인트 |
|---|---|---|
| FR-001 | ETF 티커/종목명 검색 자동완성 | `GET /api/etf/search?q=` |
| FR-002 | ETF 기본정보 표시 | `GET /api/etf/:ticker` |
| FR-003 | 최근 검색 ETF 저장 | API 없음 (localStorage) |
| FR-010 | 수익률 비교 라인 차트 | `GET /api/etf/:ticker/compare` |
| FR-011 | 초과수익률 영역 차트 | `GET /api/etf/:ticker/compare` |
| FR-012 | 성과 지표 비교 테이블 | `GET /api/etf/:ticker/compare` |
| FR-020 | 롤링 승률 대시보드 | `GET /api/etf/:ticker/compare` |
| FR-021 | 연도별 승패 막대 차트 | `GET /api/etf/:ticker/compare` |
| FR-022 | 이김/짐 통계 요약 | `GET /api/etf/:ticker/compare` |
| FR-030 | 비용 복리 효과 시뮬레이터 | API 없음 (프론트 계산) |
| FR-031 | 퇴직연금 인덱스 전략 시뮬레이터 | API 없음 (프론트 계산) |
| FR-032 | 타이밍 실패 시뮬레이터 | `GET /api/timing` |
| FR-040 | 기간별 ETF 성과 랭킹 | `GET /api/ranking` |
| FR-041 | 인기 프리셋 카드 | `GET /api/presets`, `GET /api/presets/popular` |
| FR-050 | 인사이트 교육 콘텐츠 | API 없음 (정적) |
| FR-051 | 책 소개 및 구매 링크 | API 없음 (정적) |
