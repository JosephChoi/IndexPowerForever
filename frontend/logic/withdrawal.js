// 인출전략 시뮬레이터 — 은퇴 후 자산 인출 시뮬레이션
// 백엔드(/api/withdrawal)가 실제 지수 데이터로 계산, 프론트는 입력/표시 담당
window.__view_withdrawal = {
  data() {
    const thisYear = new Date().getFullYear();
    return {
      ticker: 'SPY',
      initial: 40000,          // 4억 (만원 단위)
      frequency: 'monthly',
      withdrawal: 150,         // 월 150만 = 연 1,800만 (4억 대비 4.5%)
      inflation: 0,
      startYear: 2002,
      reserve: true,
      reserveYears: 3,
      reserveFloorYears: 1,
      reserveRate: 3,
      maxStartYear: thisYear - 1,
      // 자주 쓰는 자산 규모 (만원) — 3억 / 5억 / 10억 / 20억
      initialChips: [30000, 50000, 100000, 200000],
      result: null,
      isLoading: false,
      error: null,
      showGuide: false,
    };
  },
  computed: {
    tickerLabel() { return this.ticker === 'SPY' ? 'S&P 500 (SPY)' : 'NASDAQ 100 (QQQ)'; },
    summary() { return this.result ? this.result.summary : null; },
    // QQQ는 1999-03 상장 → 시작 연도 하한이 다르다
    minYear() { return this.ticker === 'QQQ' ? 1999 : 1993; },
    annualWithdrawal() {
      return this.frequency === 'monthly' ? this.withdrawal * 12 : this.withdrawal;
    },
    // 하한선은 리저브 크기보다 항상 작아야 한다 (백엔드 검증 조건)
    floorMax() { return Math.max(0.5, this.reserveYears - 0.5); },
    reserveTargetAmount() { return this.annualWithdrawal * this.reserveYears; },
    reserveFloorAmount() { return this.annualWithdrawal * this.reserveFloorYears; },

    // 리저브 전략이 실제로 득이었는지 실이었는지 결과에 따라 문구를 바꾼다.
    // 강세장에서는 현금 보유가 손해로 나오는 게 정상이며, 그 사실을 숨기지 않는다.
    reserveVerdict() {
      const s = this.summary;
      if (!s) return { title: '', note: '', icon: '' };

      const survived = !s.depletedAt;
      const baseSurvived = !s.baselineDepletedLabel;

      // 자산 고갈 여부가 갈렸다면 그게 가장 중요한 차이
      if (survived && !baseSurvived) {
        return {
          title: '리저브가 고갈을 막았습니다',
          icon: 'bi-shield-fill-check',
          note: '리저브 없이는 자산이 바닥났지만, 현금 버퍼로 하락장을 버텨 살아남았습니다.',
        };
      }
      if (!survived && baseSurvived) {
        return {
          title: '이 조건에선 리저브가 불리했습니다',
          icon: 'bi-exclamation-triangle',
          note: '현금 비중 때문에 상승장 수익을 놓쳤습니다. 리저브 크기를 줄여보세요.',
        };
      }

      const diff = s.finalAmount - s.baselineFinalAmount;
      const months = s.survivedMonths;
      const baseMonths = this._baselineMonths();

      // 둘 다 고갈된 경우 — 얼마나 더 오래 버텼는지가 성과
      if (!survived && !baseSurvived) {
        const gap = months - baseMonths;
        if (gap > 0) {
          return {
            title: `리저브로 ${this.monthsLabel(gap)} 더 버텼습니다`,
            icon: 'bi-shield-fill-check',
            note: '하락장에서 주식을 팔지 않아 자산 수명이 늘었습니다.',
          };
        }
        return {
          title: '이 조건에선 리저브 효과가 없었습니다',
          icon: 'bi-dash-circle',
          note: '인출률이 너무 높아 어떤 전략으로도 고갈을 피하기 어렵습니다.',
        };
      }

      // 둘 다 살아남은 경우 — 최종 자산 차이로 판단
      if (diff >= 0) {
        return {
          title: `리저브로 ${this.formatAmount(diff)}원 더 남았습니다`,
          icon: 'bi-shield-fill-check',
          note: '하락장에서 현금으로 인출해 저가 매도를 피한 효과입니다.',
        };
      }
      return {
        title: `리저브 비용은 ${this.formatAmount(-diff)}원이었습니다`,
        icon: 'bi-shield-shaded',
        note: '상승장이 길어 현금 보유가 손해였습니다. 대신 하락장에서 주식을 파는 불안을 줄였습니다 — 안정성의 대가입니다.',
      };
    },
    withdrawalRate() {
      return this.initial > 0 ? (this.annualWithdrawal / this.initial) * 100 : 0;
    },
    // 안전 인출률 4% 기준으로 위험도 안내 (5%까지는 통용 범위로 본다)
    rateClass() {
      if (this.withdrawalRate <= 5) return 'withdrawal-rate-hint--safe';
      if (this.withdrawalRate <= 7) return 'withdrawal-rate-hint--warn';
      return 'withdrawal-rate-hint--danger';
    },
    rateIcon() {
      if (this.withdrawalRate <= 5) return 'bi-check-circle';
      if (this.withdrawalRate <= 7) return 'bi-exclamation-circle';
      return 'bi-exclamation-triangle';
    },
    rateLabel() {
      if (this.withdrawalRate <= 4) return '통상 안전 인출률(4%) 이내';
      if (this.withdrawalRate <= 5) return '안전 인출률 근처';
      if (this.withdrawalRate <= 7) return '다소 공격적입니다';
      return '매우 공격적 — 조기 고갈 위험';
    },
  },
  created() {
    // Chart.js 인스턴스를 Vue 반응성 밖에 보관 (Proxy 래핑 방지)
    this._chart = null;
    this._debounceTimer = null;
  },
  mounted() { this.simulate(); },
  beforeUnmount() {
    if (this._chart) { this._chart.destroy(); this._chart = null; }
    if (this._debounceTimer) clearTimeout(this._debounceTimer);
  },
  methods: {
    selectTicker(t) {
      if (this.ticker === t) return;
      this.ticker = t;
      // QQQ 상장 이전 연도가 선택돼 있으면 보정
      if (this.startYear < this.minYear) this.startYear = this.minYear;
      this.onInput();
    },

    selectFrequency(f) {
      if (this.frequency === f) return;
      // 주기 전환 시 연 인출액이 유지되도록 환산
      this.withdrawal = f === 'monthly'
        ? Math.round(this.withdrawal / 12 / 10) * 10
        : Math.round(this.withdrawal * 12 / 100) * 100;
      this.frequency = f;
      this.onInput();
    },

    _baselineMonths() {
      return this.summary?.baselineSurvivedMonths ?? 0;
    },

    // 그 해 인출 중 현금(리저브)에서 낸 비율 — 100%면 주식을 한 주도 팔지 않은 해
    srcPct(y) {
      if (!y.withdrawn || !Number.isFinite(y.fromReserve)) return 100;
      return Math.max(0, Math.min(100, (y.fromReserve / y.withdrawn) * 100));
    },

    // 리저브 잔액을 목표 대비 비율로 (게이지 폭)
    resPct(y) {
      if (!this.reserveYears) return 0;
      return Math.max(0, Math.min(100, (y.reserveYearsLeft / this.reserveYears) * 100));
    },

    // 손실 구간 매도가 있었던 해를 강조
    rowClass(y) {
      return { 'withdrawal-row--forced': y.refill === 'forced' };
    },

    // 리필 배지 설명 — 연 수익률과 매도 시점 등락이 어긋나 보일 때의 근거
    refillTip(y) {
      if (!y.refill || !y.refillDate) return '';
      const [, m] = y.refillDate.split('-');
      const when = `${y.year}년 ${parseInt(m)}월`;
      const chg = y.refillPriceChange;
      const dir = chg >= 0 ? `${chg.toFixed(1)}% 높은` : `${Math.abs(chg).toFixed(1)}% 낮은`;
      return y.refill === 'forced'
        ? `${when}에 리저브를 채웠습니다. 직전에 팔았던 가격보다 ${dir} 시점이라 손실 매도로 봅니다. (연 수익률은 1~12월 전체 기준이라 다를 수 있습니다)`
        : `${when}에 리저브를 채웠습니다. 직전에 팔았던 가격보다 ${dir} 시점이라 이익 구간 매도입니다.`;
    },

    monthsLabel(months) {
      const y = Math.floor(months / 12);
      const m = months % 12;
      if (y > 0 && m > 0) return `${y}년 ${m}개월`;
      if (y > 0) return `${y}년`;
      return `${m}개월`;
    },

    setInitial(v) {
      this.initial = v;
      this.onInput();
    },

    // 직접 입력이라 범위 밖 값이 들어올 수 있어 blur 시점에 보정한다.
    // 입력 도중(@input)에 보정하면 "40000"을 치는 중 "4"가 최솟값으로 튀어 타이핑이 막힌다.
    _clamp(v, min, max, fallback) {
      const n = Number(v);
      if (!Number.isFinite(n)) return fallback;
      return Math.min(max, Math.max(min, n));
    },

    clampInitial() {
      this.initial = Math.round(this._clamp(this.initial, 1000, 1000000, 40000));
      this.onInput();
    },

    clampWithdrawal() {
      // 연 인출액이 초기 자산의 50%를 넘으면 백엔드가 거부하므로 상한을 맞춘다
      const maxPerPeriod = this.frequency === 'monthly'
        ? Math.floor(this.initial * 0.5 / 12)
        : Math.floor(this.initial * 0.5);
      this.withdrawal = Math.round(this._clamp(this.withdrawal, 1, maxPerPeriod, 150));
      this.onInput();
    },

    clampInflation() {
      this.inflation = this._clamp(this.inflation, 0, 5, 0);
      this.onInput();
    },

    clampStartYear() {
      this.startYear = Math.round(this._clamp(this.startYear, this.minYear, this.maxStartYear, 2002));
      this.onInput();
    },

    clampReserve() {
      this.reserveYears = Math.round(this._clamp(this.reserveYears, 1, 5, 3));
      this.reserveFloorYears = this._clamp(this.reserveFloorYears, 0.5, this.floorMax, 1);
      this.reserveRate = this._clamp(this.reserveRate, 0, 6, 3);
      this.onInput();
    },

    // 입력 연속 변경 시 요청 폭주 방지
    onInput() {
      if (this._debounceTimer) clearTimeout(this._debounceTimer);
      this._debounceTimer = setTimeout(() => this.simulate(), 400);
    },

    async simulate() {
      // 입력 도중의 불완전한 값으로 API를 때리지 않는다 (에러 메시지 깜빡임 방지)
      if (!Number.isFinite(this.initial) || this.initial < 1000) return;
      if (!Number.isFinite(this.withdrawal) || this.withdrawal < 1) return;
      if (!Number.isFinite(this.startYear) || this.startYear < this.minYear || this.startYear > this.maxStartYear) return;

      // 하한선이 리저브 크기 이상이면 보정 (백엔드 검증 실패 방지)
      if (this.reserveFloorYears >= this.reserveYears) {
        this.reserveFloorYears = Math.max(0.5, this.reserveYears - 0.5);
      }
      const params = new URLSearchParams({
        ticker: this.ticker,
        initial: this.initial,
        frequency: this.frequency,
        withdrawal: this.withdrawal,
        inflation: this.inflation,
        startYear: this.startYear,
        years: 0,
        reserve: this.reserve ? 1 : 0,
        reserveYears: this.reserveYears,
        reserveFloorYears: this.reserveFloorYears,
        reserveRate: this.reserveRate,
      });

      try {
        this.isLoading = true;
        this.error = null;
        this.result = await this.$api.get(`/api/withdrawal?${params}`);
        this.$nextTick(() => this.renderChart());
      } catch (e) {
        this.error = e.message || '시뮬레이션 중 오류가 발생했습니다.';
        this.result = null;
      } finally {
        this.isLoading = false;
      }
    },

    // 만원 단위 → 억/만원 포맷
    formatAmount(val) {
      const abs = Math.abs(Math.round(val));
      const sign = val < 0 ? '-' : '';
      if (abs >= 10000) {
        const eok = Math.floor(abs / 10000);
        const man = abs % 10000;
        return man > 0
          ? `${sign}${eok}억 ${man.toLocaleString()}만`
          : `${sign}${eok}억`;
      }
      return `${sign}${abs.toLocaleString()}만`;
    },

    renderChart() {
      const canvas = this.$refs.withdrawalChart;
      if (!canvas || !this.result) return;

      const t = this.result.timeline;
      const labels = t.map(p => p.date);
      // 선택 지수 색 — SPY 녹색 / QQQ 적색 (디자인 가이드 벤치마크 컬러)
      const assetColor = this.ticker === 'SPY' ? '#16a34a' : '#dc2626';

      const datasets = [
        {
          label: '내 자산 (총액)',
          data: t.map(p => p.asset),
          borderColor: assetColor,
          backgroundColor: 'transparent',
          borderWidth: 2.5,
          pointRadius: 0,
          yAxisID: 'y',
          order: 1,
        },
        {
          label: '인출 누계',
          data: t.map(p => p.withdrawnCum),
          borderColor: '#d4af37',
          borderWidth: 2,
          borderDash: [6, 4],
          pointRadius: 0,
          yAxisID: 'y',
          order: 2,
        },
        {
          // 지수는 금액이 아니라 "몇 배 올랐나"가 의미 → 우측 배수 축으로 분리.
          // 같은 축에 두면 6배 넘게 오른 지수가 Y축을 지배해 자산·인출 곡선이 눌린다.
          label: `${this.ticker} 지수 (배수)`,
          data: t.map(p => p.index / this.initial),
          borderColor: '#a3aab8',
          borderWidth: 1.5,
          borderDash: [3, 3],
          pointRadius: 0,
          yAxisID: 'yIndex',
          order: 4,
        },
      ];

      // 리저브 잔액 — 영역으로 표시 (전략 ON일 때만)
      if (this.reserve) {
        datasets.splice(1, 0, {
          label: '리저브 (현금)',
          data: t.map(p => p.reserve),
          borderColor: '#26b4a8',
          backgroundColor: 'rgba(38, 180, 168, 0.18)',
          borderWidth: 1.5,
          pointRadius: t.map(p => (p.refill ? 4 : 0)),
          pointBackgroundColor: t.map(p => (p.refill === 'forced' ? '#dc2626' : '#26b4a8')),
          pointBorderColor: '#fff',
          pointBorderWidth: 1,
          fill: true,
          yAxisID: 'y',
          order: 3,
        });

        // 리저브 없이 뒀을 때의 자산 — 전략 효과 대조선
        if (this.result.baselineTimeline) {
          const baseMap = new Map(this.result.baselineTimeline.map(p => [p.date, p.asset]));
          datasets.push({
            label: '리저브 없이 (비교)',
            data: labels.map(d => (baseMap.has(d) ? baseMap.get(d) : null)),
            borderColor: 'rgba(90, 100, 120, 0.45)',
            borderWidth: 1.5,
            borderDash: [2, 3],
            pointRadius: 0,
            yAxisID: 'y',
            order: 5,
          });
        }
      }

      const fmt = this.formatAmount;

      if (this._chart) {
        this._chart.data.labels = labels;
        this._chart.data.datasets = datasets;
        this._chart.update();
        return;
      }

      this._chart = new Chart(canvas, {
        type: 'line',
        data: { labels, datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } },
            tooltip: {
              callbacks: {
                title: (items) => (items.length ? items[0].label.slice(0, 7) : ''),
                label: (ctx) => (ctx.dataset.yAxisID === 'yIndex'
                  ? `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(2)}배`
                  : `${ctx.dataset.label}: ${fmt(ctx.parsed.y)}원`),
              },
            },
          },
          scales: {
            x: {
              ticks: {
                maxTicksLimit: 12,
                callback(value) {
                  const label = this.getLabelForValue(value);
                  return label ? label.slice(0, 4) : '';
                },
              },
              grid: { display: false },
            },
            y: {
              beginAtZero: true,
              position: 'left',
              title: { display: true, text: '금액', font: { size: 10 }, color: '#5a6478' },
              ticks: { callback: (v) => (v >= 10000 ? `${(v / 10000).toFixed(1)}억` : `${v.toLocaleString()}만`) },
            },
            // 지수 전용 축 — 시작 시점을 1배로 본 상대 성장
            yIndex: {
              beginAtZero: true,
              position: 'right',
              title: { display: true, text: '지수 배수', font: { size: 10 }, color: '#a3aab8' },
              grid: { drawOnChartArea: false },
              ticks: { color: '#a3aab8', callback: (v) => `${v}배` },
            },
          },
        },
      });
    },
  },
};
