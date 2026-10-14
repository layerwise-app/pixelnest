import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyNamePattern, baseName, uniqueNames, type NameContext } from '../src/lib/naming.ts';

const context: NameContext = { name: 'harbor', width: 1080, height: 720, format: 'webp', quality: 80, index: 3 };

test('expands every token and appends the output extension', () => {
  assert.equal(applyNamePattern('{name}-min', context), 'harbor-min.webp');
  assert.equal(applyNamePattern('{name}-{width}w', context), 'harbor-1080w.webp');
  assert.equal(applyNamePattern('{index}_{width}x{height}_q{quality}_{format}', context), '3_1080x720_q80_webp.webp');
  assert.equal(applyNamePattern('{name}-{unknown}', context), 'harbor-{unknown}.webp');
});

test('produces safe names and falls back when the pattern is empty', () => {
  assert.equal(applyNamePattern('a/b:c*?', context), 'a-b-c--.webp');
  assert.equal(applyNamePattern('  ..  ', context), 'harbor.webp');
  assert.equal(applyNamePattern('{name}-q{quality}', { ...context, quality: null, format: 'png' }), 'harbor-q.png');
});

test('strips only the last extension', () => {
  assert.equal(baseName('photo.final.jpeg'), 'photo.final');
  assert.equal(baseName('.hidden'), '.hidden');
  assert.equal(baseName('README'), 'README');
});

test('de-duplicates names case-insensitively for ZIP entries', () => {
  assert.deepEqual(uniqueNames(['a.webp', 'A.webp', 'a.webp', 'b.jpg']), ['a.webp', 'A-2.webp', 'a-3.webp', 'b.jpg']);
});
