# Backend Rules — Index Power Forever

> 아래 올바른 패턴을 따라 코드를 생성하라. 금지 패턴 위반은 hooks가 자동 차단한다.

## 기본 원칙

- **Route**: 입력 검증 + 서비스 호출만. 비즈니스 로직/DB 직접 접근 금지
- **Service**: `export class`, `constructor(env)`, 비즈니스 로직 전담
- **환경변수**: `c.env` (Route) / `this.env` (Service)
- **에러**: `error.name` = ValidationError(400) / NotFoundError(404) / ServerError(500)

## D1 (SQLite) 규칙

> ⚠️ 이 프로젝트는 PostgreSQL이 아닌 **Cloudflare D1 (SQLite)**를 사용한다.

- **파라미터**: `$1`, `$2` 대신 반드시 `?` 사용
- **Prepared Statement**:
  ```javascript
  const result = await this.env.DB.prepare('SELECT * FROM table WHERE id = ?').bind(id).first();
  const results = await this.env.DB.prepare('SELECT * FROM table').all();
  ```
- **여러 파라미터**:
  ```javascript
  await this.env.DB.prepare('INSERT INTO table (a, b) VALUES (?, ?)').bind(a, b).run();
  ```
- **트랜잭션**: D1 batch API 사용
  ```javascript
  await this.env.DB.batch([
    this.env.DB.prepare('UPDATE ...').bind(...),
    this.env.DB.prepare('INSERT ...').bind(...),
  ]);
  ```

## KV Cache 규칙

```javascript
// 저장
await this.env.KV.put(key, JSON.stringify(data), { expirationTtl: 3600 }); // 1시간
// 읽기
const cached = await this.env.KV.get(key);
if (cached) return JSON.parse(cached);
```

## 응답 형식

- **단건**: `{ data: { ... } }`
- **목록**: `{ data: [...], total, hasNext }`
- **에러**: errorHandler가 `{ error, message }` 자동 처리

## 입력 검증 (Route에서)

```javascript
const { ticker } = c.req.param();
if (!ticker || typeof ticker !== 'string') {
  const err = new Error('ticker is required'); err.name = 'ValidationError'; throw err;
}
const upper = ticker.toUpperCase().trim();
if (!/^[A-Z0-9\^\.]{1,10}$/.test(upper)) {
  const err = new Error('Invalid ticker format'); err.name = 'ValidationError'; throw err;
}
```

## Yahoo Finance API

```javascript
// cookie + crumb 인증 방식 (YahooService에서 관리)
// v8 chart: 일별 가격
// quoteSummary: ETF 기본정보
// 절대 직접 fetch 하지 말고 YahooService 통해서만 접근
```

> ⚠️ **죽은 티커 주의** — 종목이 티커를 변경하면 Yahoo는 옛 심볼에 대해 **에러가 아니라 빈 시계열**
> (`timestamp`는 있고 `close`가 전부 `null`)을 반환한다. 크론·보충 로직은 이를 "새 데이터 없음"으로
> 처리하므로 갱신이 조용히 멈춘다. 판별 단서는 `meta.regularMarketTime`(변경 시점에 정지)과
> `meta.firstTradeDate`(엉뚱한 최근 날짜로 리셋).
> 실제 사례: SPLG → SPYM (2025-10-31), 7주간 미갱신 — 세션 #22 참조

## KV 캐시 키 규칙

캐시 키는 **각 서비스에서 빌더 함수를 `export`** 하고, 무효화 측(`DailyUpdateService`)은
그 빌더를 import해 재사용한다. 키 문자열을 양쪽에 각각 하드코딩하면 버전 접두어(`compare:v6:` 등)를
올릴 때 한쪽만 바뀌어 무효화가 조용히 실패한다.

```javascript
// RankingService.js
export const rankingCacheKey = (period, benchmark) => `ranking:v2:${period}:${benchmark}`;

// DailyUpdateService.js
import { rankingCacheKey } from './RankingService.js';
keys.push(rankingCacheKey(period, bench));
```

## 캐시 전략

| 데이터 | KV TTL | D1 저장 |
|---|---|---|
| ETF 가격 (일별) | 1시간 | 영구 저장 |
| ETF 기본정보 | 24시간 | 영구 저장 |
| 비교 분석 결과 | 6시간 | 저장 안함 |
| 검색 자동완성 | 24시간 | 저장 안함 |

## 금지 패턴

- Route에서 직접 `this.env.DB` 접근
- `eval()` 사용
- SQL 문자열 직접 조합 (반드시 prepared statement)
- Yahoo Finance API를 Route에서 직접 호출
