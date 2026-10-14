export type QualitySearchResult<T> = {
  value: T;
  quality: number;
  /** False when even the lowest quality is larger than the target. */
  met: boolean;
  attempts: number;
};

type SearchOptions = { min: number; max: number; maxAttempts: number };

/**
 * Finds the highest integer quality whose encoded size fits under `targetBytes`.
 * Probes the top first (often already small enough), then the floor (to fail
 * fast when the target is unreachable), then bisects with the remaining budget.
 */
export async function searchQuality<T extends { byteLength: number }>(
  encode: (quality: number) => Promise<T>,
  targetBytes: number,
  { min, max, maxAttempts }: SearchOptions,
): Promise<QualitySearchResult<T>> {
  let attempts = 1;
  const top = await encode(max);
  if (top.byteLength <= targetBytes) return { value: top, quality: max, met: true, attempts };

  attempts++;
  const floor = await encode(min);
  if (floor.byteLength > targetBytes) return { value: floor, quality: min, met: false, attempts };

  let best = { value: floor, quality: min };
  let low = min;
  let high = max;
  while (high - low > 1 && attempts < maxAttempts) {
    const quality = Math.round((low + high) / 2);
    attempts++;
    const value = await encode(quality);
    if (value.byteLength <= targetBytes) {
      best = { value, quality };
      low = quality;
    } else {
      high = quality;
    }
  }
  return { ...best, met: true, attempts };
}
