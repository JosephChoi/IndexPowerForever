# Index Power Forever — CLAUDE.md

> "지수는 영원하다" — S&P 500 & NASDAQ 100 지수 투자의 장기 우월성을 데이터로 증명하는 웹앱
> 📖 『이길 수 있는 투자만 하라』(2026년 4월 출간) 연계 웹서비스

---

## 프로젝트 개요

ETF를 선택하면 S&P 500 / NASDAQ 100 지수와 성과를 비교 분석하여, 지수 투자의 장기 우월성을 시각적으로 증명하는 웹 서비스.

- **로그인 없음**: 회원가입 불필요, 즉시 사용
- **미국 ETF 전용**: Yahoo Finance API 활용
- **교육 목적**: 데이터로 보는 지수 투자의 과학

---

## 기술 스택

| 레이어 | 기술 |
|---|---|
| Frontend | Cloudflare Pages + Vue 3 CDN + Bootstrap 5 (ViewLogic) |
| Backend | Cloudflare Workers + Hono |
| Database | Cloudflare D1 (SQLite) |
| Cache | Cloudflare KV |
| 데이터 소스 | Yahoo Finance API |
| 차트 | Chart.js |

---

## 프로젝트 구조

```
IndexPowerForever/
├── frontend/
│   ├── index.html          # SPA 진입점 (Vue 3 Router + Bootstrap 5 CDN)
│   ├── css/
│   │   └── style.css       # 공통 스타일
│   ├── components/
│   │   └── navbar.html     # 공통 네비게이션
│   ├── views/              # HTML 뷰 (1:1 매칭 필수)
│   └── logic/              # JS 로직 (1:1 매칭 필수)
│       └── app.js          # Vue Router 초기화
├── backend/
│   ├── wrangler.toml       # Cloudflare Workers 설정
│   ├── package.json
│   └── src/
│       ├── index.js        # Hono 앱 진입점
│       ├── routes/         # API 라우트 (입력검증 + 서비스 호출만)
│       ├── services/       # 비즈니스 로직 (export class, constructor(env))
│       ├── middleware/      # cors, error, auth(미래)
│       └── utils/          # 유틸리티
└── .claude/
    ├── agents/             # 에이전트 정의
    ├── skills/             # 스킬 정의
    ├── rules/              # 코딩 규칙
    ├── docs/               # 스펙 문서
    ├── templates/          # 코드 템플릿
    ├── hooks/              # 검증 훅
    ├── commands/           # 슬래시 커맨드
    ├── progress.md         # 진행 상황
    └── worklog.md          # 작업 로그
```

---

## 코딩 규칙 (필독)

### Backend
- `.claude/rules/backend-guide.md` 참조
- Route: 입력 검증 + 서비스 호출만. 비즈니스 로직/DB 직접 접근 금지
- Service: `export class`, `constructor(env)`, D1은 prepared statements 필수
- 에러: ValidationError(400) / NotFoundError(404) / ServerError(500)
- **D1 주의**: PostgreSQL `$1/$2` 대신 `?` 파라미터 사용

### Frontend
- `.claude/rules/frontend-guide.md` 참조
- `src/views/{name}.html` ↔ `src/logic/{name}.js` 1:1 매칭 필수
- API 호출: `this.$api.get/post/put/delete()`
- 페이지 이동: `this.navigateTo('/path', { key: value })`

---

## 주요 화면

| 경로 | 화면 | 설명 |
|---|---|---|
| `/` | 홈 | 히어로 + ETF 검색 + 인기 프리셋 |
| `/etf/:ticker` | ETF 상세 | 성과비교 + 이김/짐 분석 + 종목정보 탭 |
| `/ranking` | 랭킹 | 기간별 지수 대비 성과 순위 |
| `/timing` | 타이밍 시뮬레이터 | 상위 상승일 놓치면? (책 13장) |
| `/fee-simulator` | 비용 시뮬레이터 | 비용 차이의 복리 효과 (책 9장, 14장) |
| `/retirement` | 퇴직연금 시뮬레이터 | 원리금보장 vs 인덱스 (책 PART 4) |
| `/insights` | 인사이트 | 교육 콘텐츠 (책 PART 1-4) |
| `/book` | 책 소개 | 도서 연계 + 구매 링크 |

---

## 핵심 계산 로직

```
누적 수익률 = (현재가 / 시작가 - 1) × 100
초과수익률 = ETF 누적수익률 - 지수 누적수익률
CAGR = (최종가/시작가)^(1/년수) - 1
MDD = (최저점 - 이전 최고점) / 이전 최고점 × 100
Sharpe = (연환산 수익률 - 무위험 수익률) / 연환산 변동성
롤링 N년 승률 = (N년 보유 후 지수를 이긴 시작점 수) / 전체 시작점 수
```

---

## 데이터 소스

- **Yahoo Finance API** (Workers에서 fetch 직접 호출)
  - v8 chart: 일별 종가, 기간별 가격 데이터
  - quoteSummary: ETF 기본정보, 구성종목, 섹터 비중
  - cookie + crumb 인증 방식
- **벤치마크**: ^GSPC (S&P 500), ^NDX (NASDAQ 100) 또는 SPY, QQQ
- **캐시 전략**: KV 1시간(가격), KV 24시간(ETF 정보), D1 영구(히스토리)

---

## 개발 진행

현재 진행 상황: `.claude/progress.md`
작업 로그: `.claude/worklog.md`

### 주요 커맨드
- `/pm` — 프로젝트 상태 확인
- `/pm 시작` — 새 세션 시작
- `/pm 완료` — 세션 마무리
- `/new-page {name} {제목}` — 새 페이지 생성
- `/new-api {route} {METHOD} {경로} {설명}` — 새 API 엔드포인트 생성
- `/build-phase {N}` — Phase N 전체 빌드

---

## SP500Simulator와의 차이점

| 항목 | SP500Simulator | Index Power Forever |
|---|---|---|
| 목적 | 포트폴리오 리밸런싱 백테스팅 | 지수 대비 ETF 성과 비교 |
| 인증 | JWT 필요 | 로그인 없음 |
| DB | D1 (사용자 데이터) | D1 (캐시만) |
| 한국 ETF | 지원 | 미지원 (미국 전용) |
| SQL 파라미터 | `?` (D1/SQLite) | `?` (D1/SQLite) |
