---
name: review-code
description: "코드를 프로젝트 컨벤션 기준으로 리뷰"
argument-hint: "(인자 없음 또는 파일 경로)"
user-invocable: true
---

현재 변경 사항을 프로젝트 컨벤션 기준으로 리뷰합니다.

$ARGUMENTS 가 있으면 해당 파일/범위를 리뷰. 없으면 전체 변경 사항을 리뷰.

## 리뷰 절차

변경된 파일 위치에 따라 해당 규칙을 적용합니다:

### 프론트엔드 (`frontend/` 하위 파일)
`.claude/rules/frontend-guide.md`의 모든 규칙 검증:
- `<style>` 태그 없음
- `fetch()` 직접 사용 없음 → `this.$api` 사용
- `v-for`에 `:key` 있음
- Chart.js `beforeUnmount`에서 `.destroy()` 있음
- `getParam()` 후 null 체크 있음

### 백엔드 (`backend/src/` 하위 파일)
`.claude/rules/backend-guide.md`의 모든 규칙 검증:
- Route에서 직접 DB 접근 없음
- `?` 파라미터 사용 (`$1`, `$2` 없음)
- SQL 문자열 직접 조합 없음 (prepared statement 사용)
- `process.env` 사용 없음 → `c.env` / `this.env` 사용
- 에러에 `error.name` 지정 있음

3. 위반 사항이 있으면 구체적인 수정 방법을 제안합니다.
