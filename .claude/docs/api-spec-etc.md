# API 명세 — 랭킹·프리셋·타이밍 (FR-032, FR-040, FR-041)

> 상위 문서: [api-spec.md](./api-spec.md)
> Route 파일: `routes/ranking.js`, `routes/presets.js`, `routes/timing.js`

---

## GET /api/ranking

**목적**: 사전 정의된 ETF 목록의 기간별 지수 대비 성과 순위를 반환한다. (FR-040)

### Query 파라미터

| 파라미터 | 타입 | 필수 | 유효값 | 기본값 |
|---|---|---|---|---|
| `period` | string | 선택 | `1Y`, `3Y`, `5Y`, `10Y` | `3Y` |
| `benchmark` | string | 선택 | `SPY`, `QQQ` | `SPY` |
| `sort` | string | 선택 | `excess_return`, `cagr`, `mdd`, `sharpe` | `excess_return` |

> `max`는 랭킹에서 허용하지 않음 (ETF별 inception_date 차이로 비교 불공평)

### 처리 흐름 (`RankingService.compute(period, benchmark, sort)`)

1. `KV.get('ranking:{period}:{benchmark}')` → 캐시 히트 시 sort만 적용하여 반환
2. `D1: SELECT ticker, name, category FROM ranking_etf WHERE is_active = 1 ORDER BY sort_order ASC`
3. 각 ETF별 `CompareService.analyze(ticker, period, benchmark)` 병렬 호출 (KV 캐시 최대 활용)
4. 결과 정렬 후 `KV.put('ranking:{period}:{benchmark}', ..., { expirationTtl: 21600 })`
5. `sort` 파라미터에 따라 재정렬 후 반환

### 성공 응답 (HTTP 200)

```json
{
  "data": [
    {
      "rank": 1,
      "ticker": "XLK",
      "name": "Technology Select Sector SPDR Fund",
      "category": "Technology",
      "excess_return": 42.31,
      "cagr": 21.85,
      "mdd": -28.43,
      "sharpe": 1.24,
      "outperformed": true
    },
    {
      "rank": 2,
      "ticker": "QQQ",
      "name": "Invesco QQQ Trust",
      "category": "Technology",
      "excess_return": 18.77,
      "cagr": 18.92,
      "mdd": -32.58,
      "sharpe": 1.12,
      "outperformed": true
    }
  ],
  "total": 35,
  "hasNext": false,
  "meta": {
    "period": "3Y",
    "benchmark": "SPY",
    "sort": "excess_return",
    "computed_at": "2026-03-22T10:00:00Z"
  }
}
```

### 에러 응답

| 조건 | error | HTTP | message |
|---|---|---|---|
| 유효하지 않은 period | `ValidationError` | 400 | "랭킹 period는 1Y, 3Y, 5Y, 10Y 중 하나여야 합니다." |
| 유효하지 않은 benchmark | `ValidationError` | 400 | "benchmark는 SPY 또는 QQQ 중 하나여야 합니다." |
| 유효하지 않은 sort | `ValidationError` | 400 | "sort는 excess_return, cagr, mdd, sharpe 중 하나여야 합니다." |
| D1 오류 | `ServerError` | 500 | "서버 오류가 발생했습니다." |

---

## GET /api/presets

**목적**: 홈 화면의 인기 프리셋 ETF 카드 목록을 반환한다. (FR-041)

### Query 파라미터

없음.

### 처리 흐름 (`PresetService.getPresets()`)

1. `D1: SELECT id, name, description, tickers, sort_order FROM preset ORDER BY sort_order ASC`
2. `tickers` 컬럼(JSON 문자열)을 파싱하여 배열로 변환
3. `D1: SELECT ticker, name, category FROM etf_info WHERE ticker IN (...)` 로 ETF 정보 보강

### 성공 응답 (HTTP 200)

```json
{
  "data": [
    {
      "id": 1,
      "name": "테마 ETF 비교",
      "description": "혁신·테마 ETF와 S&P 500 비교",
      "sort_order": 1,
      "tickers": [
        { "ticker": "ARKK", "name": "ARK Innovation ETF", "category": "Technology" },
        { "ticker": "XLK",  "name": "Technology Select Sector SPDR Fund", "category": "Technology" },
        { "ticker": "GLD",  "name": "SPDR Gold Shares", "category": "Commodities" }
      ]
    },
    {
      "id": 2,
      "name": "레버리지 ETF 비교",
      "description": "레버리지·인버스 ETF의 장기 위험",
      "sort_order": 2,
      "tickers": [
        { "ticker": "TQQQ", "name": "ProShares UltraPro QQQ", "category": "Leveraged" },
        { "ticker": "QQQ",  "name": "Invesco QQQ Trust", "category": "Technology" }
      ]
    }
  ],
  "total": 5,
  "hasNext": false
}
```

### 에러 응답

| 조건 | error | HTTP | message |
|---|---|---|---|
| D1 쿼리 실패 | `ServerError` | 500 | "서버 오류가 발생했습니다." |

---

## GET /api/presets/popular

**목적**: 최근 많이 조회된 ETF TOP 5를 반환한다. (FR-041)

### Query 파라미터

없음.

### 처리 흐름 (`PresetService.getPopular()`)

1. `KV.get('popular:etf')` → 캐시 히트 시 즉시 반환
2. `D1: SELECT ticker, COUNT(*) as count FROM search_log WHERE created_at >= datetime('now', '-7 days') GROUP BY ticker ORDER BY count DESC LIMIT 5`
3. `D1: SELECT ticker, name, category FROM etf_info WHERE ticker IN (...)` 로 정보 보강
4. `KV.put('popular:etf', JSON.stringify(result), { expirationTtl: 3600 })`

### 성공 응답 (HTTP 200)

```json
{
  "data": [
    { "ticker": "ARKK", "name": "ARK Innovation ETF", "category": "Technology", "search_count": 342 },
    { "ticker": "TQQQ", "name": "ProShares UltraPro QQQ", "category": "Leveraged", "search_count": 218 },
    { "ticker": "VYM",  "name": "Vanguard High Dividend Yield ETF", "category": "Dividend", "search_count": 187 },
    { "ticker": "GLD",  "name": "SPDR Gold Shares", "category": "Commodities", "search_count": 154 },
    { "ticker": "XLK",  "name": "Technology Select Sector SPDR Fund", "category": "Technology", "search_count": 132 }
  ],
  "total": 5,
  "hasNext": false
}
```

### 에러 응답

| 조건 | error | HTTP | message |
|---|---|---|---|
| D1 쿼리 실패 | `ServerError` | 500 | "서버 오류가 발생했습니다." |

---

## GET /api/timing

**목적**: S&P 500(SPY)의 상위 N일 상승일을 놓쳤을 때의 수익률 시뮬레이션 결과를 반환한다. (FR-032)

### Query 파라미터

| 파라미터 | 타입 | 필수 | 유효값 | 기본값 |
|---|---|---|---|---|
| `period` | string | 선택 | `YYYY-YYYY` 형식 | `2000-2024` |
| `missing` | string | 선택 | `0`, `10`, `20`, `30`, `50` (쉼표 구분 복수 가능) | `0,10,20,30` |

### 입력 검증 (Route)

```javascript
const period = c.req.query('period') ?? '2000-2024';
const [startYearStr, endYearStr] = period.split('-');
const startYear = parseInt(startYearStr);
const endYear = parseInt(endYearStr);
if (isNaN(startYear) || isNaN(endYear) || startYear < 1993 || endYear > 2030 || startYear >= endYear) {
  const err = new Error('period는 YYYY-YYYY 형식이며 1993 이후여야 합니다.');
  err.name = 'ValidationError'; throw err;
}

const VALID_MISSING = [0, 10, 20, 30, 50];
const missingRaw = c.req.query('missing') ?? '0,10,20,30';
const missingDays = missingRaw.split(',').map(Number);
if (missingDays.some(d => !VALID_MISSING.includes(d))) {
  const err = new Error('missing은 0, 10, 20, 30, 50 중에서 선택하세요.');
  err.name = 'ValidationError'; throw err;
}
```

### 처리 흐름 (`TimingService.simulate(startYear, endYear, missingDays[])`)

1. `EtfService.getPrices('SPY', 'max')` 호출 (D1 캐시 우선)
2. `startYear-01-01 ~ endYear-12-31` 구간 필터링
3. 일별 수익률 배열 계산: `dailyReturn[i] = close[i] / close[i-1] - 1`
4. `missingDays`의 각 N에 대해:
   - 일별 수익률 내림차순 정렬 → 상위 N일 특정
   - 해당 날짜 제외한 수익률 배열로 누적 수익률 재계산
   - CAGR 계산

### 성공 응답 (HTTP 200)

```json
{
  "data": {
    "benchmark": "SPY",
    "start_year": 2000,
    "end_year": 2024,
    "years": 24,
    "scenarios": [
      {
        "missing_days": 0,
        "total_return": 312.45,
        "cagr": 5.97,
        "final_value": 41245,
        "label": "상위 상승일 0일 놓침 (완전 투자)"
      },
      {
        "missing_days": 10,
        "total_return": 189.32,
        "cagr": 4.58,
        "final_value": 28932,
        "label": "상위 10일 놓침"
      },
      {
        "missing_days": 20,
        "total_return": 102.17,
        "cagr": 2.99,
        "final_value": 20217,
        "label": "상위 20일 놓침"
      },
      {
        "missing_days": 30,
        "total_return": 38.42,
        "cagr": 1.38,
        "final_value": 13842,
        "label": "상위 30일 놓침"
      }
    ],
    "top_days": [
      { "date": "2008-10-13", "daily_return": 11.58 },
      { "date": "2020-03-24", "daily_return": 9.38 }
    ],
    "summary_sentence": "2000년부터 2024년까지 상위 20일을 놓쳤다면 수익률은 312.45%에서 102.17%로 감소합니다."
  }
}
```

**필드 타입:**

| 필드 | 타입 | 설명 |
|---|---|---|
| `scenarios[].total_return` | number | % |
| `scenarios[].cagr` | number | % |
| `scenarios[].final_value` | number | 초기 10,000 USD 기준 최종 금액 |
| `top_days[].daily_return` | number | % |

### 에러 응답

| 조건 | error | HTTP | message |
|---|---|---|---|
| period 형식 불일치 | `ValidationError` | 400 | "period는 YYYY-YYYY 형식이며 1993 이후여야 합니다." |
| 유효하지 않은 missing 값 | `ValidationError` | 400 | "missing은 0, 10, 20, 30, 50 중에서 선택하세요." |
| startYear >= endYear | `ValidationError` | 400 | "종료년도는 시작년도보다 커야 합니다." |
| SPY 가격 데이터 없음 | `ServerError` | 500 | "서버 오류가 발생했습니다." |
