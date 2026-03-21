// 전역 에러 핸들러 — ValidationError(400) / NotFoundError(404) / RateLimitError(429) / ServerError(500)
export const errorHandler = (err, c) => {
  if (err.name === 'ValidationError') {
    return c.json({ error: err.name, message: err.message }, 400);
  }
  if (err.name === 'NotFoundError') {
    return c.json({ error: err.name, message: err.message }, 404);
  }
  if (err.name === 'RateLimitError') {
    return c.json({ error: err.name, message: err.message }, 429);
  }
  return c.json({ error: 'ServerError', message: '서버 오류가 발생했습니다.' }, 500);
};
