const KB = 1024;

export function formatBytes(bytes: number) {
  if (bytes < KB) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / KB;
  let unit = 0;
  while (value >= KB && unit < units.length - 1) {
    value /= KB;
    unit++;
  }
  const digits = value >= 100 || unit === 0 ? 0 : 1;
  return `${value.toFixed(digits)} ${units[unit]}`;
}

/** Positive when the output is smaller. Rounded toward zero so 99.6% never reads as 100%. */
export function percentSaved(original: number, output: number) {
  if (!original) return 0;
  return Math.trunc((1 - output / original) * 100);
}

export function formatDimensions(size: { width: number; height: number }) {
  return `${size.width}×${size.height}`;
}
