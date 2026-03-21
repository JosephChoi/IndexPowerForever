window.__view_insights = {
  data() {
    return {
      activeSection: 'all',
      cards: [
        { id: 1, part: 'PART 1', icon: '📈', title: 'S&P 500의 장기 복리 마법', message: '1993년 SPY에 투자했다면 2024년 기준 약 +2,000% 수익. 연평균 10%대 복리의 위력을 확인하세요.', link: '/etf/SPY' },
        { id: 2, part: 'PART 1', icon: '🏆', title: '지수를 이기지 못하는 액티브 펀드', message: '20년 이상 장기간 S&P 500을 꾸준히 이기는 액티브 펀드는 전체의 10% 미만입니다.', link: '/ranking' },
        { id: 3, part: 'PART 1', icon: '🌍', title: 'NASDAQ 100 vs S&P 500', message: '기술 섹터 집중 vs 분산투자. 높은 수익률 뒤에는 더 큰 변동성과 MDD가 숨어있습니다.', link: '/etf/QQQ' },
        { id: 4, part: 'PART 2', icon: '💸', title: '1% 보수 차이가 30년 후 수천만원', message: '운용보수 0.03%와 1.5%의 차이, 30년 복리 효과로 계산하면 원금보다 큰 금액을 잃습니다.', link: '/fee-simulator' },
        { id: 5, part: 'PART 2', icon: '🔄', title: '잦은 거래의 진짜 비용', message: '매매 수수료 + 세금 + 기회비용. 장기 보유가 최고의 절세 전략입니다.', link: '/fee-simulator' },
        { id: 6, part: 'PART 3', icon: '⏰', title: '상위 20거래일을 놓치면?', message: 'S&P 500의 20년 수익 중 상당 부분이 단 20거래일에 집중됩니다. 시장 타이밍은 불가능합니다.', link: '/timing' },
        { id: 7, part: 'PART 3', icon: '😰', title: '공포 심리가 만드는 최악의 결정', message: '2008년, 2020년 폭락 때 팔았다면? 오히려 최고의 매수 기회를 놓친 것입니다.', link: '/timing' },
        { id: 8, part: 'PART 4', icon: '🏦', title: '원리금보장 vs 인덱스 퇴직연금', message: '20년간 원리금보장 2.5%와 S&P 500 인덱스 10%의 차이는 수억 원에 달합니다.', link: '/retirement' },
        { id: 9, part: 'PART 4', icon: '📅', title: '은퇴 시점이 가까워질수록 리밸런싱', message: '젊을수록 주식 비중을 높이고, 은퇴에 가까워질수록 안전 자산 비중을 늘리세요.', link: '/retirement' },
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
      const map = { 'PART 1': 'bg-primary', 'PART 2': 'bg-success', 'PART 3': 'bg-warning text-dark', 'PART 4': 'bg-danger' };
      return map[part] || 'bg-secondary';
    },
  },
};
