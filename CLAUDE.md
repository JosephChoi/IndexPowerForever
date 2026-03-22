# Index Power Forever

> ETF vs S&P 500 / NASDAQ 100 지수 성과 비교 웹서비스
> 『이길 수 있는 투자만 하라』(2026년 4월 출간) 연계

## 핵심 규칙

- **로그인 없음** — 인증/JWT 불필요
- **D1 (SQLite)** — `$1/$2` 금지, 반드시 `?` 파라미터
- **코딩 규칙** — `.claude/rules/` 참조

## 배포

> **수동 배포 금지. 모든 배포는 `git commit` + `git push`로만.**

| 대상 | 트리거 | 워크플로우 |
|---|---|---|
| Frontend | `frontend/**` push | `deploy-frontend.yml` → Cloudflare Pages |
| Backend | `backend/**` push | `deploy-backend.yml` → Cloudflare Workers |

- Frontend: `https://indexpowerforever.pages.dev`
- Backend: `https://index-power-forever.sixman-joseph.workers.dev`
- `.claude/`, 루트 파일 변경은 배포 트리거 안 됨

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
| 진행 상황 | `.claude/progress.md` |
| 작업 로그 | `.claude/worklog.md` |
