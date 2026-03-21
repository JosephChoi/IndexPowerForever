// 퇴직연금 시뮬레이터 — 프론트엔드 계산 전용
// FV = PV(1+r)^n + PMT×((1+r)^n - 1)/r (월복리)
window.__view_retirement = {
  data() {
    return {
      currentBalance: 5000,
      monthlyContrib: 50,
      years: 20,
      scenarios: [
        { label: '원리금보장', annualRate: 2.5 },
        { label: 'S&P 500', annualRate: 10 },
        { label: 'NASDAQ 100', annualRate: 13 },
      ],
      results: [],
      chart: null,
    };
  },
  mounted() { this.calculate(); },
  beforeUnmount() { if (this.chart) this.chart.destroy(); },
  methods: {
    calculate() {
      const totalContrib = this.currentBalance + this.monthlyContrib * 12 * this.years;
      const base = this._calcFinal(this.scenarios[0].annualRate);
      this.results = this.scenarios.map(s => {
        const finalAmount = this._calcFinal(s.annualRate);
        return { ...s, finalAmount, profit: finalAmount - totalContrib, extra: finalAmount - base };
      });
      this.$nextTick(() => this.renderChart());
    },

    _calcFinal(annualRate) {
      const r = annualRate / 100 / 12;
      const n = this.years * 12;
      const pv = this.currentBalance;
      const pmt = this.monthlyContrib;
      if (r === 0) return Math.round(pv + pmt * n);
      return Math.round(pv * Math.pow(1 + r, n) + pmt * (Math.pow(1 + r, n) - 1) / r);
    },

    renderChart() {
      const ctx = document.getElementById('retirementChart');
      if (!ctx) return;
      if (this.chart) this.chart.destroy();
      const labels = Array.from({ length: this.years + 1 }, (_, i) => i);
      const colors = ['#6c757d', '#198754', '#fd7e14'];
      this.chart = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: this.scenarios.map((s, i) => ({
            label: s.label,
            data: labels.map(y => {
              const r = s.annualRate / 100 / 12; const n = y * 12;
              if (r === 0) return Math.round(this.currentBalance + this.monthlyContrib * n);
              return Math.round(this.currentBalance * Math.pow(1 + r, n) + this.monthlyContrib * (Math.pow(1 + r, n) - 1) / r);
            }),
            borderColor: colors[i], borderWidth: 2, fill: false, pointRadius: 0,
          })),
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'top' } },
          scales: {
            x: { title: { display: true, text: '운용 기간 (년)' } },
            y: { ticks: { callback: v => v.toLocaleString() + '만' } },
          },
        },
      });
    },
  },
};
