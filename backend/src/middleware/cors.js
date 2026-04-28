// 프로덕션은 Workers Static Assets로 정적+API 동일 도메인 → CORS 불필요(same-origin).
// 로컬 개발(프론트 8080 → 백엔드 8787)만 cross-origin이라 그 경우에만 헤더를 응답.
export const corsMiddleware = async (c, next) => {
  const reqOrigin = c.req.header('Origin') || '';
  const isLocalDev = reqOrigin === 'http://localhost:8080' || reqOrigin === 'http://127.0.0.1:8080';

  if (c.req.method === 'OPTIONS' && isLocalDev) {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': reqOrigin,
        'Vary': 'Origin',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  await next();

  if (isLocalDev) {
    c.res.headers.set('Access-Control-Allow-Origin', reqOrigin);
    c.res.headers.set('Vary', 'Origin');
  }
};
