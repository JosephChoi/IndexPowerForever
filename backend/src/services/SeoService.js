// SEO 메타 주입 서비스
// SPA는 JS 실행 후에야 본문이 생기므로, JS를 거의 실행하지 않는 크롤러(특히 네이버 Yeti)를 위해
// Worker 단계에서 index.html의 title/description/canonical/og 를 라우트별 값으로 치환한다.
// 사용자와 크롤러에게 동일한 HTML을 주므로 클로킹이 아니다.

// 검색엔진에 노출할 정식 도메인 (canonical 기준)
export const SITE_ORIGIN = 'https://indexwins.com';
export const SITE_NAME = 'indexwins';
export const OG_IMAGE = `${SITE_ORIGIN}/images/og-image.png`;

// 정적 라우트별 SEO 메타 — sitemap 생성과 메타 주입이 이 맵 하나를 공유한다
export const PAGE_SEO = {
  '/': {
    title: 'indexwins — ETF vs S&P 500 / NASDAQ 100 지수 성과 비교',
    description:
      'ETF를 검색하면 S&P 500·NASDAQ 100 지수와 20년 성과를 비교 분석합니다. 누적수익률·CAGR·MDD·연도별 승패를 무료로, 로그인 없이 확인하세요.',
    changefreq: 'daily',
    priority: '1.0',
  },
  '/ranking': {
    title: '주요 ETF 성과비교 랭킹 — indexwins',
    description:
      '미국 상장 AUM 상위 30개 ETF가 S&P 500·NASDAQ 100 지수를 이겼는지 기간별로 비교합니다. 초과수익률 기준 랭킹을 한눈에 확인하세요.',
    changefreq: 'daily',
    priority: '0.9',
  },
  '/timing': {
    title: '타이밍 시뮬레이터 — 상승일을 놓치면 수익률은 얼마나 줄어들까',
    description:
      '지수의 상위 상승일을 놓쳤을 때 장기 수익률이 얼마나 달라지는지 시뮬레이션합니다. 마켓 타이밍의 구조적 한계를 데이터로 확인하세요.',
    changefreq: 'monthly',
    priority: '0.8',
  },
  '/fee-simulator': {
    title: '비용 시뮬레이터 — 운용보수 차이가 만드는 복리 격차',
    description:
      '운용보수 0.1%와 1%의 차이가 20년 뒤 자산에 얼마나 반영되는지 계산합니다. 비용이 수익률에 미치는 복리 효과를 확인하세요.',
    changefreq: 'monthly',
    priority: '0.8',
  },
  '/retirement': {
    title: '퇴직연금 시뮬레이터 — 원리금보장 vs 인덱스 펀드',
    description:
      '원리금보장 상품과 인덱스 펀드로 퇴직연금을 운용했을 때의 격차를 시뮬레이션합니다. 납입 기간·수익률별 퇴직 시 자산을 비교하세요.',
    changefreq: 'monthly',
    priority: '0.8',
  },
  '/withdrawal': {
    title: '인출전략 시뮬레이터 — 은퇴 자산은 얼마나 버틸까',
    description:
      '은퇴 후 자산을 인출하며 살 때 그 돈이 얼마나 버티는지 과거 지수 데이터로 시뮬레이션합니다. 인출률·물가상승률·리저브 전략을 조합해 확인하세요.',
    changefreq: 'monthly',
    priority: '0.8',
  },
  '/insights': {
    title: '인사이트 — 지수 투자의 근거를 데이터로',
    description:
      '『이길 수 있는 투자만 하라』의 핵심 메시지를 SPIVA·장기 수익률 데이터로 검증합니다. 액티브 펀드의 승률과 지수의 장기 우월성을 확인하세요.',
    changefreq: 'weekly',
    priority: '0.8',
  },
  '/book': {
    title: '이길 수 있는 투자만 하라 — 김대중·최근민 지음',
    description:
      '증권사와 투자자문사에서 일하며 자본시장 한가운데에 서 있던 저자들이 20년 데이터를 분석해 내린 결론. 왜 인덱스 투자만이 승산 있는 게임인지 설명합니다.',
    changefreq: 'monthly',
    priority: '0.9',
  },
  '/manual': {
    title: '서비스 이용 매뉴얼 — indexwins',
    description:
      'ETF 성과 비교, 랭킹, 비용·타이밍·퇴직연금·인출전략 시뮬레이터의 사용법을 화면과 함께 안내합니다.',
    changefreq: 'monthly',
    priority: '0.5',
  },
};

// ETF 상세는 티커가 동적이므로 별도 생성
const etfSeo = (ticker) => ({
  title: `${ticker} vs S&P 500 / NASDAQ 100 지수 성과 비교 — indexwins`,
  description: `${ticker}가 S&P 500·NASDAQ 100 지수를 이겼는지 장기 데이터로 비교합니다. 누적수익률, CAGR, MDD, 연도별 승패, 롤링 승률을 확인하세요.`,
});

// 경로 → SEO 메타. 매칭되는 라우트가 없으면 홈 메타를 쓴다.
export const seoForPath = (pathname) => {
  const etfMatch = pathname.match(/^\/etf\/([A-Za-z0-9.^-]{1,10})\/?$/);
  if (etfMatch) return etfSeo(etfMatch[1].toUpperCase());
  const clean = pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname;
  return PAGE_SEO[clean] || PAGE_SEO['/'];
};

// canonical URL — 쿼리스트링은 제외하고 경로만 사용한다
const canonicalFor = (pathname) => {
  const etfMatch = pathname.match(/^\/etf\/([A-Za-z0-9.^-]{1,10})\/?$/);
  if (etfMatch) return `${SITE_ORIGIN}/etf/${etfMatch[1].toUpperCase()}`;
  const clean = pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname;
  return clean === '/' ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${clean}`;
};

// HTML 속성값 이스케이프
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// index.html 응답에 라우트별 메타를 주입해 새 Response 반환
export const injectSeo = (response, pathname) => {
  const seo = seoForPath(pathname);
  const canonical = canonicalFor(pathname);

  return new HTMLRewriter()
    .on('title', {
      element(el) { el.setInnerContent(seo.title); },
    })
    .on('meta[name="description"]', {
      element(el) { el.setAttribute('content', seo.description); },
    })
    .on('meta[property="og:title"]', {
      element(el) { el.setAttribute('content', seo.title); },
    })
    .on('meta[property="og:description"]', {
      element(el) { el.setAttribute('content', seo.description); },
    })
    .on('meta[property="og:url"]', {
      element(el) { el.setAttribute('content', canonical); },
    })
    .on('meta[name="twitter:title"]', {
      element(el) { el.setAttribute('content', seo.title); },
    })
    .on('meta[name="twitter:description"]', {
      element(el) { el.setAttribute('content', seo.description); },
    })
    .on('link[rel="canonical"]', {
      element(el) { el.setAttribute('href', canonical); },
    })
    // SPA 내부 이동 시에도 메타를 갱신할 수 있도록 라우트 맵을 함께 내려준다
    .on('head', {
      element(el) {
        el.append(
          `<script id="seo-map" type="application/json">${JSON.stringify(PAGE_SEO).replace(/</g, '\\u003c')}</script>`,
          { html: true },
        );
      },
    })
    .transform(response);
};

// 색인 대상 ETF 티커 — D1에 정보가 쌓인 종목만 sitemap에 포함한다.
// 조회에 실패해도 sitemap 자체는 나가야 하므로 빈 배열로 폴백한다.
export const getIndexableTickers = async (env, limit = 500) => {
  try {
    const { results } = await env.DB
      .prepare('SELECT ticker FROM etf_info ORDER BY ticker ASC LIMIT ?')
      .bind(limit)
      .all();
    return (results || []).map((r) => r.ticker).filter(Boolean);
  } catch (e) {
    console.log('[Sitemap] ticker 조회 실패:', e.message);
    return [];
  }
};

// sitemap.xml 생성 — 정적 페이지 + D1에 쌓인 ETF 상세 페이지
export const buildSitemap = (tickers = []) => {
  const today = new Date().toISOString().slice(0, 10);
  const urls = Object.entries(PAGE_SEO).map(([path, meta]) => ({
    loc: `${SITE_ORIGIN}${path === '/' ? '/' : path}`,
    changefreq: meta.changefreq,
    priority: meta.priority,
  }));

  tickers.forEach((t) => {
    urls.push({ loc: `${SITE_ORIGIN}/etf/${esc(t)}`, changefreq: 'weekly', priority: '0.6' });
  });

  const body = urls
    .map(
      (u) =>
        `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`,
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
};
