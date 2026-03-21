import { Hono } from 'hono';
import { corsMiddleware } from './middleware/cors.js';
import { errorHandler } from './middleware/error.js';
import { etfRoute } from './routes/etf.js';
import { compareRoute } from './routes/compare.js';
import { rankingRoute } from './routes/ranking.js';
import { presetsRoute } from './routes/presets.js';
import { timingRoute } from './routes/timing.js';

const app = new Hono();

// 미들웨어
app.use('*', corsMiddleware);

// 라우트 마운트
app.route('/api/etf', etfRoute);
app.route('/api/etf', compareRoute);
app.route('/api/ranking', rankingRoute);
app.route('/api/presets', presetsRoute);
app.route('/api/timing', timingRoute);

// 헬스체크
app.get('/health', (c) => c.json({ status: 'ok', service: 'index-power-forever' }));

// 에러 핸들러
app.onError(errorHandler);

// 404 핸들러
app.notFound((c) => c.json({ error: 'NotFoundError', message: '요청한 경로를 찾을 수 없습니다.' }, 404));

export default app;
