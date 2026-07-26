// 핵심 계산 로직 서비스 — 모든 메서드는 정적(static)
// 무위험 수익률: 3.9% 고정 (미국 3개월 만기 국채 T-Bill 기준, 2026-07 시점)
// 샤프 비율의 표준 정의가 단기 무위험자산을 쓰므로 10년물(4.7%)이 아닌 3개월물을 적용한다.
// 시장 금리가 크게 변하면 이 값을 갱신할 것.
const RISK_FREE_RATE = 0.039;
const TRADING_DAYS_PER_YEAR = 252;

export class CalculationService {
  // 누적 수익률 배열 계산 (시작점 대비 %)
  // 입력: [{date, close}, ...], 출력: [{date, return}, ...]
  static calcCumulativeReturns(prices) {
    if (!prices.length) return [];
    const startPrice = prices[0].close;
    return prices.map(p => ({
      date: p.date,
      return: ((p.close / startPrice) - 1) * 100,
    }));
  }

  // 초과수익률 계산 (ETF - 벤치마크, 날짜 정렬 후 공통 날짜만)
  static calcExcessReturns(etfReturns, benchReturns) {
    const benchMap = new Map(benchReturns.map(r => [r.date, r.return]));
    return etfReturns
      .filter(r => benchMap.has(r.date))
      .map(r => ({
        date: r.date,
        excess: r.return - benchMap.get(r.date),
      }));
  }

  // CAGR 계산: (최종가/시작가)^(1/년수) - 1
  static calcCAGR(startPrice, endPrice, years) {
    if (years <= 0 || startPrice <= 0) return 0;
    return Math.pow(endPrice / startPrice, 1 / years) - 1;
  }

  // MDD(최대낙폭) 계산 (%)
  static calcMDD(prices) {
    if (!prices.length) return 0;
    let peak = prices[0].close;
    let mdd = 0;
    for (const p of prices) {
      if (p.close > peak) peak = p.close;
      const drawdown = ((p.close - peak) / peak) * 100;
      if (drawdown < mdd) mdd = drawdown;
    }
    return mdd;
  }

  // 연환산 변동성: 일별 수익률 표준편차 × √252
  static calcAnnualVolatility(prices) {
    if (prices.length < 2) return 0;
    const dailyReturns = [];
    for (let i = 1; i < prices.length; i++) {
      dailyReturns.push(prices[i].close / prices[i - 1].close - 1);
    }
    const mean = dailyReturns.reduce((s, r) => s + r, 0) / dailyReturns.length;
    const variance = dailyReturns.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / dailyReturns.length;
    return Math.sqrt(variance) * Math.sqrt(TRADING_DAYS_PER_YEAR);
  }

  // Sharpe 비율 — 표준 정의: 일별 초과수익률의 산술평균 / 표준편차 × √252
  //
  // 분자에 CAGR(기하평균)을 쓰면 변동성이 클수록 산술평균보다 낮아져
  // 샤프가 구조적으로 과소평가된다. (SPY 전체기간 0.26 vs 표준 0.34,
  // 변동성이 큰 QQQ는 격차가 더 크다) 교과서·업계 표준을 따라 산술평균을 쓴다.
  //
  // 표본표준편차(n-1)를 쓰는 것도 표준 관례다.
  static calcSharpe(prices) {
    if (!prices || prices.length < 3) return 0;

    const dailyRf = RISK_FREE_RATE / TRADING_DAYS_PER_YEAR;
    const excess = [];
    for (let i = 1; i < prices.length; i++) {
      excess.push(prices[i].close / prices[i - 1].close - 1 - dailyRf);
    }

    const mean = excess.reduce((s, r) => s + r, 0) / excess.length;
    const variance = excess.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / (excess.length - 1);
    const sd = Math.sqrt(variance);
    if (sd === 0) return 0;

    return (mean / sd) * Math.sqrt(TRADING_DAYS_PER_YEAR);
  }

  // 연도별 수익률 계산
  // 출력: [{year, etfReturn, benchReturn, diff, win}, ...]
  static calcYearlyReturns(etfPrices, benchPrices) {
    const etfByYear = this._groupByYear(etfPrices);
    const benchByYear = this._groupByYear(benchPrices);

    const years = [...new Set([...Object.keys(etfByYear), ...Object.keys(benchByYear)])].sort();

    return years
      .filter(y => etfByYear[y] && benchByYear[y])
      .map(year => {
        const etfReturn = etfByYear[year];
        const benchReturn = benchByYear[year];
        return {
          year: parseInt(year),
          etfReturn: parseFloat((etfReturn * 100).toFixed(2)),
          benchReturn: parseFloat((benchReturn * 100).toFixed(2)),
          diff: parseFloat(((etfReturn - benchReturn) * 100).toFixed(2)),
          win: etfReturn > benchReturn,
        };
      });
  }

  // 롤링 N년 승률 계산
  // 출력: { winRate, winCount, totalWindows }
  static calcRollingWinRate(etfPrices, benchPrices, holdingYears) {
    if (!etfPrices.length || !benchPrices.length) {
      return { winRate: 0, winCount: 0, totalWindows: 0 };
    }

    const tradingDays = holdingYears * TRADING_DAYS_PER_YEAR;
    const benchMap = new Map(benchPrices.map(p => [p.date, p.close]));

    // 공통 날짜 필터링
    const common = etfPrices.filter(p => benchMap.has(p.date));
    if (common.length <= tradingDays) {
      return { winRate: 0, winCount: 0, totalWindows: 0 };
    }

    let winCount = 0;
    const totalWindows = common.length - tradingDays;

    for (let i = 0; i < totalWindows; i++) {
      const startDate = common[i].date;
      const endDate = common[i + tradingDays].date;
      const etfReturn = common[i + tradingDays].close / common[i].close;
      const benchReturn = benchMap.get(endDate) / benchMap.get(startDate);
      if (etfReturn > benchReturn) winCount++;
    }

    return {
      winRate: parseFloat(((winCount / totalWindows) * 100).toFixed(1)),
      winCount,
      totalWindows,
    };
  }

  // 롤링 상세 결과 (각 시작일별 승/패 + 수익률)
  static calcRollingDetail(etfPrices, benchPrices, holdingYears) {
    if (!etfPrices.length || !benchPrices.length) {
      return { totalTradingDays: 0, holdingDays: 0, possibleStarts: 0, indexWins: 0, indexWinRate: 0, results: [] };
    }

    const holdingDays = holdingYears * TRADING_DAYS_PER_YEAR;
    const benchMap = new Map(benchPrices.map(p => [p.date, p.close]));
    const common = etfPrices.filter(p => benchMap.has(p.date));

    if (common.length <= holdingDays) {
      return { totalTradingDays: common.length, holdingDays, possibleStarts: 0, indexWins: 0, indexWinRate: 0, results: [] };
    }

    const possibleStarts = common.length - holdingDays;
    const results = [];
    let indexWins = 0;

    for (let i = 0; i < possibleStarts; i++) {
      const startDate = common[i].date;
      const endDate = common[i + holdingDays].date;
      const etfReturn = ((common[i + holdingDays].close / common[i].close) - 1) * 100;
      const benchReturn = ((benchMap.get(endDate) / benchMap.get(startDate)) - 1) * 100;
      const indexWin = benchReturn > etfReturn;
      if (indexWin) indexWins++;

      results.push({
        d: startDate,
        e: endDate,
        er: parseFloat(etfReturn.toFixed(1)),
        br: parseFloat(benchReturn.toFixed(1)),
        w: indexWin ? 1 : 0,
      });
    }

    return {
      totalTradingDays: common.length,
      holdingDays,
      possibleStarts,
      indexWins,
      indexWinRate: parseFloat(((indexWins / possibleStarts) * 100).toFixed(1)),
      results,
    };
  }

  // 연도별 종가 그룹화 헬퍼 (연간 수익률: 연말 대비)
  static _groupByYear(prices) {
    const byYear = {};
    for (const p of prices) {
      const year = p.date.slice(0, 4);
      byYear[year] = p; // 마지막 값이 연말
    }
    const result = {};
    const years = Object.keys(byYear).sort();
    for (let i = 1; i < years.length; i++) {
      const prevClose = byYear[years[i - 1]].close;
      const currClose = byYear[years[i]].close;
      result[years[i]] = currClose / prevClose - 1;
    }
    return result;
  }
}
