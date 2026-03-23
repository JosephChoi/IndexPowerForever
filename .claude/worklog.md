# Index Power Forever — 작업 로그

---

## 세션 #8 — 2026-03-23 (20:00 ~ 22:00 KST)

### 시작 시 상태
- Phase 0~4 전체 완료 (42/42 + 10)
- Post-MVP 트래킹 체계 필요

### 작업 내용

**Post-MVP 트래킹 체계 구성 (P-000)**
- `.claude/post-mvp.md` 신규 생성 (MVP 이후 추가 기능 별도 관리)
- `progress.md` 하단에 Post-MVP 문서 참조 링크 추가

**P-001: 프리셋 카드 개별 티커 클릭**
- 카드 전체 클릭(`onPresetClick`) → 개별 뱃지 클릭(`onSelectResult`)으로 변경
- `ticker-badge-clickable` 호버 스타일 추가 (translateY + scale + box-shadow)
- 카드에서 `card-clickable` 제거

**P-002: 10Y 기간 선택 시 5Y 데이터만 반환되는 버그 수정**
- 원인: D1에 5Y 데이터만 캐시된 상태에서 10Y 요청 시 `d1Prices.length > 0`이면 바로 반환
- KV 캐시에도 잘못된 5Y 데이터가 `price:DVY:10Y` 키로 저장됨
- PriceService: `_coversRequestedPeriod()` 메서드 추가 (데이터 시작일 vs 요청 시작일 비교, 90일 허용)
- KV 캐시 반환 시에도 동일 검증 적용
- CompareService: `_cacheCoversperiod()` 메서드 추가 (`dataRange.start` 기준 검증)

**P-003: 로딩 화면 맞춤 메시지 적용**
- CSS: `loading-context`, `loading-fullscreen` 컴포넌트 추가 (회전 애니메이션 + 점 애니메이션)
- 홈: "인기 프리셋을 불러오는 중..."
- ETF 상세 초기: "{ticker} 성과 데이터를 수집하는 중..."
- ETF 상세 기간 변경: "{period} 기간 성과를 분석하는 중..." (글래스모피즘 오버레이)
- 승률 탐색기: "{N}년 보유 시 승률을 계산하는 중..."
- 랭킹: "ETF 성과 랭킹을 집계하는 중..."
- 타이밍: "타이밍 시뮬레이션을 실행하는 중..."
- 라우터 전환: "페이지를 준비하는 중..."
- 아이콘 `bi-arrow-repeat` 통일 + `loading-spin` 회전 애니메이션 적용

**P-004: D1 가격 데이터 최신성 자동 보충**
- 문제: D1에 3/20까지 데이터 → 3/23에 검색해도 3/20 데이터 반환 (최신 종가 미반영)
- PriceService 전면 개편:
  - 모든 기간에 `_isRecentEnough` 체크 적용 (4일 허용, 주말/공휴일 고려)
  - D1 데이터가 있지만 오래된 경우 → Yahoo에서 부족분만 보충 (`_fetchRecent`)
  - `_mergePrices`: 기존 D1 + 신규 Yahoo 병합 (중복 제거, 날짜순 정렬)
- CompareService: `_cacheIsRecent` 검증 추가 (`dataRange.end` 기준 4일 체크)
- D1 현황: 29개 종목, SPY 8342건(1993~), 전체 최신 날짜 3/20

**P-005: 주요 종목 일일 자동 업데이트 (Cron Trigger)**
- `DailyUpdateService.js` 신규 생성
- wrangler.toml에 Cron 설정: `0 22 * * 1-5` (UTC 22:00 = KST 07:00, 월~금)
- 실행 로직: ranking_etf 25종목 + SPY/QQQ → D1 마지막 날짜 이후만 Yahoo 보충
- 종목 간 1.5초 딜레이 (Yahoo API 부하 방지)
- 업데이트 후 관련 KV 캐시 자동 무효화 (price/compare/ranking 키)
- 수동 트리거: `/api/admin/update-prices` 엔드포인트 추가
- index.js `export default` 변경: Hono fetch 컨텍스트 바인딩 수정 (502 에러 해결)
- 초기 실행 결과: 25종목 전부 skipped (3/23 일요일, 새 거래일 없음) ✅

**인프라: Cloudflare Workers 유료 전환**
- KV 쓰기 무료 한도(1,000/일) 50% 경고 수신
- $5/월 유료 플랜 전환 (Workers 실행 시간 10ms → 30초, KV 쓰기 100만/월)

### 결과 파일 목록
- `.claude/post-mvp.md` — 신규 생성
- `.claude/progress.md` — Post-MVP 참조 추가
- `frontend/views/home.html` — 프리셋 뱃지 클릭 + 로딩 메시지
- `frontend/views/etf-detail.html` — 로딩 메시지 3곳
- `frontend/views/ranking.html` — 로딩 메시지
- `frontend/views/timing.html` — 로딩 메시지
- `frontend/css/style.css` — ticker-badge-clickable + loading-context/fullscreen + spin
- `frontend/logic/app.js` — 라우터 로딩 컴포넌트
- `backend/src/services/PriceService.js` — 캐시 기간 검증 + 최신성 검증 + 부족분 보충
- `backend/src/services/CompareService.js` — 캐시 기간/최신성 검증
- `backend/src/services/DailyUpdateService.js` — 신규 (일일 자동 업데이트)
- `backend/src/index.js` — Cron 핸들러 + 수동 트리거 + fetch 바인딩 수정
- `backend/wrangler.toml` — Cron Trigger 설정 추가

### 커밋 이력
- `852f961` feat: preset card individual ticker navigation + post-MVP tracking
- `7194035` fix: D1 cache returning incomplete data for longer periods
- `654c08d` fix: validate KV cache coverage for requested period
- `697080e` design: contextual loading messages with pulse animation
- `0784f8a` design: spinning arrow icon for loading states
- `bad0f41` fix: auto-refresh stale D1 price data from Yahoo
- `4328d00` feat: daily cron job for price data auto-update
- `24aab25` fix: bind Hono fetch context for Workers export

### 다음 세션 할 일
1. ETF 상세 페이지 디자인 표준 적용 (세션 #7에서 미완)
2. book.html 디자인 개선
3. 책 구매 링크 URL 확정 시 교체
4. 실제 책 표지 이미지 교체 (현재 SVG 더미)
5. 10Y 데이터 실제 동작 확인 (배포 후)
6. Cron 첫 실행 결과 확인 (3/24 월요일 KST 07:00)

### 참고사항
- Post-MVP 작업은 `.claude/post-mvp.md`에서 별도 관리 (안정화 후 Phase 5+로 통합)
- 캐시 기간 검증: 데이터 시작일이 요청 시작일보다 90일 이상 늦으면 Yahoo 재조회
- Workers epoch 문제: 모듈 스코프 `new Date()` 사용 금지 (세션 #7 참고)

---

## 세션 #7 — 2026-03-22 (저녁 KST)

### 시작 시 상태
- Phase 0~3 전체 완료 (42/42)
- 전체 QA 후 디자인 개선 필요 (6.8/10 평가)

### 작업 내용

**홈 페이지 프로모션 배너**
- 책 표지 이미지 + 소개 문구 + "자세히 보기" 버튼 추가
- book.html 연결

**네비게이션 바 구조 개편**
- 시뮬레이터 3개(타이밍/비용/퇴직연금)를 "시뮬레이터" 드롭다운으로 그룹화
- 각 항목에 한 줄 설명 텍스트 추가

**Navbar DOM 위치 수정**
- `#navbar-container`가 `#app` 내부에 있어 Vue 마운트 시 덮어씌워지는 문제 발생
- `#navbar-container`를 `#app` 바깥(상위)으로 이동하여 해결

**저자명 업데이트**
- 책 표지 SVG 및 book.html에 "김대중 · 최근민" 반영

**디자인 감수**
- 전체 8개 페이지 디자인 분석 (평균 6.8/10)
- 주요 문제: 페이지 간 디자인 불일치, 카드/테이블 스타일 혼재, 타이포그래피 체계 부재

**디자인 가이드 문서 생성**
- `.claude/rules/design-guide.md` 생성
- CSS 변수 체계(색상/간격/라운딩/그림자), 컴포넌트 표준, 반응형 전략 정의

**CSS 디자인 시스템 v3 적용 (`frontend/css/style.css`)**
- CSS 변수: `--color-*`, `--space-*`, `--radius-*`, `--shadow-*`
- 표준 컴포넌트 6종: `card-base`, `table-standard`, `btn-group-selector`, `sim-slider`, `page-header`, `sim-panel`

**6개 페이지 디자인 표준 적용**
- `home.html` / `timing.html` / `fee-simulator.html` / `retirement.html` / `ranking.html` / `insights.html`
- 각 페이지에 `page-header`, `card-base`, `table-standard` 등 표준 클래스 적용

**네비게이션 바 리디자인 (`frontend/components/navbar.html`)**
- 다크 그라데이션 배경
- 브랜드 아이콘(차트 아이콘) 추가
- 드롭다운 메뉴 레이아웃 개선 (아이콘 + 설명 텍스트)

**차트 렌더링 수정**
- `document.getElementById('canvas')` 방식 → `this.$refs.canvas` 방식으로 전환
- 대상: `fee-simulator.js`, `retirement.js`, `etf-detail.js`
- Vue 라이프사이클 내 올바른 DOM 참조 확보

**타이밍 시뮬레이터 백엔드 수정 (`backend/src/services/TimingService.js`)**
- `MAX_YEAR`를 모듈 스코프(`const MAX_YEAR = new Date().getFullYear()`)에서 요청 핸들러 내부로 이동
- Cloudflare Workers epoch 문제: 모듈 스코프에서 `new Date()`가 배포 시점 기준으로 고정되는 현상 해결

**타이밍 시뮬레이터 UX 개선 (`frontend/logic/timing.js`, `timing.html`)**
- "놓친 상승일" 수동 입력 버튼 제거
- 슬라이더 연동 제거
- 슬라이더 값 변경 시 자동으로 시뮬레이션 실행 (즉각 반응)

### 결과 파일 목록
- `frontend/css/style.css` — CSS 디자인 시스템 v3
- `frontend/components/navbar.html` — 리디자인
- `frontend/views/home.html` — 프로모션 배너 + 디자인 표준
- `frontend/views/timing.html` — 디자인 표준 + UX 개선
- `frontend/views/fee-simulator.html` — 디자인 표준
- `frontend/views/retirement.html` — 디자인 표준
- `frontend/views/ranking.html` — 디자인 표준
- `frontend/views/insights.html` — 디자인 표준
- `frontend/logic/timing.js` — 자동 시뮬레이션
- `frontend/logic/fee-simulator.js` — $refs 차트 수정
- `frontend/logic/retirement.js` — $refs 차트 수정
- `frontend/logic/etf-detail.js` — $refs 차트 수정
- `backend/src/services/TimingService.js` — MAX_YEAR 스코프 수정
- `.claude/rules/design-guide.md` — 신규 생성

### 다음 세션 할 일
1. ETF 상세 페이지 디자인 표준 적용 (현재 세션 미완)
2. book.html 디자인 개선
3. 책 구매 링크 URL 확정 시 교체 (`book.html` 내 `purchaseUrl: '#'`)
4. 실제 책 표지 이미지 교체 (현재 SVG 더미)
5. 전체 QA: 디자인 개선 후 실사용 테스트

### 참고사항
- CSS 변수 체계는 `.claude/rules/design-guide.md` 참조
- Navbar는 `#app` 바깥에 위치 — Vue 마운트 범위 밖이므로 Vue 데이터 바인딩 불가
- 타이밍 시뮬레이터: Workers epoch 문제로 모듈 스코프 `new Date()` 사용 금지

---

## 세션 #6 — 2026-03-22 (17:30 ~ 18:45 KST)

### 시작 시 상태
- Phase 0~2 완료, Phase 3 일부 완료 (7/10)
- 승률 탐색기 Step 네비게이션 버그 (Step 2/3 진행 불가)

### 작업 내용

**승률 탐색기 Step 네비게이션 수정**
- `step-dimmed` CSS 클래스의 `pointer-events: none`로 버튼 클릭 불가 → `v-if`로 Step 표시/숨김 전환
- Step 1 하단: "다음: 투자 가능 시작일 알아보기" 버튼 추가
- Step 2 하단: "다음: 승부 결과 확인하기" 버튼 이동

**승률 탐색기 → 인덱스 승률 연결**
- Step 3 결과 하단에 "더 많은 결과 보기" 버튼 추가
- 클릭 시 인덱스 승률 탭(`activeTab = 'analysis'`)으로 전환

**Phase 3-4: 에러 처리 + 로딩 상태 전체 검토**
- 프론트엔드: Home/Ranking/Timing에 에러 재시도 버튼 + 빈 데이터 메시지 추가
- 백엔드: 모든 `JSON.parse()` 호출에 try-catch (KV/D1 캐시 7곳, D1 JSON 필드 3곳)
- translate.js: `c.req.json()` 파싱 + `AI.run()` 실패 처리
- YahooService: `res.json()` 비JSON 응답 대응 (chart, quoteSummary, search)

**Phase 3-5: 성능 최적화**
- RankingService: 순차 ETF 분석 → 동시 3개 병렬 처리 (Promise.allSettled)
- Rolling detail: 압축 필드명(d/e/er/br/w)으로 JSON 페이로드 ~50% 축소
- 프론트엔드: computed에서 압축 필드 → 읽기 쉬운 필드로 변환

**Phase 3-6: 책 소개 페이지 전면 개편**
- PDF 내용 기반 5 PART, 21장 전체 목차 + 각 장별 요약
- SVG 더미 표지 생성 (다크 배경 + 우상향 차트 + 제목)
- 서문 발췌, 핵심 수치(SPIVA 데이터), 메시지 카드
- 각 시뮬레이터 연계 링크 (장 번호 매핑)
- 구매 URL은 `purchaseUrl: '#'` — URL 확정 시 교체

### 다음 세션 할 일
1. 전체 QA: 각 페이지 실사용 테스트
2. 승률 탐색기 실사용 테스트 및 UX 개선
3. 구매 링크 URL 확정 시 교체
4. 실제 책 표지 이미지 교체

---

## 세션 #5 — 2026-03-22 (02:30 ~ 03:20 KST)

### 시작 시 상태
- Phase 0~2 완료, Phase 3 일부 완료 (5/8)
- "전체" 기간 선택 시 데이터가 5년치로 제한되는 버그 존재

### 작업 내용

**Yahoo API 전체 기간 데이터 수정**
- `range=max` 파라미터가 crumb 인증 시 5년치만 반환하는 Yahoo API 제한 발견
- `period1=0&period2=now` 타임스탬프 방식으로 변경하여 전체 기간 데이터 정상 조회
- `query1.finance.yahoo.com` → `query2.finance.yahoo.com`으로 변경
- PriceService: `max` 기간은 D1 캐시 건너뛰고 항상 Yahoo 직접 조회 (D1에 부분 데이터만 있으면 잘못된 결과 방지)
- 디버그 엔드포인트로 Worker→Yahoo API 응답 직접 확인하여 원인 규명

**ETF 설명 전문 + 한국어 번역**
- 설명 300자 하드코딩 잘림 → 3줄 미리보기 + "더보기/접기" 토글
- Cloudflare Workers AI (`@cf/meta/m2m100-1.2b`) 바인딩 추가
- `/api/translate` 엔드포인트 신규 생성 (영→한 번역, KV 7일 캐시)
- "한국어로 보기" / "원문 보기" 토글 버튼 추가

**검색 드롭다운 정렬 개선**
- 히어로 `text-align: center` 상속으로 드롭다운 중앙 정렬 버그 수정
- `display: flex` + `text-align: left` 적용
- 티커를 파란색 뱃지(`badge bg-primary`)로 시각 구분

### 이슈 및 해결
- KV 캐시가 이전 잘못된 데이터를 계속 반환 → 전체 KV 벌크 삭제 (54개 키) + D1 price_cache 전체 삭제
- `_needsYahooFetch` 6년 임계값 방식은 ETF 설정일을 모르므로 부정확 → max일 때 D1 캐시 자체를 건너뛰는 방식으로 단순화
- WebFetch 15분 캐시로 API 결과 확인 시 혼동 → `_t=` 파라미터로 캐시 우회

### 다음 세션 할 일
1. **번역 기능 확인**: Workers AI 번역 품질 검토 (필요시 다른 모델로 교체)
2. **Phase 3-4**: 에러 처리 + 로딩 상태 전체 검토
3. **Phase 3-5**: 성능 최적화 (캐시 전략 검토)
4. **책 구매 링크**: URL 확정 후 `book.html` 수정

### 참고사항
- Workers AI 바인딩: `wrangler.toml`에 `[ai] binding = "AI"` 추가됨
- Yahoo API: crumb 인증은 quoteSummary에만 사용, chart API는 period1/period2 + crumb 조합
- max 기간 데이터: KV 1시간 캐시만 적용, D1 캐시는 건너뜀 (항상 Yahoo 최신 데이터)

---

## 세션 #4 — 2026-03-22 (01:36 ~ 02:20 KST)

### 시작 시 상태
- Phase 0~2 완료, Phase 3 일부 완료 (인사이트/책 소개)
- Workers/Pages 배포 미연결 상태

### 작업 내용

**배포 환경 구성**
- Cloudflare Pages ↔ GitHub 연결 (사용자 수동 — 직접업로드 방식 Pages 삭제 후 Git 연결로 재생성)
- Workers API URL 수정: `index-power-forever.sixman-joseph.workers.dev`
- Pages 프로젝트명: `index-power-forever` (도메인: `indexpowerforever.pages.dev`)
- GitHub Actions `deploy-frontend.yml`의 `--project-name` 이 실제 배포 담당 확인 (wrangler pages deploy 방식)

**프론트엔드 버그 수정**
- `app.js`: `beforeCreate` 템플릿 동적 설정 → `defineAsyncComponent` 패턴으로 수정 (스피너만 돌고 렌더링 안 되는 문제 해결)
- `insights.html`: `:href="card.link"` → `@click.prevent="navigateTo(card.link)"` SPA 라우팅 수정

**디자인 개선**
- 홈 히어로 섹션 리디자인: 다크 테마 + 그리드 배경 + 그라디언트 발광 + 글래스모피즘 검색창
- 히어로 제목: **"이길 수 있는 투자만 하라"** (책 제목 연계)
- ETF 상세 페이지 전면 리디자인:
  - 다크 헤더 배너 + 그라디언트 티커 + 풀네임 + 메타칩(운용보수/AUM/설정일)
  - KPI 카드 4개 (총수익률/CAGR/MDD/샤프) 상단 배치
  - 차트카드, 롤링카드, 테이블 스타일 전면 교체
  - 탭바 sticky 적용

**백엔드 수정**
- `YahooService`: quoteSummary에 `quoteType` 모듈 추가
- `EtfService`: ETF 이름을 `quoteType.longName`에서 가져오도록 수정 (기존: `${ticker} ETF`)
- D1 + KV 캐시 수동 삭제 (기존 잘못된 name 데이터 제거)

**인덱스 승률 관점 전환**
- 탭명: "이김/짐 분석" → **"인덱스 승률"**
- 관점: ETF 승률 → 인덱스 승률 (100 - ETF승률)로 전환
- 설명 배너 추가: "인덱스 승률이란?" 한 줄 안내
- 연도별 테이블: 인덱스 기준 승/패 표시, 열 순서 변경
- 홈 화면 소개 문구 동기화

### 이슈 및 해결
- Pages GitHub 연동 후에도 wrangler deploy가 실제 배포 담당 → workflow에서 wrangler 제거 시 배포 실패 → 원복
- KV 원격 캐시에 잘못된 ETF name이 남아 있어 풀네임 반영 안 됨 → `wrangler kv key delete` 로 수동 삭제

### 다음 세션 할 일
1. **Phase 3-4**: 에러 처리 + 로딩 상태 전체 검토
2. **Phase 3-5**: 성능 최적화 (캐시 전략 검토)
3. **책 구매 링크**: URL 확정 후 `book.html` 수정
4. **ETF 풀네임 확인**: 새 ETF 검색 시 `quoteType.longName` 정상 반환 확인

### 참고사항
- Workers URL: `https://index-power-forever.sixman-joseph.workers.dev`
- Pages URL: `https://indexpowerforever.pages.dev`
- Pages 프로젝트명(`index-power-forever`)과 도메인(`indexpowerforever`)이 다름 주의
- GitHub Actions가 wrangler로 Pages 배포함 (Pages GitHub 직접 연동과 별개)

---

## 세션 #3 — 2026-03-22 (00:17 ~ 00:36 KST)

### 시작 시 상태
- Phase -1 스펙 완료, Phase 0~2 미착수

### 작업 내용

**Phase 0: 환경 구축 (전체 CLI로 처리)**
- Git 초기화 + `main` 브랜치 + GitHub 레포 생성 (`JosephChoi/IndexPowerForever`)
- Cloudflare D1 생성: `index-power-forever` (ID: `d83bdf6e-ce60-47d3-a415-455f24b69295`)
- Cloudflare KV 생성: `IPF_KV` (ID: `d9325ab1fd164d17bb4065dbcbb4515e`)
- Cloudflare Pages 프로젝트 생성: `index-power-forever.pages.dev`
- GitHub Actions 자동 배포 설정:
  - `.github/workflows/deploy-backend.yml` — `backend/` 변경 시 Workers 배포
  - `.github/workflows/deploy-frontend.yml` — `frontend/` 변경 시 Pages 배포
  - GitHub Secrets 등록: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`
- `backend/` 구조 생성, `package.json`, `wrangler.toml` 작성, `npm install`
- D1 마이그레이션 실행 (로컬 + 원격):
  - `0001_init.sql`: 5개 테이블 생성
  - `0002_seed.sql`: preset 6개, ranking_etf 25개 seed

**Phase 1: 백엔드 전체 구현**
- `src/middleware/`: `cors.js`, `error.js`
- `src/services/`: `YahooService`, `EtfService`, `PriceService`, `CalculationService`, `CompareService`, `RankingService`, `PresetService`, `TimingService` (8개)
- `src/routes/`: `etf.js`, `compare.js`, `ranking.js`, `presets.js`, `timing.js` (5개)
- `src/index.js`: Hono 앱 초기화 + 라우트 마운트

**Phase 2: 프론트엔드 전체 구현**
- `frontend/index.html`: SPA 진입점 (Vue 3 + Vue Router + Chart.js + Bootstrap 5 CDN)
- `frontend/logic/app.js`: Vue 앱 초기화, `$api` 플러그인, `navigateTo`/`getParam` mixin
- `frontend/components/navbar.html`: 공통 네비게이션
- `frontend/css/style.css`: 색상 변수, 히어로, 차트, 카드 스타일
- views + logic 8쌍: `home`, `etf-detail`, `ranking`, `timing`, `fee-simulator`, `retirement`, `insights`, `book`
- `.gitignore` 추가 (node_modules, .wrangler 제외)
- 전체 커밋 + 푸시

### 다음 세션 할 일
1. **로컬 테스트**: `wrangler dev` 로 백엔드 실행 → API 동작 확인
2. **Phase 3-3**: 에러 처리 + 로딩 상태 전체 검토
3. **Phase 3-4**: 성능 최적화 (캐시 전략 검토)
4. **배포**: Cloudflare Pages ↔ GitHub 대시보드 연결 (수동 1회)

### 참고사항
- `app.js`의 `makeView`에서 kebab-case → snake_case 변환 처리 (`etf-detail` → `__view_etf_detail`)
- Workers URL: `https://index-power-forever.workers.dev` (배포 후 활성화)
- Pages URL: `https://index-power-forever.pages.dev` (배포 후 활성화)

---

## 세션 #2 — 2026-03-22 (00:10 ~ 00:17 KST)

### 시작 시 상태
- Phase -1 스펙 문서 전체 완료 (`.claude/docs/` 에 저장)
- progress.md가 실제 완료 상태를 반영 못하고 있었음

### 작업 내용
- progress.md 업데이트: Phase -1 전체 완료 처리 (7/7)
- worklog.md 세션 #2 추가

### 다음 세션 할 일
1. Phase 0: 환경 구축
   - 0-1: Git 초기화 + GitHub 레포 생성 (수동)
   - 0-2: Cloudflare D1/KV 생성 (수동)
   - 0-3: 프로젝트 구조 생성 (backend/frontend 폴더)
   - 0-4: backend package.json + wrangler.toml 설정
   - 0-5: D1 마이그레이션 파일 작성 + 실행

---

## 세션 #1 — 2026-03-21 (시간 미기록)

### 시작 시 상태
- 프로젝트 초기 상태
- 기획안.md만 존재
- .claude/ 설정 파일들 준비 완료

### 목표
- 프로젝트 설정 구조 구축 (에이전트, 스킬, 훅, 커맨드, 규칙)
- Phase -1 (스펙 문서 생성) 준비

### 결과
- 완료한 작업:
  - CLAUDE.md 생성
  - .claude/agents/ — planner, architect, db-schema-spec, api-spec, frontend-spec, reviewer, finalizer, tester, project-manager (9개)
  - .claude/skills/ — create-page, create-endpoint, build-phase, run-tests, review-code, fix-backend, fix-frontend (7개)
  - .claude/hooks/ — validate-structure.py, validate-backend.py, validate-viewlogic.py (3개)
  - .claude/commands/ — pm.md, new-page.md, new-api.md (3개)
  - .claude/rules/ — backend-guide.md, frontend-guide.md, architecture.md, coding-conventions.md (4개)
  - .claude/settings.json (권한 + 훅 설정)
  - .claude/progress.md, worklog.md

### 다음 세션 할 일
1. `docs/specs/00-business-brief.md` 작성 (기획안.md 기반)
2. planner 에이전트 실행 → PRD 생성
3. architect 에이전트 실행 → 시스템 아키텍처
4. db-schema-spec 에이전트 실행
5. api-spec 에이전트 실행
6. frontend-spec 에이전트 실행
7. reviewer + finalizer 에이전트 실행

### 참고사항
- D1 (SQLite) 사용 — PostgreSQL 문법 금지, `?` 파라미터 사용
- 인증 없음 — 역할 가드, JWT 불필요
- Yahoo Finance API: cookie + crumb 인증 (SP500Simulator YahooService 참조)
- 훅이 PostgreSQL `$1/$2` 파라미터 사용 감지 시 자동 차단
