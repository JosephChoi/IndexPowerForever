# Frontend Spec — Index Power Forever

> 작성일: 2026-03-22 | PRD + Architecture 기반

---

## 공통 규칙

- Vue 3 CDN, 빌드 없음
- `views/{name}.html` ↔ `logic/{name}.js` 1:1 매칭 필수
- API 호출: `this.$api.get()` / `this.$api.post()`
- 페이지 이동: `this.navigateTo('/path', { key: value })`
- 색상: `--color-outperform: #28a745` / `--color-underperform: #dc3545` / `--color-spy: #198754` / `--color-ndx: #fd7e14` / `--color-etf: #0d6efd`

---

## 1. 홈 (`/`)

**파일**: `views/home.html` / `logic/home.js`
**FR**: FR-001, FR-003, FR-041

### data()
```js
{
  searchQuery: '',           // 검색 입력값
  searchResults: [],         // 자동완성 결과 (최대 10개)
  isSearching: false,        // 검색 로딩 상태
  recentTickers: [],         // localStorage 최근 검색 (최대 10개)
  presets: [],               // 인기 프리셋 카드 목록
  popularEtfs: [],           // 인기 검색 TOP 5
  isLoading: false,
  error: null
}
```

### 주요 메서드
```js
onSearchInput()        // debounce 300ms → this.$api.get('/api/etf/search?q=')
onSelectResult(ticker) // navigateTo('/etf/:ticker'), localStorage 저장
loadPresets()          // this.$api.get('/api/presets')
loadPopular()          // this.$api.get('/api/presets/popular')
loadRecent()           // localStorage.getItem('recentTickers') 파싱
```

### Lifecycle
```js
mounted() { this.loadPresets(); this.loadPopular(); this.loadRecent(); }
```

### UI 구성
- **히어로 섹션**: 슬로건 "지수는 영원하다" + 검색 입력창 (Bootstrap `input-group`)
- **자동완성 드롭다운**: `v-if="searchResults.length"` 절대 위치
- **최근 검색**: Badge 형태 티커 목록 (localStorage, `v-if="recentTickers.length"`)
- **인기 프리셋 카드**: `col-6 col-md-4 col-xl-3` 그리드, 카드 클릭 → ETF 상세
- **인기 검색 TOP 5**: 순위 뱃지 + 티커 + 종목명 리스트

---

## 2. ETF 상세 (`/etf/:ticker`)

**파일**: `views/etf-detail.html` / `logic/etf-detail.js`
**FR**: FR-002, FR-010, FR-011, FR-012, FR-020, FR-021, FR-022

### data()
```js
{
  ticker: '',
  period: '5Y',              // 선택된 기간 (1Y/3Y/5Y/10Y/max)
  benchmark: 'SPY',          // SPY | QQQ
  activeTab: 'comparison',   // comparison | analysis | info
  etfInfo: null,             // ETF 기본정보
  compareData: null,         // 비교 분석 결과
  isLoading: false,
  error: null,
  comparisonChart: null,     // Chart.js 인스턴스
  excessChart: null,
  annualChart: null
}
```

### 주요 메서드
```js
loadData()              // loadInfo() + loadCompare() 병렬
loadInfo()              // this.$api.get('/api/etf/:ticker')
loadCompare()           // this.$api.get('/api/etf/:ticker/compare?period=&benchmark=')
onPeriodChange(p)       // this.period = p → loadCompare()
onBenchmarkChange(b)    // this.benchmark = b → loadCompare()
renderCharts()          // 비교차트 + 초과수익률차트 + 연도별차트 그리기
saveRecent()            // localStorage에 ticker 저장
```

### Lifecycle
```js
mounted() {
  this.ticker = this.getParam('ticker');
  if (!this.ticker) { this.navigateTo('/'); return; }
  this.saveRecent();
  this.loadData();
}
beforeUnmount() {
  if (this.comparisonChart) this.comparisonChart.destroy();
  if (this.excessChart) this.excessChart.destroy();
  if (this.annualChart) this.annualChart.destroy();
}
```

### UI 구성
- **헤더**: 티커 + 종목명 + 기간 선택 탭 (1Y/3Y/5Y/10Y/전체)
- **벤치마크 선택**: `S&P 500` / `NASDAQ 100` 토글 버튼
- **탭**: 성과비교 | 이김/짐 분석 | 종목정보

### Chart 명세

**① 수익률 비교 라인 차트** (`comparisonChart`)
```js
type: 'line'
datasets: [
  { label: ticker, borderColor: '#0d6efd', borderWidth: 2, pointRadius: 0 },
  { label: 'S&P 500', borderColor: '#198754', borderDash: [5,5], pointRadius: 0 },
  { label: 'NASDAQ 100', borderColor: '#fd7e14', borderDash: [3,3], pointRadius: 0 }
]
options: { responsive: true, plugins: { legend: { position: 'top' } } }
```

**② 초과수익률 영역 차트** (`excessChart`)
```js
type: 'bar'  // 또는 line with fill
backgroundColor: (ctx) => ctx.raw >= 0 ? 'rgba(40,167,69,0.4)' : 'rgba(220,53,69,0.4)'
```

**③ 연도별 승패 막대 차트** (`annualChart`)
```js
type: 'bar'
// 연도별 (ETF수익률 - 벤치마크수익률)
backgroundColor: (ctx) => ctx.raw >= 0 ? '#28a745' : '#dc3545'
```

### 성과 지표 테이블 (FR-012)
| 지표 | ETF | S&P 500 | NASDAQ 100 |
- 총수익률, CAGR, MDD, 샤프비율, 연환산 변동성
- 우세 항목: `table-success` 배경 강조

### 롤링 승률 (FR-020)
- 보유기간 1Y/3Y/5Y 별 카드 3개
- "이 ETF를 5년 보유했을 때 S&P 500을 이긴 확률: **28%**" 문장 형태

---

## 3. 랭킹 (`/ranking`)

**파일**: `views/ranking.html` / `logic/ranking.js`
**FR**: FR-040

### data()
```js
{
  period: '3Y',        // 1Y/3Y/5Y/10Y
  benchmark: 'SPY',    // SPY | QQQ
  rankings: [],        // 랭킹 결과 배열
  isLoading: false,
  error: null
}
```

### 주요 메서드
```js
loadRanking()  // this.$api.get('/api/ranking?period=&benchmark=')
onRowClick(ticker)  // navigateTo('/etf/' + ticker)
```

### UI 구성
- 기간 + 벤치마크 선택 필터
- `<div class="table-responsive">` 래퍼
- 순위 | 티커 | 종목명 | 총수익률 | 초과수익률 | CAGR 컬럼
- 초과수익률 양수: `text-success`, 음수: `text-danger`
- 행 클릭 → ETF 상세 이동

---

## 4. 타이밍 시뮬레이터 (`/timing`)

**파일**: `views/timing.html` / `logic/timing.js`
**FR**: FR-032

### data()
```js
{
  startYear: 2000,
  endYear: 2024,
  missingDays: 0,      // 0/10/20/30/50
  result: null,
  isLoading: false,
  error: null
}
```

### 주요 메서드
```js
simulate()  // this.$api.get('/api/timing?period=&missing=')
```

### UI 구성
- 기간 선택 (시작연도~종료연도 슬라이더 또는 select)
- 놓친 상승일 선택 버튼 그룹: 0 / 10 / 20 / 30 / 50일
- 결과 카드: 각 시나리오별 최종수익률 + CAGR
- 요약 문장: "2000년~2024년 상위 20일을 놓쳤다면 수익률은 X%에서 Y%로 감소"

---

## 5. 비용 시뮬레이터 (`/fee-simulator`)

**파일**: `views/fee-simulator.html` / `logic/fee-simulator.js`
**FR**: FR-030

### data()
```js
{
  initialAmount: 10000,   // 초기 투자금 (만원)
  annualReturn: 7,        // 연평균 수익률 (%)
  years: 30,              // 투자 기간
  scenarios: [
    { label: '저비용 ETF', fee: 0.1 },
    { label: '일반 펀드', fee: 1.0 },
    { label: '고비용 상품', fee: 2.0 }
  ],
  results: [],
  chart: null
}
```

### 주요 메서드
```js
calculate()   // 프론트엔드 계산 (서버 호출 없음)
// 공식: FV = PV × (1 + (r - fee)/100)^years
renderChart() // Chart.js 라인 차트
```

### Lifecycle
```js
mounted() { this.calculate(); }
watch: { initialAmount, annualReturn, years → calculate() }
beforeUnmount() { if (this.chart) this.chart.destroy(); }
```

### UI 구성
- 입력 슬라이더 3개 (초기금액/수익률/기간) + 실시간 갱신
- 라인 차트: 연도별 자산 추이 3개 시나리오 비교
- 결과 테이블: 최종 자산, 총 수익금, 손실 금액 비교

---

## 6. 퇴직연금 시뮬레이터 (`/retirement`)

**파일**: `views/retirement.html` / `logic/retirement.js`
**FR**: FR-031

### data()
```js
{
  currentBalance: 5000,   // 현재 적립금 (만원)
  monthlyContrib: 50,     // 월 납입액 (만원)
  years: 20,              // 운용 기간
  scenarios: [
    { label: '원리금보장', rate: 2.5 },
    { label: 'S&P 500 인덱스', rate: 10 },
    { label: 'NASDAQ 100 인덱스', rate: 13 }
  ],
  results: [],
  chart: null
}
```

### 주요 메서드
```js
calculate()   // 프론트엔드 계산 (서버 호출 없음)
// FV = PV(1+r)^n + PMT × ((1+r)^n - 1) / r
renderChart()
```

### UI 구성
- 입력 3개 (적립금/월납입/기간)
- 라인 차트: 3개 시나리오 자산 추이
- 결과 카드 3개: 최종 적립금 + 총납입 대비 수익금

---

## 7. 인사이트 (`/insights`)

**파일**: `views/insights.html` / `logic/insights.js`
**FR**: FR-050

### data()
```js
{
  activeSection: 'all',   // all | part1 | part2 | part3 | part4
  cards: [/* 정적 데이터 */]
}
```

### UI 구성 (정적, API 없음)
- PART 1~4 필터 탭
- 교육 카드 그리드 (`col-12 col-md-6`)
- 각 카드: 아이콘 + 핵심 메시지 + 설명 + 관련 시뮬레이터 링크
- Bootstrap Accordion으로 상세 내용 펼치기

---

## 8. 책 소개 (`/book`)

**파일**: `views/book.html` / `logic/book.js`
**FR**: FR-051

### data()
```js
{ activeChapter: null }
```

### UI 구성 (정적, API 없음)
- 책 표지 이미지 + 저자 소개
- 목차 Accordion
- 각 챕터 → 관련 시뮬레이터 링크
- "구매하기" 버튼 (외부 서점 링크, `target="_blank"`)

---

## 라우터 설정 (logic/app.js)

```js
const routes = [
  { path: '/', component: loadView('home') },
  { path: '/etf/:ticker', component: loadView('etf-detail') },
  { path: '/ranking', component: loadView('ranking') },
  { path: '/timing', component: loadView('timing') },
  { path: '/fee-simulator', component: loadView('fee-simulator') },
  { path: '/retirement', component: loadView('retirement') },
  { path: '/insights', component: loadView('insights') },
  { path: '/book', component: loadView('book') },
];
```

---

## 공통 패턴

### localStorage (최근 검색)
```js
const MAX_RECENT = 10;
const key = 'recentTickers';
function saveRecent(ticker) {
  let list = JSON.parse(localStorage.getItem(key) || '[]');
  list = [ticker, ...list.filter(t => t !== ticker)].slice(0, MAX_RECENT);
  localStorage.setItem(key, JSON.stringify(list));
}
```

### 에러 처리
```js
try {
  this.isLoading = true;
  const data = await this.$api.get('/api/...');
  this.result = data;
} catch (e) {
  this.error = e.message || '데이터를 불러오는 중 오류가 발생했습니다.';
} finally {
  this.isLoading = false;
}
```
