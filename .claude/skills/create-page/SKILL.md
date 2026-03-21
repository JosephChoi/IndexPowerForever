---
name: create-page
description: "새 페이지(view + logic) 생성. 이 프로젝트는 인증 없음."
argument-hint: "경로 [템플릿] (예: etf-detail analytics)"
user-invocable: true
---

$ARGUMENTS 에서 페이지 경로와 템플릿 타입을 파악하세요. 없으면 AskUserQuestion으로 확인.

## 입력 파싱

- `$0` = 페이지 경로 (예: `etf-detail`)
- `$1` = 템플릿 타입 (선택)

템플릿 타입 매핑:
- `home` → `.claude/templates/home.md`
- `analytics` → `.claude/templates/analytics.md`
- `simulator` → `.claude/templates/simulator.md`
- `ranking` → `.claude/templates/ranking.md`
- `etf-detail` → `.claude/templates/etf-detail.md`

## 실행 절차

1. `.claude/rules/frontend-guide.md`를 읽고 핵심 패턴 확인
2. 해당 템플릿 MD 파일을 읽기 (없으면 유사한 템플릿 참조)
3. 다음 파일 생성:
   - `frontend/views/{경로}.html` — 템플릿 기반 HTML
   - `frontend/logic/{경로}.js` — 템플릿 기반 JS
4. `frontend/logic/app.js`의 라우터에 경로 추가
5. 생성 완료 후 결과 요약 출력

## 주의사항

- HTML에 `<style>` 태그 금지 → `frontend/css/style.css`에 작성
- JS에서 `this.$api.get()` 사용, `fetch()` 금지
- v-for에는 반드시 `:key="item.ticker"` 또는 `:key="item.id"` 사용
- async 함수에 try/catch 필수
- 역할 가드 불필요 (인증 없음)
- Chart.js 사용 시 `beforeUnmount`에서 `this.chart.destroy()` 필수
- 차트 색상:
  - ETF: `#0d6efd`, S&P 500: `#198754`, NASDAQ 100: `#fd7e14`
  - 초과수익 양수: `rgba(40, 167, 69, 0.4)`, 음수: `rgba(220, 53, 69, 0.4)`
