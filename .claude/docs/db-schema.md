# DB Schema — Index Power Forever

> Cloudflare D1 (SQLite) 기준. 로그인 없음, D1은 캐시 및 정적 데이터 저장 전용.

---

## 설계 원칙

1. **D1은 캐시 레이어**: Yahoo Finance 데이터를 영구 캐시하여 반복 호출 최소화
2. **로그인 없음**: 사용자 테이블 없음
3. **SQLite 문법**: `?` 파라미터, `INSERT OR REPLACE`, `datetime('now')`
4. **정적 데이터**: preset, ranking_etf는 초기 seed 데이터로 관리

---

## 테이블 목록

| 테이블 | 목적 | FR |
|---|---|---|
| `etf_info` | ETF 기본정보 영구 캐시 | FR-002, FR-041 |
| `price_cache` | 일별 종가 히스토리 영구 캐시 | FR-010~022, FR-032 |
| `preset` | 인기 프리셋 ETF 목록 (정적) | FR-041 |
| `ranking_etf` | 랭킹 대상 ETF 목록 (정적) | FR-040 |
| `search_log` | 검색/조회 로그, 인기 ETF 집계 | FR-001, FR-041 |

---

## DDL

### etf_info

```sql
CREATE TABLE IF NOT EXISTS etf_info (
  ticker        TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  category      TEXT,
  expense_ratio REAL,
  inception_date TEXT,
  aum           REAL,
  description   TEXT,
  top_holdings  TEXT,  -- JSON array
  sector_weights TEXT, -- JSON object
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_etf_info_category ON etf_info(category);
CREATE INDEX IF NOT EXISTS idx_etf_info_updated ON etf_info(updated_at);
```

### price_cache

```sql
CREATE TABLE IF NOT EXISTS price_cache (
  ticker TEXT NOT NULL,
  date   TEXT NOT NULL,  -- YYYY-MM-DD
  close  REAL NOT NULL,
  PRIMARY KEY (ticker, date)
);

CREATE INDEX IF NOT EXISTS idx_price_ticker_date ON price_cache(ticker, date DESC);
```

### preset

```sql
CREATE TABLE IF NOT EXISTS preset (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,        -- '레버리지 ETF 비교', '테마 ETF'
  description TEXT,
  tickers     TEXT NOT NULL,        -- JSON array: ["QQQ","TQQQ","SPY"]
  sort_order  INTEGER DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### ranking_etf

```sql
CREATE TABLE IF NOT EXISTS ranking_etf (
  ticker      TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  category    TEXT,
  is_active   INTEGER NOT NULL DEFAULT 1,  -- 0: 비활성
  sort_order  INTEGER DEFAULT 0
);
```

### search_log

```sql
CREATE TABLE IF NOT EXISTS search_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  query      TEXT,                  -- 검색어 (null이면 직접 접근)
  ticker     TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_search_log_ticker ON search_log(ticker);
CREATE INDEX IF NOT EXISTS idx_search_log_created ON search_log(created_at DESC);
```

---

## DB 불필요 기능 (설계 제외)

| 기능 | 이유 |
|---|---|
| FR-030 비용 시뮬레이터 | 프론트엔드 계산 전용 |
| FR-031 퇴직연금 시뮬레이터 | 프론트엔드 계산 전용 |
| FR-003 최근 검색 저장 | localStorage 사용 |
| FR-050 인사이트 | 정적 콘텐츠 |
| FR-051 책 소개 | 정적 콘텐츠 |

---

## 마이그레이션

```
backend/migrations/
└── 0001_init.sql   # 위 DDL 전체 포함
```

실행:
```bash
wrangler d1 execute DB --file=backend/migrations/0001_init.sql
wrangler d1 execute DB --file=backend/migrations/0002_seed.sql  # preset, ranking_etf seed
```

---

## FR-ID 매핑 요약

| FR-ID | 기능 | 사용 테이블 |
|---|---|---|
| FR-001 | ETF 검색 자동완성 | `etf_info`, `search_log` |
| FR-002 | ETF 기본정보 | `etf_info` |
| FR-003 | 최근 검색 | localStorage (DB 없음) |
| FR-010 | 누적 수익률 비교 | `price_cache` |
| FR-011 | 연도별 수익률 | `price_cache` |
| FR-012 | 통계 지표 (CAGR/MDD/Sharpe) | `price_cache` |
| FR-020 | 이김/짐 판정 | `price_cache` |
| FR-021 | 롤링 승률 | `price_cache` |
| FR-022 | 연도별 승패 히트맵 | `price_cache` |
| FR-030 | 비용 시뮬레이터 | 없음 (프론트 계산) |
| FR-031 | 퇴직연금 시뮬레이터 | 없음 (프론트 계산) |
| FR-032 | 타이밍 시뮬레이터 | `price_cache` |
| FR-040 | 랭킹 | `ranking_etf`, `price_cache` |
| FR-041 | 인기 프리셋 | `preset`, `search_log` |
| FR-050 | 인사이트 | 없음 (정적) |
| FR-051 | 책 소개 | 없음 (정적) |
