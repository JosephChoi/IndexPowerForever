# API 명세 — ETF 검색·정보·가격 (FR-001, FR-002, FR-010)

> 상위 문서: [api-spec.md](./api-spec.md)
> Route 파일: `backend/src/routes/etf.js`
> Service 파일: `backend/src/services/EtfService.js`, `YahooService.js`

---

## GET /api/etf/search

**목적**: ETF 티커 또는 종목명 일부로 자동완성 후보를 반환한다. (FR-001)

### Query 파라미터

| 파라미터 | 타입 | 필수 | 유효값 | 기본값 |
|---|---|---|---|---|
| `q` | string | 필수 | 2자 이상, 최대 50자 | 없음 |

### 입력 검증 (Route)

```javascript
const q = c.req.query('q')?.trim();
if (!q || q.length < 2) {
  const err = new Error('검색어는 2자 이상이어야 합니다.');
  err.name = 'ValidationError';
  throw err;
}
if (q.length > 50) {
  const err = new Error('검색어는 50자 이하여야 합니다.');
  err.name = 'ValidationError';
  throw err;
}
```

### 처리 흐름 (`EtfService.search(q)`)

1. `KV.get('search:{q}')` → 캐시 히트 시 즉시 반환
2. Yahoo Finance 자동완성 API 호출:
   ```
   GET https://query2.finance.yahoo.com/v1/finance/search
     ?q={q}&quotesCount=10&newsCount=0&listsCount=0
   ```
3. `quotes[]`에서 `typeDisp === 'ETF'`인 항목만 필터링
4. `D1: SELECT ticker, name FROM etf_info WHERE ticker IN (...)` 로 캐시된 정보 보강
5. `D1: INSERT INTO search_log (query, ticker) VALUES (?, ?)` 각 결과별 비동기 기록
6. `KV.put('search:{q}', JSON.stringify(result), { expirationTtl: 86400 })`

### 성공 응답 (HTTP 200)

```json
{
  "data": [
    {
      "ticker": "ARKK",
      "name": "ARK Innovation ETF",
      "category": "Technology",
      "exchange": "NYSE Arca"
    },
    {
      "ticker": "ARKG",
      "name": "ARK Genomic Revolution ETF",
      "category": "Health Care",
      "exchange": "NYSE Arca"
    }
  ],
  "total": 2,
  "hasNext": false
}
```

### 에러 응답

| 조건 | error | HTTP | message |
|---|---|---|---|
| `q` 누락 또는 1자 이하 | `ValidationError` | 400 | "검색어는 2자 이상이어야 합니다." |
| `q` 50자 초과 | `ValidationError` | 400 | "검색어는 50자 이하여야 합니다." |
| Yahoo Finance 타임아웃 | `ServerError` | 500 | "서버 오류가 발생했습니다." |

---

## GET /api/etf/:ticker

**목적**: 특정 ETF의 기본정보를 반환한다. (FR-002)

### Path 파라미터

| 파라미터 | 타입 | 필수 | 유효값 |
|---|---|---|---|
| `ticker` | string | 필수 | `^[A-Z0-9\^\.]{1,10}$` (대문자 변환 적용) |

### 처리 흐름 (`EtfService.getInfo(ticker)`)

1. `KV.get('info:{ticker}')` → 캐시 히트 시 즉시 반환
2. `D1: SELECT * FROM etf_info WHERE ticker = ?` → D1 히트 시 반환 + KV 갱신
3. `YahooService.getQuoteSummary(ticker)` 호출
4. 응답 파싱 → `etf_info` 스키마에 맞게 변환
5. `D1: INSERT OR REPLACE INTO etf_info (...) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
6. `KV.put('info:{ticker}', JSON.stringify(result), { expirationTtl: 86400 })`
7. `D1: INSERT INTO search_log (query, ticker) VALUES (NULL, ?)` 비동기 기록

### 성공 응답 (HTTP 200)

```json
{
  "data": {
    "ticker": "ARKK",
    "name": "ARK Innovation ETF",
    "category": "Technology",
    "expense_ratio": 0.0075,
    "inception_date": "2014-10-31",
    "aum": 8500000000,
    "description": "ARK Innovation ETF is an actively managed ETF...",
    "top_holdings": [
      { "symbol": "TSLA", "holdingName": "Tesla Inc", "holdingPercent": 0.0912 },
      { "symbol": "COIN", "holdingName": "Coinbase Global Inc", "holdingPercent": 0.0741 }
    ],
    "sector_weights": [
      { "technology": 0.412 },
      { "healthcare": 0.198 }
    ],
    "updated_at": "2026-03-22T10:00:00Z"
  }
}
```

### 에러 응답

| 조건 | error | HTTP | message |
|---|---|---|---|
| ticker 형식 불일치 | `ValidationError` | 400 | "유효하지 않은 ticker 형식입니다." |
| Yahoo Finance에 존재하지 않는 ticker | `NotFoundError` | 404 | "해당 ETF를 찾을 수 없습니다. 미국 ETF 티커를 입력해주세요." |
| Yahoo Finance 응답 오류 | `ServerError` | 500 | "서버 오류가 발생했습니다." |

---

## GET /api/etf/:ticker/prices

**목적**: 특정 ETF의 일별 종가 배열을 반환한다. (FR-010 보조)

### Path 파라미터

| 파라미터 | 타입 | 필수 | 유효값 |
|---|---|---|---|
| `ticker` | string | 필수 | `^[A-Z0-9\^\.]{1,10}$` |

### Query 파라미터

| 파라미터 | 타입 | 필수 | 유효값 | 기본값 |
|---|---|---|---|---|
| `period` | string | 선택 | `1Y`, `3Y`, `5Y`, `10Y`, `max` | `5Y` |

### 처리 흐름 (`EtfService.getPrices(ticker, period)`)

1. `KV.get('price:{ticker}:{period}')` → 캐시 히트 시 즉시 반환
2. `D1: SELECT date, close FROM price_cache WHERE ticker = ? AND date >= ? ORDER BY date ASC`
3. `YahooService.getChart(ticker, period)` 호출 (D1 데이터 부족 시)
4. `D1 batch: INSERT OR REPLACE INTO price_cache (ticker, date, close) VALUES (?, ?, ?)`
5. `KV.put('price:{ticker}:{period}', JSON.stringify(result), { expirationTtl: 3600 })`

### 성공 응답 (HTTP 200)

```json
{
  "data": {
    "ticker": "ARKK",
    "period": "5Y",
    "prices": [
      { "date": "2021-01-04", "close": 124.52 },
      { "date": "2021-01-05", "close": 126.07 }
    ],
    "inception_date": "2014-10-31",
    "truncated": false
  },
  "total": 1260,
  "hasNext": false
}
```

`truncated: true`는 요청 period가 inception_date 이전을 포함할 때 설정된다.

### 에러 응답

| 조건 | error | HTTP | message |
|---|---|---|---|
| ticker 형식 불일치 | `ValidationError` | 400 | "유효하지 않은 ticker 형식입니다." |
| 유효하지 않은 period 값 | `ValidationError` | 400 | "period는 1Y, 3Y, 5Y, 10Y, max 중 하나여야 합니다." |
| Yahoo Finance에 존재하지 않는 ticker | `NotFoundError` | 404 | "해당 ETF를 찾을 수 없습니다." |
| Yahoo Finance 응답 오류 | `ServerError` | 500 | "서버 오류가 발생했습니다." |
