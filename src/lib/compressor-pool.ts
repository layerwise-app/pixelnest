import type { CompressResult, WorkerRequest, WorkerResponse } from '~/lib/compressor-protocol';
import type { CompressionSettings } from '~/lib/settings';

type Task = {
  jobId: number;
  /** Builds the request lazily so file bytes are only read when a worker is free. */
  build: () => Promise<{ request: WorkerRequest; transfer: Transferable[] }>;
  resolve: (response: WorkerResponse) => void;
  reject: (error: unknown) => void;
  signal?: AbortSignal;
  onStart?: () => void;
};

type Slot = { worker: Worker; task: Task | null };

export type CompressJob = { file: Blob; mime: string; settings: CompressionSettings };
export type CompressorPool = ReturnType<typeof createCompressorPool>;

export function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError';
}

/**
 * A few module workers that each encode one image at a time. Jobs wait in a
 * FIFO queue; aborted jobs are dropped before they reach a worker.
 */
export function createCompressorPool(size: number) {
  const slots: Slot[] = [];
  const queue: Task[] = [];
  let nextJobId = 1;

  function spawn() {
    const slot: Slot = {
      worker: new Worker(new URL('../workers/compressor.worker.ts', import.meta.url), { type: 'module' }),
      task: null,
    };
    slot.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const task = slot.task;
      if (!task || task.jobId !== event.data.jobId) return;
      slot.task = null;
      task.resolve(event.data);
      pump();
    };
    // A crashed worker (e.g. out of memory) is replaced so the rest of the queue keeps moving.
    slot.worker.onerror = (event) => {
      event.preventDefault();
      slot.worker.terminate();
      slots.splice(slots.indexOf(slot), 1);
      slot.task?.reject(new Error('The encoder ran out of memory on this image.'));
      pump();
    };
    slots.push(slot);
    return slot;
  }

  function pump() {
    while (queue.length) {
      const slot = slots.find((candidate) => !candidate.task) ?? (slots.length < size ? spawn() : null);
      if (!slot) return;
      const task = queue.shift()!;
      if (task.signal?.aborted) {
        task.reject(new DOMException('Aborted', 'AbortError'));
        continue;
      }
      slot.task = task;
      task.onStart?.();
      task.build().then(
        ({ request, transfer }) => slot.worker.postMessage(request, transfer),
        (error: unknown) => {
          slot.task = null;
          task.reject(error);
          pump();
        },
      );
    }
  }

  function enqueue(task: Omit<Task, 'resolve' | 'reject'>, front = false) {
    return new Promise<WorkerResponse>((resolve, reject) => {
      const full = { ...task, resolve, reject };
      if (front) queue.unshift(full);
      else queue.push(full);
      pump();
    });
  }

  return {
    async compress(job: CompressJob, options: { signal?: AbortSignal; onStart?: () => void } = {}) {
      const jobId = nextJobId++;
      const response = await enqueue({
        jobId,
        ...options,
        build: async () => {
          const buffer = await job.file.arrayBuffer();
          return {
            request: { type: 'compress', jobId, buffer, mime: job.mime, settings: job.settings },
            transfer: [buffer],
          };
        },
      });
      if (response.type === 'failed') throw new Error(response.message);
      if (response.type !== 'compressed') throw new Error('Unexpected encoder response.');
      const { type: _type, jobId: _jobId, ...result } = response;
      return result satisfies CompressResult;
    },

    async zip(files: Array<{ name: string; blob: Blob }>) {
      const jobId = nextJobId++;
      // ZIP jumps the queue: the user is waiting on it right now.
      const response = await enqueue(
        {
          jobId,
          build: async () => {
            const entries = await Promise.all(
              files.map(async (file) => ({ name: file.name, buffer: await file.blob.arrayBuffer() })),
            );
            return { request: { type: 'zip', jobId, files: entries }, transfer: entries.map((entry) => entry.buffer) };
          },
        },
        true,
      );
      if (response.type === 'failed') throw new Error(response.message);
      if (response.type !== 'zipped') throw new Error('Unexpected encoder response.');
      return new Blob([response.bytes], { type: 'application/zip' });
    },

    terminate() {
      const pending = [...queue.splice(0), ...slots.flatMap((slot) => (slot.task ? [slot.task] : []))];
      for (const slot of slots) slot.worker.terminate();
      slots.length = 0;
      for (const task of pending) task.reject(new DOMException('Aborted', 'AbortError'));
    },
  };
}

export function defaultPoolSize() {
  const cores = typeof navigator === 'undefined' ? 4 : navigator.hardwareConcurrency || 4;
  return Math.min(3, Math.max(1, Math.floor(cores / 2)));
}
