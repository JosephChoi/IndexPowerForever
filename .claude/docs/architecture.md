# Architecture — Index Power Forever

> 작성일: 2026-03-21 | PRD 기반 도출

---

## 1. 시스템 구성

```
[Browser]
  └─ Vue 3 SPA (Cloudflare Pages)
       └─ fetch (this.$api) → [Cloudflare Workers (Hono)]
                                  ├─ Cloudflare KV — 단기 캐시 (1h~24h)
                                  ├─ Cloudflare D1 (SQLite) — 영구 캐시 + 정적 데이터
                                  └─ Yahoo Finance API — 외부 데이터 소스
```

---

## 2. 레이어 역할

### Frontend (Cloudflare Pages)
- Vue 3 CDN, 빌드 없음 (SPA)
- `views/*.html` + `logic/*.js` 1:1 ViewLogic 구조
- API 호출: `this.$api.get/post()` (JWT 없음)
- 시뮬레이터 계산 (FR-030, FR-031): 서버 호출 없이 프론트에서 직접 계산
- 최근 검색 (FR-003): localStorage

### Backend (Cloudflare Workers + Hono)
- `src/index.js`: 앱 초기화, 라우트 마운트, 미들웨어 등록
- `src/routes/`: 입력 검증 + 서비스 호출만 (DB 직접 접근 금지)
- `src/services/`: 비즈니스 로직 + D1/KV/Yahoo Finance 접근
- `src/middleware/cors.js`, `src/middleware/error.js`

---

## 3. 모듈 정의

| 모듈 | Route 파일 | Service 파일 | FR |
|---|---|---|---|
| ETF 검색/정보 | `routes/etf.js` | `services/YahooService.js`, `services/EtfService.js` | FR-001, FR-002 |
| 성과 비교 | `routes/compare.js` | `services/CompareService.js`, `services/CalculationService.js` | FR-010~012 |
| 이김/짐 분석 | `routes/compare.js` (동일) | `services/CalculationService.js` | FR-020~022 |
| 랭킹 | `routes/ranking.js` | `services/RankingService.js` | FR-040 |
| 프리셋 | `routes/presets.js` | `services/PresetService.js` | FR-041 |
| 타이밍 시뮬 | `routes/timing.js` | `services/TimingService.js` | FR-032 |

---

## 4. 전체 API 엔드포인트

| Method | Path | 설명 | FR |
|---|---|---|---|
| GET | `/api/etf/search?q=` | ETF 티커/종목명 자동완성 | FR-001 |
| GET | `/api/etf/:ticker` | ETF 기본정보 (quoteSummary) | FR-002 |
| GET | `/api/etf/:ticker/prices?period=` | 일별 가격 데이터 | FR-010~022 |
| GET | `/api/etf/:ticker/compare?period=&benchmark=` | 지수 비교 분석 결과 | FR-010~022 |
| GET | `/api/ranking?period=&benchmark=&sort=` | 기간별 ETF 성과 랭킹 | FR-040 |
| GET | `/api/presets` | 인기 프리셋 목록 | FR-041 |
| GET | `/api/presets/popular` | 인기 검색 ETF TOP 5 | FR-041 |
| GET | `/api/timing?period=&missing=` | 타이밍 실패 시뮬레이션 | FR-032 |

**프론트 전용 (API 없음):**
- FR-030 비용 시뮬레이터: 프론트 계산
- FR-031 퇴직연금 시뮬레이터: 프론트 계산
- FR-050 인사이트: 정적 콘텐츠
- FR-051 책 소개: 정적 콘텐츠

---

## 5. 데이터 흐름

### ETF 기본정보 조회 (FR-002)
```
Route /api/etf/:ticker
  → EtfService.getInfo(ticker)
    → KV.get('info:{ticker}') → 히트 시 반환
    → YahooService.getQuoteSummary(ticker)
    → D1 INSERT OR REPLACE etf_info
    → KV.put('info:{ticker}', data, TTL 24h)
    → 반환
```

### 가격 데이터 + 비교 분석 (FR-010~022)
```
Route /api/etf/:ticker/compare?period=5Y
  → CompareService.analyze(ticker, period, benchmark)
    → PriceService.get(ticker, period)     ─┐
    → PriceService.get('SPY', period)       │ 병렬 fetch
    → PriceService.get('QQQ', period)      ─┘
      각각:
        → KV.get('price:{ticker}:{period}') → 히트 시 반환
        → YahooService.getChart(ticker, period)
        → D1 batch INSERT price_cache
        → KV.put('price:{ticker}:{period}', data, TTL 1h)
    → CalculationService.compute(etfPrices, spyPrices, qqqPrices)
      ├─ 누적 수익률 (일별)
      ├─ 초과수익률 (ETF - SPY)
      ├─ CAGR, MDD, Sharpe
      ├─ 연도별 승패
      └─ 롤링 1Y/3Y/5Y 승률
    → KV.put('compare:{ticker}:{period}:{benchmark}', result, TTL 6h)
    → 반환
```

### 랭킹 (FR-040)
```
Route /api/ranking?period=3Y&benchmark=SPY
  → KV.get('ranking:{period}:{benchmark}') → 히트 시 반환
  → RankingService.compute(period, benchmark)
    → D1 SELECT * FROM ranking_etf WHERE is_active = 1
    → 각 ETF별 CompareService.analyze() 호출 (KV 캐시 활용)
    → 초과수익률 기준 정렬
  → KV.put('ranking:{period}:{benchmark}', result, TTL 6h)
  → 반환
```

### 타이밍 시뮬레이터 (FR-032)
```
Route /api/timing?period=2000-2024&missing=20
  → TimingService.simulate(startYear, endYear, missingDays)
    → PriceService.get('SPY', 'max') (D1 캐시 우선)
    → 상위 N일 상승일 제거 후 수익률 재계산
  → 반환
```

---

## 6. Yahoo Finance 연동 전략

```javascript
// YahooService — cookie + crumb 인증
class YahooService {
  constructor(env) { this.env = env; }

  async getCrumb() {
    // 1. KV에서 crumb 캐시 확인 (TTL 1h)
    const cached = await this.env.KV.get('yahoo:crumb');
    if (cached) return JSON.parse(cached);
    // 2. Yahoo Finance 접속하여 cookie 획득
    // 3. crumb 엔드포인트 호출
    // 4. KV 저장
  }

  async getChart(ticker, period) {
    const { crumb, cookie } = await this.getCrumb();
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?...`;
    const res = await fetch(url, { headers: { Cookie: cookie } });
    return res.json();
  }

  async getQuoteSummary(ticker) {
    const { crumb, cookie } = await this.getCrumb();
    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?crumb=${crumb}&modules=...`;
    const res = await fetch(url, { headers: { Cookie: cookie } });
    return res.json();
  }
}
```

---

## 7. 캐시 전략

| KV Key 패턴 | TTL | D1 저장 |
|---|---|---|
| `price:{ticker}:{period}` | 1h | 영구 (price_cache) |
| `info:{ticker}` | 24h | 영구 (etf_info) |
| `compare:{ticker}:{period}:{benchmark}` | 6h | 없음 |
| `search:{q}` | 24h | 없음 |
| `ranking:{period}:{benchmark}` | 6h | 없음 |
| `yahoo:crumb` | 1h | 없음 |

---

## 8. 에러 처리

| 에러명 | HTTP | 발생 조건 |
|---|---|---|
| `ValidationError` | 400 | 잘못된 ticker 형식, 필수 파라미터 누락 |
| `NotFoundError` | 404 | Yahoo Finance에서 해당 ticker 없음 |
| `ServerError` | 500 | Yahoo Finance API 타임아웃, D1 오류 |

```javascript
// errorHandler middleware
app.onError((err, c) => {
  if (err.name === 'ValidationError') return c.json({ error: err.name, message: err.message }, 400);
  if (err.name === 'NotFoundError') return c.json({ error: err.name, message: err.message }, 404);
  return c.json({ error: 'ServerError', message: '서버 오류가 발생했습니다.' }, 500);
});
```

---

## 9. 입력 검증 (Route 공통)

```javascript
// ticker 검증
const ticker = c.req.param('ticker').toUpperCase().trim();
if (!/^[A-Z0-9\^\.]{1,10}$/.test(ticker)) {
  const err = new Error('Invalid ticker'); err.name = 'ValidationError'; throw err;
}

// period 검증
const VALID_PERIODS = ['1Y', '3Y', '5Y', '10Y', 'max'];
const period = c.req.query('period') || '5Y';
if (!VALID_PERIODS.includes(period)) {
  const err = new Error('Invalid period'); err.name = 'ValidationError'; throw err;
}
```

---

## 10. 배포 구성

```
frontend/ → Cloudflare Pages (GitHub 연동 자동 배포)
backend/  → wrangler deploy → Cloudflare Workers

# D1 마이그레이션
wrangler d1 execute DB --file=backend/migrations/0001_init.sql
wrangler d1 execute DB --file=backend/migrations/0002_seed.sql

# wrangler.toml 바인딩
[[d1_databases]]
binding = "DB"

[[kv_namespaces]]
binding = "KV"
```

---

## 11. 파일 구조 (구현 기준)

```
backend/src/
├── index.js
├── routes/
│   ├── etf.js          # /api/etf/*
│   ├── compare.js      # /api/etf/:ticker/compare
│   ├── ranking.js      # /api/ranking
│   ├── presets.js      # /api/presets
│   └── timing.js       # /api/timing
├── services/
│   ├── YahooService.js
│   ├── EtfService.js
│   ├── CompareService.js
│   ├── CalculationService.js
│   ├── RankingService.js
│   ├── PresetService.js
│   └── TimingService.js
└── middleware/
    ├── cors.js
    └── error.js

frontend/
├── index.html
├── css/style.css
├── components/navbar.html
├── views/
│   ├── home.html
│   ├── etf-detail.html
│   ├── ranking.html
│   ├── timing.html
│   ├── fee-simulator.html
│   ├── retirement.html
│   ├── insights.html
│   └── book.html
└── logic/
    ├── app.js
    ├── home.js
    ├── etf-detail.js
    ├── ranking.js
    ├── timing.js
    ├── fee-simulator.js
    ├── retirement.js
    ├── insights.js
    └── book.js
```
