// 서비스 이용 매뉴얼 — 『이길 수 있는 투자만 하라』 부록
// 원본: manual/서비스_이용_매뉴얼.md (2026-04-06) 기준 + 이후 변경분(인출전략 시뮬레이터, 승률 탐색기 3STEP) 반영
window.__view_manual = {
  data() {
    return {
      activeId: 'intro',
      // 좌측 목차 — 스크롤 스파이 대상
      toc: [
        { id: 'intro', label: '시작하기', icon: 'bi-play-circle' },
        { id: 'home', label: '1. 홈 — ETF 검색', icon: 'bi-house' },
        { id: 'ranking', label: '2. 랭킹', icon: 'bi-bar-chart-line' },
        { id: 'detail', label: '3. ETF 상세 분석', icon: 'bi-graph-up' },
        { id: 'fee', label: '4. 비용 시뮬레이터', icon: 'bi-percent' },
        { id: 'timing', label: '5. 타이밍 시뮬레이터', icon: 'bi-clock-history' },
        { id: 'retirement', label: '6. 퇴직연금 시뮬레이터', icon: 'bi-piggy-bank' },
        { id: 'withdrawal', label: '7. 인출전략 시뮬레이터', icon: 'bi-cash-coin' },
        { id: 'insights', label: '8. 인사이트', icon: 'bi-lightbulb' },
        { id: 'menu', label: '9. 메뉴 구조 요약', icon: 'bi-list-ul' },
        { id: 'guide', label: '이용 안내', icon: 'bi-info-circle' },
      ],
      // 랭킹 지표 설명
      rankingMetrics: [
        { name: '총수익률', desc: '선택 기간 동안의 전체 수익률' },
        { name: '초과수익률', desc: '벤치마크(S&P 500 등) 대비 얼마나 더/덜 벌었는지' },
        { name: 'CAGR', desc: '연평균 복합 성장률 (연환산 수익률)' },
        { name: 'MDD', desc: '최대낙폭 — 고점 대비 최대 하락 폭' },
      ],
      // ETF 상세 4개 탭
      detailTabs: [
        {
          name: '성과 비교',
          icon: 'bi-graph-up',
          desc: '선택한 ETF의 성과를 벤치마크와 직접 비교합니다. 총수익률 · CAGR · MDD · 샤프 비율 4개 KPI 카드가 표시되고, 각 카드 하단에 S&P 500 / NASDAQ 100의 동일 지표가 함께 나와 바로 비교할 수 있습니다. 누적 수익률 차트는 마우스로 드래그하면 특정 구간의 수익률을 확인할 수 있습니다.',
        },
        {
          name: '승률 탐색기',
          icon: 'bi-search',
          desc: '"내가 아무 때나 투자를 시작해도 지수를 이길 수 있었을까?"에 대한 답을 3단계로 보여줍니다. 보유 기간(1년 / 3년 / 5년)을 고르면 STEP 1에서 전체 거래일 수를, STEP 2에서 보유 기간을 채울 수 있는 시작일 수를, STEP 3에서 각 시작일의 승부 결과를 점으로 표시합니다. 녹색은 인덱스 승, 적색은 인덱스 패입니다.',
        },
        {
          name: '인덱스 승률',
          icon: 'bi-trophy',
          desc: '1년 / 3년 / 5년 단위로 굴려가며 측정한 롤링 승률과, 매년 해당 ETF가 벤치마크를 이겼는지 졌는지를 연도별 테이블로 확인합니다.',
        },
        {
          name: '종목 정보',
          icon: 'bi-info-circle',
          desc: '운용보수(%), 상장일, 운용자산 규모와 ETF 설명(한국어 번역 버튼 제공), 상위 10개 보유 종목과 비중을 확인할 수 있습니다.',
        },
      ],
      // 비용 시뮬레이터 시나리오
      feeScenarios: [
        { name: '저비용 ETF', fee: '0.03%', desc: 'S&P 500 인덱스 펀드 수준' },
        { name: '일반 ETF', fee: '0.5%', desc: '일반적인 ETF 수준' },
        { name: '액티브 펀드', fee: '1.5%', desc: '전문가가 운용하는 액티브 펀드 수준' },
      ],
      // 퇴직연금 시뮬레이터 전략
      retirementStrategies: [
        { name: '원리금보장', rate: '연 2.5%', desc: '은행 예금, 보험사 원리금보장 상품' },
        { name: 'S&P 500', rate: '연 10%', desc: 'S&P 500 인덱스 펀드 투자' },
        { name: 'NASDAQ 100', rate: '연 13%', desc: 'NASDAQ 100 인덱스 펀드 투자' },
      ],
      // 메뉴 구조 요약
      menuMap: [
        { menu: '홈', fn: 'ETF 검색 + 인기 프리셋', part: '—', link: '/' },
        { menu: '랭킹', fn: '상위 30개 ETF 벤치마크 대비 성과 비교', part: 'PART 1', link: '/ranking' },
        { menu: 'ETF 상세', fn: '4탭 심층 분석 (성과 / 승률 / 인덱스승률 / 종목정보)', part: 'PART 1', link: '/etf/SPY' },
        { menu: '비용 시뮬레이터', fn: '운용보수 차이의 장기 영향', part: 'PART 2', link: '/fee-simulator' },
        { menu: '타이밍 시뮬레이터', fn: '상위 거래일 누락의 영향', part: 'PART 3', link: '/timing' },
        { menu: '퇴직연금 시뮬레이터', fn: '원리금보장 vs 인덱스 펀드 비교', part: 'PART 4', link: '/retirement' },
        { menu: '인출전략 시뮬레이터', fn: '은퇴 후 인출하며 자산이 얼마나 버티는지', part: 'PART 4', link: '/withdrawal' },
        { menu: '인사이트', fn: '책의 핵심 메시지 + 데이터 연결', part: '전체', link: '/insights' },
        { menu: '책 소개', fn: '도서 정보 및 구매 링크', part: '—', link: '/book' },
      ],
    };
  },
  mounted() {
    // 목차 스크롤 스파이
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) this.activeId = e.target.id;
        });
      },
      { rootMargin: '-20% 0px -70% 0px' }
    );
    this.$nextTick(() => {
      this.toc.forEach((t) => {
        const el = document.getElementById(t.id);
        if (el) this.observer.observe(el);
      });
    });
  },
  beforeUnmount() {
    if (this.observer) this.observer.disconnect();
  },
  methods: {
    // 목차 클릭 — 헤더 높이만큼 보정해 스크롤
    scrollTo(id) {
      const el = document.getElementById(id);
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: 'smooth' });
    },
  },
};
