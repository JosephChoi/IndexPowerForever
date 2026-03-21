// ETF 상세 화면 로직 — 성과 비교 + 이김/짐 분석 + 종목 정보
window.__view_etf_detail = {
  data() {
    return {
      ticker: '',
      period: '5Y',
      benchmark: 'SPY',
      activeTab: 'comparison',
      etfInfo: null,
      compareData: null,
      isLoading: false,
      error: null,
      comparisonChart: null,
      excessChart: null,
      annualChart: null,
    };
  },

  mounted() {
    const ticker = this.getParam('ticker');
    if (!ticker) { this.navigateTo('/'); return; }
    this.ticker = ticker.toUpperCase();
    this.saveRecent(this.ticker);
    this.loadData();
  },

  beforeUnmount() {
    if (this.comparisonChart) this.comparisonChart.destroy();
    if (this.excessChart) this.excessChart.destroy();
    if (this.annualChart) this.annualChart.destroy();
  },

  watch: {
    // 탭 전환 시 차트 렌더링
    activeTab(tab) {
      if (tab === 'comparison' || tab === 'analysis') {
        this.$nextTick(() => this.renderCharts());
      }
    },
  },

  methods: {
    // 기본정보 + 비교 분석 병렬 로드
    async loadData() {
      this.isLoading = true;
      this.error = null;
      try {
        await Promise.all([this.loadInfo(), this.loadCompare()]);
        await this.$nextTick();
        this.renderCharts();
      } catch (e) {
        this.error = e.message || '데이터를 불러오는 중 오류가 발생했습니다.';
      } finally {
        this.isLoading = false;
      }
    },

    async loadInfo() {
      try {
        this.etfInfo = await this.$api.get(`/api/etf/${this.ticker}`);
      } catch { /* 정보 실패는 무시하고 비교 분석만 표시 */ }
    },

    async loadCompare() {
      this.compareData = await this.$api.get(
        `/api/etf/${this.ticker}/compare?period=${this.period}&benchmark=${this.benchmark}`
      );
    },

    onPeriodChange(p) {
      this.period = p;
      this.loadCompare().then(() => {
        this.$nextTick(() => this.renderCharts());
      });
    },

    onBenchmarkChange(b) {
      this.benchmark = b;
      this.loadCompare().then(() => {
        this.$nextTick(() => this.renderCharts());
      });
    },

    // 차트 3개 렌더링
    renderCharts() {
      if (!this.compareData) return;
      this.renderComparisonChart();
      this.renderExcessChart();
      this.renderAnnualChart();
    },

    // ① 누적 수익률 비교 라인 차트
    renderComparisonChart() {
      const ctx = document.getElementById('comparisonChart');
      if (!ctx) return;
      if (this.comparisonChart) this.comparisonChart.destroy();

      const chart = this.compareData.chart;
      const labels = chart.etf.map(d => d.date);

      this.comparisonChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: this.ticker,
              data: chart.etf.map(d => d.return),
              borderColor: '#0d6efd',
              borderWidth: 2,
              fill: false,
              pointRadius: 0,
              tension: 0.1,
            },
            {
              label: 'S&P 500',
              data: chart.spy.map(d => d.return),
              borderColor: '#198754',
              borderWidth: 1.5,
              borderDash: [5, 5],
              fill: false,
              pointRadius: 0,
              tension: 0.1,
            },
            {
              label: 'NASDAQ 100',
              data: chart.qqq.map(d => d.return),
              borderColor: '#fd7e14',
              borderWidth: 1.5,
              borderDash: [3, 3],
              fill: false,
              pointRadius: 0,
              tension: 0.1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'top' } },
          scales: {
            x: { ticks: { maxTicksLimit: 8 } },
            y: { ticks: { callback: v => v.toFixed(0) + '%' } },
          },
        },
      });
    },

    // ② 초과수익률 영역 차트
    renderExcessChart() {
      const ctx = document.getElementById('excessChart');
      if (!ctx) return;
      if (this.excessChart) this.excessChart.destroy();

      const excess = this.compareData.chart.excess;
      this.excessChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: excess.map(d => d.date),
          datasets: [{
            label: '초과수익률',
            data: excess.map(d => d.excess),
            backgroundColor: excess.map(d => d.excess >= 0 ? 'rgba(40,167,69,0.5)' : 'rgba(220,53,69,0.5)'),
            borderWidth: 0,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { display: false },
            y: { ticks: { callback: v => v.toFixed(0) + '%' } },
          },
        },
      });
    },

    // ③ 연도별 승패 막대 차트
    renderAnnualChart() {
      const ctx = document.getElementById('annualChart');
      if (!ctx) return;
      if (this.annualChart) this.annualChart.destroy();

      const yearly = this.compareData.winAnalysis.yearlyReturns;
      this.annualChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: yearly.map(d => d.year),
          datasets: [{
            label: '초과수익률',
            data: yearly.map(d => d.diff),
            backgroundColor: yearly.map(d => d.win ? '#28a745' : '#dc3545'),
            borderRadius: 3,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { ticks: { callback: v => v.toFixed(0) + '%' } },
          },
        },
      });
    },

    // 통계 지표 강조 클래스 (ETF가 SPY보다 높으면 table-success)
    statClass(metric, target) {
      if (!this.compareData) return '';
      const etfVal = this.compareData.stats.etf[metric];
      const benchVal = this.compareData.stats[this.benchmark.toLowerCase()]?.[metric];
      if (benchVal === undefined) return '';
      return etfVal > benchVal ? 'table-success fw-bold' : '';
    },

    // MDD는 낮을수록 좋음
    mddClass(target) {
      if (!this.compareData) return '';
      const etfMdd = Math.abs(this.compareData.stats.etf.mdd);
      const benchMdd = Math.abs(this.compareData.stats[this.benchmark.toLowerCase()]?.mdd || 0);
      return etfMdd < benchMdd ? 'table-success fw-bold' : '';
    },

    // AUM 포맷 (조/억 단위)
    formatAum(aum) {
      if (aum >= 1e12) return `$${(aum / 1e12).toFixed(1)}T`;
      if (aum >= 1e9) return `$${(aum / 1e9).toFixed(1)}B`;
      if (aum >= 1e6) return `$${(aum / 1e6).toFixed(1)}M`;
      return `$${aum.toLocaleString()}`;
    },

    // 최근 검색 저장
    saveRecent(ticker) {
      try {
        let list = JSON.parse(localStorage.getItem('recentTickers') || '[]');
        list = [ticker, ...list.filter(t => t !== ticker)].slice(0, 10);
        localStorage.setItem('recentTickers', JSON.stringify(list));
      } catch { /* noop */ }
    },
  },
};
