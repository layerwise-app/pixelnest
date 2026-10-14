import assert from 'node:assert/strict';
import { test } from 'node:test';
import { describeRejections, imageMime, partitionFiles } from '../src/lib/file-intake.ts';
import { formatBytes, percentSaved } from '../src/lib/format.ts';
import { describeResize, isLossless, matchPreset, PRESETS, resolveFormat } from '../src/lib/settings.ts';

test('recognises presets and marks edits as custom', () => {
  assert.equal(matchPreset(structuredClone(PRESETS.social.settings)), 'social');
  assert.equal(matchPreset({ ...PRESETS.web.settings, quality: 79 }), 'custom');
});

test('auto format keeps JPEG and AVIF and sends the rest to WebP', () => {
  assert.equal(resolveFormat('auto', 'image/jpeg'), 'jpeg');
  assert.equal(resolveFormat('auto', 'image/avif'), 'avif');
  assert.equal(resolveFormat('auto', 'image/png'), 'webp');
  assert.equal(resolveFormat('png', 'image/jpeg'), 'png');
  assert.equal(isLossless({ format: 'webp', lossless: true }), true);
  assert.equal(isLossless({ format: 'jpeg', lossless: true }), false);
});

test('summarises resize and crop settings', () => {
  assert.equal(describeResize(PRESETS.web.settings), '2048 px');
  assert.equal(describeResize(PRESETS.social.settings), '1080 × auto');
  assert.equal(describeResize({ ...PRESETS.lossless.settings, crop: '1:1' }), 'Original size · 1:1');
});

test('formats bytes and savings', () => {
  assert.equal(formatBytes(512), '512 B');
  assert.equal(formatBytes(158_000), '154 KB');
  assert.equal(formatBytes(2_609_720), '2.5 MB');
  assert.equal(percentSaved(1000, 4), 99);
  assert.equal(percentSaved(1000, 1500), -50);
  assert.equal(percentSaved(0, 10), 0);
});

test('accepts images by type or extension and explains rejections', () => {
  const file = (name: string, type: string, size = 10) => new File([new Uint8Array(size)], name, { type });
  assert.equal(imageMime(file('scan.JPG', '')), 'image/jpeg');
  assert.equal(imageMime(file('icon.png', 'image/png')), 'image/png');
  assert.equal(imageMime(file('vector.svg', 'image/svg+xml')), '');

  const { accepted, rejected } = partitionFiles([
    file('a.webp', 'image/webp'),
    file('.DS_Store', ''),
    file('notes.txt', 'text/plain'),
    file('clip.gif', 'image/gif'),
  ]);
  assert.deepEqual(accepted.map((entry) => entry.name), ['a.webp']);
  assert.equal(describeRejections(rejected), "Skipped notes.txt and clip.gif aren't JPEG, PNG, WebP or AVIF.");
});
