import type { Rect } from './geometry.ts';
import type { CompressionSettings } from './settings.ts';

export type CompressRequest = {
  type: 'compress';
  jobId: number;
  buffer: ArrayBuffer;
  mime: string;
  settings: CompressionSettings;
};

export type ZipRequest = {
  type: 'zip';
  jobId: number;
  files: Array<{ name: string; buffer: ArrayBuffer }>;
};

export type WorkerRequest = CompressRequest | ZipRequest;

export type CompressResult = {
  bytes: ArrayBuffer;
  mime: string;
  extension: string;
  width: number;
  height: number;
  sourceWidth: number;
  sourceHeight: number;
  /** Region of the source that ended up in the output, in source pixels. */
  crop: Rect;
  /** Quality used for lossy encodes, on the 0–100 UI scale. */
  quality: number | null;
  /** Set in target-size mode: whether the output fits under the target. */
  targetMet: boolean | null;
};

export type WorkerResponse =
  | ({ type: 'compressed'; jobId: number } & CompressResult)
  | { type: 'zipped'; jobId: number; bytes: ArrayBuffer }
  | { type: 'failed'; jobId: number; message: string };
