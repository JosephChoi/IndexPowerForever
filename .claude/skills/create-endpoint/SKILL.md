---
name: create-endpoint
description: "새 API 엔드포인트(route + service) 생성. D1(SQLite) 기준."
argument-hint: "route-name HTTP메서드 경로 설명 (예: etf GET /api/etf/:ticker ETF 기본정보 조회)"
user-invocable: true
---

$ARGUMENTS 에서 route-name, HTTP 메서드, 경로, 설명을 파악하세요. 없으면 AskUserQuestion으로 확인.

## 입력 파싱

- `$0` = route 파일명 (예: `etf`)
- `$1` = HTTP 메서드 (GET / POST / PUT / DELETE)
- `$2` = 경로 (예: `/api/etf/:ticker`)
- `$3+` = 설명

## 실행 절차

1. `.claude/rules/backend-guide.md`를 읽고 핵심 패턴 확인
2. `.claude/docs/api-spec.md` (또는 `docs/specs/40-api-spec.md`)에서 해당 엔드포인트 명세 확인
3. 다음 파일 생성/수정:
   - `backend/src/routes/{route-name}.js` — 입력 검증 + 서비스 호출만
   - `backend/src/services/{Name}Service.js` — 비즈니스 로직
   - `backend/src/index.js` — 라우트 등록 (신규 파일인 경우 Edit)

## D1 (SQLite) 패턴

```javascript
// Service 클래스 기본 구조
export class ETFService {
  constructor(env) {
    this.env = env;
  }

  async getETFInfo(ticker) {
    // KV 캐시 확인
    const cached = await this.env.KV.get(`info:${ticker}`);
    if (cached) return JSON.parse(cached);

    // D1 조회
    const row = await this.env.DB
      .prepare('SELECT * FROM etf_info WHERE ticker = ?')
      .bind(ticker)
      .first();

    if (row) {
      await this.env.KV.put(`info:${ticker}`, JSON.stringify(row), { expirationTtl: 86400 });
      return row;
    }

    // Yahoo Finance에서 조회
    // ... YahooService 호출
  }
}
```

## Route 패턴

```javascript
// 입력 검증 + 서비스 호출만
app.get('/api/etf/:ticker', async (c) => {
  const ticker = c.req.param('ticker').toUpperCase().trim();
  if (!ticker || !/^[A-Z0-9\^\.]{1,10}$/.test(ticker)) {
    const err = new Error('Invalid ticker'); err.name = 'ValidationError'; throw err;
  }
  const service = new ETFService(c.env);
  const data = await service.getETFInfo(ticker);
  if (!data) { const err = new Error('ETF not found'); err.name = 'NotFoundError'; throw err; }
  return c.json({ data });
});
```

## 주의사항

- Route에서 직접 `this.env.DB` 접근 금지
- `$1`, `$2` 파라미터 사용 금지 → `?` 사용
- KV 캐시 전략 반드시 포함
- 에러: `error.name = 'ValidationError'` / `'NotFoundError'` / `'ServerError'`
