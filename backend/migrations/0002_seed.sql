-- 인기 프리셋 초기 데이터
INSERT OR IGNORE INTO preset (name, description, tickers, sort_order) VALUES
  ('레버리지 ETF 비교', 'S&P 500 레버리지 ETF vs 지수 비교', '["SPY","SSO","UPRO"]', 1),
  ('나스닥 레버리지', 'NASDAQ 100 레버리지 ETF vs 지수 비교', '["QQQ","QLD","TQQQ"]', 2),
  ('섹터 ETF 비교', '주요 섹터 ETF vs S&P 500 비교', '["XLK","XLV","XLF","SPY"]', 3),
  ('배당 ETF 비교', '고배당 ETF vs S&P 500 비교', '["VYM","SCHD","DVY","SPY"]', 4),
  ('채권혼합 ETF', '자산배분 ETF vs 지수 비교', '["AOM","AOR","AOA","SPY"]', 5),
  ('성장주 ETF', '성장주 ETF vs NASDAQ 100 비교', '["VUG","MGK","IWF","QQQ"]', 6);

-- 랭킹 대상 ETF 목록 초기 데이터
INSERT OR IGNORE INTO ranking_etf (ticker, name, category, is_active, sort_order) VALUES
  ('SPY',  'SPDR S&P 500 ETF Trust', '대형 혼합', 1, 1),
  ('IVV',  'iShares Core S&P 500 ETF', '대형 혼합', 1, 2),
  ('VOO',  'Vanguard S&P 500 ETF', '대형 혼합', 1, 3),
  ('QQQ',  'Invesco QQQ Trust', '대형 성장', 1, 4),
  ('QQQM', 'Invesco NASDAQ 100 ETF', '대형 성장', 1, 5),
  ('VTI',  'Vanguard Total Stock Market ETF', '대형 혼합', 1, 6),
  ('IWM',  'iShares Russell 2000 ETF', '소형 혼합', 1, 7),
  ('VUG',  'Vanguard Growth ETF', '대형 성장', 1, 8),
  ('VTV',  'Vanguard Value ETF', '대형 가치', 1, 9),
  ('XLK',  'Technology Select Sector SPDR Fund', '기술', 1, 10),
  ('XLV',  'Health Care Select Sector SPDR Fund', '헬스케어', 1, 11),
  ('XLF',  'Financial Select Sector SPDR Fund', '금융', 1, 12),
  ('XLE',  'Energy Select Sector SPDR Fund', '에너지', 1, 13),
  ('XLY',  'Consumer Discretionary Select Sector SPDR Fund', '소비재', 1, 14),
  ('SCHD', 'Schwab US Dividend Equity ETF', '배당', 1, 15),
  ('VYM',  'Vanguard High Dividend Yield ETF', '배당', 1, 16),
  ('VIG',  'Vanguard Dividend Appreciation ETF', '배당성장', 1, 17),
  ('GLD',  'SPDR Gold Shares', '원자재', 1, 18),
  ('TLT',  'iShares 20+ Year Treasury Bond ETF', '채권', 1, 19),
  ('AGG',  'iShares Core US Aggregate Bond ETF', '채권', 1, 20),
  ('SSO',  'ProShares Ultra S&P 500', '레버리지', 1, 21),
  ('UPRO', 'ProShares UltraPro S&P 500', '레버리지', 1, 22),
  ('QLD',  'ProShares Ultra QQQ', '레버리지', 1, 23),
  ('TQQQ', 'ProShares UltraPro QQQ', '레버리지', 1, 24),
  ('ARKK', 'ARK Innovation ETF', '테마', 1, 25);
