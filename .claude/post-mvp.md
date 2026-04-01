# Index Power Forever — Post-MVP 추가 기능

> MVP(Phase 0~4) 완료 후 추가되는 기능/변경 사항을 별도 관리합니다.
> 마지막 업데이트: 2026-04-01 (세션 #17)

## 관리 원칙

1. **MVP 문서와 분리**: `progress.md`(Phase 0~4)는 확정된 MVP 기록으로 유지
2. **이 문서에서 추적**: 신규 요청은 여기에 기록 후 구현
3. **통합 시점**: 기능이 안정화되면 `progress.md`에 Phase 5+로 통합

---

## 📋 Post-MVP 작업 목록

| ID | 기능/변경 | 상태 | 요청일 | 완료일 | 비고 |
|---|---|---|---|---|---|
| P-001 | 프리셋 카드 개별 티커 클릭 → 해당 종목 상세 이동 | [x] | 2026-03-23 | 2026-03-23 | 카드 전체 클릭 → 개별 뱃지 클릭으로 변경 |
| P-002 | 10Y 기간 선택 시 5Y 데이터만 반환되는 버그 수정 | [x] | 2026-03-23 | 2026-03-23 | KV/D1 캐시 기간 커버리지 검증 추가 |
| P-003 | 로딩 화면 맞춤 메시지 적용 | [x] | 2026-03-23 | 2026-03-23 | 각 페이지별 상황 설명 + 펄스 애니메이션 |
| P-004 | D1 가격 데이터 최신성 자동 보충 | [x] | 2026-03-23 | 2026-03-23 | D1 데이터가 4일 이상 오래되면 Yahoo에서 부족분만 보충 |
| P-005 | 주요 종목 일일 자동 업데이트 (Cron Trigger) | [x] | 2026-03-23 | 2026-03-23 | 매일 KST 07:00 랭킹 25종목+벤치마크 가격 자동 갱신 |
| P-006 | 10Y/max 기간 전환 시 잘못된 데이터 반환 버그 수정 | [x] | 2026-03-24 | 2026-03-24 | PriceService/CompareService 기간 검증 강화 |
| P-007 | 디폴트 기간 5Y → max 변경 | [x] | 2026-03-24 | 2026-03-24 | 프론트엔드 ETF 상세 페이지 기본값 변경 |
| P-008 | 크론잡 대상 확장 — ranking_etf + price_cache 전체 종목 | [x] | 2026-03-24 | 2026-03-24 | ranking_etf UNION price_cache 전체로 확대 |
| P-009 | Yahoo 데이터 fetch 최적화 — getChartSince(lastDate) 도입 | [x] | 2026-03-24 | 2026-03-24 | 1Y 전체 대신 lastDate 이후만 조회 |
| P-010 | D1 데이터 충전율 검증 로직 추가 | [x] | 2026-03-24 | 2026-03-24 | 90% 미만이면 Yahoo 전체 재조회 |
| P-011 | D1 불완전 데이터 7개 종목 복구 | [x] | 2026-03-24 | 2026-03-24 | 삭제 후 Yahoo 전체 재조회로 복구 |
| P-012 | 벤치마크 차트 선 스타일 변경 — 점선 → 실선 | [x] | 2026-03-24 | 2026-03-24 | SPY/QQQ 선을 얇은 실선으로 변경 |
| P-013 | 프리셋에서 벤치마크 ETF(SPY/QQQ) 제거 | [x] | 2026-03-25 | 2026-03-25 | 인기 검색에서도 벤치마크 필터링 |
| P-014 | 랭킹 → 주요 ETF 성과비교로 리브랜딩 | [x] | 2026-03-25 | 2026-03-25 | 제목/네비/로딩 문구 전면 변경 |
| P-015 | 성과비교 ETF 목록을 AUM 상위 30개로 교체 | [x] | 2026-03-25 | 2026-03-25 | 임의 25개 → US 상장 시가총액 상위 30개 |
| P-016 | 성과비교 테이블에 AUM 컬럼 추가 + 정렬 기능 | [x] | 2026-03-25 | 2026-03-25 | etf_info(Yahoo) 기반 AUM + 컬럼별 정렬 |
| P-017 | SPYM → SPLG 티커 교체 | [x] | 2026-03-25 | 2026-03-25 | Yahoo Finance 호환 위해 구 티커 사용 |
| P-018 | 성과비교 연승률 컬럼 제거 | [x] | 2026-03-25 | 2026-03-25 | 테이블 간소화 |
| P-019 | 차트 드래그로 원하는 구간 수익률 비교 기능 추가 | [x] | 2026-03-29 | 2026-03-29 | Chart.js 커스텀 플러그인, 마우스+터치 지원, 실시간 수익률 계산 |
| P-020 | 전체 페이지 모바일 최적화 | [x] | 2026-03-30 | 2026-03-30 | 랭킹/ETF상세/비용시뮬레이터 테이블→카드, 슬라이더 터치 타겟, 차트 반응형 |
| P-021 | 모바일 햄버거 메뉴 아이콘 흰색으로 변경 | [x] | 2026-03-30 | 2026-03-30 | 다크 네비게이션 배경에서 SVG 색상 변경 |
| P-022 | ETF 상세 모바일 헤더 레이아웃 개선 | [x] | 2026-03-30 | 2026-03-30 | 메타칩 같은 행 배치, 검색 버튼 우상단 고정, flex-wrap nowrap |
| P-023 | 네비게이션/탭바/스피너 정리 | [x] | 2026-03-30 | 2026-03-30 | 메뉴 "성과비교"→"랭킹" 복원, 벤치마크 라벨, 랭킹 스피너 중앙 배치 |
| P-024 | 프론트엔드 중복 배포 워크플로우 제거 | [x] | 2026-03-30 | 2026-03-30 | deploy-frontend.yml 삭제, Cloudflare Pages Git 연동 단일화 |
| P-025 | 프론트엔드/백엔드 전체 검증 + 미정의 CSS 3건 수정 | [x] | 2026-03-30 | 2026-03-30 | book-cover-shadow, book-author, desc-toggle-wrap CSS 추가 |
| P-026 | 서비스 로고 SVG + 파비콘 생성 및 적용 | [x] | 2026-03-30 | 2026-03-30 | 우상향 차트 디자인 SVG, 네비게이션 Bootstrap Icons → SVG 로고 교체 |
| P-027 | 탭바 밑줄 스타일 복원 + 연한 블루 배경 | [x] | 2026-03-30 | 2026-03-30 | ETF 상세 모바일 탭바 디자인 강화 |
| P-028 | SPY 전체기간 NASDAQ 100 차트/수치 잘림 버그 수정 | [x] | 2026-03-30 | 2026-03-30 | CompareService 벤치마크별 실제 기간 CAGR 산출, 차트 날짜 합집합 매핑 |
| P-029 | 홈 인기 프리셋 즉시 표시 (API 호출 제거) | [x] | 2026-03-30 | 2026-03-30 | 프리셋 6개 하드코딩, 로딩 오버레이 제거 |
| P-030 | 서비스명 indexwins로 변경 | [x] | 2026-03-30 | 2026-03-30 | 네비게이션 바 타이포그래피 로고, 페이지 타이틀 변경 |
| P-031 | 커스텀 도메인 indexwins.com 설정 | [x] | 2026-03-30 | 2026-03-30 | 가비아→Cloudflare 네임서버, Pages/Workers 커스텀 도메인, API URL 변경 |
| P-032 | ETF 상세 차트 기간/벤치마크 전환 애니메이션 | [x] | 2026-03-31 | 2026-03-31 | destroy→재생성 대신 데이터 업데이트 방식, Chart.js 인스턴스 반응성 밖 관리로 stack overflow 해결 |
| P-033 | 퇴직연금 시뮬레이터 UX 개선 | [x] | 2026-03-31 | 2026-03-31 | 연수익률 표시, 억/만원 포맷, 카드 디자인 개선, 초과수익 분리, 0원 허용, 디스클레이머 |
| P-034 | 비용 시뮬레이터 운용보수 강조 + 디스클레이머 | [x] | 2026-03-31 | 2026-03-31 | 운용보수 열 빨간 볼드+테두리, 하단 디스클레이머 추가 |
| P-035 | 타이밍 시뮬레이터 카드 레이아웃 + 디스클레이머 | [x] | 2026-03-31 | 2026-03-31 | 전체 투자 강조 카드 상단, 4열 그리드, 문구 개선, 디스클레이머 추가 |
| P-036 | 로컬 개발 서버 생성 | [x] | 2026-03-31 | 2026-03-31 | dev-server.js — SPA fallback 지원 |
| P-037 | 일일 가격 업데이트 타임아웃 수정 | [x] | 2026-03-31 | 2026-03-31 | waitUntil() 적용, test-update 엔드포인트 추가 |
| P-038 | PM 스킬 복구 (commands→skills 마이그레이션) | [x] | 2026-03-31 | 2026-03-31 | .claude/skills/pm/skill.md 생성 |
| P-039 | 차트 드래그 선택 영역 시각화 | [~] | 2026-04-01 | | 선택 영역 음영+경계선 표시, state 저장 위치 수정 |

---

## 📝 Post-MVP 작업 로그

### 세션 #15 — 2026-03-31 KST

**P-032**: ETF 상세 차트 기간/벤치마크 전환 시 부드러운 애니메이션 적용. 기존 destroy→재생성 방식을 Chart.js `data.labels`, `data.datasets` 직접 업데이트 방식으로 변경. Chart.js 인스턴스를 `this._chart`로 Vue 반응성 시스템 밖에 저장하고 `created()` 훅에서 초기화하여 반응성 추적으로 인한 stack overflow 해결.

**P-033**: 퇴직연금 시뮬레이터 전반적인 UX 개선. 각 시나리오 카드에 연수익률(연 2.5%, 연 10%, 연 13%) 표시. 금액 포맷을 만원 단위에서 억/만원 단위로 변환(예: 7억 4,690만원). 원금과 수익금을 카드 하단에 분리 표시. 결과 카드 디자인 강화(컬러 배지, 상단 보더, 호버 효과). NASDAQ 카드에 주황색 테마 적용. 원리금보장 대비 초과 수익을 각 카드 하단에 별도 카드로 분리. 월 납입액 최소값 0원 허용. 하단 디스클레이머 추가.

**P-034**: 비용 시뮬레이터 개선. 운용보수 테이블 열에 빨간색 볼드 강조 및 빨간 테두리 박스 적용. 하단 디스클레이머 추가.

**P-035**: 타이밍 시뮬레이터 카드 레이아웃 및 문구 개선. 전체 투자 시 결과를 상단 강조 카드로 분리하고, 일부 기간 제외 시나리오를 하단 4열 그리드로 배치. "상위 N일 제외되었을 때" 문구로 개선하고 일수를 주황색으로 강조. 마이너스 수익률 빨간색 표시 유지. 하단 디스클레이머 추가.

**P-036**: SPA fallback을 지원하는 로컬 개발 서버 `dev-server.js` 생성.

변경 파일: `frontend/logic/etf-detail.js`, `frontend/views/retirement.html`, `frontend/logic/retirement.js`, `frontend/views/fee-simulator.html`, `frontend/views/timing.html`, `frontend/logic/timing.js`, `dev-server.js`

---

### 세션 #14 — 2026-03-30 KST

**P-028**: SPY 전체기간에서 NASDAQ 100 차트/수치가 잘리는 버그 수정. 백엔드 CompareService에서 SPY/QQQ 각각의 실제 데이터 시작일 기준으로 CAGR을 독립 계산하도록 수정. 프론트엔드 Chart.js에서 날짜 합집합 기반 인덱스 매핑으로 각 데이터셋이 정확한 위치에 그려지도록 변경. 드래그 선택 기능 동일하게 수정, null 안전 처리 추가.

**P-029**: 홈 인기 프리셋을 로딩 없이 즉시 표시. /api/presets API 호출 제거, 프리셋 6개 home.js에 하드코딩. 로딩 오버레이 제거, 페이지 진입 즉시 카드 표시.

**P-030**: 서비스명을 indexwins로 변경. 네비게이션 바에 "index"(light 400) + "wins"(bold 800 녹색→시안 그라데이션) 타이포그래피 로고 적용. 페이지 타이틀 "indexwins — 지수 투자의 과학"으로 변경.

**P-031**: 커스텀 도메인 indexwins.com 설정. 가비아 네임서버를 Cloudflare로 변경(chris.ns.cloudflare.com, wally.ns.cloudflare.com). Cloudflare DNS CNAME 레코드 추가. Pages 커스텀 도메인 indexwins.com, Workers 커스텀 도메인 api.indexwins.com 설정. 프론트엔드 API URL을 api.indexwins.com으로 변경.

변경 파일: `backend/src/services/CompareService.js`, `frontend/logic/etf-detail.js`, `frontend/views/etf-detail.html`, `frontend/logic/home.js`, `frontend/views/home.html`, `frontend/components/navbar.html`, `frontend/css/style.css`, `frontend/index.html`, `frontend/logic/app.js`

커밋: `12c105b`, `34d75bf`, `6945607`, `6efad00`

---

### 세션 #13 — 2026-03-30 17:00 KST

**P-025**: 프론트엔드/백엔드 전체 검증 수행. 미정의 CSS 클래스 3건(book-cover-shadow, book-author, desc-toggle-wrap) 발견 및 수정.

**P-026**: 서비스 로고 SVG 생성(우상향 차트 디자인). 파비콘 SVG 생성 및 index.html 적용. 네비게이션 바 Bootstrap Icons → SVG 로고 교체.

**P-027**: ETF 상세 모바일 탭바 밑줄 스타일 복원 + 연한 블루 배경 디자인 강화.

변경 파일: `frontend/css/style.css`, `frontend/components/navbar.html`, `frontend/index.html`, `frontend/assets/logo.svg`, `frontend/assets/favicon.svg`

커밋: `d11b07c`

---

### 세션 #12 — 2026-03-30 (KST)

**P-020**: 전체 페이지 모바일 최적화. 랭킹 9컬럼 테이블→모바일 카드 리스트+정렬 드롭다운, ETF 상세 연도별 수익률 테이블→카드+탭바 가로 스크롤, 비용 시뮬레이터 테이블→카드(기준 시나리오 강조), 슬라이더 터치 타겟 24px, 차트 높이 반응형, 인사이트 필터 가로 스크롤.

**P-021**: 모바일 햄버거 메뉴 아이콘 SVG 색상 흰색으로 변경.

**P-022**: ETF 상세 모바일 헤더 레이아웃 개선. 메타칩(AUM/설정일) 같은 행 배치, 검색 버튼 우상단 고정, flex-wrap nowrap으로 줄바꿈 방지.

**P-023**: 네비게이션 메뉴 "성과비교"→"랭킹" 복원, ETF 상세 탭바 모바일 디자인 강화, 벤치마크 버튼 앞 "비교지수" 라벨 추가(후 제거), 랭킹 인라인 스피너 제거+뷰포트 중앙 배치.

**P-024**: deploy-frontend.yml 삭제(Cloudflare Pages Git 연동과 중복), CLAUDE.md 배포 섹션 업데이트.

변경 파일: `frontend/views/ranking.html`, `frontend/views/etf-detail.html`, `frontend/views/fee-simulator.html`, `frontend/views/insights.html`, `frontend/css/style.css`, `frontend/logic/ranking.js`, `frontend/components/navbar.html`, `CLAUDE.md`, `.github/workflows/deploy-frontend.yml`(삭제)

커밋: `09be64a`, `61ff77a`, `dd9ac85`, `ff87cd3`, `e244f6c`, `431f91c`, `1b67acb`, `b8cf773`, `8c46adf`, `4b46e88`

---

### 세션 #11 — 2026-03-29 (KST)

**P-019**: 차트 드래그로 원하는 구간 수익률 비교 기능 추가. Chart.js 커스텀 플러그인으로 드래그 선택 구현, 마우스+터치 이벤트 지원, 드래그 중 실시간 수익률 계산(ETF/S&P 500/NASDAQ 100), 선택 구간 UI + 해제 기능.

변경 파일: `frontend/logic/etf-detail.js`, `frontend/views/etf-detail.html`, `frontend/css/style.css`

커밋: `6aa24fd`

---

### 세션 #10 — 2026-03-25 (15:00 ~ KST)

**P-013~P-018**: 프리셋/인기검색 벤치마크 제거, 랭킹→성과비교 리브랜딩, AUM 상위 30개 ETF로 교체, AUM 컬럼+정렬 기능, SPYM→SPLG 티커 교체, 연승률 컬럼 제거, 로딩 UX 개선

커밋: `ecae974`, `a714a35`, `62dd6f2`, `d609127`, `9e0b7d6`, `41c2487`, `d2b2f75`, `5f69856`, `fb01c61`, `49f0dbd`

---

### 세션 #9 — 2026-03-24

**P-006~P-012**: PriceService/CompareService 기간 검증 강화, 디폴트 기간 max 변경, 크론잡 대상 확장(ranking_etf UNION price_cache), Yahoo fetch 최적화(getChartSince), D1 충전율 90% 검증, D1 불완전 데이터 7종목 삭제 후 재조회 복구, 벤치마크 차트 실선으로 변경

커밋: `6d728bb`, `b831173`, `465cd35`, `057d0f0`, `7a0e3ab`, `115e359`

---

### 세션 #8 — 2026-03-23

**P-001**: `home.html` 프리셋 카드 `@click` → 개별 뱃지 `@click`, `style.css` 호버 스타일 추가
**P-002**: `PriceService.js` KV/D1 캐시 기간 검증 추가, `CompareService.js` 동일 적용
**P-003**: `style.css` 로딩 컴포넌트(CSS 애니메이션), 5개 뷰 + `app.js` 맞춤 메시지 적용
**P-004**: `PriceService.js` 전면 개편 — 모든 기간에 최신성 검증 + 부족분만 Yahoo 보충
**P-005**: `DailyUpdateService.js` 신규 + `wrangler.toml` Cron + `index.js` scheduled 핸들러

---

## 작업 상태 표기
- `[ ]` 미시작
- `[~]` 진행 중
- `[x]` 완료
- `[!]` 수동 작업 (사용자 직접 수행)
- `[-]` 건너뜀/보류
