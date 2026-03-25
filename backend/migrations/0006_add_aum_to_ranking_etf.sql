-- ranking_etf에 AUM 컬럼 추가 (단위: 십억 달러)
ALTER TABLE ranking_etf ADD COLUMN aum REAL;

-- AUM 데이터 반영 (US 상장 시가총액 상위 30개)
UPDATE ranking_etf SET aum = 840.87 WHERE ticker = 'VOO';
UPDATE ranking_etf SET aum = 691.03 WHERE ticker = 'IVV';
UPDATE ranking_etf SET aum = 653.29 WHERE ticker = 'SPY';
UPDATE ranking_etf SET aum = 565.50 WHERE ticker = 'VTI';
UPDATE ranking_etf SET aum = 382.68 WHERE ticker = 'QQQ';
UPDATE ranking_etf SET aum = 202.91 WHERE ticker = 'VEA';
UPDATE ranking_etf SET aum = 189.99 WHERE ticker = 'VUG';
UPDATE ranking_etf SET aum = 170.00 WHERE ticker = 'IEFA';
UPDATE ranking_etf SET aum = 166.14 WHERE ticker = 'VTV';
UPDATE ranking_etf SET aum = 161.76 WHERE ticker = 'GLD';
UPDATE ranking_etf SET aum = 150.77 WHERE ticker = 'BND';
UPDATE ranking_etf SET aum = 139.30 WHERE ticker = 'AGG';
UPDATE ranking_etf SET aum = 137.10 WHERE ticker = 'IEMG';
UPDATE ranking_etf SET aum = 134.13 WHERE ticker = 'VXUS';
UPDATE ranking_etf SET aum = 114.63 WHERE ticker = 'SPYM';
UPDATE ranking_etf SET aum = 113.89 WHERE ticker = 'IWF';
UPDATE ranking_etf SET aum = 110.51 WHERE ticker = 'VWO';
UPDATE ranking_etf SET aum = 108.26 WHERE ticker = 'VGT';
UPDATE ranking_etf SET aum = 107.61 WHERE ticker = 'IJH';
UPDATE ranking_etf SET aum = 100.04 WHERE ticker = 'VIG';
UPDATE ranking_etf SET aum = 93.00  WHERE ticker = 'VO';
UPDATE ranking_etf SET aum = 92.80  WHERE ticker = 'IJR';
UPDATE ranking_etf SET aum = 86.80  WHERE ticker = 'XLK';
UPDATE ranking_etf SET aum = 85.30  WHERE ticker = 'RSP';
UPDATE ranking_etf SET aum = 83.81  WHERE ticker = 'SCHD';
UPDATE ranking_etf SET aum = 80.93  WHERE ticker = 'SGOV';
UPDATE ranking_etf SET aum = 80.28  WHERE ticker = 'ITOT';
UPDATE ranking_etf SET aum = 76.79  WHERE ticker = 'BNDX';
UPDATE ranking_etf SET aum = 72.31  WHERE ticker = 'VYM';
UPDATE ranking_etf SET aum = 72.09  WHERE ticker = 'IWM';
