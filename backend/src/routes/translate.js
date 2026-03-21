import { Hono } from 'hono';

export const translateRoute = new Hono();

// POST /api/translate — Cloudflare Workers AI 번역 (영→한)
translateRoute.post('/', async (c) => {
  const { text } = await c.req.json();
  if (!text || typeof text !== 'string') {
    const err = new Error('text는 필수입니다.');
    err.name = 'ValidationError';
    throw err;
  }
  if (text.length > 5000) {
    const err = new Error('번역 텍스트는 5000자 이하여야 합니다.');
    err.name = 'ValidationError';
    throw err;
  }

  // KV 캐시 확인 (번역 결과는 7일 캐시)
  const cacheKey = `translate:${btoa(unescape(encodeURIComponent(text))).slice(0, 200)}`;
  const cached = await c.env.KV.get(cacheKey);
  if (cached) return c.json({ data: { translated: cached } });

  // Cloudflare Workers AI — m2m100 번역 모델
  const result = await c.env.AI.run('@cf/meta/m2m100-1.2b', {
    text,
    source_lang: 'en',
    target_lang: 'ko',
  });

  const translated = result.translated_text || '';

  // KV 캐시 저장 (7일)
  await c.env.KV.put(cacheKey, translated, { expirationTtl: 604800 });

  return c.json({ data: { translated } });
});
