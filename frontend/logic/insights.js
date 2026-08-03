// 인사이트 화면 로직 — 『이길 수 있는 투자만 하라』 최종 원고(2교) 기준
// 원칙: 수치는 원고에 실린 것만 사용하고, 반드시 source(출처)를 함께 표기한다.
window.__view_insights = {
  data() {
    return {
      activeSection: 'all',
      parts: [
        { key: 'all', label: '전체' },
        { key: 'part1', label: 'PART 1 · 데이터는 이미 결론을 내렸다' },
        { key: 'part2', label: 'PART 2 · 우리는 왜 실패할 수밖에 없는가' },
        { key: 'part3', label: 'PART 3 · 인덱스 투자라는 과학' },
        { key: 'part4', label: 'PART 4 · 퇴직연금' },
        { key: 'part5', label: 'PART 5 · 이기는 투자자의 선언' },
      ],
      cards: [
        {
          id: 1, part: 'PART 1', icon: '📊', chapter: '1장',
          title: '15년을 버틴 액티브 펀드는 10%뿐',
          message: 'SPIVA 기준 S&P 500을 초과한 액티브 펀드 비율은 5년 11.04%, 10년 14.41%, 15년 10.07%. 기간이 길어질수록 시장을 이기는 펀드는 줄어듭니다.',
          source: 'SPIVA, 2025.12.31 기준',
          link: '/ranking',
        },
        {
          id: 2, part: 'PART 1', icon: '🪙', chapter: 'PART 1 도입',
          title: '5년 연속 이긴 313명의 정체',
          message: '실력이 전혀 없는 매니저 1만 명이 동전을 던져도, 5년 연속 수익을 낸 313명은 반드시 남습니다. 우리는 그들을 스타라고 부릅니다.',
          source: '나심 탈렙 『행운에 속지 마라』',
          link: null,
        },
        {
          id: 3, part: 'PART 1', icon: '💔',
          chapter: '2장',
          title: '연 29.2% 펀드, 투자자는 연 7%',
          message: '피터 린치의 마젤란 펀드는 13년간 연평균 29.2%를 기록했습니다. 그런데 그 펀드에 투자한 사람들의 평균 수익률은 연 7%였습니다.',
          source: '2장 · 스펜서 자카브',
          link: null,
        },
        {
          id: 4, part: 'PART 1', icon: '🏆', chapter: '1장',
          title: '20년간 단 하나도 없었다',
          message: '대형 성장주(Large-Cap Growth) 유형에서 지난 20년간 벤치마크를 초과한 펀드는 단 하나도 존재하지 않았습니다.',
          source: 'SPIVA, 2024.12.31 기준',
          link: '/etf/SPY',
        },
        {
          id: 5, part: 'PART 2', icon: '💸', chapter: '4장 · 14장',
          title: '비용 2%가 수익률을 5%로 만든다',
          message: '시장 수익률이 연 7%일 때 2%의 비용을 부담하면 실제 수익률은 연 5%로 낮아집니다. 수익은 불확실하지만 비용은 확정적입니다.',
          source: '14장',
          link: '/fee-simulator',
        },
        {
          id: 6, part: 'PART 2', icon: '🎯', chapter: '7장',
          title: '증권사 16곳의 전망, 맞은 곳은 없었다',
          message: '주요 증권사 16곳이 제시한 코스피 예상 밴드는 2100~3206이었지만, 연말 시점에 이에 부합한 곳은 사실상 한 곳도 없었습니다.',
          source: '7장 · 마켓in 2025.12.15',
          link: null,
        },
        {
          id: 7, part: 'PART 2', icon: '🔄', chapter: '9장',
          title: '중요한 건 피한 거래의 수',
          message: '거래마다 수수료·세금·스프레드·시장충격 비용이 발생합니다. 질문은 "얼마나 거래했는가"가 아니라 "얼마나 많은 불필요한 거래를 피했는가"입니다.',
          source: '9장',
          link: '/fee-simulator',
        },
        {
          id: 8, part: 'PART 3', icon: '⏰', chapter: '13장',
          title: '나갈 때와 들어올 때, 둘 다 맞혀야 한다',
          message: '강한 상승은 대체로 극심한 하락 직후에 나타납니다. 타이밍 전략은 이중 예측 문제이며, 시장을 떠나면 가장 중요한 상승도 함께 놓칩니다.',
          source: '13장',
          link: '/timing',
        },
        {
          id: 9, part: 'PART 3', icon: '📈', chapter: '17장',
          title: '20년을 버틴 결과',
          message: '지난 20년 누적 수익률은 KOSPI 273.21%, S&P 500 448.39%, NASDAQ 100 1,434.76%였습니다. 시장은 흔들리지만 경제는 성장합니다.',
          source: 'Yahoo Finance, 2025.12.31 기준',
          link: '/etf/QQQ',
        },
        {
          id: 10, part: 'PART 3', icon: '⚖️', chapter: '11장',
          title: '평균을 고르는 것은 평범함이 아니다',
          message: '평균을 크게 웃돈 성과는 결국 평균으로 수렴합니다. 인덱스 투자는 평균회귀를 부정하지 않고, 시장의 기본 특성으로 받아들인 전략입니다.',
          source: '11장',
          link: null,
        },
        {
          id: 11, part: 'PART 4', icon: '🏦', chapter: '15장',
          title: '496조 원이 잠들어 있다',
          message: '전체 퇴직연금 적립금은 약 496조 원. 그러나 최근 10년 평균 수익률은 연 3%대 중반이고, DB형의 92%, DC형의 66%가 원리금보장형에 머물러 있습니다.',
          source: '금융감독원, 2025년 4분기 기준',
          link: '/retirement',
        },
        {
          id: 12, part: 'PART 4', icon: '🔍', chapter: 'PART 4 도입',
          title: '고수와 평균의 차이는 실력이 아니었다',
          message: '퇴직연금 상위 1,500명의 3년 연평균 수익률은 16.1%, 전체 가입자 평균은 4.6%였습니다. 차이를 만든 것은 투자 능력이 아니라 투자 구조였습니다.',
          source: '금융감독원 퇴직연금 백서, 2025.6월 말 기준',
          link: '/retirement',
        },
        {
          id: 13, part: 'PART 4', icon: '📅', chapter: '18장',
          title: '시장이 아니라 시간에 따라 바꾼다',
          message: '자산배분의 변화는 시장 상황이 아니라 투자자의 시간에 따라 이루어져야 합니다. 은퇴가 가까울수록 안정 자산 비중을 넓히세요.',
          source: '18장',
          link: '/withdrawal',
        },
        {
          id: 14, part: 'PART 5', icon: '📣', chapter: '19장',
          title: '마케팅은 확률을 말하지 않는다',
          message: '금융 마케팅이 사용하는 언어는 확률이 아니라 가능성입니다. 절대로 투자 실력과 강세장을 혼동하지 마세요.',
          source: '19장 · 제이슨 츠바이크',
          link: null,
        },
        {
          id: 15, part: 'PART 5', icon: '🏁', chapter: '21장',
          title: '끝까지 남는 것이 승리다',
          message: '투자는 자존심의 게임이 아니라 확률의 게임입니다. 승리는 남보다 앞서는 것이 아니라 끝까지 남는 것입니다.',
          source: '21장 · 이기는 투자자의 선언',
          link: null,
        },
      ],
    };
  },
  computed: {
    filteredCards() {
      if (this.activeSection === 'all') return this.cards;
      return this.cards.filter(c => c.part.toLowerCase().replace(' ', '') === this.activeSection);
    },
  },
  methods: {
    partBadgeClass(part) {
      const map = {
        'PART 1': 'bg-primary',
        'PART 2': 'bg-success',
        'PART 3': 'bg-warning text-dark',
        'PART 4': 'bg-danger',
        'PART 5': 'bg-dark',
      };
      return map[part] || 'bg-secondary';
    },
  },
};
