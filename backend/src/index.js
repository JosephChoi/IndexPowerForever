import { Hono } from 'hono';
import { corsMiddleware } from './middleware/cors.js';
import { errorHandler } from './middleware/error.js';
import { etfRoute } from './routes/etf.js';
import { compareRoute } from './routes/compare.js';
import { rankingRoute } from './routes/ranking.js';
import { presetsRoute } from './routes/presets.js';
import { timingRoute } from './routes/timing.js';
import { translateRoute } from './routes/translate.js';
import { DailyUpdateService } from './services/DailyUpdateService.js';

const app = new Hono();

// 미들웨어
app.use('*', corsMiddleware);

// 라우트 마운트
app.route('/api/etf', etfRoute);
app.route('/api/etf', compareRoute);
app.route('/api/ranking', rankingRoute);
app.route('/api/presets', presetsRoute);
app.route('/api/timing', timingRoute);
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

// 에러 핸들러
app.onError(errorHandler);

// 404 핸들러
app.notFound((c) => c.json({ error: 'NotFoundError', message: '요청한 경로를 찾을 수 없습니다.' }, 404));

export default {
  fetch: (request, env, ctx) => app.fetch(request, env, ctx),

  // Cron Trigger: 매일 KST 07:00 (UTC 22:00) 주요 종목 가격 업데이트
  async scheduled(event, env, ctx) {
    const service = new DailyUpdateService(env);
    const results = await service.run();
    console.log('[DailyUpdate]', JSON.stringify({
      success: results.success.length,
      failed: results.failed.length,
      skipped: results.skipped.length,
      details: results,
    }));
  },
};
