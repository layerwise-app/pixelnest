import { createFileRoute } from '@tanstack/react-router';
import {
  Aperture,
  ArrowDownToLine,
  ArrowDownUp,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Download,
  FileImage,
  FolderOpen,
  ImagePlus,
  LockKeyhole,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
  ZoomIn,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '~/components/ui/button';
import { seo } from '~/utils/seo';

type OutputFormat = 'smart' | 'jpeg' | 'png' | 'webp' | 'avif';
type Status = 'queued' | 'compressing' | 'done' | 'error';

type QueueItem = {
  id: string;
  file: File;
  originalUrl: string;
  outputUrl?: string;
  outputName?: string;
  outputSize?: number;
  outputMime?: string;
  dimensions?: { width: number; height: number };
  status: Status;
  error?: string;
};

type JobOptions = { format: OutputFormat; quality: number; maxDimension?: number };
type WorkerResult =
  | { type: 'progress'; id: string; status: 'compressing' }
  | {
      type: 'complete';
      id: string;
      bytes: ArrayBuffer;
      mime: string;
      extension: string;
      width: number;
      height: number;
    }
  | { type: 'error'; id: string; message: string }
  | { type: 'zip-complete'; bytes: ArrayBuffer }
  | { type: 'zip-error'; message: string };

const acceptedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const mimeByExtension: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
};
const homePageTitle = 'Compress images, beautifully.';

function imageMime(file: File) {
  if (acceptedTypes.includes(file.type)) return file.type;
  return mimeByExtension[file.name.split('.').pop()?.toLowerCase() ?? ''] ?? '';
}

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      ...seo({
        title: 'Pixelnest | Private image compression',
        description:
          'Compress JPEG, PNG, WebP, and AVIF images right on your device. Private by design.',
      }),
    ],
  }),
  component: Home,
});

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(value >= 10 ? 1 : 2)} ${units[unit]}`;
}

function savedPercent(original: number, compressed: number) {
  return Math.round((1 - compressed / original) * 100);
}

function extensionFor(file: File) {
  const ext = file.name.split('.').pop()?.toLowerCase();
  return ext && ext.length <= 5 ? ext : 'image';
}

function Home() {
  const inputRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const itemsRef = useRef<QueueItem[]>([]);
  const [items, setItems] = useState<QueueItem[]>([]);
  const [format, setFormat] = useState<OutputFormat>('smart');
  const [quality, setQuality] = useState(82);
  const [maxDimension, setMaxDimension] = useState('none');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [comparePosition, setComparePosition] = useState(50);
  const [zipBusy, setZipBusy] = useState(false);

  useEffect(() => {
    const worker = new Worker(new URL('../workers/compressor.worker.ts', import.meta.url), {
      type: 'module',
    });
    workerRef.current = worker;
    worker.onmessage = (event: MessageEvent<WorkerResult>) => {
      const result = event.data;
      if (result.type === 'progress') {
        setItems((current) =>
          current.map((item) =>
            item.id === result.id ? { ...item, status: 'compressing' } : item,
          ),
        );
      } else if (result.type === 'complete') {
        const outputUrl = URL.createObjectURL(
          new Blob([result.bytes], { type: result.mime }),
        );
        setItems((current) =>
          current.map((item) => {
            if (item.id !== result.id) return item;
            if (item.outputUrl) URL.revokeObjectURL(item.outputUrl);
            const suffix = `-small.${result.extension}`;
            const base = item.file.name.replace(/\.[^.]+$/, '');
            return {
              ...item,
              outputUrl,
              outputName: `${base}${suffix}`,
              outputSize: result.bytes.byteLength,
              outputMime: result.mime,
              dimensions: { width: result.width, height: result.height },
              status: 'done',
              error: undefined,
            };
          }),
        );
      } else if (result.type === 'error') {
        setItems((current) =>
          current.map((item) =>
            item.id === result.id
              ? { ...item, status: 'error', error: result.message }
              : item,
          ),
        );
      } else if (result.type === 'zip-complete') {
        downloadBlob(new Blob([result.bytes], { type: 'application/zip' }), 'pixelnest-images.zip');
        setZipBusy(false);
      } else if (result.type === 'zip-error') {
        setZipBusy(false);
        window.alert(`Could not create ZIP: ${result.message}`);
      }
    };
    worker.onerror = (event) => {
      console.error('Image worker failed:', event.message);
      setItems((current) =>
        current.map((item) =>
          item.status === 'compressing'
            ? { ...item, status: 'error', error: 'Compression worker stopped.' }
            : item,
        ),
      );
    };
    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  itemsRef.current = items;

  useEffect(() => () => {
    for (const item of itemsRef.current) {
      URL.revokeObjectURL(item.originalUrl);
      if (item.outputUrl) URL.revokeObjectURL(item.outputUrl);
    }
  }, []);

  useEffect(() => {
    if (!previewId) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPreviewId(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [previewId]);

  function sendToWorker(item: QueueItem, options: JobOptions) {
    void item.file.arrayBuffer().then((buffer) => {
      workerRef.current?.postMessage(
        {
          type: 'compress',
          id: item.id,
          buffer,
          mime: imageMime(item.file),
          name: item.file.name,
          options,
        },
        [buffer],
      );
    }).catch((error: unknown) => {
      setItems((current) => current.map((entry) => entry.id === item.id
        ? { ...entry, status: 'error', error: error instanceof Error ? error.message : 'Could not read this file.' }
        : entry));
    });
  }

  function addFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    const unsupportedCount = files.filter((file) => !imageMime(file)).length;
    if (unsupportedCount) {
      window.alert(`${unsupportedCount} file${unsupportedCount === 1 ? ' was' : 's were'} skipped. Choose JPEG, PNG, WebP, or AVIF images.`);
    }
    const newItems = files
      .filter((file) => Boolean(imageMime(file)))
      .map((file) => ({
        id: crypto.randomUUID(),
        file,
        originalUrl: URL.createObjectURL(file),
        status: (file.size > 50 * 1024 * 1024 ? 'error' : 'queued') as Status,
        ...(file.size > 50 * 1024 * 1024 ? { error: 'Maximum file size is 50 MB.' } : {}),
      }));
    if (!newItems.length) return;
    setItems((current) => [...current, ...newItems]);
    const options: JobOptions = {
      format,
      quality,
      ...(maxDimension !== 'none' ? { maxDimension: Number(maxDimension) } : {}),
    };
    newItems.filter((item) => item.status === 'queued').forEach((item) => sendToWorker(item, options));
  }

  function removeItem(item: QueueItem) {
    URL.revokeObjectURL(item.originalUrl);
    if (item.outputUrl) URL.revokeObjectURL(item.outputUrl);
    setItems((current) => current.filter((entry) => entry.id !== item.id));
    if (previewId === item.id) setPreviewId(null);
  }

  function clearAll() {
    for (const item of items) {
      URL.revokeObjectURL(item.originalUrl);
      if (item.outputUrl) URL.revokeObjectURL(item.outputUrl);
    }
    setItems([]);
    setPreviewId(null);
  }

  function reprocessAll() {
    const options: JobOptions = {
      format,
      quality,
      ...(maxDimension !== 'none' ? { maxDimension: Number(maxDimension) } : {}),
    };
    items.forEach((item) => {
      if (item.outputUrl) URL.revokeObjectURL(item.outputUrl);
    });
    const retryable = items.filter((item) => item.file.size <= 50 * 1024 * 1024);
    setItems((current) => current.map((item) => ({
      ...item,
      outputUrl: undefined,
      outputName: undefined,
      outputSize: undefined,
      outputMime: undefined,
      status: item.file.size > 50 * 1024 * 1024 ? 'error' : 'queued',
      error: item.file.size > 50 * 1024 * 1024 ? 'Maximum file size is 50 MB.' : undefined,
    })));
    retryable.forEach((item) => sendToWorker(item, options));
  }

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function downloadAll() {
    const complete = items.filter((item) => item.status === 'done' && item.outputUrl);
    if (!complete.length || zipBusy) return;
    setZipBusy(true);
    void Promise.all(
      complete.map(async (item) => ({
        name: item.outputName!,
        buffer: await (await fetch(item.outputUrl!)).arrayBuffer(),
      })),
    ).then((files) => {
      const payload = files.map((file) => ({ ...file }));
      const transfers = payload.map((file) => file.buffer);
      workerRef.current?.postMessage({ type: 'zip', files: payload }, transfers);
    }).catch((error: unknown) => {
      setZipBusy(false);
      window.alert(error instanceof Error ? error.message : 'Could not prepare the ZIP.');
    });
  }

  const completedItems = items.filter((item) => item.status === 'done');
  const originalTotal = completedItems.reduce((sum, item) => sum + item.file.size, 0);
  const outputTotal = completedItems.reduce((sum, item) => sum + (item.outputSize ?? 0), 0);
  const totalSaved = originalTotal ? savedPercent(originalTotal, outputTotal) : 0;
  const activePreview = items.find((item) => item.id === previewId);

  return (
    <div className='pixelnest-shell min-h-screen'>
      <header className='app-header'>
        <a className='brand-lockup' href='/' aria-label='Pixelnest home'>
          <span className='brand-mark'><Aperture size={19} strokeWidth={2.1} /></span>
          <span>pixelnest<span className='brand-period'>.</span></span>
          <span className='brand-divider' />
          <span className='brand-product'>image studio</span>
        </a>
        <div className='header-trust'><span className='trust-dot' /> Private by design</div>
      </header>

      <main className='workspace'>
        <section className='intro-row'>
          <div>
            <div className='eyebrow'><Sparkles size={14} /> THE LITTLE IMAGE OPTIMIZER</div>
            <h1>{homePageTitle}</h1>
            <p className='intro-copy'>Less file. Same feeling. Drop in your images and let the pixels do the rest.</p>
          </div>
          <div className='privacy-note'><ShieldCheck size={19} /><span><strong>Always on your device</strong><small>Your images never leave this browser.</small></span></div>
        </section>

        <section
          className={`dropzone ${dragging ? 'is-dragging' : ''}`}
          onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
          }}
          onDrop={(event) => { event.preventDefault(); setDragging(false); addFiles(event.dataTransfer.files); }}
          aria-label='Add images to compress'
        >
          <input
            ref={inputRef}
            className='visually-hidden'
            type='file'
            multiple
            accept={acceptedTypes.join(',')}
            onChange={(event) => { if (event.target.files) addFiles(event.target.files); event.target.value = ''; }}
          />
          <div className='drop-art' aria-hidden='true'>
            <div className='drop-art-back'><FileImage size={25} /></div>
            <div className='drop-art-front'><ImagePlus size={27} /></div>
            <span className='art-spark art-spark-one'>✳</span><span className='art-spark art-spark-two'>✦</span>
          </div>
          <div className='drop-copy'>
            <h2>Drop your images here</h2>
            <p>or <button className='inline-link' onClick={() => inputRef.current?.click()}>browse files</button> from your computer</p>
          </div>
          <Button className='choose-button' onClick={() => inputRef.current?.click()}><FolderOpen size={16} /> Choose images</Button>
          <div className='drop-meta'><span>JPEG</span><span>PNG</span><span>WEBP</span><span>AVIF</span><i /> Up to 50 MB each</div>
          <span className='drop-corner drop-corner-tl' /><span className='drop-corner drop-corner-br' />
        </section>

        <section className='queue-section'>
          <div className='queue-heading'>
            <div className='queue-title-wrap'>
              <h2>Your images <span className='count-pill'>{items.length}</span></h2>
              {completedItems.length > 0 && (
                <span className='queue-summary'>{formatBytes(originalTotal)} <ArrowRight size={13} /> {formatBytes(outputTotal)} <span className='summary-saving'>{totalSaved > 0 ? `${totalSaved}% smaller` : 'optimized'}</span></span>
              )}
            </div>
            <div className='queue-actions'>
              <button className={`settings-trigger ${settingsOpen ? 'active' : ''}`} onClick={() => setSettingsOpen((open) => !open)} aria-expanded={settingsOpen}>
                <Settings2 size={15} /> Settings <ChevronDown size={13} className={settingsOpen ? 'rotate' : ''} />
              </button>
              {items.length > 0 && <button className='quiet-action' onClick={clearAll}><Trash2 size={14} /> Clear all</button>}
            </div>
          </div>

          {settingsOpen && (
            <div className='settings-panel'>
              <div className='settings-heading'><div><Settings2 size={16} /><strong>Compression settings</strong></div><button aria-label='Close settings' onClick={() => setSettingsOpen(false)}><X size={16} /></button></div>
              <div className='settings-grid'>
                <label className='setting-field'><span>Output format</span><select value={format} onChange={(event) => setFormat(event.target.value as OutputFormat)}><option value='smart'>Smart (recommended)</option><option value='jpeg'>JPEG</option><option value='png'>PNG</option><option value='webp'>WebP</option><option value='avif'>AVIF</option></select></label>
                <label className='setting-field quality-setting'><span>Image quality <b>{quality}%</b></span><input aria-label='Image quality' type='range' min='40' max='100' value={quality} onChange={(event) => setQuality(Number(event.target.value))} /><small>Higher quality keeps more detail.</small></label>
                <label className='setting-field'><span>Resize longest edge</span><select value={maxDimension} onChange={(event) => setMaxDimension(event.target.value)}><option value='none'>Keep original dimensions</option><option value='2560'>2,560 px</option><option value='1920'>1,920 px</option><option value='1280'>1,280 px</option><option value='800'>800 px</option></select></label>
              </div>
              <div className='settings-footer'><span><Sparkles size={13} /> New images use these settings automatically.</span><Button size='sm' variant='outline' onClick={reprocessAll} disabled={!items.length}><RotateCcw size={13} /> Recompress all</Button></div>
            </div>
          )}

          {items.length === 0 ? (
            <div className='empty-queue'>
              <div className='empty-icon'><ArrowDownUp size={19} /></div>
              <div><strong>Your queue is ready</strong><p>Compressed images will appear here, neatly side by side.</p></div>
              <div className='empty-hint'><CircleHelp size={14} /> Files stay local</div>
            </div>
          ) : (
            <div className='queue-list'>
              <div className='queue-columns'><span>IMAGE</span><span>ORIGINAL</span><span>COMPRESSED</span><span>RESULT</span><span /></div>
              {items.map((item) => {
                const saving = item.outputSize ? savedPercent(item.file.size, item.outputSize) : 0;
                return (
                  <article className='queue-item' key={item.id}>
                    <div className='file-cell'>
                      <div className='thumbnail-wrap'><img src={item.originalUrl} alt='' /><span className='file-ext'>{extensionFor(item.file)}</span></div>
                      <div className='file-details'><strong title={item.file.name}>{item.file.name}</strong><small>{formatBytes(item.file.size)} original{item.dimensions ? ` · ${item.dimensions.width} × ${item.dimensions.height} px` : ''}</small></div>
                    </div>
                    <div className='size-cell'>{formatBytes(item.file.size)}</div>
                    <div className='size-cell compressed-cell'>
                      {item.status === 'done' ? <>{formatBytes(item.outputSize ?? 0)}<small>{item.outputMime?.replace('image/', '').toUpperCase()} · {saving > 0 ? `${saving}% saved` : saving < 0 ? `${Math.abs(saving)}% larger` : 'same size'}</small></> : item.status === 'error' ? <span className='error-copy' title={item.error}>Couldn’t compress</span> : <span className='processing-copy'><span className='mini-spinner' />{item.status === 'compressing' ? 'Compressing…' : 'In the queue'}</span>}
                    </div>
                    <div className='result-cell'>
                      {item.status === 'done' && <span className={`saving-pill ${saving <= 0 ? 'larger' : ''}`}><ArrowDownToLine size={13} />{saving > 0 ? `${saving}% saved` : saving < 0 ? `${Math.abs(saving)}% larger` : 'Same size'}</span>}
                      {item.status === 'error' && <span className='error-dot' title={item.error}><X size={13} /></span>}
                    </div>
                    <div className='item-actions'>
                      {item.status === 'done' && <button className='icon-action preview-action' onClick={() => { setPreviewId(item.id); setComparePosition(50); }} aria-label={`Compare ${item.file.name}`} title='Compare original and compressed'><ZoomIn size={16} /></button>}
                      {item.status === 'done' && item.outputUrl && <a className='icon-action download-action' href={item.outputUrl} download={item.outputName} aria-label={`Download ${item.outputName}`} title='Download image'><Download size={16} /></a>}
                      <button className='icon-action remove-action' onClick={() => removeItem(item)} aria-label={`Remove ${item.file.name}`} title='Remove image'><X size={16} /></button>
                    </div>
                  </article>
                );
              })}
              {completedItems.length > 0 && <div className='queue-footer'><span><CheckCircle2 size={15} /> {completedItems.length === items.length ? 'All images are ready' : `${completedItems.length} of ${items.length} images ready`}</span><Button className='download-all' onClick={downloadAll} disabled={zipBusy}><Download size={15} /> {zipBusy ? 'Packing files…' : 'Download all'} {!zipBusy && <span className='zip-label'>ZIP</span>}</Button></div>}
            </div>
          )}
        </section>

        <footer className='app-footer'><span><LockKeyhole size={13} /> Your images never leave your device. Processing happens locally in your browser.</span><span className='footer-credit'>MADE FOR THE PIXELS <span>✳</span></span></footer>
      </main>

      {activePreview?.outputUrl && (
        <div className='preview-backdrop' role='presentation' onMouseDown={(event) => { if (event.target === event.currentTarget) setPreviewId(null); }}>
          <section className='preview-dialog' role='dialog' aria-modal='true' aria-labelledby='preview-title'>
            <div className='preview-header'><div><div className='preview-kicker'><Check size={12} /> COMPARISON VIEW</div><h2 id='preview-title'>{activePreview.file.name}</h2></div><button className='preview-close' onClick={() => setPreviewId(null)} aria-label='Close comparison'><X size={19} /></button></div>
            <div className='compare-frame'>
              <img className='compare-compressed' src={activePreview.outputUrl} alt='Compressed image' />
              <div className='compare-original-layer' style={{ clipPath: `inset(0 ${100 - comparePosition}% 0 0)` }}><img src={activePreview.originalUrl} alt='Original image' /></div>
              <div className='compare-divider' style={{ left: `${comparePosition}%` }}><span><ArrowDownUp size={14} /></span></div>
              <span className='compare-label original-label'>ORIGINAL <b>{formatBytes(activePreview.file.size)}</b></span>
              <span className='compare-label compressed-label'>COMPRESSED <b>{formatBytes(activePreview.outputSize ?? 0)}</b></span>
            </div>
            <div className='compare-controls'><span>Drag to compare</span><input aria-label='Comparison position' type='range' min='0' max='100' value={comparePosition} onChange={(event) => setComparePosition(Number(event.target.value))} /><span className='compare-saving'>{savedPercent(activePreview.file.size, activePreview.outputSize ?? 0)}% smaller</span></div>
            <div className='preview-footer'><span><ShieldCheck size={15} /> A little smaller. Still yours.</span>{activePreview.outputUrl && <a href={activePreview.outputUrl} download={activePreview.outputName}><Download size={14} /> Download compressed image</a>}</div>
          </section>
        </div>
      )}
    </div>
  );
}
