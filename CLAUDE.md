# Index Power Forever

> ETF vs S&P 500 / NASDAQ 100 지수 성과 비교 웹서비스
> 『이길 수 있는 투자만 하라』(2026년 4월 출간) 연계

## 핵심 규칙

- **로그인 없음** — 인증/JWT 불필요
- **D1 (SQLite)** — `$1/$2` 금지, 반드시 `?` 파라미터
- **코딩 규칙** — `.claude/rules/` 참조

## 배포

> **수동 배포 금지. `wrangler deploy` / `wrangler pages deploy` 직접 실행 절대 금지.**
> **모든 배포는 `git commit` + `git push`로만.**

| 대상 | 배포 방식 | 트리거 |
|---|---|---|
| Frontend | **Cloudflare Pages Git 연동** (대시보드 설정) | `main` push 자동 감지 |
| Backend | **GitHub Actions** (`deploy-backend.yml`) | `backend/**` push |

- Frontend: `https://indexpowerforever.pages.dev`
- Backend: `https://index-power-forever.sixman-joseph.workers.dev`
- `.claude/`, 루트 파일 변경은 배포 트리거 안 됨

### 배포 주의사항

- **Frontend는 GitHub Actions 워크플로우 없음** — Cloudflare Pages가 Git 연동으로 직접 배포. GitHub Actions로 중복 배포 워크플로우(`deploy-frontend.yml`)를 만들면 **같은 커밋이 2번 배포**되므로 절대 만들지 말 것
- **Backend(Workers)는 Git 연동 불가** — Cloudflare Workers는 Git 연동을 지원하지 않으므로 GitHub Actions가 유일한 자동 배포 수단
- 배포 워크플로우 신규 생성/수정 시 위 구조를 반드시 확인하여 중복 배포 방지

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
