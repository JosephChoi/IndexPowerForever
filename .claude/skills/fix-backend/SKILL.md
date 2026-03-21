---
name: fix-backend
description: "백엔드 오류 수정. 테스트 리포트 또는 에러 메시지 기반."
argument-hint: "(인자 없음: test-report 기반 | 에러 메시지)"
user-invocable: true
---

백엔드 오류를 분석하고 수정합니다.

## 입력

$ARGUMENTS 가 있으면 해당 에러 메시지를 기반으로 수정.
없으면 `docs/test-report.md`를 읽어 실패 목록을 확인.

## 수정 절차

1. 에러 소스 파일을 Read로 확인
2. `.claude/rules/backend-guide.md` 규칙 검토
3. D1 (SQLite) 특성 확인:
   - `?` 파라미터 사용 여부
   - `prepare().bind().first()/all()/run()` 패턴 사용 여부
4. 수정 실행 (Edit 사용)
5. 수정 내용 요약 보고

## 주요 수정 패턴

### D1 쿼리 오류
```javascript
// 잘못된 패턴 (PostgreSQL)
await client.query('SELECT * FROM table WHERE id = $1', [id]);

// 올바른 패턴 (D1/SQLite)
await env.DB.prepare('SELECT * FROM table WHERE id = ?').bind(id).first();
```

### KV 캐시 오류
```javascript
// 저장
await env.KV.put(key, JSON.stringify(data), { expirationTtl: 3600 });
// 읽기
const raw = await env.KV.get(key);
const data = raw ? JSON.parse(raw) : null;
```

### Yahoo Finance API 오류
- YahooService의 cookie/crumb 갱신 필요 여부 확인
- 응답 파싱 오류 확인
