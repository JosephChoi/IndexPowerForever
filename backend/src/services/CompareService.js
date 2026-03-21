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
    if (cached) return JSON.parse(cached);

    // 3개 티커 가격 병렬 조회
    const [etfPrices, spyPrices, qqqPrices] = await Promise.all([
      this.priceService.get(ticker, period),
      this.priceService.get('SPY', period),
      this.priceService.get('QQQ', period),
    ]);

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

    const result = {
      ticker,
      period,
      benchmark,
      dataRange: {
        start: etfPrices[0]?.date,
        end: etfPrices.at(-1)?.date,
        years: parseFloat(years.toFixed(1)),
      },
      // 차트 데이터 (날짜 + 수익률)
      chart: {
        etf: etfCumReturns,
        spy: spyCumReturns,
        qqq: qqqCumReturns,
        excess: excessReturns,
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

  // 가격 배열에서 보유 기간(년) 계산
  _calcYears(prices) {
    if (prices.length < 2) return 0;
    const start = new Date(prices[0].date);
    const end = new Date(prices.at(-1).date);
    return (end - start) / (365.25 * 24 * 60 * 60 * 1000);
  }
}
