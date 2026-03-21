window.__view_timing = {
  data() {
    return {
      startYear: 2000, endYear: 2024,
      maxYear: new Date().getFullYear() - 1,
      missingDays: 0, result: null, isLoading: false, error: null,
    };
  },
  mounted() { this.simulate(); },
  methods: {
    async simulate() {
      try {
        this.isLoading = true; this.error = null;
        this.result = await this.$api.get(
          `/api/timing?startYear=${this.startYear}&endYear=${this.endYear}&missing=${this.missingDays}`
        );
      } catch (e) {
        this.error = e.message || '시뮬레이션 중 오류가 발생했습니다.';
      } finally {
        this.isLoading = false;
      }
    },
  },
};
