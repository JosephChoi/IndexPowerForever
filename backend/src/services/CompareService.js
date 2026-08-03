import { PriceService } from './PriceService.js';
import { CalculationService } from './CalculationService.js';

// ETF vs 지수 비교 분석 서비스
export class CompareService {
  constructor(env) {
    this.env = env;
    this.priceService = new PriceService(env);
  }

  // 비교 분석 전체 실행 (KV 6h 캐시)
  async analyze(ticker, period = '5Y', benchmark = 'SPY') {
    // v6: 벤치마크를 조회 중인 ETF의 시작일에 맞춰 자른다.
    //     v5 정렬 전면 제거(벤치마크가 과도하게 길어짐), v4 세 종목 공통 구간(둘 다 폐기),
    //     v3 샤프 표준정의 변경, v2 무위험수익률 4.5%→3.9%.
    // 계산식이 바뀌면 이 버전을 올릴 것 (안 올리면 TTL 6시간 동안 옛 값이 나온다)
    const cacheKey = `compare:v6:${ticker}:${period}:${benchmark}`;

    const cached = await this.env.KV.get(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        // 캐시된 데이터가 요청 기간을 충분히 커버하는지 검증
        if (this._cacheCoversperiod(parsed, period) && this._cacheIsRecent(parsed)) return parsed;
      } catch { /* 캐시 파싱 실패 시 재계산 */ }
    }

    // 3개 티커 가격 병렬 조회
    let [etfPrices, spyPrices, qqqPrices] = await Promise.all([
      this.priceService.get(ticker, period),
      this.priceService.get('SPY', period),
      this.priceService.get('QQQ', period),
    ]);

    // max: 기준은 언제나 조회 중인 ETF다. 벤치마크를 ETF 시작일에 맞춰 자른다.
    // 세 종목 공통 구간으로 자르면(v4) 화면에 없는 종목이 지표를 깎고,
    // 아무것도 자르지 않으면(v5) 벤치마크만 훨씬 긴 기간이라 ETF가 부당하게 져 보인다.
    // (예: SMH 2000~ vs S&P 500 1993~ → S&P 500이 1,600%로 표시)
    if (period === 'max' && etfPrices.length > 0) {
      const etfStart = etfPrices[0].date;
      spyPrices = spyPrices.filter(p => p.date >= etfStart);
      qqqPrices = qqqPrices.filter(p => p.date >= etfStart);
    }

    const benchPrices = benchmark === 'QQQ' ? qqqPrices : spyPrices;

    // 벤치마크가 ETF보다 늦게 상장한 경우에만 기간이 어긋난다.
    // (예: SPY 1993~ 상세에서 NASDAQ 100은 1999~ 밖에 없음)
    const periodNotice = this._buildPeriodNotice(period, ticker, etfPrices, benchPrices, benchmark);

    // 기간 계산 (년수) — 각 티커별 실제 데이터 기간 사용
    const years = this._calcYears(etfPrices);
    const spyYears = this._calcYears(spyPrices);
    const qqqYears = this._calcYears(qqqPrices);

    // 누적 수익률
    const etfCumReturns = CalculationService.calcCumulativeReturns(etfPrices);
    const spyCumReturns = CalculationService.calcCumulativeReturns(spyPrices);
    const qqqCumReturns = CalculationService.calcCumulativeReturns(qqqPrices);
    const benchCumReturns = benchmark === 'QQQ' ? qqqCumReturns : spyCumReturns;

    // 초과수익률
    const excessReturns = CalculationService.calcExcessReturns(etfCumReturns, benchCumReturns);

    // 통계 지표 — 각 티커의 실제 기간으로 CAGR 산출
    const etfCAGR = CalculationService.calcCAGR(etfPrices[0]?.close, etfPrices.at(-1)?.close, years);
    const spyCAGR = CalculationService.calcCAGR(spyPrices[0]?.close, spyPrices.at(-1)?.close, spyYears);
    const qqqCAGR = CalculationService.calcCAGR(qqqPrices[0]?.close, qqqPrices.at(-1)?.close, qqqYears);

    const etfVol = CalculationService.calcAnnualVolatility(etfPrices);
    const spyVol = CalculationService.calcAnnualVolatility(spyPrices);
    const qqqVol = CalculationService.calcAnnualVolatility(qqqPrices);

    // 연도별 수익률
    const yearlyReturns = CalculationService.calcYearlyReturns(etfPrices, benchPrices);

    // 롤링 승률 (1Y/3Y/5Y)
    const rollingWin = {
      '1Y': CalculationService.calcRollingWinRate(etfPrices, benchPrices, 1),
      '3Y': CalculationService.calcRollingWinRate(etfPrices, benchPrices, 3),
      '5Y': CalculationService.calcRollingWinRate(etfPrices, benchPrices, 5),
    };

    // 연도별 승패 요약
    const winCount = yearlyReturns.filter(y => y.win).length;
    const totalYears = yearlyReturns.length;

    // 차트용 데이터 샘플링 (5년 초과 시 주간, 응답 크기 축소)
    const chartEtf = years > 5 ? this._sampleWeekly(etfCumReturns) : etfCumReturns;
    const chartSpy = years > 5 ? this._sampleWeekly(spyCumReturns) : spyCumReturns;
    const chartQqq = years > 5 ? this._sampleWeekly(qqqCumReturns) : qqqCumReturns;
    const chartExcess = years > 5 ? this._sampleWeekly(excessReturns, 'excess') : excessReturns;

    const result = {
      ticker,
      period,
      benchmark,
      dataRange: {
        start: etfPrices[0]?.date,
        end: etfPrices.at(-1)?.date,
        years: parseFloat(years.toFixed(1)),
      },
      // 종목과 벤치마크의 시작일이 다를 때만 채워진다 (없으면 null)
      periodNotice,
      // 차트 데이터 (샘플링 적용)
      chart: {
        etf: chartEtf,
        spy: chartSpy,
        qqq: chartQqq,
        excess: chartExcess,
      },
      // 통계 지표
      stats: {
        etf: {
          totalReturn: parseFloat((etfCumReturns.at(-1)?.return || 0).toFixed(2)),
          cagr: parseFloat((etfCAGR * 100).toFixed(2)),
          mdd: parseFloat(CalculationService.calcMDD(etfPrices).toFixed(2)),
          sharpe: parseFloat(CalculationService.calcSharpe(etfPrices).toFixed(2)),
          annualVolatility: parseFloat((etfVol * 100).toFixed(2)),
        },
        spy: {
          totalReturn: parseFloat((spyCumReturns.at(-1)?.return || 0).toFixed(2)),
          cagr: parseFloat((spyCAGR * 100).toFixed(2)),
          mdd: parseFloat(CalculationService.calcMDD(spyPrices).toFixed(2)),
          sharpe: parseFloat(CalculationService.calcSharpe(spyPrices).toFixed(2)),
          annualVolatility: parseFloat((spyVol * 100).toFixed(2)),
        },
        qqq: {
          totalReturn: parseFloat((qqqCumReturns.at(-1)?.return || 0).toFixed(2)),
          cagr: parseFloat((qqqCAGR * 100).toFixed(2)),
          mdd: parseFloat(CalculationService.calcMDD(qqqPrices).toFixed(2)),
          sharpe: parseFloat(CalculationService.calcSharpe(qqqPrices).toFixed(2)),
          annualVolatility: parseFloat((qqqVol * 100).toFixed(2)),
        },
      },
      // 이김/짐 분석
      winAnalysis: {
        yearlyReturns,
        winCount,
        loseCount: totalYears - winCount,
        totalYears,
        winRate: totalYears > 0 ? parseFloat(((winCount / totalYears) * 100).toFixed(1)) : 0,
        rollingWin,
      },
    };

    // KV 저장 (6h)
    await this.env.KV.put(cacheKey, JSON.stringify(result), { expirationTtl: 21600 });

    return result;
  }

  // 벤치마크가 ETF보다 늦게 상장해 기간을 맞출 수 없을 때만 안내를 만든다.
  // 벤치마크는 ETF 시작일에 맞춰 잘리므로 보통은 시작일이 같아진다.
  // 다만 벤치마크 쪽 데이터가 더 짧으면 자를 수가 없어 기간이 어긋난다.
  // (예: SPY 1993~ 상세에서 NASDAQ 100은 1999-03-10부터만 존재)
  _buildPeriodNotice(period, ticker, etfPrices, benchPrices, benchmark) {
    if (period !== 'max') return null;
    const etfStart = etfPrices[0]?.date;
    const benchStart = benchPrices[0]?.date;
    if (!etfStart || !benchStart || benchStart <= etfStart) return null;

    const benchName = benchmark === 'QQQ' ? 'NASDAQ 100' : 'S&P 500';

    return {
      etfStart,
      benchStart,
      benchName,
      message: `${benchName}의 데이터는 ${benchStart}부터 존재해 `
        + `${ticker}의 시작일(${etfStart})까지 거슬러 올라가지 않습니다. `
        + `${benchName} 지표는 ${benchStart} 이후 구간만 반영되므로 `
        + `CAGR·MDD·샤프 비율은 동일 조건 비교가 아닙니다.`,
    };
  }

  // 주간 샘플링 (매주 금요일 or 마지막 거래일)
  _sampleWeekly(data, valueKey = 'return') {
    if (data.length <= 500) return data;
    const sampled = [data[0]];
    let lastWeek = -1;
    for (const d of data) {
      const dt = new Date(d.date);
      const week = Math.floor(dt.getTime() / (7 * 24 * 60 * 60 * 1000));
      if (week !== lastWeek) {
        sampled.push(d);
        lastWeek = week;
      }
    }
    // 마지막 데이터 포인트 보장
    if (sampled.at(-1)?.date !== data.at(-1)?.date) {
      sampled.push(data.at(-1));
    }
    return sampled;
  }

  // KV 캐시 데이터가 최신인지 검증 (dataRange.end 기준 4일 이내)
  _cacheIsRecent(data) {
    if (!data?.dataRange?.end) return true;
    const endDate = new Date(data.dataRange.end);
    const now = new Date();
    const diffDays = (now - endDate) / (24 * 60 * 60 * 1000);
    return diffDays < 4;
  }

  // KV 캐시 데이터가 요청 기간을 커버하는지 검증
  _cacheCoversperiod(data, period) {
    if (!data?.dataRange?.start) return true;
    if (period === 'max') {
      // max 캐시: 데이터 시작점이 10Y 기준보다 90일 이상 이전이어야 유효
      const dataStart = new Date(data.dataRange.start);
      const tenYearsAgo = new Date();
      tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
      const diffDays = (dataStart - tenYearsAgo) / (24 * 60 * 60 * 1000);
      return diffDays < -90;
    }
    const years = { '1Y': 1, '3Y': 3, '5Y': 5, '10Y': 10 }[period];
    if (!years) return true;
    const requestedStart = new Date();
    requestedStart.setFullYear(requestedStart.getFullYear() - years);
    const dataStart = new Date(data.dataRange.start);
    const diffDays = (dataStart - requestedStart) / (24 * 60 * 60 * 1000);
    return diffDays < 90;
  }

  // 가격 배열에서 보유 기간(년) 계산
  _calcYears(prices) {
    if (prices.length < 2) return 0;
    const start = new Date(prices[0].date);
    const end = new Date(prices.at(-1).date);
    return (end - start) / (365.25 * 24 * 60 * 60 * 1000);
  }
}
