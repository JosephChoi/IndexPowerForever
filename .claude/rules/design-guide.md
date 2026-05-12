# Design Guide — Index Power Forever

> 최종 업데이트: 2026-05-13 (SP500Simulator 디자인 시스템 차용)
> 적용 대상: `frontend/` 전체 (홈·ETF 상세·랭킹·시뮬레이터 3종·인사이트·책)
> 변경 시 이 문서를 먼저 갱신하고 코드를 수정한다.
> 레퍼런스: `simulation.indexwins.com` 의 SP500Simulator design-system.md

---

## 1. 디자인 무드

**한 줄 정의**: *딥 네이비 + 청록 액센트의 단정한 핀테크 톤*

| 키워드 | 설명 |
|---|---|
| 신뢰감 | 딥 네이비를 메인 컬러로 사용. 데이터·금융 서비스 톤 |
| 현대적 | 카드 라운드, 옅은 그라데이션, 일관된 hairline 보더 |
| 절제 | 무지개 컬러 라인 금지. 메인·액센트·보조 3색 + 데이터 의미색만 사용 |
| 단계적 강조 | 강조 카드 무작위 배치 금지. hover 인터랙션 또는 의도된 패턴(STEP 교차)으로만 |

> ⚠️ **이 프로젝트 도메인 의미**
> "outperform/underperform"은 ETF가 **지수(SPY/QQQ)를 이겼는지/졌는지**를 뜻한다. (수익/손실이 아님)
> "profit/loss"는 일반 수익/손실로, 한국 관례(적=수익, 청=손실)를 따른다.

---

## 2. 컬러 시스템

### 2-1. CSS 토큰

```css
:root {
  /* 메인/액센트 (Pretendard 핀테크 톤) */
  --color-navy: #1a2b6d;          /* 메인 — 브랜드/타이틀/주요 텍스트 */
  --color-navy-deep: #0e1a47;     /* 더 깊은 네이비 — navbar, 히어로 */
  --color-teal: #26b4a8;          /* 액센트 — CTA, hover 강조 */
  --color-teal-deep: #1f9c91;     /* 청록 hover/active */
  --color-gold: #d4af37;          /* 보조 — 특별 강조 (1페이지 1~2회) */

  /* 옅은 배경 */
  --color-primary-light: #e8ecf7; /* 옅은 네이비 (아이콘 배지 등) */
  --color-accent-light: #d8f1ee;  /* 옅은 청록 */

  /* 도메인 시맨틱 — 지수 승/패 (벤치마크 컬러와 매핑) */
  --color-outperform: #16a34a;    /* ETF가 지수 이김 (녹색) */
  --color-underperform: #dc2626;  /* ETF가 지수 짐 (적색) */

  /* 도메인 시맨틱 — 수익/손실 (한국 관례) */
  --color-profit: #e53935;        /* 수익 — 적 */
  --color-loss: #1565c0;          /* 손실 — 청 */

  /* 벤치마크 라인 (차트 전용 — Chart.js에는 hex 직박) */
  --color-spy: #16a34a;           /* S&P 500 — 녹 (outperform과 동일) */
  --color-ndx: #dc2626;           /* NASDAQ 100 — 적 (underperform과 동일) */
  --color-etf: #1a2b6d;           /* 선택 ETF — 네이비 */

  /* 배경 */
  --color-bg: #f3f5f9;            /* 페이지 배경 — 옅은 네이비 톤 회색 */
  --color-card: #ffffff;          /* 카드 기본 */
  --color-border: #e3e7ef;        /* hairline 보더 */
  --bg-white: #ffffff;
  --bg-light: #f8f9fa;            /* 섹션 교차용 */
  --bg-dark-hero: #070d24;        /* 미드나이트 네이비 (히어로) */

  /* 텍스트 */
  --color-text: #1f2a44;          /* 본문 — 네이비-블랙 */
  --color-text-sub: #5a6478;      /* 보조 텍스트 */
  --color-text-light: #a3aab8;    /* 비활성/placeholder */
  --text-on-dark: rgba(255,255,255,0.85);
  --text-on-dark-sub: rgba(255,255,255,0.6);

  /* Bootstrap override alias (기존 코드 호환) */
  --text-primary: var(--color-text);
  --text-secondary: var(--color-text-sub);
  --text-muted: var(--color-text-sub);
}
```

### 2-2. Chart.js 색 (CSS 변수 미해석 → hex 직박)

| 용도 | 색 | 비고 |
|---|---|---|
| 선택 ETF 라인 | `#1a2b6d` | navy, 가장 두꺼움(2~3px) |
| S&P 500 라인 | `#16a34a` | dash 5/3 |
| NASDAQ 100 라인 | `#dc2626` | dash 3/3 |
| 초과수익 양수 영역 | `rgba(22,163,74,0.4)` | outperform |
| 초과수익 음수 영역 | `rgba(220,38,38,0.4)` | underperform |
| 시뮬레이터 보조 라인 (다종목) | `#d4af37, #7c3aed, #ea580c, #6c757d` | 골드부터, 파/녹/적 피함 |

### 2-3. 컬러 사용 우선순위

1. **네이비** — 모든 텍스트·아이콘·기본 보더의 기준
2. **청록** — 사용자 행동 유도 (CTA, hover, 진행 단계 마커)
3. **골드** — 1페이지 1~2회 (특별 강조)
4. **무지개 컬러 라인 금지** — N개 카드에 N가지 색 부여하는 옛 패턴 폐기

---

## 3. 타이포그래피

### 3-1. 폰트

- **Pretendard** (CDN, `index.html`에 로드)
- fallback: `system-ui, -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`

### 3-2. 스케일

| 용도 | size | weight | letter-spacing |
|---|---|---|---|
| 히어로 타이틀 | `clamp(2rem, 5vw, 3.2rem)` | 800 | -0.04em |
| 섹션 타이틀 | 1.85rem | 800 | -0.02em |
| 페이지 타이틀 (H1) | 1.75rem | 700 | -0.02em |
| 섹션 타이틀 (H2) | 1.25rem | 700 | -0.01em |
| 카드 H3 | 1.05rem | 700 | -0.02em |
| 본문 | 0.95~1rem | 400~500 | -0.01em |
| 보조 텍스트 | 0.82~0.88rem | 400 | 0 |
| 라벨/태그 | 0.7~0.78rem | 600~700, uppercase | 0.04~0.18em |

### 3-3. 행간

| 용도 | 값 |
|---|---|
| 제목 (히어로, H1) | 1.15~1.2 |
| 섹션 제목 (H2, H3) | 1.4 |
| 본문 | 1.6~1.7 |
| 캡션 | 1.4 |

---

## 4. 레이아웃 토큰

```css
:root {
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-pill: 100px;

  /* 그림자 — 네이비 톤 (무채색 금지) */
  --shadow-sm: 0 1px 3px rgba(26, 43, 109, 0.06);
  --shadow-md: 0 2px 12px rgba(26, 43, 109, 0.08);
  --shadow-lg: 0 8px 28px -10px rgba(26, 43, 109, 0.18);

  /* 8pt 그리드 */
  --space-xs: 0.25rem;
  --space-sm: 0.5rem;
  --space-md: 1rem;
  --space-lg: 1.5rem;
  --space-xl: 2rem;
  --space-2xl: 3rem;
  --space-3xl: 4rem;
}
```

- 카드 내부 패딩: `--space-lg` (1.5rem)
- 카드 간 gap: `--space-md` (1rem)
- 섹션 간 수직 간격: `--space-2xl` ~ `--space-3xl`
- 버튼 내부: `0.5rem 1rem`
- 배지 내부: `0.25rem 0.5rem`

---

## 5. 컴포넌트 스타일

### 5-1. 버튼

| 종류 | 배경 | 텍스트 | hover |
|---|---|---|---|
| `.btn-primary` (override) | `--color-navy` | 흰색 | `--color-navy-deep` |
| `.btn-cta` (다크 위 CTA) | `--color-teal` | 흰색 | `--color-teal-deep` + translateY(-2px) + 청록 그림자 |
| `.btn-outline-light` (다크 위 보조) | 투명 | rgba(255,255,255,0.7) | 흰색 + 보더 강조 |

**원칙**: 다크 배경 위 CTA → 청록 / 흰 배경 위 CTA → 네이비 / 보조 → outline·muted

### 5-2. 카드 (3가지 패턴만)

**A. 기본 카드**
```css
.card-base {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-lg);
  box-shadow: var(--shadow-sm);
  transition: box-shadow 0.2s, transform 0.2s;
}
.card-base:hover { box-shadow: var(--shadow-md); }
.card-base.card-clickable { cursor: pointer; }
.card-base.card-clickable:hover { transform: translateY(-2px); }
.card-base.card-highlight { border-left: 4px solid var(--color-teal); }
```

**B. 강조 카드 — 채움 (드물게, 한 섹션 1~2장)**
```css
background: var(--color-navy);  /* 또는 var(--color-teal) */
color: #ffffff;
```

**C. 인터랙션 카드** — hover 시 위로 4px, 좌측 청록 세로 바 슬라이드 인, 아이콘 배지 청록 채움.

> ⚠ "랜덤 N장 다크 강조" 금지. hover 인터랙션으로 차별화.

### 5-3. 아이콘 배지

```css
.icon-badge {
  width: 48px; height: 48px;
  border-radius: var(--radius-sm);
  background: var(--color-primary-light);
  color: var(--color-navy);
  display: inline-flex; align-items: center; justify-content: center;
  transition: all 0.2s;
}
.icon-badge:hover {
  background: var(--color-teal); color: #fff;
  box-shadow: 0 6px 18px -4px rgba(38, 180, 168, 0.45);
  transform: scale(1.06);
}
```

### 5-4. 배지 (2종 표준)

```css
.badge-standard { font-size: 0.8rem; padding: 0.3rem 0.6rem; border-radius: var(--radius-sm); font-weight: 600; }
.badge-sm { font-size: 0.7rem; padding: 0.2rem 0.4rem; border-radius: 4px; font-weight: 600; }
```

### 5-5. 버튼 그룹 (기간/벤치마크 셀렉터)

```css
.btn-group-selector .btn {
  font-size: 0.875rem; padding: 0.4rem 0.8rem;
  border-radius: var(--radius-sm); font-weight: 600;
  background: #e9ecef; color: var(--color-text-sub); border: 1px solid transparent;
}
.btn-group-selector .btn.active {
  background: var(--color-navy); color: #fff; border-color: var(--color-navy);
}
```

### 5-6. 테이블

```css
.table-standard { font-size: 0.875rem; border-collapse: separate; border-spacing: 0; }
.table-standard thead th {
  background: var(--color-navy-deep); color: #fff;
  font-weight: 600; padding: 0.75rem; font-size: 0.8rem;
  text-transform: none;
}
.table-standard tbody td {
  padding: 0.75rem; vertical-align: middle;
  border-bottom: 1px solid var(--color-border);
}
.table-standard tbody tr:hover { background: rgba(26, 43, 109, 0.04); }
```

### 5-7. 슬라이더 (시뮬레이터 3종 공통)

```css
.sim-slider { -webkit-appearance: none; width: 100%; height: 6px; border-radius: 3px; background: #dee2e6; outline: none; }
.sim-slider::-webkit-slider-thumb {
  -webkit-appearance: none; width: 20px; height: 20px; border-radius: 50%;
  background: var(--color-teal); cursor: pointer;
  box-shadow: 0 2px 6px rgba(38, 180, 168, 0.3);
}
.sim-slider::-webkit-slider-thumb:hover { transform: scale(1.2); }
.sim-slider-label .value { color: var(--color-teal); font-weight: 700; }
```

### 5-8. 차트 컨테이너

Chart.js의 `responsive: true + maintainAspectRatio: false` 사용 시 **반드시 명시적 높이 박스로 감쌀 것** (무한 확장 버그 방지).

```css
.chart-canvas-box { position: relative; width: 100%; height: 360px; }
.chart-canvas-box canvas { width: 100% !important; height: 100% !important; }
@media (max-width: 576px) { .chart-canvas-box { height: 240px; } }
```

`.chart-container-main` (360px), `.chart-container-sub` (200px) alias 유지.

---

## 6. 반응형

| 이름 | 범위 | 레이아웃 |
|---|---|---|
| Mobile | `< 576px` | 1열, 카드 스택 |
| Tablet | `576px ~ 991px` | 2열 |
| Desktop | `≥ 992px` | 3~4열, 테이블 |

테이블 컬럼 6개 이상 → 모바일에서 카드 레이아웃으로 전환.

---

## 7. 다크 톤 가독성

| 역할 | 색 |
|---|---|
| 본문 | `rgba(255, 255, 255, 0.7~0.85)` |
| 보조 | `rgba(255, 255, 255, 0.5~0.6)` |
| placeholder | `rgba(255, 255, 255, 0.3~0.4)` |
| 라인 | `rgba(255, 255, 255, 0.06~0.12)` |

순백(`#fff`)은 메인 타이틀과 CTA 텍스트에만.

---

## 8. 아이콘

- **Bootstrap Icons** (`bi bi-*`) — 기존 유지
- 크기: 일반 24px / 작은 18~20px / 칩 14px
- 색: `currentColor` (부모 상속)

---

## 9. 금지 사항

| 금지 | 이유 |
|---|---|
| N개 카드에 N가지 컬러 라인 (무지개) | 산만 |
| 랜덤 다크 강조 | 패턴 없으면 부자연스러움 |
| 무채색 그림자 `rgba(0,0,0,0.x)` | 톤 깨짐 — 네이비 톤(`rgba(26,43,109,…)`)으로 |
| Chart.js `responsive:true` + 래퍼 없음 | 무한 확장 버그 |
| Chart.js 코드에 `var(--…)` | CSS 변수 미해석 — hex 직박 |
| HTML 안 `<style>` 태그 | ViewLogic 규칙 위반 (단일 `style.css`) |

---

## 10. 변경 체크리스트

- [ ] 색은 `--color-*` 토큰만 (Chart.js 제외)
- [ ] 카드는 5-2 세 패턴 중 하나
- [ ] 버튼은 배경 톤에 맞춰 navy/teal 선택
- [ ] 텍스트 `--color-text`, 보조 `--color-text-sub`
- [ ] 그림자는 `--shadow-*` 토큰
- [ ] 라운드는 `--radius-*` 토큰
- [ ] 차트는 `.chart-canvas-box`로 감싸기

---

## 11. 참고

- 토큰: [frontend/css/style.css](../../frontend/css/style.css) `:root`
- 레퍼런스: `/Users/joseph/AICording/SP500Simulator/.claude/docs/design-system.md`
