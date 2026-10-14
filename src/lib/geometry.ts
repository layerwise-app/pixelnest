import type { CompressionSettings, CropAspect, ResizeSettings } from './settings.ts';

export type Rect = { x: number; y: number; width: number; height: number };
export type Size = { width: number; height: number };
export type GeometryPlan = { crop: Rect; width: number; height: number; changed: boolean };

const ASPECTS: Record<Exclude<CropAspect, 'original'>, number> = {
  '1:1': 1,
  '4:5': 4 / 5,
  '16:9': 16 / 9,
};

// Mirrors MAX_DIMENSION in settings.ts; duplicated to keep this module import-free at runtime.
const MAX_SIDE = 16384;

/** Largest centered rectangle with the requested aspect ratio. */
export function cropRect(width: number, height: number, aspect: CropAspect): Rect {
  if (aspect === 'original') return { x: 0, y: 0, width, height };
  const ratio = ASPECTS[aspect];
  if (width / height > ratio) {
    const cropWidth = Math.max(1, Math.round(height * ratio));
    return { x: Math.floor((width - cropWidth) / 2), y: 0, width: cropWidth, height };
  }
  const cropHeight = Math.max(1, Math.round(width / ratio));
  return { x: 0, y: Math.floor((height - cropHeight) / 2), width, height: cropHeight };
}

function clampSide(value: number) {
  return Math.min(MAX_SIDE, Math.max(1, Math.round(value)));
}

/** Output size for an already-cropped region. Fit and percent never upscale; exact mode may. */
export function resizeDimensions(width: number, height: number, resize: ResizeSettings): Size {
  if (resize.mode === 'percent') {
    const scale = Math.min(100, Math.max(1, resize.percent)) / 100;
    return { width: clampSide(width * scale), height: clampSide(height * scale) };
  }
  if (resize.mode !== 'fit' || (!resize.width && !resize.height)) return { width, height };

  if (resize.lockAspect) {
    const scale = Math.min(
      1,
      resize.width ? resize.width / width : Infinity,
      resize.height ? resize.height / height : Infinity,
    );
    return { width: clampSide(width * scale), height: clampSide(height * scale) };
  }

  // Exact size: a missing side follows the other one proportionally.
  const targetWidth = resize.width ?? (width * resize.height!) / height;
  const targetHeight = resize.height ?? (height * resize.width!) / width;
  return { width: clampSide(targetWidth), height: clampSide(targetHeight) };
}

export function planGeometry(
  width: number,
  height: number,
  settings: Pick<CompressionSettings, 'crop' | 'resize'>,
): GeometryPlan {
  const crop = cropRect(width, height, settings.crop);
  const size = resizeDimensions(crop.width, crop.height, settings.resize);
  const changed =
    crop.width !== width || crop.height !== height || size.width !== crop.width || size.height !== crop.height;
  return { crop, ...size, changed };
}
