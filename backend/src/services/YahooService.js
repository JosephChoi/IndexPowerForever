// Yahoo Finance API 연동 서비스 — cookie + crumb 인증 방식
const PERIOD_TO_RANGE = {
  '1Y': '1y',
  '3Y': '3y',
  '5Y': '5y',
  '10Y': '10y',
  'max': 'max',
};

export class YahooService {
  constructor(env) {
    this.env = env;
  }

  // cookie + crumb 취득 (KV 캐시 1시간)
  async getCrumb() {
    const cached = await this.env.KV.get('yahoo:crumb');
    if (cached) return JSON.parse(cached);

    // Step 1: Yahoo Finance 접속 → cookie 획득
    const cookieRes = await fetch('https://fc.yahoo.com', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });
    const cookie = cookieRes.headers.get('set-cookie') || '';

    // Step 2: crumb 취득
    const crumbRes = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Cookie': cookie,
      },
    });

    if (!crumbRes.ok) {
      const err = new Error('Yahoo Finance crumb 획득 실패');
      err.name = 'ServerError';
      throw err;
    }

    const crumb = await crumbRes.text();
    const data = { crumb: crumb.trim(), cookie };

    await this.env.KV.put('yahoo:crumb', JSON.stringify(data), { expirationTtl: 3600 });
    return data;
  }

  // 일별 가격 데이터 조회 (v8 chart API)
  async getChart(ticker, period = '5Y') {
    const range = PERIOD_TO_RANGE[period] || '5y';
    const { crumb, cookie } = await this.getCrumb();

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=${range}&crumb=${encodeURIComponent(crumb)}`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Cookie': cookie,
      },
    });

    this._handleHttpError(res.status, ticker);

    const json = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) {
      const err = new Error(`티커 ${ticker}를 찾을 수 없습니다.`);
      err.name = 'NotFoundError';
      throw err;
    }

    // 타임스탬프 → YYYY-MM-DD 변환 + 종가 추출
    const timestamps = result.timestamp || [];
    const closes = result.indicators?.quote?.[0]?.close || [];

    const prices = timestamps
      .map((ts, i) => ({
        date: new Date(ts * 1000).toISOString().slice(0, 10),
        close: closes[i],
      }))
      .filter(p => p.close != null);

    return prices;
  }

  // ETF 기본정보 조회 (quoteSummary API)
  async getQuoteSummary(ticker) {
    const { crumb, cookie } = await this.getCrumb();

    const modules = 'summaryProfile,summaryDetail,defaultKeyStatistics,topHoldings,assetProfile,quoteType';
    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(ticker)}?crumb=${encodeURIComponent(crumb)}&modules=${modules}`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Cookie': cookie,
      },
    });

    this._handleHttpError(res.status, ticker);

    const json = await res.json();
    const result = json?.quoteSummary?.result?.[0];
    if (!result) {
      const err = new Error(`티커 ${ticker}를 찾을 수 없습니다.`);
      err.name = 'NotFoundError';
      throw err;
    }

    return result;
  }

  // ETF 검색 자동완성 (search API)
  async search(query) {
    const { crumb, cookie } = await this.getCrumb();

    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0&enableFuzzyQuery=false&crumb=${encodeURIComponent(crumb)}`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Cookie': cookie,
      },
    });

    if (!res.ok) return [];

    const json = await res.json();
    return (json?.finance?.result?.[0]?.quotes || [])
      .filter(q => q.quoteType === 'ETF' || q.quoteType === 'EQUITY')
      .slice(0, 10)
      .map(q => ({
        ticker: q.symbol,
        name: q.shortname || q.longname || q.symbol,
        type: q.quoteType,
      }));
  }

  // HTTP 상태코드별 에러 처리
  _handleHttpError(status, ticker) {
    if (status === 404) {
      const err = new Error(`티커 ${ticker}를 찾을 수 없습니다.`);
      err.name = 'NotFoundError';
      throw err;
    }
    if (status === 429) {
      const err = new Error('Yahoo Finance 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.');
      err.name = 'RateLimitError';
      throw err;
    }
    if (status >= 500) {
      const err = new Error('Yahoo Finance 서버 오류가 발생했습니다.');
      err.name = 'ServerError';
      throw err;
    }
  }
}
