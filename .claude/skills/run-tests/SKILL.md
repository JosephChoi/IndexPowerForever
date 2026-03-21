---
name: run-tests
description: "테스터 에이전트를 호출하여 테스트 실행 + 오류 보고서 생성"
argument-hint: "범위 (all | backend | routes | services)"
user-invocable: true
---

테스터 에이전트를 호출하여 테스트를 실행하고 구조화된 오류 보고서를 생성합니다.

## 범위 파라미터

$ARGUMENTS 에서 scope를 파악합니다:

| 값 | 설명 |
|---|---|
| `all` (기본값) | 전체 (routes → services) |
| `backend` | 백엔드만 (routes + services) |
| `routes` | Route 통합 테스트만 |
| `services` | Service 단위 테스트만 |

## 실행

Agent 도구로 `tester` 에이전트를 호출합니다:

```
Agent(subagent_type="tester", prompt="""
scope: {파악한 scope}
context: {추가 힌트가 있으면 전달}
""")
```

## 결과 안내

에이전트 완료 후:
1. 전체 결과 요약 (통과/실패 건수)
2. `docs/test-report.md` 보고서 생성 완료 안내
3. 실패가 있을 경우 `/fix-backend`로 자동 수정 가능함을 안내
