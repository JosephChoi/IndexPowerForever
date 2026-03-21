-- ETF 기본정보 영구 캐시
CREATE TABLE IF NOT EXISTS etf_info (
  ticker        TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  category      TEXT,
  expense_ratio REAL,
  inception_date TEXT,
  aum           REAL,
  description   TEXT,
  top_holdings  TEXT,   -- JSON array
  sector_weights TEXT,  -- JSON object
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_etf_info_category ON etf_info(category);
CREATE INDEX IF NOT EXISTS idx_etf_info_updated ON etf_info(updated_at);

-- 일별 종가 히스토리 영구 캐시
CREATE TABLE IF NOT EXISTS price_cache (
  ticker TEXT NOT NULL,
  date   TEXT NOT NULL,  -- YYYY-MM-DD
  close  REAL NOT NULL,
  PRIMARY KEY (ticker, date)
);

CREATE INDEX IF NOT EXISTS idx_price_ticker_date ON price_cache(ticker, date DESC);

-- 인기 프리셋 (정적 데이터)
CREATE TABLE IF NOT EXISTS preset (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  description TEXT,
  tickers     TEXT NOT NULL,  -- JSON array: ["QQQ","TQQQ","SPY"]
  sort_order  INTEGER DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 랭킹 대상 ETF 목록 (정적 데이터)
CREATE TABLE IF NOT EXISTS ranking_etf (
  ticker     TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  category   TEXT,
  is_active  INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER DEFAULT 0
);

-- 검색/조회 로그 (인기 ETF 집계)
CREATE TABLE IF NOT EXISTS search_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  query      TEXT,
  ticker     TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_search_log_ticker ON search_log(ticker);
CREATE INDEX IF NOT EXISTS idx_search_log_created ON search_log(created_at DESC);
