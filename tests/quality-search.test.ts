import assert from 'node:assert/strict';
import { test } from 'node:test';
import { searchQuality } from '../src/lib/quality-search.ts';

// A fake encoder whose output grows linearly with quality: 10 bytes per step.
function linearEncoder() {
  const calls: number[] = [];
  const encode = async (quality: number) => {
    calls.push(quality);
    return { byteLength: quality * 10, quality };
  };
  return { calls, encode };
}

const options = { min: 5, max: 95, maxAttempts: 10 };

test('returns the top quality when it already fits', async () => {
  const { calls, encode } = linearEncoder();
  const result = await searchQuality(encode, 2000, options);
  assert.deepEqual([result.quality, result.met, result.attempts], [95, true, 1]);
  assert.deepEqual(calls, [95]);
});

test('reports an unreachable target with the smallest encode', async () => {
  const { encode } = linearEncoder();
  const result = await searchQuality(encode, 20, options);
  assert.deepEqual([result.quality, result.met, result.attempts], [5, false, 2]);
});

test('finds the highest quality under the target within the attempt budget', async () => {
  const { calls, encode } = linearEncoder();
  const result = await searchQuality(encode, 615, options);
  assert.equal(result.met, true);
  assert.ok(result.value.byteLength <= 615);
  assert.equal(result.quality, 61);
  assert.ok(calls.length <= options.maxAttempts);
});

test('keeps the best fitting encode when the budget runs out', async () => {
  const { calls, encode } = linearEncoder();
  const result = await searchQuality(encode, 615, { ...options, maxAttempts: 4 });
  assert.equal(calls.length, 4);
  assert.equal(result.met, true);
  assert.ok(result.value.byteLength <= 615);
  assert.ok(result.quality >= 5 && result.quality < 61);
});
