-- 프리셋에서 벤치마크 ETF(SPY, QQQ) 제거
UPDATE preset SET tickers = '["SSO","UPRO","SPXL"]' WHERE name = '레버리지 ETF 비교';
UPDATE preset SET tickers = '["QLD","TQQQ"]' WHERE name = '나스닥 레버리지';
UPDATE preset SET tickers = '["XLK","XLV","XLF"]' WHERE name = '섹터 ETF 비교';
UPDATE preset SET tickers = '["VYM","SCHD","DVY"]' WHERE name = '배당 ETF 비교';
UPDATE preset SET tickers = '["AOM","AOR","AOA"]' WHERE name = '채권혼합 ETF';
UPDATE preset SET tickers = '["VUG","MGK","IWF"]' WHERE name = '성장주 ETF';
