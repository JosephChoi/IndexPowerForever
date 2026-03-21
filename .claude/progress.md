# Index Power Forever — 진행 현황

> 마지막 업데이트: 2026-03-22

## 전체 진행률: 7/40 (18%)

---

## 📋 Phase -1: 스펙 문서 생성 (7/7) ✅

- [x] -1-1. 기획안 → business-brief 작성 (`docs/specs/00-business-brief.md`)
- [x] -1-2. planner 에이전트 실행 → PRD 생성 (`.claude/docs/PRD.md`, `PRD-requirements.md`, `PRD-appendix.md`)
- [x] -1-3. architect 에이전트 실행 → 시스템 아키텍처 (`.claude/docs/architecture.md`)
- [x] -1-4. db-schema-spec 에이전트 실행 → DB 스키마 (`.claude/docs/db-schema.md`)
- [x] -1-5. api-spec 에이전트 실행 → API 명세 (`.claude/docs/api-spec.md`, `api-spec-etf.md`, `api-spec-compare.md`, `api-spec-etc.md`)
- [x] -1-6. frontend-spec 에이전트 실행 → UI/UX 명세 (`.claude/docs/frontend-spec.md`)
- [x] -1-7. reviewer + finalizer 에이전트 실행 → 최종 스펙 (완료)

---

## 🔧 Phase 0: 환경 구축 (0/5)

- [!] 0-1. Git 초기화 + GitHub 레포 생성
- [!] 0-2. Cloudflare 계정 설정 (D1, KV, Workers, Pages)
- [ ] 0-3. 프로젝트 구조 생성 (backend/frontend 폴더)
- [ ] 0-4. backend package.json + wrangler.toml 설정
- [ ] 0-5. D1 마이그레이션 파일 작성 + 실행

---

## ⚙️ Phase 1: 백엔드 (0/8)

- [ ] 1-1. Hono 앱 기본 설정 (index.js, middleware/cors.js, middleware/error.js)
- [ ] 1-2. YahooService (cookie+crumb 인증, 가격/정보 fetch)
- [ ] 1-3. ETFService (ETF 기본정보 조회 + KV/D1 캐시)
- [ ] 1-4. PriceService (가격 데이터 조회 + 캐시)
- [ ] 1-5. CompareService (비교 분석 계산: 수익률, CAGR, MDD, Sharpe, 초과수익률)
- [ ] 1-6. WinAnalysisService (이김/짐 분석: 연도별 승패, 롤링 승률, 연속 스트릭)
- [ ] 1-7. RankingService (기간별 지수 대비 성과 랭킹)
- [ ] 1-8. etf/compare/ranking/timing/presets 라우트 등록

---

## 🎨 Phase 2: 프론트엔드 (0/9)

- [ ] 2-1. SPA 기본 틀 (index.html, app.js, navbar.html, style.css)
- [ ] 2-2. 홈 화면 (home.html + home.js): 히어로 + 검색 + 프리셋
- [ ] 2-3. ETF 상세 탭1: 성과 비교 (etf-detail.html + etf-detail.js)
- [ ] 2-4. ETF 상세 탭2: 이김/짐 분석 (초과수익률 차트, 연도별 승패)
- [ ] 2-5. ETF 상세 탭3: 종목 정보 (구성종목, 섹터 비중)
- [ ] 2-6. 랭킹 화면 (ranking.html + ranking.js)
- [ ] 2-7. 비용 시뮬레이터 (fee-simulator.html + fee-simulator.js)
- [ ] 2-8. 퇴직연금 시뮬레이터 (retirement.html + retirement.js)
- [ ] 2-9. 타이밍 실패 시뮬레이터 (timing.html + timing.js)

---

## 🚀 Phase 3: 안정화 및 배포 (0/5)

- [ ] 3-1. 인사이트 화면 (insights.html + insights.js)
- [ ] 3-2. 책 소개 화면 (book.html + book.js)
- [ ] 3-3. 에러 처리 + 로딩 상태 전체 검토
- [ ] 3-4. 성능 최적화 (캐시 전략 검토)
- [!] 3-5. 배포 (Cloudflare Pages + Workers)

---

## 🔴 수동 작업 목록 ([!] 표시)

| ID | 작업 | 필요 정보 |
|---|---|---|
| 0-1 | Git 초기화 + GitHub 레포 생성 | 레포명: IndexPowerForever |
| 0-2 | Cloudflare D1 생성 | `wrangler d1 create index-power-forever` |
| 0-2 | Cloudflare KV 생성 | `wrangler kv:namespace create IPF_KV` |
| 0-2 | Cloudflare Pages 연결 | GitHub 레포 연결 |
| 3-5 | Workers 배포 | `wrangler deploy` (backend/) |
| 3-5 | Pages 배포 | GitHub push → 자동 배포 |

---

## 작업 상태 표기
- `[ ]` 미시작
- `[~]` 진행 중
- `[x]` 완료
- `[!]` 수동 작업 (사용자 직접 수행)
- `[-]` 건너뜀/보류
