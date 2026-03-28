// ETF 상세 화면 로직 — 성과 비교 + 인덱스 승률 + 종목 정보
window.__view_etf_detail = {
  data() {
    return {
      ticker: '',
      period: 'max',
      benchmark: 'SPY',
      activeTab: 'comparison',
      etfInfo: null,
      compareData: null,
      isLoading: false,
      error: null,
      comparisonChart: null,
      excessChart: null,
      annualChart: null,
      descExpanded: false,
      showTranslated: false,
      translatedDesc: null,
      isTranslating: false,
      explorerData: null,
      explorerLoading: false,
      explorerHolding: 1,
      explorerStep: 1,
      selectedDot: null,
      // 드래그 구간 선택
      dragSelection: null,
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

  computed: {
    // 벤치마크 표시명
    benchmarkName() {
      return this.benchmark === 'SPY' ? 'S&P 500' : 'NASDAQ 100';
    },
    // 탐색기 전체 도트 (Step 1-2용)
    explorerDots() {
      if (!this.explorerData) return [];
      return new Array(this.explorerData.totalTradingDays);
    },
    // 탐색기 결과 도트 (Step 3용, 압축 필드 → 읽기 쉬운 필드로 변환)
    explorerResultDots() {
      if (!this.explorerData) return [];
      return this.explorerData.results.map(r => ({
        date: r.d,
        endDate: r.e,
        etfReturn: r.er,
        benchReturn: r.br,
        indexWin: r.w === 1,
      }));
    },
    // 연도별 인덱스 승률
    indexYearlyWinRate() {
      if (!this.compareData) return 0;
      const wa = this.compareData.winAnalysis;
      return wa.totalYears ? ((wa.loseCount / wa.totalYears) * 100).toFixed(0) : 0;
    },
  },

  watch: {
    // 탭 전환 시 차트 렌더링 / 탐색기 데이터 로드
    activeTab(tab) {
      if (tab === 'comparison' || tab === 'analysis') {
        this.$nextTick(() => this.renderCharts());
      }
      if (tab === 'explorer' && !this.explorerData) {
        this.loadExplorerData();
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

    async onPeriodChange(p) {
      this.period = p;
      this.isLoading = true;
      this.error = null;
      try {
        await this.loadCompare();
        await this.$nextTick();
        this.renderCharts();
      } catch (e) {
        this.error = e.message || '데이터를 불러오는 중 오류가 발생했습니다.';
      } finally {
        this.isLoading = false;
      }
    },

    async onBenchmarkChange(b) {
      this.benchmark = b;
      this.isLoading = true;
      this.error = null;
      try {
        await this.loadCompare();
        await this.$nextTick();
        this.renderCharts();
      } catch (e) {
        this.error = e.message || '데이터를 불러오는 중 오류가 발생했습니다.';
      } finally {
        this.isLoading = false;
      }
    },

    // 차트 3개 렌더링
    renderCharts() {
      if (!this.compareData) return;
      this.renderComparisonChart();
      this.renderExcessChart();
      this.renderAnnualChart();
    },

    // 드래그 선택 해제
    clearDragSelection() {
      this.dragSelection = null;
    },

    // 드래그 구간 수익률 계산 (누적수익률 기반)
    calcRangeReturn(cumReturns, startIdx, endIdx) {
      const rA = cumReturns[startIdx];
      const rB = cumReturns[endIdx];
      return ((1 + rB / 100) / (1 + rA / 100) - 1) * 100;
    },

    // Chart.js 드래그 선택 플러그인 생성
    createDragSelectPlugin() {
      const vm = this;
      return {
        id: 'dragSelect',
        _state: { dragging: false, startX: null, endX: null },

        // 드래그 영역 그리기
        afterDraw(chart) {
          const state = chart.options.plugins.dragSelect?._state;
          if (!state || !state.dragging || state.startX === null || state.endX === null) return;

          const { ctx, chartArea } = chart;
          const left = Math.min(state.startX, state.endX);
          const right = Math.max(state.startX, state.endX);
          const clampL = Math.max(left, chartArea.left);
          const clampR = Math.min(right, chartArea.right);
          if (clampR <= clampL) return;

          ctx.save();
          ctx.fillStyle = 'rgba(13, 110, 253, 0.1)';
          ctx.fillRect(clampL, chartArea.top, clampR - clampL, chartArea.bottom - chartArea.top);
          ctx.strokeStyle = 'rgba(13, 110, 253, 0.4)';
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(clampL, chartArea.top, clampR - clampL, chartArea.bottom - chartArea.top);
          ctx.restore();
        },

        // 이벤트 핸들러
        afterInit(chart) {
          const canvas = chart.canvas;
          const state = { dragging: false, startX: null, endX: null };
          chart.options.plugins.dragSelect = { _state: state };

          const getX = (e) => {
            const rect = canvas.getBoundingClientRect();
            const touch = e.touches ? e.touches[0] : e;
            return touch.clientX - rect.left;
          };

          const getDataIndex = (chart, x) => {
            const xScale = chart.scales.x;
            if (!xScale) return -1;
            const val = xScale.getValueForPixel(x);
            return Math.round(Math.max(0, Math.min(val, chart.data.labels.length - 1)));
          };

          const updateSelection = (chart, state) => {
            if (state.startX === null || state.endX === null) return;
            let startIdx = getDataIndex(chart, state.startX);
            let endIdx = getDataIndex(chart, state.endX);
            if (startIdx === endIdx) return;
            if (startIdx > endIdx) [startIdx, endIdx] = [endIdx, startIdx];

            const chartData = vm.compareData.chart;
            const labels = chartData.etf.map(d => d.date);
            const etfReturns = chartData.etf.map(d => d.return);
            const spyReturns = chartData.spy.map(d => d.return);
            const qqqReturns = chartData.qqq.map(d => d.return);

            vm.dragSelection = {
              startDate: labels[startIdx],
              endDate: labels[endIdx],
              startIdx,
              endIdx,
              etfReturn: vm.calcRangeReturn(etfReturns, startIdx, endIdx),
              spyReturn: vm.calcRangeReturn(spyReturns, startIdx, endIdx),
              qqqReturn: vm.calcRangeReturn(qqqReturns, startIdx, endIdx),
            };
          };

          const onStart = (e) => {
            if (e.type === 'touchstart' && e.touches.length > 1) return;
            const x = getX(e);
            const { chartArea } = chart;
            if (x < chartArea.left || x > chartArea.right) return;
            state.dragging = true;
            state.startX = x;
            state.endX = x;
            if (e.type === 'touchstart') e.preventDefault();
          };

          const onMove = (e) => {
            if (!state.dragging) return;
            state.endX = getX(e);
            chart.draw();
            updateSelection(chart, state);
            if (e.type === 'touchmove') e.preventDefault();
          };

          const onEnd = () => {
            if (!state.dragging) return;
            state.dragging = false;
            chart.draw();
          };

          canvas.addEventListener('mousedown', onStart);
          canvas.addEventListener('mousemove', onMove);
          canvas.addEventListener('mouseup', onEnd);
          canvas.addEventListener('mouseleave', onEnd);
          canvas.addEventListener('touchstart', onStart, { passive: false });
          canvas.addEventListener('touchmove', onMove, { passive: false });
          canvas.addEventListener('touchend', onEnd);

          // 정리용 참조 저장
          chart._dragCleanup = () => {
            canvas.removeEventListener('mousedown', onStart);
            canvas.removeEventListener('mousemove', onMove);
            canvas.removeEventListener('mouseup', onEnd);
            canvas.removeEventListener('mouseleave', onEnd);
            canvas.removeEventListener('touchstart', onStart);
            canvas.removeEventListener('touchmove', onMove);
            canvas.removeEventListener('touchend', onEnd);
          };
        },

        beforeDestroy(chart) {
          if (chart._dragCleanup) chart._dragCleanup();
        },
      };
    },

    // ① 누적 수익률 비교 라인 차트
    renderComparisonChart() {
      const ctx = this.$refs.comparisonChart;
      if (!ctx) return;
      if (this.comparisonChart) {
        if (this.comparisonChart._dragCleanup) this.comparisonChart._dragCleanup();
        this.comparisonChart.destroy();
      }
      this.dragSelection = null;

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
              borderWidth: 1.2,
              fill: false,
              pointRadius: 0,
              tension: 0.1,
            },
            {
              label: 'NASDAQ 100',
              data: chart.qqq.map(d => d.return),
              borderColor: '#fd7e14',
              borderWidth: 1.2,
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
        plugins: [this.createDragSelectPlugin()],
      });
    },

    // ② 초과수익률 영역 차트
    renderExcessChart() {
      const ctx = this.$refs.excessChart;
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
      const ctx = this.$refs.annualChart;
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

    // 인덱스 승률 계산 (ETF 승률을 뒤집음)
    indexWinRate(data) {
      if (!data.totalWindows) return 0;
      return (100 - data.winRate).toFixed(1);
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

    // 탐색기 데이터 로드
    async loadExplorerData() {
      this.explorerLoading = true;
      this.explorerStep = 1;
      this.selectedDot = null;
      try {
        this.explorerData = await this.$api.get(
          `/api/etf/${this.ticker}/rolling-detail?period=${this.period}&benchmark=${this.benchmark}&holding=${this.explorerHolding}`
        );
      } catch (e) {
        this.error = e.message || '롤링 데이터를 불러오는 중 오류가 발생했습니다.';
      } finally {
        this.explorerLoading = false;
      }
    },

    // 보유 기간 변경
    onExplorerHoldingChange(h) {
      this.explorerHolding = h;
      this.loadExplorerData();
    },

    // Step 3 애니메이션 시작
    startExplorerAnimation() {
      this.explorerStep = 2;
      setTimeout(() => { this.explorerStep = 3; }, 400);
    },

    // 도트 클릭
    onDotClick(dot) {
      this.selectedDot = dot;
    },

    // 설명 번역 토글
    async toggleTranslate() {
      if (this.showTranslated && this.translatedDesc) {
        this.showTranslated = false;
        return;
      }
      if (this.translatedDesc) {
        this.showTranslated = true;
        return;
      }
      this.isTranslating = true;
      try {
        const res = await this.$api.post('/api/translate', { text: this.etfInfo.description });
        this.translatedDesc = res.translated;
        this.showTranslated = true;
        this.descExpanded = true;
      } catch {
        this.translatedDesc = '번역에 실패했습니다. 잠시 후 다시 시도해주세요.';
        this.showTranslated = true;
      } finally {
        this.isTranslating = false;
      }
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
