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

  created() {
    // Chart.js 인스턴스를 Vue 반응성 시스템 밖에 저장 (Proxy 래핑 방지)
    this._comparisonChart = null;
    this._excessChart = null;
    this._annualChart = null;
  },

  mounted() {
    const ticker = this.getParam('ticker');
    if (!ticker) { this.navigateTo('/'); return; }
    this.ticker = ticker.toUpperCase();
    this.saveRecent(this.ticker);
    this.loadData();
  },

  beforeUnmount() {
    if (this._comparisonChart) this._comparisonChart.destroy();
    if (this._excessChart) this._excessChart.destroy();
    if (this._annualChart) this._annualChart.destroy();
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
      // 차트의 선택 영역 하이라이트도 제거
      if (this._comparisonChart) {
        const state = this._comparisonChart._dragState;
        if (state) {
          state.selectedStartX = null;
          state.selectedEndX = null;
        }
        this._comparisonChart.draw();
      }
    },

    // 드래그 구간 수익률 계산 (누적수익률 기반)
    calcRangeReturn(cumReturns, startIdx, endIdx) {
      const rA = cumReturns[startIdx];
      const rB = cumReturns[endIdx];
      if (rA == null || rB == null) return null;
      return ((1 + rB / 100) / (1 + rA / 100) - 1) * 100;
    },

    // Chart.js 드래그 선택 플러그인 생성
    createDragSelectPlugin() {
      const vm = this;
      return {
        id: 'dragSelect',

        // 드래그 영역 그리기 (드래그 중 + 선택 완료 후 모두)
        afterDraw(chart) {
          const state = chart._dragState;
          if (!state) return;

          // 드래그 중이면 현재 좌표로, 선택 완료 후에는 저장된 좌표로
          const drawStartX = state.dragging ? state.startX : state.selectedStartX;
          const drawEndX = state.dragging ? state.endX : state.selectedEndX;
          if (drawStartX === null || drawEndX === null) return;

          const { ctx, chartArea } = chart;
          const left = Math.min(drawStartX, drawEndX);
          const right = Math.max(drawStartX, drawEndX);
          const clampL = Math.max(left, chartArea.left);
          const clampR = Math.min(right, chartArea.right);
          if (clampR <= clampL) return;

          ctx.save();
          // 선택 영역 배경
          ctx.fillStyle = 'rgba(13, 110, 253, 0.12)';
          ctx.fillRect(clampL, chartArea.top, clampR - clampL, chartArea.bottom - chartArea.top);
          // 선택 영역 테두리
          ctx.strokeStyle = 'rgba(13, 110, 253, 0.5)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([6, 3]);
          ctx.strokeRect(clampL, chartArea.top, clampR - clampL, chartArea.bottom - chartArea.top);
          // 양쪽 수직 경계선
          ctx.setLineDash([]);
          ctx.strokeStyle = 'rgba(13, 110, 253, 0.7)';
          ctx.lineWidth = 2;
          [clampL, clampR].forEach(x => {
            ctx.beginPath();
            ctx.moveTo(x, chartArea.top);
            ctx.lineTo(x, chartArea.bottom);
            ctx.stroke();
          });
          ctx.restore();
        },

        // 이벤트 핸들러
        afterInit(chart) {
          const canvas = chart.canvas;
          // chart 인스턴스에 직접 state 저장 (options 프록시 문제 방지)
          const state = { dragging: false, startX: null, endX: null, selectedStartX: null, selectedEndX: null };
          chart._dragState = state;

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
            // 차트의 통합 라벨 사용 (모든 데이터셋의 날짜 합집합)
            const allDates = new Set([
              ...chartData.etf.map(d => d.date),
              ...chartData.spy.map(d => d.date),
              ...chartData.qqq.map(d => d.date),
            ]);
            const labels = [...allDates].sort();
            const toMap = (arr) => { const m = new Map(); for (const d of arr) m.set(d.date, d.return); return m; };
            const etfMap = toMap(chartData.etf);
            const spyMap = toMap(chartData.spy);
            const qqqMap = toMap(chartData.qqq);
            const etfReturns = labels.map(d => etfMap.get(d) ?? null);
            const spyReturns = labels.map(d => spyMap.get(d) ?? null);
            const qqqReturns = labels.map(d => qqqMap.get(d) ?? null);

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
            // 이전 선택 영역 클리어
            state.selectedStartX = null;
            state.selectedEndX = null;
            vm.dragSelection = null;
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
            // 유효한 선택이면 좌표 저장하여 영역 유지
            if (state.startX !== null && state.endX !== null) {
              const startIdx = getDataIndex(chart, state.startX);
              const endIdx = getDataIndex(chart, state.endX);
              if (startIdx !== endIdx) {
                state.selectedStartX = state.startX;
                state.selectedEndX = state.endX;
              }
            }
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

    // 비교 차트용 데이터 준비 헬퍼
    _prepareComparisonData() {
      const chart = this.compareData.chart;
      const allDates = new Set([
        ...chart.etf.map(d => d.date),
        ...chart.spy.map(d => d.date),
        ...chart.qqq.map(d => d.date),
      ]);
      const labels = [...allDates].sort();
      const toMap = (arr, key = 'return') => {
        const m = new Map();
        for (const d of arr) m.set(d.date, d[key]);
        return m;
      };
      const etfMap = toMap(chart.etf);
      const spyMap = toMap(chart.spy);
      const qqqMap = toMap(chart.qqq);
      return {
        labels,
        etfData: labels.map(d => etfMap.get(d) ?? null),
        spyData: labels.map(d => spyMap.get(d) ?? null),
        qqqData: labels.map(d => qqqMap.get(d) ?? null),
      };
    },

    // ① 누적 수익률 비교 라인 차트
    renderComparisonChart() {
      const ctx = this.$refs.comparisonChart;
      if (!ctx) return;
      this.dragSelection = null;

      const { labels, etfData, spyData, qqqData } = this._prepareComparisonData();

      // 기존 차트가 있으면 데이터만 업데이트
      if (this._comparisonChart) {
        this._comparisonChart.stop();
        this._comparisonChart.data.labels = labels;
        this._comparisonChart.data.datasets[0].label = this.ticker;
        this._comparisonChart.data.datasets[0].data = etfData;
        this._comparisonChart.data.datasets[1].data = spyData;
        this._comparisonChart.data.datasets[2].data = qqqData;
        this._comparisonChart.update();
        return;
      }

      this._comparisonChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: this.ticker,
              data: etfData,
              borderColor: '#0d6efd',
              borderWidth: 2,
              fill: false,
              pointRadius: 0,
              tension: 0.1,
              spanGaps: true,
            },
            {
              label: 'S&P 500',
              data: spyData,
              borderColor: '#198754',
              borderWidth: 1.2,
              fill: false,
              pointRadius: 0,
              tension: 0.1,
              spanGaps: true,
            },
            {
              label: 'NASDAQ 100',
              data: qqqData,
              borderColor: '#fd7e14',
              borderWidth: 1.2,
              fill: false,
              pointRadius: 0,
              tension: 0.1,
              spanGaps: true,
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

      const excess = this.compareData.chart.excess;
      const labels = excess.map(d => d.date);
      const data = excess.map(d => d.excess);
      const bgColors = excess.map(d => d.excess >= 0 ? 'rgba(40,167,69,0.5)' : 'rgba(220,53,69,0.5)');

      // 기존 차트가 있으면 데이터만 업데이트
      if (this._excessChart) {
        this._excessChart.stop();
        this._excessChart.data.labels = labels;
        this._excessChart.data.datasets[0].data = data;
        this._excessChart.data.datasets[0].backgroundColor = bgColors;
        this._excessChart.update();
        return;
      }

      this._excessChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: '초과수익률',
            data,
            backgroundColor: bgColors,
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

      const yearly = this.compareData.winAnalysis.yearlyReturns;
      const labels = yearly.map(d => d.year);
      const data = yearly.map(d => d.diff);
      const bgColors = yearly.map(d => d.win ? '#28a745' : '#dc3545');

      // 기존 차트가 있으면 데이터만 업데이트
      if (this._annualChart) {
        this._annualChart.stop();
        this._annualChart.data.labels = labels;
        this._annualChart.data.datasets[0].data = data;
        this._annualChart.data.datasets[0].backgroundColor = bgColors;
        this._annualChart.update();
        return;
      }

      this._annualChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: '초과수익률',
            data,
            backgroundColor: bgColors,
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
