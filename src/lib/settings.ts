// Compression settings, presets, and the small rules that connect them.
// Kept free of runtime imports so `node --test` can load it directly.

export type OutputFormat = 'auto' | 'jpeg' | 'png' | 'webp' | 'avif';
export type EncodeFormat = Exclude<OutputFormat, 'auto'>;
export type SizeMode = 'quality' | 'target';
export type ResizeMode = 'none' | 'fit' | 'percent';
export type CropAspect = 'original' | '1:1' | '4:5' | '16:9';
export type PresetId = 'web' | 'social' | 'email' | 'lossless';

export type ResizeSettings = {
  mode: ResizeMode;
  width: number | null;
  height: number | null;
  /** On: fit inside width × height. Off: resize to exactly width × height. */
  lockAspect: boolean;
  percent: number;
};

export type CompressionSettings = {
  format: OutputFormat;
  /** WebP only. */
  lossless: boolean;
  quality: number;
  sizeMode: SizeMode;
  targetKB: number;
  resize: ResizeSettings;
  crop: CropAspect;
};

export const MIN_QUALITY = 5;
export const MAX_QUALITY = 100;
export const MAX_DIMENSION = 16384;

const baseResize: ResizeSettings = {
  mode: 'none',
  width: null,
  height: null,
  lockAspect: true,
  percent: 50,
};

const base: CompressionSettings = {
  format: 'webp',
  lossless: false,
  quality: 80,
  sizeMode: 'quality',
  targetKB: 200,
  resize: baseResize,
  crop: 'original',
};

export const PRESETS: Record<PresetId, { label: string; spec: string; settings: CompressionSettings }> = {
  web: {
    label: 'Web',
    spec: 'WebP · 2048',
    settings: { ...base, resize: { ...baseResize, mode: 'fit', width: 2048, height: 2048 } },
  },
  social: {
    label: 'Social',
    spec: 'JPEG · 1080w',
    settings: {
      ...base,
      format: 'jpeg',
      quality: 82,
      resize: { ...baseResize, mode: 'fit', width: 1080, height: null },
    },
  },
  email: {
    label: 'Email',
    spec: 'JPEG · 1280',
    settings: {
      ...base,
      format: 'jpeg',
      quality: 65,
      resize: { ...baseResize, mode: 'fit', width: 1280, height: 1280 },
    },
  },
  lossless: {
    label: 'Lossless',
    spec: 'WebP · exact',
    settings: { ...base, lossless: true, quality: 100 },
  },
};

export const PRESET_IDS = Object.keys(PRESETS) as PresetId[];
export const DEFAULT_SETTINGS = PRESETS.web.settings;
export const DEFAULT_NAME_PATTERN = '{name}-min';

export function matchPreset(settings: CompressionSettings): PresetId | 'custom' {
  const json = JSON.stringify(settings);
  return PRESET_IDS.find((id) => JSON.stringify(PRESETS[id].settings) === json) ?? 'custom';
}

/** Which encoder an input ends up in. `auto` keeps JPEG/AVIF and sends everything else to WebP. */
export function resolveFormat(format: OutputFormat, inputMime: string): EncodeFormat {
  if (format !== 'auto') return format;
  if (inputMime === 'image/jpeg') return 'jpeg';
  if (inputMime === 'image/avif') return 'avif';
  return 'webp';
}

/** Lossless encodes ignore quality, so neither the slider nor a size target applies. */
export function isLossless(settings: Pick<CompressionSettings, 'format' | 'lossless'>) {
  return settings.format === 'png' || (settings.format === 'webp' && settings.lossless);
}

export const FORMAT_LABELS: Record<OutputFormat, string> = {
  auto: 'Auto',
  jpeg: 'JPEG',
  png: 'PNG',
  webp: 'WebP',
  avif: 'AVIF',
};

export function describeResize(settings: CompressionSettings) {
  const { resize, crop } = settings;
  let size = 'Original size';
  if (resize.mode === 'percent') size = `${resize.percent}%`;
  if (resize.mode === 'fit' && (resize.width || resize.height)) {
    if (resize.width && resize.height && resize.lockAspect && resize.width === resize.height) {
      size = `${resize.width} px`;
    } else {
      size = `${resize.width ?? 'auto'} × ${resize.height ?? 'auto'}`;
    }
  }
  return crop === 'original' ? size : `${size} · ${crop}`;
}
