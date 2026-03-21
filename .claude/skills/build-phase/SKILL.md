---
name: build-phase
description: "스펙 문서 기반으로 Phase별 풀스택(백엔드+프론트엔드) 개발 실행"
argument-hint: "Phase 번호 (예: 0, 1, 2, 3)"
user-invocable: true
---

$ARGUMENTS 에서 Phase 번호를 파악하세요. 없으면 AskUserQuestion으로 확인.

## 목적

스펙 문서 기반으로 Phase별 작업을 **백엔드 → 프론트엔드** 순서로 실행합니다.

**스펙 소스 우선순위:**
1. `docs/specs/73-final-spec-build-order.md` 존재 시 → 이 파일의 Phase 정의를 따름
2. `docs/specs/40-api-spec.md` + `docs/specs/30-db-schema.md`만 존재 시 → API 스펙 엔드포인트 순서

## Phase별 작업 목록

| Phase | 내용 |
|---|---|
| 0 | 환경 구축: Cloudflare D1/KV 설정, 프로젝트 구조, 마이그레이션 |
| 1 | 백엔드: Yahoo Finance 연동, ETF 검색/정보/가격 API, 비교 분석 API |
| 2 | 프론트엔드: 홈, ETF 상세(3탭), 랭킹, 시뮬레이터 |
| 3 | 안정화: 에러 처리, 캐시 최적화, 배포 |

## 실행 절차

### Step 1: 스펙 읽기

스펙 문서에서 해당 Phase 섹션을 읽고:
- 백엔드 작업 목록 추출
- 프론트엔드 작업 목록 추출

### Step 2: 백엔드 개발

`.claude/rules/backend-guide.md` 규칙 준수:

**2-1. D1 마이그레이션**
- `docs/specs/30-db-schema.md` 읽기
- `backend/migrations/0001_init.sql`에 DDL 추가
- SQLite 문법: `CREATE TABLE IF NOT EXISTS`, `?` 파라미터

**2-2. Service 생성**
- `backend/src/services/{Name}Service.js`
- `export class`, `constructor(env)`
- D1: `env.DB.prepare('...').bind(...).first()` / `.all()` / `.run()`
- KV: `env.KV.get(key)` / `env.KV.put(key, value, { expirationTtl: TTL })`
- Yahoo Finance: YahooService 통해서만 접근

**2-3. Route 생성**
- `backend/src/routes/{name}.js`
- 입력 검증 + 서비스 호출만

**2-4. 등록**
- `backend/src/index.js`에 라우트 등록 (Edit)

### Step 3: 프론트엔드 개발

`.claude/rules/frontend-guide.md` 규칙 준수:
- `frontend/views/{path}.html` + `frontend/logic/{path}.js` 쌍
- Chart.js 차트 색상 규칙 준수
- 로딩/에러/빈 상태 처리 필수

### Step 4: 검증

- view + logic 파일 쌍 존재 확인
- HTML에 `<style>` 태그 없음 확인
- `backend/src/index.js`에 라우트 등록 확인
- `?` 파라미터 사용 확인 (D1)

### Step 5: 체크포인트 보고

- 생성/수정된 파일 목록
- D1 테이블 수, API 엔드포인트 수
- 프론트엔드 페이지 수
- "다음 Phase 진행 / 중단" 선택 요청

## 운영 규칙

1. **스펙 문서를 반드시 Read** 후 코드 생성 — 추측하지 말 것
2. **D1**: `?` 파라미터, `prepare().bind().first()/all()/run()` 패턴
3. **KV 캐시 전략**: 아키텍처 문서의 TTL 표 준수
4. **프론트엔드**: `this.$api` 사용, `fetch()` 직접 사용 금지
5. **차트**: beforeUnmount에서 `this.chart.destroy()` 필수
