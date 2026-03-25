window.__view_ranking = {
  data() {
    return {
      period: '3Y', benchmark: 'SPY', rankings: [], isLoading: false, error: null,
      sortKey: 'excessReturn', sortDir: 'desc',
    };
  },
  computed: {
    sortedRankings() {
      if (!this.rankings.length) return [];
      const sorted = [...this.rankings].sort((a, b) => {
        const va = a[this.sortKey] ?? 0;
        const vb = b[this.sortKey] ?? 0;
        if (typeof va === 'string') return this.sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
        return this.sortDir === 'asc' ? va - vb : vb - va;
      });
      return sorted.map((r, i) => ({ ...r, displayRank: i + 1 }));
    },
  },
  mounted() { this.loadRanking(); },
  methods: {
    async loadRanking() {
      try {
        this.isLoading = true;
        this.error = null;
        const data = await this.$api.get(`/api/ranking?period=${this.period}&benchmark=${this.benchmark}`);
        this.rankings = Array.isArray(data) ? data : (data?.data || []);
      } catch (e) {
        this.error = e.message || '성과 비교를 불러오는 중 오류가 발생했습니다.';
      } finally {
        this.isLoading = false;
      }
    },
    onFilterChange(period, benchmark) {
      this.period = period;
      this.benchmark = benchmark;
      this.loadRanking();
    },
    onSort(key) {
      if (this.sortKey === key) {
        this.sortDir = this.sortDir === 'desc' ? 'asc' : 'desc';
      } else {
        this.sortKey = key;
        this.sortDir = 'desc';
      }
    },
    sortIcon(key) {
      if (this.sortKey !== key) return 'bi-chevron-expand';
      return this.sortDir === 'asc' ? 'bi-caret-up-fill' : 'bi-caret-down-fill';
    },
  },
};
