// 홈 화면 로직 — ETF 검색 + 프리셋 + 인기 ETF
window.__view_home = {
  data() {
    return {
      searchQuery: '',
      searchResults: [],
      isSearching: false,
      recentTickers: [],
      presets: [],
      popularEtfs: [],
      isLoading: false,
      error: null,
      _debounceTimer: null,
    };
  },

  mounted() {
    this.loadRecent();
    this.loadPresets();
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

    // 인기 프리셋 로드
    async loadPresets() {
      try {
        this.isLoading = true;
        const data = await this.$api.get('/api/presets');
        this.presets = Array.isArray(data) ? data : (data?.data || []);
      } catch (e) {
        this.error = '프리셋을 불러오는 중 오류가 발생했습니다.';
      } finally {
        this.isLoading = false;
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
