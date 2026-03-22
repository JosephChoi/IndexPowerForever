# Design Guide — Index Power Forever

> 디자인 개선 작업 시 반드시 이 문서를 참조하라. 모든 UI 변경은 이 가이드를 기준으로 판단한다.

## 디자인 원칙

1. **데이터가 주인공** — 장식보다 데이터 가독성 우선
2. **모바일 퍼스트** — 모바일에서 먼저 설계, 데스크톱으로 확장
3. **일관성** — 동일 목적의 컴포넌트는 동일 스타일
4. **접근성** — WCAG AA 대비 기준 준수 (텍스트 4.5:1, 대형 텍스트 3:1)

---

## 색상 시스템

### 시맨틱 컬러 (변경 금지)

```css
:root {
  /* 성과 판정 — 서비스 핵심 색상 */
  --color-outperform: #28a745;     /* 지수 승리 (녹색) */
  --color-underperform: #dc3545;   /* 지수 패배 (적색) */

  /* 벤치마크 라인 */
  --color-spy: #198754;            /* S&P 500 */
  --color-ndx: #fd7e14;            /* NASDAQ 100 */
  --color-etf: #0d6efd;            /* 선택 ETF */
}
```

### 배경 톤 전환 규칙

페이지 내 배경색 전환은 **최대 2단계**로 제한한다.

| 패턴 | 허용 | 예시 |
|---|---|---|
| 다크 히어로 → 화이트 본문 | O | 홈, ETF 상세 |
| 화이트 → 라이트 그레이 교차 | O | 섹션 구분 |
| 다크 → 화이트 → 그레이 → 화이트 | X | 톤 전환 과다 |

```css
/* 허용되는 섹션 배경 */
--bg-white: #ffffff;
--bg-light: #f8f9fa;
--bg-dark-hero: linear-gradient(160deg, #060b18 0%, #0d1f3c 55%, #0a2a1a 100%);
```

### 텍스트 대비 기준

| 용도 | 색상 | 최소 대비비 |
|---|---|---|
| 본문 텍스트 | `#212529` | 4.5:1 이상 |
| 보조 텍스트 | `#495057` | 4.5:1 이상 (기존 `#6c757d` 사용 금지) |
| 비활성/힌트 | `#6c757d` | 라이트 배경에서만 허용, 다크 배경 사용 금지 |
| 다크 배경 본문 | `rgba(255,255,255,0.85)` | — |
| 다크 배경 보조 | `rgba(255,255,255,0.6)` | — (0.5 이하 금지) |

---

## 타이포그래피

### 크기 체계 (8pt 기반)

| 레벨 | 크기 | weight | 용도 |
|---|---|---|---|
| Display | `clamp(2rem, 5vw, 3.2rem)` | 800 | 히어로 제목 |
| H1 | `1.75rem` | 700 | 페이지 제목 |
| H2 | `1.25rem` | 700 | 섹션 제목 |
| H3 | `1.1rem` | 600 | 카드 제목 |
| Body | `1rem` | 400 | 본문 |
| Small | `0.875rem` | 400 | 보조 텍스트 |
| Caption | `0.75rem` | 500 | 라벨, 배지 내부 |

### 행간 (line-height)

| 용도 | 값 |
|---|---|
| 제목 (Display, H1) | `1.2` |
| 섹션 제목 (H2, H3) | `1.4` |
| 본문 | `1.6` |
| 캡션 | `1.4` |

---

## 간격 시스템 (8pt grid)

모든 padding/margin/gap은 아래 값만 사용한다.

```css
--space-xs: 0.25rem;   /* 4px */
--space-sm: 0.5rem;    /* 8px */
--space-md: 1rem;      /* 16px */
--space-lg: 1.5rem;    /* 24px */
--space-xl: 2rem;      /* 32px */
--space-2xl: 3rem;     /* 48px */
--space-3xl: 4rem;     /* 64px */
```

| 용도 | 값 |
|---|---|
| 카드 내부 패딩 | `--space-lg` (1.5rem) |
| 카드 간 간격 (gap) | `--space-md` (1rem) |
| 섹션 간 수직 간격 | `--space-2xl` (3rem) |
| 버튼 내부 패딩 | `0.5rem 1rem` |
| 배지 내부 패딩 | `0.25rem 0.5rem` |

---

## 컴포넌트 표준

### 카드 (단일 기본 스타일)

기존 `stat-card`, `kpi-card`, `rolling-card`, `win-rate-card` 등을 **하나의 기본 카드**로 통합한다.

```css
/* 기본 카드 */
.card-base {
  background: #ffffff;
  border: 1px solid #e9ecef;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: box-shadow 0.2s;
}
.card-base:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

/* 변형: 강조 카드 (성과 표시용) */
.card-base.card-highlight {
  border-left: 4px solid var(--color-etf);
}

/* 변형: 클릭 가능 카드 */
.card-base.card-clickable {
  cursor: pointer;
}
.card-base.card-clickable:hover {
  transform: translateY(-2px);
}
```

### 배지

크기를 **2종**으로 표준화한다.

```css
.badge-standard {
  font-size: 0.8rem;
  padding: 0.3rem 0.6rem;
  border-radius: 6px;
  font-weight: 600;
}
.badge-sm {
  font-size: 0.7rem;
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  font-weight: 600;
}
```

### 버튼 그룹 (기간/벤치마크 선택)

```css
.btn-group-selector .btn {
  font-size: 0.875rem;
  padding: 0.4rem 0.8rem;
  border-radius: 8px;
  font-weight: 600;
  border: 1px solid transparent;
  background: #e9ecef;
  color: #495057;
}
.btn-group-selector .btn.active {
  background: var(--color-etf);
  color: #fff;
}
```

### 테이블

```css
.table-standard {
  font-size: 0.875rem;
  border-collapse: separate;
  border-spacing: 0;
}
.table-standard thead th {
  background: #212529;
  color: #fff;
  font-weight: 600;
  padding: 0.75rem;
  font-size: 0.8rem;
  text-transform: none;  /* 대문자 변환 금지 */
}
.table-standard tbody td {
  padding: 0.75rem;
  vertical-align: middle;
  border-bottom: 1px solid #e9ecef;
}
.table-standard tbody tr:hover {
  background: rgba(13, 110, 253, 0.04);
}
```

---

## 반응형 전략

### 중단점

| 이름 | 범위 | 레이아웃 |
|---|---|---|
| Mobile | `< 576px` | 1열, 카드 스택 |
| Tablet | `576px ~ 991px` | 2열 |
| Desktop | `992px ~` | 3~4열, 테이블 |

### 테이블 → 모바일 전환 규칙

**컬럼 5개 이하**: `table-responsive` 수평 스크롤 허용
**컬럼 6개 이상**: 모바일에서 카드 레이아웃으로 전환

```html
<!-- 데스크톱: 테이블 -->
<div class="d-none d-md-block">
  <table>...</table>
</div>

<!-- 모바일: 카드 리스트 -->
<div class="d-md-none">
  <div class="card-base mb-2" v-for="row in data" :key="row.id">
    <div class="d-flex justify-content-between mb-1">
      <span class="fw-bold">{{ row.label }}</span>
      <span :class="row.class">{{ row.value }}</span>
    </div>
  </div>
</div>
```

### 차트 높이

| 화면 | 메인 차트 | 보조 차트 |
|---|---|---|
| Desktop | `360px` | `200px` |
| Mobile | `240px` | `160px` |

```css
.chart-container-main { height: 360px; }
.chart-container-sub { height: 200px; }

@media (max-width: 576px) {
  .chart-container-main { height: 240px; }
  .chart-container-sub { height: 160px; }
}
```

### ETF 상세 헤더 — 모바일 레이아웃

```
Desktop: [티커 + 풀네임] [기간 5버튼 | 벤치마크 2버튼]
Mobile:  [티커 + 풀네임]
         [기간 5버튼 (가로 스크롤)]
         [벤치마크 2버튼]
```

---

## 페이지별 개선 체크리스트

### 홈 (home.html)
- [ ] 인기 ETF 버튼 스타일 → `btn-group-selector` 통일
- [ ] 프리셋 카드 → `card-base card-clickable` 적용
- [ ] 책 배너 → 히어로-본문 전환과 자연스러운 톤
- [ ] 서비스 소개 아이콘 크기 통일 (`display-6` → 고정 크기)

### ETF 상세 (etf-detail.html)
- [ ] 헤더 버튼 그룹 → 모바일에서 세로 분리
- [ ] KPI 카드 → `card-base` 통일
- [ ] 롤링 승률 카드 → `card-base card-highlight` 적용
- [ ] 연도별 테이블 → 모바일 카드 레이아웃 추가
- [ ] 탐색기 도트 → 모바일에서 크기 확대 (4px → 6px)

### 랭킹 (ranking.html)
- [ ] 테이블 → `table-standard` 적용
- [ ] 모바일 → 카드 레이아웃 전환 (9컬럼)
- [ ] TOP 3 행 → 미묘한 배경색 강조
- [ ] hover 효과 강화

### 타이밍 시뮬레이터 (timing.html)
- [ ] 슬라이더 커스텀 스타일 (thumb + track)
- [ ] 시나리오 카드 → `card-base` 통일
- [ ] 모바일 → 좌측 패널 상단, 결과 하단

### 비용 시뮬레이터 (fee-simulator.html)
- [ ] 슬라이더 스타일 통일 (타이밍과 동일)
- [ ] 결과 테이블 → `table-standard` 적용
- [ ] 기준 시나리오 행 → "기준" 라벨 명시

### 퇴직연금 (retirement.html)
- [ ] 시나리오 카드 → `card-base` + 색상 변형
- [ ] 슬라이더 스타일 통일
- [ ] 결과 금액 → 크기 계층 명확화

### 인사이트 (insights.html)
- [ ] 카드 높이 → `h-100` 추가
- [ ] 아이콘 → 이모지 대신 Bootstrap Icons 고려
- [ ] 필터 버튼 → `btn-group-selector` 통일

### 책 소개 (book.html)
- [ ] `.book-cover-shadow` CSS 누락 수정
- [ ] 핵심 수치 → 모바일 2열 간격 개선
- [ ] 아코디언 → 열린 상태 스타일 강화

---

## 슬라이더 표준 스타일

시뮬레이터 3개 페이지(비용/타이밍/퇴직연금)에서 공통 사용한다.

```css
.sim-slider {
  -webkit-appearance: none;
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: #dee2e6;
  outline: none;
}
.sim-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--color-etf);
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(13, 110, 253, 0.3);
}
.sim-slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

/* 슬라이더 라벨 */
.sim-slider-label {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 0.25rem;
}
.sim-slider-label .label { font-size: 0.875rem; font-weight: 600; color: #212529; }
.sim-slider-label .value { font-size: 1.1rem; font-weight: 700; color: var(--color-etf); }
```

---

## 작업 순서 권장

| 순서 | 작업 | 범위 | 설명 |
|---|---|---|---|
| 1 | CSS 변수 + 기본 컴포넌트 정의 | `style.css` | 카드, 배지, 테이블, 슬라이더 표준 |
| 2 | 홈 페이지 개선 | `home.html` | 카드 통일, 배너 톤 조정 |
| 3 | ETF 상세 개선 | `etf-detail.html` | 모바일 헤더, KPI 카드, 테이블 |
| 4 | 시뮬레이터 3종 개선 | `timing/fee/retirement` | 슬라이더 통일, 카드 표준화 |
| 5 | 랭킹 개선 | `ranking.html` | 테이블 표준, 모바일 카드 |
| 6 | 인사이트 + 책 소개 | `insights/book` | 카드 높이, 아이콘 통일 |
