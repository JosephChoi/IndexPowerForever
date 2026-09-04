import { Hono } from 'hono';
import { corsMiddleware } from './middleware/cors.js';
import { errorHandler } from './middleware/error.js';
import { etfRoute } from './routes/etf.js';
import { compareRoute } from './routes/compare.js';
import { rankingRoute } from './routes/ranking.js';
import { presetsRoute } from './routes/presets.js';
import { timingRoute } from './routes/timing.js';
import { withdrawalRoute } from './routes/withdrawal.js';
import { translateRoute } from './routes/translate.js';
import { DailyUpdateService } from './services/DailyUpdateService.js';
import { injectSeo, buildSitemap, getIndexableTickers, PAGE_SEO, hasTickerData } from './services/SeoService.js';

const app = new Hono();

// 미들웨어
app.use('*', corsMiddleware);

// 도메인 정규화 — 검색엔진 중복 색인을 막기 위해 www 는 apex(indexwins.com)로 301
app.use('*', async (c, next) => {
  const url = new URL(c.req.url);
  if (url.hostname === 'www.indexwins.com') {
    url.hostname = 'indexwins.com';
    return c.redirect(url.toString(), 301);
  }
  await next();
});

// API 응답은 검색 결과에 노출될 이유가 없다.
// robots.txt 의 Disallow 는 Cloudflare 가 앞에 자동 주입하는 블록 때문에 `User-agent: *` 그룹이
// 둘로 나뉘어, 그룹을 병합하지 않는 크롤러에는 적용되지 않을 수 있다.
// 응답 헤더로 직접 막으면 robots.txt 해석 방식과 무관하게 색인되지 않는다.
app.use('/api/*', async (c, next) => {
  await next();
  c.header('X-Robots-Tag', 'noindex, nofollow');
});

// 라우트 마운트
app.route('/api/etf', etfRoute);
app.route('/api/etf', compareRoute);
app.route('/api/ranking', rankingRoute);
app.route('/api/presets', presetsRoute);
app.route('/api/timing', timingRoute);
app.route('/api/withdrawal', withdrawalRoute);
app.route('/api/translate', translateRoute);

// 헬스체크
app.get('/health', (c) => c.json({ status: 'ok', service: 'index-power-forever' }));

// 수동 데이터 업데이트 트리거 (초기 세팅 + 디버그용) — waitUntil로 타임아웃 방지
app.get('/api/admin/update-prices', async (c) => {
  const service = new DailyUpdateService(c.env);
  c.executionCtx.waitUntil(service.run().then(results => {
    console.log('[ManualUpdate]', JSON.stringify({
      success: results.success.length,
      failed: results.failed.length,
      skipped: results.skipped.length,
      details: results,
    }));
  }));
  return c.json({ data: { message: '업데이트가 백그라운드에서 시작되었습니다. 완료까지 약 5~10분 소요됩니다.' } });
});

// Yahoo API 연결 테스트 — SPY 1개만 업데이트하여 즉시 결과 확인
app.get('/api/admin/test-update', async (c) => {
  const service = new DailyUpdateService(c.env);
  try {
    const updated = await service._updateTicker('SPY');
    return c.json({ data: { ticker: 'SPY', newRows: updated, status: 'ok' } });
  } catch (e) {
    return c.json({ data: { ticker: 'SPY', error: e.message, status: 'failed' } });
  }
});

// ── SEO ──

// sitemap.xml — 정적 페이지 + D1에 등록된 ETF 상세 페이지를 매 요청 시 생성
app.get('/sitemap.xml', async (c) => {
  const tickers = await getIndexableTickers(c.env);
  return c.body(buildSitemap(tickers), 200, {
    'Content-Type': 'application/xml; charset=utf-8',
    'Cache-Control': 'public, max-age=3600',
  });
});

// SPA 페이지 요청 — index.html에 라우트별 title/description/canonical 을 주입해 응답한다
const fetchIndexHtml = (c) => {
  const indexUrl = new URL('/index.html', c.req.url);
  return c.env.ASSETS.fetch(new Request(indexUrl, { headers: c.req.raw.headers }));
};

Object.keys(PAGE_SEO).forEach((path) => {
  app.get(path, async (c) => {
    const res = await fetchIndexHtml(c);
    return injectSeo(res, new URL(c.req.url).pathname);
  });
});

// ETF 상세 — 티커는 URL만 바꾸면 무한히 만들어지므로, D1에 데이터가 있는 종목만 색인 대상으로 둔다.
// 데이터가 없으면 noindex + 404 상태로 응답한다. 본문은 그대로 내려가므로 사용자 화면은 정상 동작하고,
// 조회 결과가 D1에 쌓이면 이후 요청부터 자연히 200 + 색인 대상이 된다.
app.get('/etf/:ticker', async (c) => {
  const { pathname } = new URL(c.req.url);
  const ticker = c.req.param('ticker').toUpperCase();
  const known = await hasTickerData(c.env, ticker);
  const res = await fetchIndexHtml(c);
  const injected = injectSeo(res, pathname, { noindex: !known });
  if (known) return injected;
  return new Response(injected.body, { status: 404, headers: injected.headers });
});

// 에러 핸들러
app.onError(errorHandler);

// 404 핸들러 — /api/* 는 JSON 404.
// 그 외 알 수 없는 경로는 SPA 폴백(index.html)을 주되 상태코드는 404로 둔다.
// 정식 라우트는 모두 위에서 처리되므로, 200을 주면 검색엔진이 soft 404로 판단한다.
app.notFound(async (c) => {
  const { pathname } = new URL(c.req.url);
  if (pathname.startsWith('/api/')) {
    return c.json({ error: 'NotFoundError', message: '요청한 경로를 찾을 수 없습니다.' }, 404);
  }
  const indexUrl = new URL('/index.html', c.req.url);
  const res = await c.env.ASSETS.fetch(new Request(indexUrl, { headers: c.req.raw.headers }));
  return new Response(res.body, { status: 404, headers: res.headers });
});

export default {
  fetch: (request, env, ctx) => app.fetch(request, env, ctx),

  // Cron Trigger: 매일 KST 07:00 (UTC 22:00) 주요 종목 가격 업데이트
  async scheduled(event, env, ctx) {
    const service = new DailyUpdateService(env);
    ctx.waitUntil(service.run().then(results => {
      console.log('[DailyUpdate]', JSON.stringify({
        success: results.success.length,
        failed: results.failed.length,
        skipped: results.skipped.length,
        details: results,
      }));
    }));
  },
};
