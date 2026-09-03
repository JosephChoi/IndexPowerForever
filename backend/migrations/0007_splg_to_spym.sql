-- SPLG → SPYM 티커 교체
--
-- 배경: SPDR Portfolio S&P 500 ETF가 2025-10-31자로 티커를 SPLG → SPYM으로 변경했다.
-- Yahoo Finance는 죽은 SPLG 심볼에 대해 에러 없이 빈 시계열(close 전부 null)을 반환하며,
-- firstTradeDate가 2026-07-17로 리셋되고 regularMarketTime은 2025-10-30에 멈춰 있다.
-- 이 때문에 SPLG 가격이 2026-07-17 이후 갱신되지 않아 랭킹 지표가 왜곡되었다
-- (1Y 수익률 15.52% — 동일 지수 추종 VOO 18.88% 대비 3.36%p 낮게 표시).
--
-- SPYM 가격 데이터는 이미 price_cache에 5,230건(2005-11-15~2026-09-02) 최신 상태로 존재하며,
-- 겹치는 구간의 종가가 SPLG와 소수점까지 일치함을 확인했다.

-- 1) 랭킹 대상 티커 교체 (name은 현행 정식 명칭으로 갱신)
UPDATE ranking_etf
SET ticker = 'SPYM',
    name = 'State Street SPDR Portfolio S&P 500 ETF'
WHERE ticker = 'SPLG';

-- 2) 죽은 티커의 중복 가격 데이터 삭제 (동일 데이터가 SPYM에 존재)
DELETE FROM price_cache WHERE ticker = 'SPLG';

-- 3) 죽은 티커의 기본정보 캐시 삭제
DELETE FROM etf_info WHERE ticker = 'SPLG';
