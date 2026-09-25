import { decode as decodeAvif } from '@jsquash/avif';
import { encode as encodeAvif } from '@jsquash/avif';
import { decode as decodeJpeg } from '@jsquash/jpeg';
import { encode as encodeJpeg } from '@jsquash/jpeg';
import { decode as decodePng } from '@jsquash/png';
import { encode as encodePng } from '@jsquash/png';
import { decode as decodeWebp } from '@jsquash/webp';
import { encode as encodeWebp } from '@jsquash/webp';
import { zipSync } from 'fflate';

type OutputFormat = 'smart' | 'jpeg' | 'png' | 'webp' | 'avif';
type JobOptions = { format: OutputFormat; quality: number; maxDimension?: number };
type EncodeFormat = Exclude<OutputFormat, 'smart'>;
type CompressMessage = {
  type: 'compress';
  id: string;
  buffer: ArrayBuffer;
  mime: string;
  name: string;
  options: JobOptions;
};
type ZipMessage = { type: 'zip'; files: Array<{ name: string; buffer: ArrayBuffer }> };
const compressionQueue: CompressMessage[] = [];
let processingQueue = false;

self.onmessage = (event: MessageEvent<CompressMessage | ZipMessage>) => {
  if (event.data.type === 'compress') {
    compressionQueue.push(event.data);
    void processQueue();
  }
  else if (event.data.type === 'zip') makeZip(event.data);
};

async function processQueue() {
  if (processingQueue) return;
  processingQueue = true;
  while (compressionQueue.length) {
    const next = compressionQueue.shift();
    if (next) await compress(next);
  }
  processingQueue = false;
}

async function decodeImage(buffer: ArrayBuffer, mime: string) {
  if (mime === 'image/jpeg') return decodeJpeg(buffer, { preserveOrientation: true });
  if (mime === 'image/png') return decodePng(buffer);
  if (mime === 'image/webp') return decodeWebp(buffer);
  if (mime === 'image/avif') {
    const image = await decodeAvif(buffer);
    if (!image) throw new Error('This AVIF image could not be decoded.');
    return image;
  }
  throw new Error('This image format is not supported.');
}

function smartFormat(mime: string): EncodeFormat {
  if (mime === 'image/jpeg') return 'jpeg';
  if (mime === 'image/avif') return 'avif';
  if (mime === 'image/png') return 'webp';
  return 'webp';
}

function resizeImage(image: ImageData, maxDimension?: number) {
  if (!maxDimension || Math.max(image.width, image.height) <= maxDimension) return image;
  const ratio = maxDimension / Math.max(image.width, image.height);
  const width = Math.max(1, Math.round(image.width * ratio));
  const height = Math.max(1, Math.round(image.height * ratio));
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Could not resize this image.');
  const source = new OffscreenCanvas(image.width, image.height);
  const sourceContext = source.getContext('2d', { willReadFrequently: true });
  if (!sourceContext) throw new Error('Could not resize this image.');
  sourceContext.putImageData(image, 0, 0);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(source, 0, 0, width, height);
  return context.getImageData(0, 0, width, height);
}

function flattenAlpha(image: ImageData) {
  const source = new OffscreenCanvas(image.width, image.height);
  const sourceContext = source.getContext('2d', { willReadFrequently: true });
  const canvas = new OffscreenCanvas(image.width, image.height);
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context || !sourceContext) throw new Error('Could not prepare this image for JPEG.');
  sourceContext.putImageData(image, 0, 0);
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, image.width, image.height);
  context.drawImage(source, 0, 0);
  return context.getImageData(0, 0, image.width, image.height);
}

async function compress(message: CompressMessage) {
  try {
    self.postMessage({ type: 'progress', id: message.id });
    let image = await decodeImage(message.buffer, message.mime);
    image = resizeImage(image, message.options.maxDimension);
    const format = message.options.format === 'smart'
      ? smartFormat(message.mime)
      : message.options.format;
    const quality = Math.max(40, Math.min(100, message.options.quality));
    let bytes: ArrayBuffer;
    let mime: string;
    let extension: string;

    switch (format) {
      case 'jpeg':
        bytes = await encodeJpeg(image.data.some((value, index) => index % 4 === 3 && value < 255)
          ? flattenAlpha(image)
          : image, { quality });
        mime = 'image/jpeg';
        extension = 'jpg';
        break;
      case 'png':
        bytes = await encodePng(image);
        mime = 'image/png';
        extension = 'png';
        break;
      case 'webp':
        bytes = await encodeWebp(image, { quality });
        mime = 'image/webp';
        extension = 'webp';
        break;
      case 'avif':
        bytes = await encodeAvif(image, { quality: Math.round(quality * 0.8), speed: 6 });
        mime = 'image/avif';
        extension = 'avif';
        break;
    }

    self.postMessage({
      type: 'complete',
      id: message.id,
      bytes,
      mime,
      extension,
      width: image.width,
      height: image.height,
    }, { transfer: [bytes] });
  } catch (error) {
    self.postMessage({
      type: 'error',
      id: message.id,
      message: error instanceof Error ? error.message : 'Compression failed. Try another image.',
    });
  }
}

function makeZip(message: ZipMessage) {
  try {
    const files: Record<string, Uint8Array> = {};
    for (const file of message.files) {
      files[file.name.replace(/[\\/:*?"<>|]/g, '_')] = new Uint8Array(file.buffer);
    }
    const zipped = zipSync(files, { level: 6 });
    const bytes = zipped.buffer.slice(
      zipped.byteOffset,
      zipped.byteOffset + zipped.byteLength,
    ) as ArrayBuffer;
    self.postMessage({ type: 'zip-complete', bytes }, { transfer: [bytes] });
  } catch (error) {
    self.postMessage({
      type: 'zip-error',
      message: error instanceof Error ? error.message : 'ZIP creation failed.',
    });
  }
}
