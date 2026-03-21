import { cors } from 'hono/cors';

// CORS 미들웨어 — 모든 출처 허용 (인증 없는 공개 서비스)
export const corsMiddleware = cors({
  origin: '*',
  allowMethods: ['GET', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
  maxAge: 86400,
});
