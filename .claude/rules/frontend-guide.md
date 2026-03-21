# Frontend Rules — Index Power Forever

> 아래 올바른 패턴을 따라 코드를 생성하라. 금지 패턴 위반은 hooks가 자동 차단한다.

## ViewLogic 구조 규칙

- `frontend/views/{name}.html` ↔ `frontend/logic/{name}.js` 반드시 1:1 매칭
- API 호출: `this.$api.get/post/put/delete()`
- 페이지 이동: `this.navigateTo('/path', { key: value })` (쿼리 파라미터)
- 비동기: `async/await` + `try/catch`
- 모달: `this.$nextTick()` 내에서 `new bootstrap.Modal()` 초기화

## getParam 널 가드

```javascript
// URL 파라미터 사용 시 반드시 null 체크
const ticker = this.getParam('ticker');
if (!ticker) { this.navigateTo('/'); return; }
```

## beforeUnmount 정리

```javascript
// Chart.js 반드시 destroy
beforeUnmount() {
  if (this.chart) { this.chart.destroy(); }
}
```

## 이 프로젝트 특수 규칙 (로그인 없음)

- 역할 가드 불필요 (인증 없음)
- `localStorage`에 최근 검색 ETF만 저장 (최대 10개)
- `this.$api`는 JWT 없이 단순 fetch wrapper

## Chart.js 패턴 (필수)

```javascript
// 수익률 비교 라인 차트
const ctx = document.getElementById('comparisonChart').getContext('2d');
this.chart = new Chart(ctx, {
  type: 'line',
  data: {
    labels: dates,
    datasets: [
      { label: ticker, data: etfReturns, borderColor: '#0d6efd', borderWidth: 2, fill: false, pointRadius: 0 },
      { label: 'S&P 500', data: spyReturns, borderColor: '#198754', borderWidth: 1.5, borderDash: [5,5], fill: false, pointRadius: 0 },
      { label: 'NASDAQ 100', data: qdqReturns, borderColor: '#fd7e14', borderWidth: 1.5, borderDash: [3,3], fill: false, pointRadius: 0 },
    ]
  },
  options: { responsive: true, plugins: { legend: { position: 'top' } } }
});
```

```javascript
// 초과수익률 영역 차트 (녹색/적색)
// 양수: 녹색, 음수: 적색
backgroundColor: (ctx) => {
  const value = ctx.raw;
  return value >= 0 ? 'rgba(40, 167, 69, 0.4)' : 'rgba(220, 53, 69, 0.4)';
}
```

## HTML/CSS

- 로직은 `.js` 파일, 스타일은 `css/style.css`, 아이콘은 Bootstrap Icons(`bi bi-*`)
- `v-for`에 `:key` 필수 (고유 ID/ticker)
- `<table>` 사용 시 `<div class="table-responsive">` 래퍼
- Bootstrap 5 클래스 최대 활용
- 반응형: Bootstrap grid (`col-12 col-md-6 col-xl-3`)

## 색상 체계

```css
:root {
  --color-outperform: #28a745;   /* 지수 이김 (녹색) */
  --color-underperform: #dc3545; /* 지수 짐 (적색) */
  --color-spy: #198754;          /* S&P 500 선 */
  --color-ndx: #fd7e14;          /* NASDAQ 100 선 */
  --color-etf: #0d6efd;          /* 선택 ETF 선 */
}
```

## 페이지 생성 후 동기화 (사이드바 없는 구조)

1. `frontend/logic/app.js`의 라우터에 경로 추가
2. `frontend/components/navbar.html`에 메뉴 항목 추가 (해당하는 경우)

## 금지 패턴

- `fetch()` 직접 호출 — 반드시 `this.$api` 사용
- `innerHTML`로 HTML 주입
- `document.querySelector` 남용 — Vue 데이터 바인딩 활용
- 인라인 스타일 (`style="..."`) 남용
