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
    const cacheKey = `compare:${ticker}:${period}:${benchmark}`;

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

    // max: SPY/QQQ를 ETF 시작일 기준으로 자름 (불필요한 과거 데이터 제거)
    if (period === 'max' && etfPrices.length > 0) {
      const etfStartDate = etfPrices[0].date;
      spyPrices = spyPrices.filter(p => p.date >= etfStartDate);
      qqqPrices = qqqPrices.filter(p => p.date >= etfStartDate);
    }

    const benchPrices = benchmark === 'QQQ' ? qqqPrices : spyPrices;

    // 기간 계산 (년수)
    const years = this._calcYears(etfPrices);

    // 누적 수익률
    const etfCumReturns = CalculationService.calcCumulativeReturns(etfPrices);
    const spyCumReturns = CalculationService.calcCumulativeReturns(spyPrices);
    const qqqCumReturns = CalculationService.calcCumulativeReturns(qqqPrices);
    const benchCumReturns = benchmark === 'QQQ' ? qqqCumReturns : spyCumReturns;

    // 초과수익률
    const excessReturns = CalculationService.calcExcessReturns(etfCumReturns, benchCumReturns);

    // 통계 지표
    const etfCAGR = CalculationService.calcCAGR(etfPrices[0]?.close, etfPrices.at(-1)?.close, years);
    const spyCAGR = CalculationService.calcCAGR(spyPrices[0]?.close, spyPrices.at(-1)?.close, years);
    const qqqCAGR = CalculationService.calcCAGR(qqqPrices[0]?.close, qqqPrices.at(-1)?.close, years);

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
          sharpe: parseFloat(CalculationService.calcSharpe(etfCAGR, etfVol).toFixed(2)),
          annualVolatility: parseFloat((etfVol * 100).toFixed(2)),
        },
        spy: {
          totalReturn: parseFloat((spyCumReturns.at(-1)?.return || 0).toFixed(2)),
          cagr: parseFloat((spyCAGR * 100).toFixed(2)),
          mdd: parseFloat(CalculationService.calcMDD(spyPrices).toFixed(2)),
          sharpe: parseFloat(CalculationService.calcSharpe(spyCAGR, spyVol).toFixed(2)),
          annualVolatility: parseFloat((spyVol * 100).toFixed(2)),
        },
        qqq: {
          totalReturn: parseFloat((qqqCumReturns.at(-1)?.return || 0).toFixed(2)),
          cagr: parseFloat((qqqCAGR * 100).toFixed(2)),
          mdd: parseFloat(CalculationService.calcMDD(qqqPrices).toFixed(2)),
          sharpe: parseFloat(CalculationService.calcSharpe(qqqCAGR, qqqVol).toFixed(2)),
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
