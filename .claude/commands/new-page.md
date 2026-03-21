# /new-page — 새 페이지 생성

## 사용법
```
/new-page {page-name} {페이지 제목}
```

## 동작
1. `frontend/views/{page-name}.html` 생성
2. `frontend/logic/{page-name}.js` 생성
3. `frontend/logic/app.js`의 라우터에 경로 추가

## 규칙
- HTML에 `<style>`, `<script>` 태그 금지
- JS에서 `fetch()` 직접 사용 금지 → `this.$api` 사용
- Chart.js 사용 시 `beforeUnmount`에서 `.destroy()` 필수
- 인증/역할 가드 불필요 (이 프로젝트는 로그인 없음)

## 참조 문서
- `.claude/rules/frontend-guide.md`
- `.claude/rules/coding-conventions.md`
- `docs/specs/50-ui-ux-spec.md` (해당 화면 명세)

$ARGUMENTS
