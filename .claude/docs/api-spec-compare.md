# API 명세 — 지수 비교 분석 (FR-010~022)

> 상위 문서: [api-spec.md](./api-spec.md)
> Route 파일: `backend/src/routes/compare.js`
> Service 파일: `backend/src/services/CompareService.js`, `CalculationService.js`

---

## GET /api/etf/:ticker/compare

**목적**: ETF와 S&P 500(SPY) 및 NASDAQ 100(QQQ)의 지수 비교 분석 결과를 반환한다. FR-010~022의 핵심 엔드포인트.

### Path 파라미터

| 파라미터 | 타입 | 필수 | 유효값 |
|---|---|---|---|
| `ticker` | string | 필수 | `^[A-Z0-9\^\.]{1,10}$` |

### Query 파라미터

| 파라미터 | 타입 | 필수 | 유효값 | 기본값 |
|---|---|---|---|---|
| `period` | string | 선택 | `1Y`, `3Y`, `5Y`, `10Y`, `max` | `5Y` |
| `benchmark` | string | 선택 | `SPY`, `QQQ` | `SPY` |

### 처리 흐름 (`CompareService.analyze(ticker, period, benchmark)`)

1. `KV.get('compare:{ticker}:{period}:{benchmark}')` → 캐시 히트 시 즉시 반환
2. 3개 가격 데이터 병렬 조회:
   ```javascript
   const [etfPrices, spyPrices, qqqPrices] = await Promise.all([
     EtfService.getPrices(ticker, period),
     EtfService.getPrices('SPY', period),
     EtfService.getPrices('QQQ', period),
   ]);
   ```
3. 날짜 기준 공통 구간 정렬 (ETF inception_date 이후 + 세 자산 공통 거래일만)
4. `CalculationService` 메서드 순차 호출
5. `KV.put('compare:{ticker}:{period}:{benchmark}', JSON.stringify(result), { expirationTtl: 21600 })`

### 성공 응답 (HTTP 200)

```json
{
  "data": {
    "ticker": "ARKK",
    "period": "5Y",
    "benchmark": "SPY",
    "data_start": "2019-03-22",
    "data_end": "2024-03-22",
    "truncated": false,

    "cumulative_returns": {
      "dates": ["2019-03-22", "2019-03-25"],
      "etf": [0.0, 1.23],
      "spy": [0.0, 0.87],
      "qqq": [0.0, 0.95]
    },

    "excess_returns": {
      "dates": ["2019-03-22", "2019-03-25"],
      "values": [0.0, 0.36]
    },

    "metrics": {
      "etf": {
        "total_return": -12.34,
        "cagr": -2.63,
        "mdd": -79.11,
        "sharpe": -0.42,
        "annual_volatility": 0.56
      },
      "spy": {
        "total_return": 98.52,
        "cagr": 14.73,
        "mdd": -23.87,
        "sharpe": 0.91,
        "annual_volatility": 0.17
      },
      "qqq": {
        "total_return": 142.35,
        "cagr": 19.42,
        "mdd": -32.58,
        "sharpe": 1.12,
        "annual_volatility": 0.22
      }
    },

    "yearly_returns": [
      {
        "year": 2019,
        "etf_return": 35.73,
        "bench_return": 31.22,
        "diff": 4.51,
        "outperformed": true
      },
      {
        "year": 2022,
        "etf_return": -66.98,
        "bench_return": -18.17,
        "diff": -48.81,
        "outperformed": false
      }
    ],

    "rolling_win_rate": {
      "1Y": { "win_rate": 35.2, "win_count": 412, "total_windows": 1170 },
      "3Y": { "win_rate": 22.8, "win_count": 198, "total_windows": 868 },
      "5Y": { "win_rate": 18.1, "win_count": 112, "total_windows": 619 }
    },

    "win_loss_summary": {
      "overall_win_rate": 28.0,
      "years_outperformed": 2,
      "years_underperformed": 5,
      "max_consecutive_wins": 2,
      "max_consecutive_losses": 4,
      "recent_trend": "underperforming"
    },

    "summary_sentence": {
      "rolling": "ARKK를 5년 보유했을 때 S&P 500을 이긴 확률: 18.1%",
      "overall": "전체 기간 중 S&P 500을 이긴 비율: 28.0%"
    }
  }
}
```

**필드 타입:**

| 필드 | 타입 | 단위/설명 |
|---|---|---|
| `cumulative_returns.etf[]` | `number[]` | % (소수점 2자리) |
| `excess_returns.values[]` | `number[]` | % (ETF - benchmark 누적수익률 차이) |
| `metrics.*.total_return` | `number` | % |
| `metrics.*.cagr` | `number` | % |
| `metrics.*.mdd` | `number` | % (음수) |
| `metrics.*.sharpe` | `number` | 소수점 2자리 |
| `metrics.*.annual_volatility` | `number` | 소수 (0.17 = 17%) |
| `rolling_win_rate.*.win_rate` | `number` | % |
| `win_loss_summary.recent_trend` | `string` | `"outperforming"` 또는 `"underperforming"` |

### 에러 응답

| 조건 | error | HTTP | message |
|---|---|---|---|
| ticker 형식 불일치 | `ValidationError` | 400 | "유효하지 않은 ticker 형식입니다." |
| 유효하지 않은 period | `ValidationError` | 400 | "period는 1Y, 3Y, 5Y, 10Y, max 중 하나여야 합니다." |
| 유효하지 않은 benchmark | `ValidationError` | 400 | "benchmark는 SPY 또는 QQQ 중 하나여야 합니다." |
| 존재하지 않는 ticker | `NotFoundError` | 404 | "해당 ETF를 찾을 수 없습니다. 미국 ETF 티커를 입력해주세요." |
| 1년 미만 데이터 | `ValidationError` | 400 | "비교 분석에 필요한 최소 데이터(1년)가 부족합니다." |
| Yahoo Finance 응답 오류 | `ServerError` | 500 | "서버 오류가 발생했습니다." |

### 주의사항

- `yearly_returns`는 완전한 데이터가 있는 연도만 포함 (현재 연도 제외)
- `rolling_win_rate.3Y`, `rolling_win_rate.5Y`는 데이터 부족 시 `null` 반환
- `data_start`는 ETF inception_date와 요청 period 시작일 중 더 늦은 날짜
