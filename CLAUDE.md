# Index Power Forever

> ETF vs S&P 500 / NASDAQ 100 지수 성과 비교 웹서비스
> 『이길 수 있는 투자만 하라』(2026년 4월 출간) 연계

## 핵심 규칙

- **로그인 없음** — 인증/JWT 불필요
- **D1 (SQLite)** — `$1/$2` 금지, 반드시 `?` 파라미터
- **코딩 규칙** — `.claude/rules/` 참조

## 배포

> **수동 배포 금지. `wrangler deploy` 직접 실행 절대 금지.**
> **모든 배포는 `git commit` + `git push`로만.**

**Workers 단일 배포 (Static Assets 통합)** — 정적(frontend)과 API(backend)가 같은 Worker에서 서빙.

| 항목 | 설정 |
|---|---|
| 배포 방식 | **Cloudflare Workers Builds** (대시보드에서 GitHub repo 직접 연결) |
| Git 연동 설정 | repo `IndexPowerForever`, branch `main`, **Root directory `backend`**, deploy `npx wrangler deploy` |
| 트리거 | `main` push 자동 감지 (전체 watch) |
| Worker 이름 | `index-power-forever` |
| 정적 자산 | `wrangler.toml [assets]` → `directory = "../frontend"`, SPA fallback |
| 운영 도메인 | `indexwins.com` (Worker Custom Domain) |
| API 호출 | same-origin (`/api/*` 상대경로) — CORS 불필요 |

### 배포 주의사항

- `[assets]` directory 경로는 wrangler.toml(=`backend/`) 기준 → **`../frontend`** (절대 `./frontend` 아님)
- Vue Router가 history 모드라 `not_found_handling = "single-page-application"` 필수
- CORS는 로컬 dev(프론트 8080 → 백엔드 8787) 전용으로만 동작 (`backend/src/middleware/cors.js`)
- 프론트 `API_BASE`는 운영 시 `''`(상대경로). `https://api.indexwins.com` 등 절대 URL 하드코딩 금지
- **GitHub Actions 워크플로우 신규 생성 금지** — Workers Builds가 유일한 자동 배포 수단. `.github/workflows/`에 deploy 워크플로우를 다시 만들면 같은 커밋이 2번 배포됨

## 분석 (GA4)

- 측정 ID `G-0CEXV75HNR` — `frontend/index.html` 상단 스니펫
- **SPA라 자동 page_view는 끔** (`send_page_view: false`). `logic/app.js`의 `router.afterEach`에서 `applySeo()` 직후 직접 전송
- 새 페이지를 추가해도 GA 관련 추가 작업은 없음 (라우터가 자동 처리)
- `localhost`/`127.0.0.1`은 GA 스크립트 미로드 → 로컬 작업은 통계에 안 잡힘
- 책 QR 유입은 `utm_source=book&utm_medium=qr`로 구분 (네이버 동적 QR 목적지에 설정)

## 구조

- `frontend/views/*.html` ↔ `frontend/logic/*.js` 1:1 매칭 필수
- `backend/src/routes/` — 입력 검증 + 서비스 호출만
- `backend/src/services/` — 비즈니스 로직 전담

## 참조 문서

| 문서 | 경로 |
|---|---|
| 백엔드 규칙 | `.claude/rules/backend-guide.md` |
| 프론트엔드 규칙 | `.claude/rules/frontend-guide.md` |
| 아키텍처 | `.claude/rules/architecture.md` |
| 코딩 컨벤션 | `.claude/rules/coding-conventions.md` |
| 디자인 가이드 | `.claude/rules/design-guide.md` |
| 진행 상황 | `.claude/progress.md` |
| 작업 로그 | `.claude/worklog.md` |
