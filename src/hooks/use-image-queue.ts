import { useEffect, useRef, useState } from 'react';
import { createCompressorPool, defaultPoolSize, isAbortError, type CompressorPool } from '~/lib/compressor-pool';
import type { CompressResult } from '~/lib/compressor-protocol';
import { describeRejections, imageMime, partitionFiles } from '~/lib/file-intake';
import { recordLifetime } from '~/lib/lifetime-stats';
import { applyNamePattern, baseName, uniqueNames } from '~/lib/naming';
import { DEFAULT_NAME_PATTERN, DEFAULT_SETTINGS, type CompressionSettings } from '~/lib/settings';

export type ItemOutput = Omit<CompressResult, 'bytes'> & { blob: Blob; url: string; size: number };

export type QueueItem = {
  id: string;
  file: File;
  mime: string;
  /** Original file name without extension. */
  name: string;
  originalUrl: string;
  settings: CompressionSettings;
  /** True once the item has its own settings instead of following the global ones. */
  custom: boolean;
  status: 'queued' | 'working' | 'done' | 'error';
  /** The latest finished result; kept while a re-compress runs so the row never goes blank. */
  output?: ItemOutput;
  error?: string;
  /** Identifies the current job; results from superseded jobs are discarded. */
  token: number;
};

// Sliders fire on every step; wait for a pause before re-encoding.
const RERUN_DELAY_MS = 300;

export function useImageQueue() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [settings, setSettingsState] = useState(DEFAULT_SETTINGS);
  const [namePattern, setNamePattern] = useState(DEFAULT_NAME_PATTERN);
  const [notice, setNotice] = useState<string | null>(null);

  // The job system reads and writes items outside React's render cycle, so a
  // ref mirrors state and every change goes through `update`.
  const itemsRef = useRef<QueueItem[]>([]);
  const poolRef = useRef<CompressorPool | null>(null);
  const controllers = useRef(new Map<string, AbortController>());
  const timers = useRef(new Map<string, number>());
  const countedOutput = useRef(new Map<string, number>());
  const tokenRef = useRef(0);

  useEffect(
    () => () => {
      poolRef.current?.terminate();
      poolRef.current = null;
      for (const timer of timers.current.values()) window.clearTimeout(timer);
      timers.current.clear();
    },
    [],
  );

  function update(change: (current: QueueItem[]) => QueueItem[]) {
    itemsRef.current = change(itemsRef.current);
    setItems(itemsRef.current);
  }

  function patch(id: string, token: number, fields: Partial<QueueItem>) {
    update((list) => list.map((item) => (item.id === id && item.token === token ? { ...item, ...fields } : item)));
  }

  function schedule(key: string, task: () => void) {
    window.clearTimeout(timers.current.get(key));
    timers.current.set(
      key,
      window.setTimeout(() => {
        timers.current.delete(key);
        task();
      }, RERUN_DELAY_MS),
    );
  }

  function finish(id: string, token: number, result: CompressResult) {
    const item = itemsRef.current.find((entry) => entry.id === id);
    if (!item || item.token !== token) return;
    const { bytes, ...meta } = result;
    const blob = new Blob([bytes], { type: result.mime });
    if (item.output) URL.revokeObjectURL(item.output.url);
    patch(id, token, {
      status: 'done',
      error: undefined,
      output: { ...meta, blob, url: URL.createObjectURL(blob), size: blob.size },
    });

    // Lifetime totals count each image once and follow its latest output size.
    const previous = countedOutput.current.get(id);
    recordLifetime(
      previous === undefined
        ? { images: 1, originalBytes: item.file.size, outputBytes: blob.size }
        : { images: 0, originalBytes: 0, outputBytes: blob.size - previous },
    );
    countedOutput.current.set(id, blob.size);
  }

  function run(id: string, jobSettings: CompressionSettings, custom: boolean) {
    const item = itemsRef.current.find((entry) => entry.id === id);
    if (!item) return;
    controllers.current.get(id)?.abort();
    const controller = new AbortController();
    controllers.current.set(id, controller);
    const token = ++tokenRef.current;
    update((list) =>
      list.map((entry) =>
        entry.id === id ? { ...entry, settings: jobSettings, custom, token, status: 'queued', error: undefined } : entry,
      ),
    );

    poolRef.current ??= createCompressorPool(defaultPoolSize());
    poolRef.current
      .compress(
        { file: item.file, mime: item.mime, settings: jobSettings },
        { signal: controller.signal, onStart: () => patch(id, token, { status: 'working' }) },
      )
      .then(
        (result) => finish(id, token, result),
        (error: unknown) => {
          if (isAbortError(error)) return;
          patch(id, token, {
            status: 'error',
            error: error instanceof Error ? error.message : 'Could not compress this image.',
          });
        },
      );
  }

  function add(files: File[]) {
    const { accepted, rejected } = partitionFiles(files);
    setNotice(rejected.length ? describeRejections(rejected) : null);
    if (!accepted.length) return;
    const created: QueueItem[] = accepted.map((file) => ({
      id: crypto.randomUUID(),
      file,
      mime: imageMime(file),
      name: baseName(file.name),
      originalUrl: URL.createObjectURL(file),
      settings,
      custom: false,
      status: 'queued',
      token: 0,
    }));
    update((list) => [...list, ...created]);
    for (const item of created) run(item.id, settings, false);
  }

  /** Global changes re-run every image that hasn't been given its own settings. */
  function setSettings(next: CompressionSettings) {
    setSettingsState(next);
    schedule('global', () => {
      for (const item of itemsRef.current) if (!item.custom) run(item.id, next, false);
    });
  }

  function applyToAll() {
    window.clearTimeout(timers.current.get('global'));
    for (const item of itemsRef.current) run(item.id, settings, false);
  }

  function setItemSettings(id: string, next: CompressionSettings) {
    update((list) => list.map((item) => (item.id === id ? { ...item, settings: next, custom: true } : item)));
    schedule(id, () => run(id, next, true));
  }

  /** Runs an image again with whatever settings it already has. */
  function retry(id: string) {
    const item = itemsRef.current.find((entry) => entry.id === id);
    if (item) run(id, item.settings, item.custom);
  }

  function resetItem(id: string) {
    window.clearTimeout(timers.current.get(id));
    run(id, settings, false);
  }

  function forget(item: QueueItem) {
    controllers.current.get(item.id)?.abort();
    controllers.current.delete(item.id);
    window.clearTimeout(timers.current.get(item.id));
    timers.current.delete(item.id);
    URL.revokeObjectURL(item.originalUrl);
    if (item.output) URL.revokeObjectURL(item.output.url);
  }

  function remove(id: string) {
    const item = itemsRef.current.find((entry) => entry.id === id);
    if (!item) return;
    forget(item);
    update((list) => list.filter((entry) => entry.id !== id));
  }

  function clear() {
    for (const item of itemsRef.current) forget(item);
    update(() => []);
    setNotice(null);
  }

  function fileNameFor(item: QueueItem, list: QueueItem[] = items) {
    if (!item.output) return item.file.name;
    return applyNamePattern(namePattern, {
      name: item.name,
      width: item.output.width,
      height: item.output.height,
      format: item.output.extension,
      quality: item.output.quality,
      index: list.findIndex((entry) => entry.id === item.id) + 1,
    });
  }

  async function buildZip() {
    const list = itemsRef.current;
    const ready = list.filter((item) => item.status === 'done' && item.output);
    if (!ready.length) throw new Error('No compressed images yet.');
    const names = uniqueNames(ready.map((item) => fileNameFor(item, list)));
    poolRef.current ??= createCompressorPool(defaultPoolSize());
    return poolRef.current.zip(ready.map((item, index) => ({ name: names[index], blob: item.output!.blob })));
  }

  return {
    items,
    settings,
    setSettings,
    namePattern,
    setNamePattern,
    notice,
    dismissNotice: () => setNotice(null),
    add,
    applyToAll,
    setItemSettings,
    resetItem,
    retry,
    remove,
    clear,
    fileNameFor,
    buildZip,
  };
}

export type ImageQueue = ReturnType<typeof useImageQueue>;
