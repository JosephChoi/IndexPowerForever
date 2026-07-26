import { PriceService } from './PriceService.js';

// 은퇴 후 인출전략 시뮬레이터 서비스
// "N억을 지수에 넣고 매달 M만원씩 인출하면 자산은 얼마나 버티는가?"
//
// 핵심 개념 — 수익률 배열 위험(Sequence of Returns Risk)
//   평균 수익률이 같아도 초반에 폭락이 오면 하락장에서 자산을 팔아 인출하게 되어
//   회복기에 태울 원금이 남지 않아 자산이 조기 고갈된다.
//   리저브(현금 버퍼) 전략은 이 문제를 방어하기 위한 장치다.

const RESERVE_INTEREST_BASE = 100; // 이자율 % → 소수 변환 기준
const TRADING_DAYS_PER_YEAR = 252;

export class WithdrawalService {
  constructor(env) {
    this.env = env;
    this.priceService = new PriceService(env);
  }

  // 인출 시뮬레이션 실행
  // params: { ticker, initial, frequency, withdrawal, inflation, startYear, years,
  //           reserve, reserveYears, reserveFloorYears, reserveRate }
  async simulate(params) {
    const allPrices = await this.priceService.get(params.ticker, 'max');

    // 시작 연도 이후 가격만 필터링
    const fromDate = `${params.startYear}-01-01`;
    const toDate = params.years > 0
      ? `${params.startYear + params.years}-01-01`
      : '9999-12-31';
    const prices = allPrices.filter(p => p.date >= fromDate && p.date < toDate);

    if (prices.length < 2) {
      const err = new Error(`${params.ticker}의 ${params.startYear}년 이후 데이터가 부족합니다.`);
      err.name = 'ValidationError';
      throw err;
    }

    // 리저브 ON 시나리오 (사용자 설정 그대로)
    const main = this._runScenario(prices, params);

    // 리저브 OFF 비교 시나리오 — 전략 효과를 차트에서 대조하기 위함
    const baseline = params.reserve
      ? this._runScenario(prices, { ...params, reserve: false })
      : null;

    return {
      ticker: params.ticker,
      startYear: params.startYear,
      params: {
        initial: params.initial,
        frequency: params.frequency,
        withdrawal: params.withdrawal,
        inflation: params.inflation,
        reserve: params.reserve,
        reserveYears: params.reserveYears,
        reserveFloorYears: params.reserveFloorYears,
        reserveRate: params.reserveRate,
      },
      summary: {
        ...main.summary,
        baselineFinalAmount: baseline ? baseline.summary.finalAmount : null,
        baselineDepletedLabel: baseline ? baseline.summary.depletedLabel : null,
        baselineSurvivedMonths: baseline ? baseline.summary.survivedMonths : null,
      },
      timeline: main.timeline,
      yearly: main.yearly,
      baselineTimeline: baseline ? baseline.timeline : null,
    };
  }

  // 단일 시나리오 실행 — 인출 시점을 순회하며 자산 추이를 계산
  _runScenario(prices, params) {
    const isMonthly = params.frequency === 'monthly';
    // 연 인출액 기준으로 리저브 크기를 산정 (월 인출이면 12배)
    const annualWithdrawal = isMonthly ? params.withdrawal * 12 : params.withdrawal;

    const useReserve = !!params.reserve;
    const reserveTarget = useReserve ? annualWithdrawal * params.reserveYears : 0;
    const reserveFloor = useReserve ? annualWithdrawal * params.reserveFloorYears : 0;

    let reserve = reserveTarget;
    let invested = params.initial - reserveTarget;
    // 기회/강제 판정 기준 — 직전에 리필했을 때의 "지수 가격".
    // 자산 절대액으로 비교하면 인출·리필로 원금이 줄어든 만큼 기준이 흔들려
    // 상승장인데도 손실 구간(forced)으로 오판한다. 파는 시점의 단가로 비교해야 정확하다.
    let lastRefillPrice = null;

    // 인출 시점 인덱싱 — 월말/연말에 해당하는 거래일
    const points = this._buildWithdrawalPoints(prices, isMonthly);
    if (points.length === 0) {
      const err = new Error('인출 시점을 계산할 수 없습니다.');
      err.name = 'ValidationError';
      throw err;
    }

    // 리저브 이자 — 인출 주기당 복리
    const periodsPerYear = isMonthly ? 12 : 1;
    const reserveRatePerPeriod = useReserve
      ? params.reserveRate / RESERVE_INTEREST_BASE / periodsPerYear
      : 0;

    const startPrice = points[0].close;
    const startIndex = params.initial; // 지수 정규화 기준 (시작=초기자산과 같은 스케일)

    const timeline = [];
    const yearlyMap = new Map();

    let withdrawnCum = 0;
    let currentWithdrawal = params.withdrawal;
    let refillCount = 0;
    let forcedRefillCount = 0;
    let depletedAt = null;
    let survivedPeriods = 0;
    let peakAsset = params.initial;
    let mdd = 0;

    // 시작 시점 기록
    timeline.push({
      date: points[0].date,
      index: startIndex,
      asset: Math.round(invested + reserve),
      invested: Math.round(invested),
      reserve: Math.round(reserve),
      withdrawnCum: 0,
      refill: null,
    });

    for (let i = 1; i < points.length; i++) {
      const point = points[i];
      const prev = points[i - 1];

      // 1) 구간 수익률 반영 — 투자자산은 지수를, 리저브는 이자율을 따름
      invested *= point.close / prev.close;
      reserve *= (1 + reserveRatePerPeriod);

      // 2) 물가연동 — 매년 인출액 증액 (해가 바뀔 때만)
      if (params.inflation > 0 && this._isNewYear(prev.date, point.date)) {
        currentWithdrawal *= (1 + params.inflation / 100);
      }

      // 3) 인출 — 리저브 우선, 부족분만 지수 매도 (핵심 방어)
      //    fromReserve / fromInvested 를 기록해 "이번 인출을 어디서 냈는지" 보여준다.
      //    리저브 전략의 요점이 바로 이 출처 분해에 있다.
      const amount = currentWithdrawal;
      const reserveBefore = reserve;
      const fromReserve = Math.min(reserve, amount);
      const fromInvested = amount - fromReserve;

      // 총자산이 인출액에 못 미치면 남은 전액만 인출하고 고갈 처리
      const totalBefore = invested + reserve;
      if (totalBefore <= amount) {
        withdrawnCum += totalBefore;
        reserve = 0;
        invested = 0;
        depletedAt = point.date;
        survivedPeriods = i;
        timeline.push({
          date: point.date,
          index: Math.round(startIndex * (point.close / startPrice)),
          asset: 0,
          invested: 0,
          reserve: 0,
          withdrawnCum: Math.round(withdrawnCum),
          refill: null,
        });
        this._recordYear(yearlyMap, point, {
          invested: 0, reserve: 0, withdrawn: totalBefore, withdrawnCum,
          fromReserve: Math.min(reserveBefore, totalBefore),
          fromInvested: Math.max(0, totalBefore - reserveBefore),
          refill: null, refillAmount: 0, annualWithdrawal,
        });
        break;
      }

      reserve -= fromReserve;
      invested -= fromInvested;
      withdrawnCum += amount;

      // 4) 리필 판정 — 이익 구간이면 기회 리필, 손실 구간인데 리저브가 하한선 밑이면 강제 리필.
      //    기회를 먼저 보는 이유: 자산이 올라 있으면 하한선 미만이어도 손해 보고 파는 게 아니다.
      //    'forced'는 "손실 구간에서 어쩔 수 없이 팔았다"는 위험 신호로만 쓰인다.
      let refill = null;
      let refillAmount = 0;
      let refillDate = null;
      let refillPriceChange = 0;
      if (useReserve) {
        const needed = reserveTarget - reserve;
        // 리필은 리저브가 하한선 밑으로 내려갔을 때만 검토한다.
        // 매 시점 가득 채우면 상승장에서 지수 자산을 계속 팔아 현금(저이율)으로 옮기게 되어
        // 리저브 전략이 오히려 수익을 갉아먹는다. 리저브는 "비면 채우는" 버퍼다.
        if (needed > 0 && reserve < reserveFloor) {
          // ② 기회 리필 — 직전 리필 때보다 지수가 비싸면 이익 구간에서 파는 것
          //    (첫 리필은 비교 대상이 없으므로 시작가와 비교)
          const basisPrice = lastRefillPrice ?? startPrice;
          refill = point.close >= basisPrice ? 'opportunistic' : 'forced';

          refillAmount = Math.min(needed, invested); // 투자자산 부족 시 부분 리필
          invested -= refillAmount;
          reserve += refillAmount;
          // 매도 시점과 직전 리필가 대비 등락 — 연 수익률과 어긋나 보일 때 근거가 된다
          refillDate = point.date;
          refillPriceChange = (point.close / basisPrice - 1) * 100;
          lastRefillPrice = point.close;
          refillCount++;
          if (refill === 'forced') forcedRefillCount++;
        }
      }

      // 5) MDD 갱신 — 인출 소진분을 제외한 "시장 손실"만 낙폭으로 잡는다.
      //    총자산 그대로 쓰면 인출로 줄어든 몫까지 낙폭에 섞여 −99% 같은 무의미한 값이 나온다.
      //    자산에 누적 인출액을 되더한 값(= 인출이 없었다면의 자산)으로 낙폭을 계산한다.
      const totalAsset = invested + reserve;
      const grossAsset = totalAsset + withdrawnCum;
      if (grossAsset > peakAsset) peakAsset = grossAsset;
      const drawdown = (grossAsset / peakAsset - 1) * 100;
      if (drawdown < mdd) mdd = drawdown;

      survivedPeriods = i;

      timeline.push({
        date: point.date,
        index: Math.round(startIndex * (point.close / startPrice)),
        asset: Math.round(totalAsset),
        invested: Math.round(invested),
        reserve: Math.round(reserve),
        withdrawnCum: Math.round(withdrawnCum),
        refill,
      });

      this._recordYear(yearlyMap, point, {
        invested, reserve, withdrawn: amount, withdrawnCum,
        fromReserve, fromInvested,
        refill, refillAmount, refillDate, refillPriceChange, annualWithdrawal,
      });
    }

    // 연도별 표 조립 — 연초 자산과 지수 수익률은 연 단위로 재계산
    const yearly = this._buildYearly(yearlyMap, points, startPrice, params.initial);

    const survivedMonths = isMonthly ? survivedPeriods : survivedPeriods * 12;
    const finalAmount = Math.round(invested + reserve);

    return {
      summary: {
        finalAmount,
        totalWithdrawn: Math.round(withdrawnCum),
        depletedAt: depletedAt ? depletedAt.slice(0, 7) : null,
        depletedLabel: depletedAt ? this._depletedLabel(survivedMonths, depletedAt) : null,
        survivedMonths,
        survivedLabel: this._survivedLabel(survivedMonths, !!depletedAt),
        mdd: parseFloat(mdd.toFixed(2)),
        cagr: this._calcCagr(params.initial, finalAmount, withdrawnCum, survivedMonths),
        refillCount,
        forcedRefillCount,
        reserveTarget: Math.round(reserveTarget),
        reserveFloor: Math.round(reserveFloor),
      },
      timeline,
      yearly,
    };
  }

  // 인출 시점 추출 — 각 월(또는 연)의 마지막 거래일
  _buildWithdrawalPoints(prices, isMonthly) {
    const points = [];
    const keyOf = (date) => (isMonthly ? date.slice(0, 7) : date.slice(0, 4));

    let currentKey = keyOf(prices[0].date);
    let last = prices[0];

    // 첫 거래일을 시작점으로 삼는다 (인출은 다음 시점부터)
    points.push(prices[0]);

    for (let i = 1; i < prices.length; i++) {
      const key = keyOf(prices[i].date);
      if (key !== currentKey) {
        points.push(last); // 직전 구간의 마지막 거래일
        currentKey = key;
      }
      last = prices[i];
    }
    // 마지막 구간의 종료일도 포함 (진행 중인 달/해)
    if (points[points.length - 1].date !== last.date) points.push(last);

    return points;
  }

  // 연도별 데이터 누적 — 해당 연도의 마지막 상태로 덮어쓴다
  _recordYear(yearlyMap, point, state) {
    const year = parseInt(point.date.slice(0, 4));
    const existing = yearlyMap.get(year);

    yearlyMap.set(year, {
      year,
      close: point.close,
      endInvested: state.invested,
      endReserve: state.reserve,
      endAsset: state.invested + state.reserve,
      withdrawn: (existing?.withdrawn ?? 0) + state.withdrawn,
      // 인출 출처 — 리저브에서 낸 금액 / 주식을 팔아 낸 금액
      fromReserve: (existing?.fromReserve ?? 0) + (state.fromReserve ?? 0),
      fromInvested: (existing?.fromInvested ?? 0) + (state.fromInvested ?? 0),
      withdrawnCum: state.withdrawnCum,
      // 연중 강제 리필이 한 번이라도 있었으면 강제로 표기 (위험 신호 우선)
      refill: existing?.refill === 'forced' ? 'forced' : (state.refill ?? existing?.refill ?? null),
      refillAmount: (existing?.refillAmount ?? 0) + state.refillAmount,
      // 표기 기준이 되는 리필의 시점/등락 — 강제 리필을 우선 노출
      refillDate: state.refill === 'forced' ? state.refillDate : (existing?.refillDate ?? state.refillDate ?? null),
      refillPriceChange: state.refill === 'forced'
        ? state.refillPriceChange
        : (existing?.refillDate ? existing.refillPriceChange : (state.refillPriceChange ?? 0)),
      annualWithdrawal: state.annualWithdrawal,
    });
  }

  // 연도별 표 조립 — 연초 자산 / 지수 수익률 / 리저브 잔여 연수 계산
  _buildYearly(yearlyMap, points, startPrice, initial) {
    const rows = [...yearlyMap.values()].sort((a, b) => a.year - b.year);

    // 연도별 지수 종가 (전년 대비 수익률 계산용)
    let prevClose = startPrice;
    let prevAsset = initial;

    return rows.map((r) => {
      const indexReturn = (r.close / prevClose - 1) * 100;
      const startAsset = prevAsset;
      prevClose = r.close;
      prevAsset = r.endAsset;

      return {
        year: r.year,
        startAsset: Math.round(startAsset),
        indexReturn: parseFloat(indexReturn.toFixed(2)),
        withdrawn: Math.round(r.withdrawn),
        fromReserve: Math.round(r.fromReserve),
        fromInvested: Math.round(r.fromInvested),
        reserve: Math.round(r.endReserve),
        reserveYearsLeft: r.annualWithdrawal > 0
          ? parseFloat((r.endReserve / r.annualWithdrawal).toFixed(1))
          : 0,
        refill: r.refill,
        refillAmount: Math.round(r.refillAmount),
        refillDate: r.refillDate,
        refillPriceChange: parseFloat((r.refillPriceChange ?? 0).toFixed(1)),
        endAsset: Math.round(r.endAsset),
        withdrawnCum: Math.round(r.withdrawnCum),
      };
    });
  }

  // 자산 고갈 라벨 — "17년 6개월 만에 고갈 (2019년 7월)"
  _depletedLabel(months, depletedAt) {
    const y = Math.floor(months / 12);
    const m = months % 12;
    const period = m > 0 ? `${y}년 ${m}개월` : `${y}년`;
    const [year, month] = depletedAt.split('-');
    return `${period} 만에 고갈 (${year}년 ${parseInt(month)}월)`;
  }

  // 유지 기간 라벨 — 고갈되지 않았으면 "24년 유지 중"
  _survivedLabel(months, depleted) {
    const y = Math.floor(months / 12);
    const m = months % 12;
    const period = m > 0 ? `${y}년 ${m}개월` : `${y}년`;
    return depleted ? period : `${period} 유지 중`;
  }

  // 인출을 감안한 실질 연평균 수익률 (IRR 근사)
  // 최종자산 + 총인출액을 종료 시점 가치로 보고 CAGR 계산
  _calcCagr(initial, finalAmount, totalWithdrawn, months) {
    if (initial <= 0 || months <= 0) return 0;
    const years = months / 12;
    const totalValue = finalAmount + totalWithdrawn;
    if (totalValue <= 0) return -100;
    const cagr = (Math.pow(totalValue / initial, 1 / years) - 1) * 100;
    return parseFloat(cagr.toFixed(2));
  }

  // 연도가 바뀌었는지 확인 (물가연동 증액 시점 판정)
  _isNewYear(prevDate, currentDate) {
    return prevDate.slice(0, 4) !== currentDate.slice(0, 4);
  }
}
