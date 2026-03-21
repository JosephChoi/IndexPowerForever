---
name: fix-frontend
description: "프론트엔드 오류 수정. ViewLogic 규칙 위반 또는 UI 버그 수정."
argument-hint: "(인자 없음: 전체 검토 | 파일 경로 또는 에러 메시지)"
user-invocable: true
---

프론트엔드 오류를 분석하고 수정합니다.

## 입력

$ARGUMENTS 가 있으면 해당 파일/에러를 기반으로 수정.
없으면 최근 수정된 프론트엔드 파일을 검토.

## 수정 절차

1. 문제 파일을 Read로 확인
2. `.claude/rules/frontend-guide.md` 규칙 검토
3. 수정 실행 (Edit 사용)
4. 수정 내용 요약 보고

## 주요 수정 패턴

### Chart.js 오류
```javascript
// beforeUnmount 정리 필수
beforeUnmount() {
  if (this.chart) {
    this.chart.destroy();
    this.chart = null;
  }
}
```

### API 호출 오류
```javascript
// fetch() 직접 사용 금지
// 잘못된 패턴
const res = await fetch('/api/etf/' + ticker);

// 올바른 패턴
const res = await this.$api.get('/api/etf/' + ticker);
```

### getParam null 체크
```javascript
const ticker = this.getParam('ticker');
if (!ticker) { this.navigateTo('/'); return; }
```

### v-for :key 누락
```html
<!-- 잘못된 패턴 -->
<tr v-for="etf in etfList">

<!-- 올바른 패턴 -->
<tr v-for="etf in etfList" :key="etf.ticker">
```
