// 홈 화면 로직 — ETF 검색 + 프리셋 + 인기 ETF
window.__view_home = {
  data() {
    return {
      searchQuery: '',
      searchResults: [],
      isSearching: false,
      recentTickers: [],
      // 프리셋은 고정 데이터 — API 호출 없이 즉시 렌더링
      presets: [
        { id: 1, name: '레버리지 ETF 비교', description: 'S&P 500 레버리지 ETF vs 지수 비교', tickers: ['SSO', 'UPRO', 'SPXL'] },
        { id: 2, name: '나스닥 레버리지', description: 'NASDAQ 100 레버리지 ETF vs 지수 비교', tickers: ['QLD', 'TQQQ'] },
        { id: 3, name: '섹터 ETF 비교', description: '주요 섹터 ETF vs S&P 500 비교', tickers: ['XLK', 'XLV', 'XLF'] },
        { id: 4, name: '배당 ETF 비교', description: '고배당 ETF vs S&P 500 비교', tickers: ['VYM', 'SCHD', 'DVY'] },
        { id: 5, name: '채권혼합 ETF', description: '자산배분 ETF vs 지수 비교', tickers: ['AOM', 'AOR', 'AOA'] },
        { id: 6, name: '성장주 ETF', description: '성장주 ETF vs NASDAQ 100 비교', tickers: ['VUG', 'MGK', 'IWF'] },
      ],
      popularEtfs: [],
      isLoading: false,
      error: null,
      _debounceTimer: null,
    };
  },

  mounted() {
    this.loadRecent();
    this.loadPopular();
  },

  methods: {
    // 검색 입력 debounce (300ms)
    onSearchInput() {
      clearTimeout(this._debounceTimer);
      if (!this.searchQuery.trim()) {
        this.searchResults = [];
        return;
      }
      this._debounceTimer = setTimeout(async () => {
        await this.fetchSearch(this.searchQuery.trim());
      }, 300);
    },

    // 자동완성 API 호출
    async fetchSearch(q) {
      try {
        this.isSearching = true;
        const results = await this.$api.get(`/api/etf/search?q=${encodeURIComponent(q)}`);
        this.searchResults = Array.isArray(results) ? results : (results?.data || []);
      } catch (e) {
        this.searchResults = [];
      } finally {
        this.isSearching = false;
      }
    },

    // 엔터 키: 첫 결과로 이동 또는 입력값 직접 이동
    onEnterSearch() {
      const ticker = this.searchResults[0]?.ticker || this.searchQuery.trim().toUpperCase();
      if (ticker) this.onSelectResult(ticker);
    },

    // ETF 선택 → 상세 페이지 이동 + 최근 검색 저장
    onSelectResult(ticker) {
      this.searchResults = [];
      this.searchQuery = '';
      this.saveRecent(ticker);
      this.navigateTo(`/etf/${ticker}`);
    },

    // 프리셋 클릭 → 첫 번째 티커 상세 이동
    onPresetClick(preset) {
      if (preset.tickers?.length > 0) {
        this.navigateTo(`/etf/${preset.tickers[0]}`);
      }
    },

    // 인기 검색 ETF 로드
    async loadPopular() {
      try {
        const data = await this.$api.get('/api/presets/popular');
        this.popularEtfs = Array.isArray(data) ? data : (data?.data || []);
      } catch {
        // 인기 ETF 오류는 무시
      }
    },

    // 최근 검색 localStorage 로드
    loadRecent() {
      try {
        this.recentTickers = JSON.parse(localStorage.getItem('recentTickers') || '[]');
      } catch {
        this.recentTickers = [];
      }
    },

    // 최근 검색 저장 (최대 10개)
    saveRecent(ticker) {
      try {
        let list = JSON.parse(localStorage.getItem('recentTickers') || '[]');
        list = [ticker, ...list.filter(t => t !== ticker)].slice(0, 10);
        localStorage.setItem('recentTickers', JSON.stringify(list));
        this.recentTickers = list;
      } catch { /* noop */ }
    },
  },
};
