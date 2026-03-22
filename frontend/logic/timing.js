window.__view_timing = {
  data() {
    return {
      startYear: 2000,
      endYear: new Date().getFullYear() - 1,
      maxYear: new Date().getFullYear() - 1,
      result: null,
      isLoading: false,
      error: null,
    };
  },
  mounted() { this.simulate(); },
  methods: {
    async simulate() {
      // 시작연도가 종료연도 이상이면 자동 보정
      if (this.startYear >= this.endYear) {
        this.startYear = this.endYear - 1;
      }
      try {
        this.isLoading = true;
        this.error = null;
        this.result = await this.$api.get(
          `/api/timing?startYear=${this.startYear}&endYear=${this.endYear}&missing=0`
        );
      } catch (e) {
        this.error = e.message || '시뮬레이션 중 오류가 발생했습니다.';
      } finally {
        this.isLoading = false;
      }
    },
  },
};
