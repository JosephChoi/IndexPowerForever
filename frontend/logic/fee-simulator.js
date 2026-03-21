// 비용 시뮬레이터 — 프론트엔드 계산 전용 (서버 호출 없음)
// 공식: FV = PV × (1 + (r - fee) / 100)^years
window.__view_fee_simulator = {
  data() {
    return {
      initialAmount: 10000,
      annualReturn: 7,
      years: 30,
      scenarios: [
        { label: '저비용 ETF', fee: 0.03 },
        { label: '일반 ETF', fee: 0.5 },
        { label: '액티브 펀드', fee: 1.5 },
      ],
      results: [],
      chart: null,
    };
  },

  mounted() {
    this.calculate();
  },

  beforeUnmount() {
    if (this.chart) this.chart.destroy();
  },

  methods: {
    calculate() {
      const base = this.scenarios[0];
      this.results = this.scenarios.map(s => {
        const netRate = (this.annualReturn - s.fee) / 100;
        const finalAmount = Math.round(this.initialAmount * Math.pow(1 + netRate, this.years));
        const profit = finalAmount - this.initialAmount;
        const baseFinal = Math.round(this.initialAmount * Math.pow(1 + (this.annualReturn - base.fee) / 100, this.years));
        return { ...s, finalAmount, profit, loss: Math.max(0, baseFinal - finalAmount) };
      });
      this.$nextTick(() => this.renderChart());
    },

    renderChart() {
      const ctx = document.getElementById('feeChart');
      if (!ctx) return;
      if (this.chart) this.chart.destroy();

      const yearLabels = Array.from({ length: this.years + 1 }, (_, i) => i);
      const colors = ['#0d6efd', '#fd7e14', '#dc3545'];

      this.chart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: yearLabels,
          datasets: this.scenarios.map((s, i) => ({
            label: `${s.label} (${s.fee}%)`,
            data: yearLabels.map(y =>
              Math.round(this.initialAmount * Math.pow(1 + (this.annualReturn - s.fee) / 100, y))
            ),
            borderColor: colors[i],
            borderWidth: 2,
            fill: false,
            pointRadius: 0,
          })),
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'top' } },
          scales: {
            x: { title: { display: true, text: '투자 기간 (년)' } },
            y: { ticks: { callback: v => v.toLocaleString() + '만' } },
          },
        },
      });
    },
  },
};
