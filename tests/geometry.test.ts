import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cropRect, planGeometry, resizeDimensions } from '../src/lib/geometry.ts';
import { PRESETS, type ResizeSettings } from '../src/lib/settings.ts';

const resize = (patch: Partial<ResizeSettings>): ResizeSettings => ({
  mode: 'fit',
  width: null,
  height: null,
  lockAspect: true,
  percent: 50,
  ...patch,
});

test('center crops to the requested aspect', () => {
  assert.deepEqual(cropRect(1920, 1080, '1:1'), { x: 420, y: 0, width: 1080, height: 1080 });
  assert.deepEqual(cropRect(1000, 1000, '16:9'), { x: 0, y: 218, width: 1000, height: 563 });
  assert.deepEqual(cropRect(1000, 1000, '4:5'), { x: 100, y: 0, width: 800, height: 1000 });
  assert.deepEqual(cropRect(640, 480, 'original'), { x: 0, y: 0, width: 640, height: 480 });
});

test('fit mode keeps proportions and never enlarges', () => {
  assert.deepEqual(resizeDimensions(4000, 3000, resize({ width: 2048, height: 2048 })), { width: 2048, height: 1536 });
  assert.deepEqual(resizeDimensions(800, 600, resize({ width: 2048, height: 2048 })), { width: 800, height: 600 });
  assert.deepEqual(resizeDimensions(1920, 1080, resize({ width: 1080 })), { width: 1080, height: 608 });
});

test('exact mode stretches and fills a missing side proportionally', () => {
  assert.deepEqual(resizeDimensions(1920, 1080, resize({ width: 800, height: 600, lockAspect: false })), {
    width: 800,
    height: 600,
  });
  assert.deepEqual(resizeDimensions(1000, 500, resize({ width: 3000, lockAspect: false })), { width: 3000, height: 1500 });
});

test('percent mode scales down and clamps to at least one pixel', () => {
  assert.deepEqual(resizeDimensions(1920, 1080, resize({ mode: 'percent', percent: 25 })), { width: 480, height: 270 });
  assert.deepEqual(resizeDimensions(3, 3, resize({ mode: 'percent', percent: 1 })), { width: 1, height: 1 });
  assert.deepEqual(resizeDimensions(100, 100, resize({ mode: 'percent', percent: 400 })), { width: 100, height: 100 });
});

test('plans crop before resize', () => {
  const plan = planGeometry(1920, 1080, { crop: '1:1', resize: resize({ mode: 'percent', percent: 50 }) });
  assert.deepEqual(plan, { crop: { x: 420, y: 0, width: 1080, height: 1080 }, width: 540, height: 540, changed: true });
  assert.equal(planGeometry(1600, 1600, PRESETS.web.settings).changed, false);
});
