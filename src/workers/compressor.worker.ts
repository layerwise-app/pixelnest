import { decode as decodeAvif, encode as encodeAvif } from '@jsquash/avif';
import { decode as decodeJpeg, encode as encodeJpeg } from '@jsquash/jpeg';
import { decode as decodePng, encode as encodePng } from '@jsquash/png';
import { decode as decodeWebp, encode as encodeWebp } from '@jsquash/webp';
import { zipSync } from 'fflate';
import type { CompressRequest, CompressResult, WorkerRequest, WorkerResponse, ZipRequest } from '~/lib/compressor-protocol';
import { planGeometry, type GeometryPlan } from '~/lib/geometry';
import { searchQuality } from '~/lib/quality-search';
import { isLossless, MIN_QUALITY, resolveFormat, type EncodeFormat } from '~/lib/settings';

const MIME: Record<EncodeFormat, { mime: string; extension: string }> = {
  jpeg: { mime: 'image/jpeg', extension: 'jpg' },
  png: { mime: 'image/png', extension: 'png' },
  webp: { mime: 'image/webp', extension: 'webp' },
  avif: { mime: 'image/avif', extension: 'avif' },
};

// AVIF encodes are several times slower, so its size search gets a smaller budget.
const SEARCH_ATTEMPTS: Record<EncodeFormat, number> = { jpeg: 8, webp: 8, avif: 6, png: 1 };
const SEARCH_MAX_QUALITY = 95;

function post(message: WorkerResponse, transfer: Transferable[] = []) {
  self.postMessage(message, { transfer });
}

// The pool sends one job at a time per worker, so no internal queue is needed.
self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  const run = request.type === 'compress' ? compress(request) : zip(request);
  run.catch((error: unknown) => {
    post({
      type: 'failed',
      jobId: request.jobId,
      message: error instanceof Error ? error.message : 'Something went wrong with this image.',
    });
  });
};

async function decodeImage(buffer: ArrayBuffer, mime: string) {
  if (mime === 'image/jpeg') return decodeJpeg(buffer, { preserveOrientation: true });
  if (mime === 'image/png') return decodePng(buffer);
  if (mime === 'image/webp') return decodeWebp(buffer);
  if (mime === 'image/avif') {
    const image = await decodeAvif(buffer);
    if (!image) throw new Error('This AVIF file could not be decoded.');
    return image;
  }
  throw new Error('Unsupported image type.');
}

function context2d(width: number, height: number) {
  const context = new OffscreenCanvas(width, height).getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Canvas is not available in this browser.');
  return context;
}

function transform(image: ImageData, plan: GeometryPlan) {
  if (!plan.changed) return image;
  const source = context2d(image.width, image.height);
  source.putImageData(image, 0, 0);
  const target = context2d(plan.width, plan.height);
  target.imageSmoothingEnabled = true;
  target.imageSmoothingQuality = 'high';
  const { crop } = plan;
  target.drawImage(source.canvas, crop.x, crop.y, crop.width, crop.height, 0, 0, plan.width, plan.height);
  return target.getImageData(0, 0, plan.width, plan.height);
}

function hasTransparency(image: ImageData) {
  const { data } = image;
  for (let index = 3; index < data.length; index += 4) if (data[index] < 255) return true;
  return false;
}

/** JPEG has no alpha channel; composite onto white so transparent areas don't turn black. */
function flattenOnWhite(image: ImageData) {
  const source = context2d(image.width, image.height);
  source.putImageData(image, 0, 0);
  const target = context2d(image.width, image.height);
  target.fillStyle = '#ffffff';
  target.fillRect(0, 0, image.width, image.height);
  target.drawImage(source.canvas, 0, 0);
  return target.getImageData(0, 0, image.width, image.height);
}

function encode(format: EncodeFormat, image: ImageData, quality: number, lossless: boolean) {
  switch (format) {
    case 'jpeg':
      return encodeJpeg(image, { quality });
    case 'png':
      return encodePng(image);
    case 'webp':
      // In lossless mode libwebp reads quality as effort; 75 balances speed and size.
      return lossless ? encodeWebp(image, { lossless: 1, quality: 75, exact: 1 }) : encodeWebp(image, { quality });
    case 'avif':
      // libavif's scale runs lower than JPEG's for similar visual quality.
      return encodeAvif(image, { quality: Math.round(quality * 0.8), speed: 6 });
  }
}

async function compress({ jobId, buffer, mime, settings }: CompressRequest) {
  const decoded = await decodeImage(buffer, mime);
  const plan = planGeometry(decoded.width, decoded.height, settings);
  const format = resolveFormat(settings.format, mime);
  const lossless = isLossless({ format, lossless: settings.lossless });
  let image = transform(decoded, plan);
  if (format === 'jpeg' && hasTransparency(image)) image = flattenOnWhite(image);

  let bytes: ArrayBuffer;
  let quality: number | null = lossless ? null : settings.quality;
  let targetMet: boolean | null = null;

  if (settings.sizeMode === 'target' && !lossless) {
    const search = await searchQuality(
      (q) => encode(format, image, q, false),
      Math.max(1, settings.targetKB) * 1024,
      { min: MIN_QUALITY, max: SEARCH_MAX_QUALITY, maxAttempts: SEARCH_ATTEMPTS[format] },
    );
    bytes = search.value;
    quality = search.quality;
    targetMet = search.met;
  } else {
    bytes = await encode(format, image, settings.quality, lossless);
  }

  const result: CompressResult = {
    bytes,
    ...MIME[format],
    width: image.width,
    height: image.height,
    sourceWidth: decoded.width,
    sourceHeight: decoded.height,
    crop: plan.crop,
    quality,
    targetMet,
  };
  post({ type: 'compressed', jobId, ...result }, [bytes]);
}

async function zip({ jobId, files }: ZipRequest) {
  // Images are already compressed, so entries are stored rather than deflated again.
  const entries: Record<string, [Uint8Array, { level: 0 }]> = {};
  for (const file of files) entries[file.name] = [new Uint8Array(file.buffer), { level: 0 }];
  const zipped = zipSync(entries);
  const bytes = zipped.buffer.slice(zipped.byteOffset, zipped.byteOffset + zipped.byteLength) as ArrayBuffer;
  post({ type: 'zipped', jobId, bytes }, [bytes]);
}
