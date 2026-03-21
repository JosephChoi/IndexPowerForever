# /new-api — 새 API 엔드포인트 생성

## 사용법
```
/new-api {route-name} {HTTP메서드} {경로} {설명}
```

## 동작
1. `backend/src/routes/{route-name}.js`에 엔드포인트 추가
   - 파일이 없으면 새로 생성
   - 있으면 기존 파일에 엔드포인트 추가
2. 필요 시 `backend/src/services/{Name}Service.js`에 함수 추가
3. `backend/src/index.js`에 라우트 마운트 추가 (신규 파일인 경우)

## D1 (SQLite) 규칙
- `?` 파라미터 사용 (`$1`, `$2` 금지)
- `env.DB.prepare('...').bind(...).first()/all()/run()` 패턴
- Route에서 직접 `env.DB` 접근 금지

## 참조 문서
- `.claude/rules/backend-guide.md`
- `docs/specs/40-api-spec.md` (해당 엔드포인트 명세)

$ARGUMENTS
