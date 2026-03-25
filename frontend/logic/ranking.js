window.__view_ranking = {
  data() {
    return { period: '3Y', benchmark: 'SPY', rankings: [], isLoading: false, error: null };
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
  },
};
