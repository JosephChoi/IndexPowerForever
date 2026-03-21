# Coding Conventions — Index Power Forever

## 파일/폴더 명명

| 유형 | 규칙 | 예시 |
|---|---|---|
| View | `kebab-case.html` | `etf-detail.html` |
| Logic | `kebab-case.js` | `etf-detail.js` |
| Route | `kebab-case.js` | `etf.js` |
| Service | `PascalCaseService.js` | `YahooService.js` |
| Middleware | `kebab-case.js` | `error.js` |

## JavaScript 규칙

- 변수/함수: `camelCase`
- 클래스: `PascalCase`
- 상수: `UPPER_SNAKE_CASE`
- 함수 스타일: 화살표 함수 (`const fn = () => {}`)
- async/await + try/catch (Promise.then 금지)
- `const` 우선, `let` 필요 시, `var` 금지

## API 응답 헬퍼

```javascript
// 성공
return c.json({ data: result });
return c.json({ data: list, hasNext: list.length > limit, total });

// 에러 (errorHandler 자동 처리)
const err = new Error('메시지'); err.name = 'ValidationError'; throw err;
const err = new Error('Not found'); err.name = 'NotFoundError'; throw err;
```

## D1 쿼리 규칙

```javascript
// 단건 조회
const row = await this.env.DB.prepare('SELECT * FROM etf_info WHERE ticker = ?').bind(ticker).first();

// 다건 조회
const { results } = await this.env.DB.prepare('SELECT * FROM price_cache WHERE ticker = ? ORDER BY date DESC LIMIT ?').bind(ticker, limit).all();

// 삽입/업데이트
await this.env.DB.prepare('INSERT OR REPLACE INTO etf_info (ticker, name) VALUES (?, ?)').bind(ticker, name).run();

// 배치 (트랜잭션)
await this.env.DB.batch([
  this.env.DB.prepare('...').bind(...),
  this.env.DB.prepare('...').bind(...),
]);
```

## 임포트/익스포트

- Backend: ESM (`import/export`)
- Frontend: CDN 스크립트 (import 없음, 전역 변수 사용)

## 주석 규칙

- 코드 블록 상단에 한 줄 설명 (한국어)
- 복잡한 계산 로직은 수식 주석 필수
- TODO/FIXME 형식: `// TODO(작성자): 내용`

## 금지 사항

- `var` 사용
- `console.log` 프로덕션 코드에 잔존
- Magic number (상수화 필요)
- 중복 코드 (함수/서비스로 추출)
