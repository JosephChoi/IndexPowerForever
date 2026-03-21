import { PriceService } from './PriceService.js';

// 타이밍 실패 시뮬레이터 서비스
// "상위 N일 상승일을 놓쳤다면 수익률이 어떻게 달라지나?"
export class TimingService {
  constructor(env) {
    this.env = env;
    this.priceService = new PriceService(env);
  }

  // 타이밍 시뮬레이션
  // startYear, endYear: 연도 (숫자)
  // missingDays: 놓친 상승일 수 (0, 10, 20, 30, 50)
  async simulate(startYear, endYear, missingDays = 0) {
    // SPY 전체 데이터 조회
    const allPrices = await this.priceService.get('SPY', 'max');

    // 기간 필터링
    const fromDate = `${startYear}-01-01`;
    const toDate = `${endYear}-12-31`;
    const prices = allPrices.filter(p => p.date >= fromDate && p.date <= toDate);

    if (prices.length < 2) {
      const err = new Error('해당 기간의 데이터가 부족합니다.');
      err.name = 'ValidationError';
      throw err;
    }

    // 일별 수익률 계산
    const dailyReturns = [];
    for (let i = 1; i < prices.length; i++) {
      dailyReturns.push({
        date: prices[i].date,
        return: prices[i].close / prices[i - 1].close - 1,
      });
    }

    // 기준 수익률 (전체 투자)
    const baseReturn = this._calcFinalReturn(dailyReturns, []);

    // 각 시나리오별 계산
    const SCENARIOS = [0, 10, 20, 30, 50];
    const scenarios = SCENARIOS.map(missing => {
      // 상위 N일 상승일 날짜 추출
      const topDays = [...dailyReturns]
        .filter(d => d.return > 0)
        .sort((a, b) => b.return - a.return)
        .slice(0, missing)
        .map(d => d.date);

      const finalReturn = this._calcFinalReturn(dailyReturns, topDays);
      const years = (prices.length - 1) / 252;
      const cagr = Math.pow(1 + finalReturn / 100, 1 / years) - 1;

      return {
        missingDays: missing,
        finalReturn: parseFloat(finalReturn.toFixed(2)),
        cagr: parseFloat((cagr * 100).toFixed(2)),
      };
    });

    return {
      ticker: 'SPY',
      startYear,
      endYear,
      tradingDays: dailyReturns.length,
      scenarios,
    };
  }

  // 특정 날짜를 제외한 최종 수익률 계산 (%)
  _calcFinalReturn(dailyReturns, excludeDates) {
    const excludeSet = new Set(excludeDates);
    let cumulative = 1;
    for (const d of dailyReturns) {
      if (!excludeSet.has(d.date)) {
        cumulative *= (1 + d.return);
      }
    }
    return (cumulative - 1) * 100;
  }
}
