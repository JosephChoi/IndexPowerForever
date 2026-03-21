# Architecture Guide — Index Power Forever

## 시스템 구성

```
[Browser]
  └─ Vue 3 SPA (Cloudflare Pages)
       └─ fetch → [Cloudflare Workers (Hono)]
                      ├─ Cloudflare D1 (SQLite) — 캐시/ETF 데이터
                      ├─ Cloudflare KV — 단기 캐시
                      └─ Yahoo Finance API — 외부 데이터
```

## 레이어 규칙

### Frontend (Cloudflare Pages)
- Vue 3 CDN, 빌드 없음
- ViewLogic: `views/*.html` + `logic/*.js` 1:1 매칭
- 라우팅: Vue Router (history mode)
- 인증: 없음 (로그인 불필요)

### Backend (Cloudflare Workers)
- Hono 프레임워크
- `src/index.js`: 앱 초기화 + 라우트 마운트
- `src/routes/`: 입력 검증 + 서비스 호출 전담
- `src/services/`: 비즈니스 로직 전담
- `src/middleware/`: cors, error handler

## 데이터 흐름

### ETF 가격 조회
```
Route → YahooService.getPrices(ticker)
  → KV.get(cache_key) → 캐시 히트 시 반환
  → Yahoo Finance API fetch
  → D1에 가격 저장
  → KV에 캐시 저장 (TTL 1h)
  → 반환
```

### ETF 비교 분석
```
Route → CompareService.analyze(ticker, period)
  → PriceService.get(ticker) + PriceService.get('SPY') + PriceService.get('QQQ')
  → CalculationService.compute(etfPrices, benchmarkPrices)
    ├─ 누적 수익률
    ├─ 초과 수익률 (일별)
    ├─ CAGR
    ├─ MDD
    ├─ Sharpe 비율
    ├─ 연도별 승패
    └─ 롤링 승률 (1y/3y/5y)
  → 반환
```

## 환경 바인딩 (wrangler.toml)

```toml
[[d1_databases]]
binding = "DB"
database_name = "index-power-forever"
database_id = "..."

[[kv_namespaces]]
binding = "KV"
id = "..."
```

## 주요 API 엔드포인트

| Method | Path | 설명 |
|---|---|---|
| GET | /api/etf/search?q= | ETF 검색 자동완성 |
| GET | /api/etf/:ticker | ETF 기본정보 |
| GET | /api/etf/:ticker/prices?period= | 가격 데이터 |
| GET | /api/etf/:ticker/compare?period= | 지수 비교 분석 |
| GET | /api/ranking?period=&sort= | 기간별 성과 랭킹 |
| GET | /api/timing?missing= | 타이밍 실패 시뮬레이션 |
| GET | /api/presets | 인기 프리셋 목록 |

## 캐시 전략

| KV Key 패턴 | TTL | 내용 |
|---|---|---|
| `price:{ticker}:{period}` | 1h | 가격 데이터 |
| `info:{ticker}` | 24h | ETF 기본정보 |
| `compare:{ticker}:{period}` | 6h | 비교 분석 결과 |
| `search:{q}` | 24h | 검색 결과 |
| `ranking:{period}:{sort}` | 6h | 랭킹 데이터 |

## D1 테이블

```sql
-- ETF 기본정보 캐시
CREATE TABLE etf_info (
  ticker TEXT PRIMARY KEY,
  name TEXT,
  category TEXT,
  expense_ratio REAL,
  inception_date TEXT,
  aum REAL,
  description TEXT,
  top_holdings TEXT, -- JSON
  updated_at TEXT
);

-- 가격 히스토리 캐시
CREATE TABLE price_cache (
  ticker TEXT,
  date TEXT,
  close REAL,
  PRIMARY KEY (ticker, date)
);

-- 검색 로그 (인기 검색 집계)
CREATE TABLE search_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  query TEXT,
  ticker TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
```

## 배포

- Frontend: Cloudflare Pages (GitHub 연동 자동 배포)
- Backend: `wrangler deploy` → Cloudflare Workers
- D1 마이그레이션: `wrangler d1 execute DB --file=migrations/0001_init.sql`
