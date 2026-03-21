import { Hono } from 'hono';
import { PresetService } from '../services/PresetService.js';

export const presetsRoute = new Hono();

// GET /api/presets — 인기 프리셋 목록
presetsRoute.get('/', async (c) => {
  const presetService = new PresetService(c.env);
  const presets = await presetService.getPresets();
  return c.json({ data: presets, total: presets.length, hasNext: false });
});

// GET /api/presets/popular — 인기 검색 ETF TOP 5
presetsRoute.get('/popular', async (c) => {
  const presetService = new PresetService(c.env);
  const popular = await presetService.getPopular();
  return c.json({ data: popular, total: popular.length, hasNext: false });
});
