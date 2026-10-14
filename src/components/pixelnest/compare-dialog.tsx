import { ChevronsLeftRightIcon, DownloadIcon, XIcon } from 'lucide-react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { Button } from '~/components/ui/button';
import type { ItemOutput, QueueItem } from '~/hooks/use-image-queue';
import { downloadBlob } from '~/lib/export';
import { formatBytes, formatDimensions, percentSaved } from '~/lib/format';
import { cn } from '~/lib/utils';
import { formatSavings } from './queue-summary';
import { Segmented } from './segmented';

type Zoom = 'fit' | '1' | '2';
type Drag = { mode: 'split' } | { mode: 'pan'; x: number; y: number; panX: number; panY: number };

const MIME_LABELS: Record<string, string> = {
  'image/jpeg': 'JPEG',
  'image/png': 'PNG',
  'image/webp': 'WebP',
  'image/avif': 'AVIF',
};
// Breathing room around the image in fit mode.
const FIT_PADDING = 32;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

type CompareDialogProps = { item: QueueItem | null; fileName: string; onClose: () => void };

export function CompareDialog({ item, fileName, onClose }: CompareDialogProps) {
  const output = item?.output;
  return (
    <DialogPrimitive.Root open={Boolean(item && output)} onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className='fixed inset-0 z-50 bg-black/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0' />
        <DialogPrimitive.Content
          data-testid='compare-dialog'
          className='fixed inset-2 z-50 flex flex-col overflow-hidden rounded-2xl border border-line-strong bg-surface shadow-[0_40px_120px_-20px_rgb(0_0_0/90%)] outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.98] sm:inset-6 lg:inset-x-[max(1.5rem,calc(50%-42rem))]'
        >
          {item && output && <CompareViewer item={item} output={output} fileName={fileName} />}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function CompareViewer({ item, output, fileName }: { item: QueueItem; output: ItemOutput; fileName: string }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState<Zoom>('fit');
  const [split, setSplit] = useState(0.5);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<Drag | null>(null);

  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setViewport({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const fitScale = Math.min(
    1,
    (viewport.width - FIT_PADDING * 2) / output.width,
    (viewport.height - FIT_PADDING * 2) / output.height,
  );
  const scale = zoom === 'fit' ? Math.max(0.01, fitScale) : Number(zoom);
  const width = output.width * scale;
  const height = output.height * scale;
  const maxPanX = Math.max(0, (width - viewport.width) / 2);
  const maxPanY = Math.max(0, (height - viewport.height) / 2);
  const pannable = maxPanX > 0 || maxPanY > 0;
  const left = (viewport.width - width) / 2 + clamp(pan.x, -maxPanX, maxPanX);
  const top = (viewport.height - height) / 2 + clamp(pan.y, -maxPanY, maxPanY);

  // The original is positioned so its cropped region lines up exactly with the output.
  const { crop } = output;
  const originalScaleX = width / crop.width;
  const originalScaleY = height / crop.height;

  function changeZoom(next: Zoom) {
    setZoom(next);
    setPan({ x: 0, y: 0 });
  }

  function splitAt(clientX: number) {
    const rect = viewportRef.current!.getBoundingClientRect();
    setSplit(clamp((clientX - rect.left) / rect.width, 0, 1));
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    const onHandle = (event.target as HTMLElement).closest('[data-split-handle]');
    event.currentTarget.setPointerCapture(event.pointerId);
    if (onHandle || !pannable) {
      drag.current = { mode: 'split' };
      if (!onHandle) splitAt(event.clientX);
    } else {
      const panX = clamp(pan.x, -maxPanX, maxPanX);
      const panY = clamp(pan.y, -maxPanY, maxPanY);
      drag.current = { mode: 'pan', x: event.clientX, y: event.clientY, panX, panY };
    }
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const current = drag.current;
    if (!current) return;
    if (current.mode === 'split') return splitAt(event.clientX);
    setPan({
      x: clamp(current.panX + event.clientX - current.x, -maxPanX, maxPanX),
      y: clamp(current.panY + event.clientY - current.y, -maxPanY, maxPanY),
    });
  }

  function onHandleKey(event: KeyboardEvent<HTMLDivElement>) {
    const step = event.shiftKey ? 0.1 : 0.02;
    if (event.key === 'ArrowLeft') setSplit((value) => clamp(value - step, 0, 1));
    else if (event.key === 'ArrowRight') setSplit((value) => clamp(value + step, 0, 1));
    else if (event.key === 'Home') setSplit(0);
    else if (event.key === 'End') setSplit(1);
    else return;
    event.preventDefault();
  }

  const layer = (layerScale: number): CSSProperties => ({
    position: 'absolute',
    maxWidth: 'none',
    imageRendering: layerScale > 1.01 ? 'pixelated' : 'auto',
  });
  const outputFormat = MIME_LABELS[output.mime] ?? output.extension.toUpperCase();
  const percent = percentSaved(item.file.size, output.size);

  return (
    <>
      <header className='flex h-14 shrink-0 items-center gap-3 border-b border-line px-3 sm:px-4'>
        <div className='min-w-0 flex-1'>
          <DialogPrimitive.Title className='truncate text-sm font-medium'>{fileName}</DialogPrimitive.Title>
          <DialogPrimitive.Description className='sr-only'>
            Drag the divider to compare the original with the compressed image.
          </DialogPrimitive.Description>
        </div>
        <span className='num hidden text-xs text-subtle sm:inline'>{Math.round(scale * 100)}%</span>
        <Segmented<Zoom>
          label='Zoom'
          size='sm'
          value={zoom}
          onChange={changeZoom}
          className='w-auto'
          options={[
            { value: 'fit', label: 'Fit' },
            { value: '1', label: '100%' },
            { value: '2', label: '200%' },
          ]}
        />
        <DialogPrimitive.Close asChild>
          <Button size='icon-sm' variant='ghost' aria-label='Close'>
            <XIcon />
          </Button>
        </DialogPrimitive.Close>
      </header>

      <div
        ref={viewportRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
        onDoubleClick={() => changeZoom(zoom === 'fit' ? '1' : 'fit')}
        className={cn(
          'checkerboard relative min-h-0 flex-1 touch-none overflow-hidden select-none',
          pannable ? 'cursor-grab active:cursor-grabbing' : 'cursor-ew-resize',
        )}
      >
        {viewport.width > 0 && (
          <>
            <img
              src={output.url}
              alt='Compressed'
              draggable={false}
              style={{ ...layer(scale), left, top, width, height }}
            />
            <div className='absolute inset-0' style={{ clipPath: `inset(0 ${(1 - split) * 100}% 0 0)` }}>
              <div className='absolute overflow-hidden' style={{ left, top, width, height }}>
                <img
                  src={item.originalUrl}
                  alt='Original'
                  draggable={false}
                  style={{
                    ...layer(originalScaleX),
                    left: -crop.x * originalScaleX,
                    top: -crop.y * originalScaleY,
                    width: output.sourceWidth * originalScaleX,
                    height: output.sourceHeight * originalScaleY,
                  }}
                />
              </div>
            </div>
            <span className='pointer-events-none absolute top-3 left-3 rounded-md bg-black/70 px-2 py-1 text-[11px] font-medium backdrop-blur'>
              Original
            </span>
            <span className='pointer-events-none absolute top-3 right-3 rounded-md bg-black/70 px-2 py-1 text-[11px] font-medium backdrop-blur'>
              {outputFormat}
            </span>
            <div
              data-split-handle
              role='slider'
              tabIndex={0}
              aria-label='Divider position'
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(split * 100)}
              onKeyDown={onHandleKey}
              className='group absolute inset-y-0 z-10 -ml-4 w-8 cursor-ew-resize outline-none'
              style={{ left: `${split * 100}%` }}
            >
              <div className='absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-brand shadow-[0_0_0_1px_rgb(0_0_0/35%)]' />
              <div className='absolute top-1/2 left-1/2 grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-brand text-brand-foreground shadow-[0_6px_20px_rgb(0_0_0/60%)] ring-4 ring-black/20 transition-transform group-hover:scale-105 group-focus-visible:ring-brand/40'>
                <ChevronsLeftRightIcon className='size-4' />
              </div>
            </div>
          </>
        )}
      </div>

      <footer className='grid shrink-0 grid-cols-2 border-t border-line'>
        <SideStats
          label='Original'
          format={MIME_LABELS[item.mime] ?? 'Image'}
          dimensions={formatDimensions({ width: output.sourceWidth, height: output.sourceHeight })}
          bytes={formatBytes(item.file.size)}
        />
        <div className='flex items-center gap-3 border-l border-line pr-3 sm:pr-4'>
          <SideStats
            label='Compressed'
            format={output.quality === null ? `${outputFormat} lossless` : `${outputFormat} q${output.quality}`}
            dimensions={formatDimensions(output)}
            bytes={formatBytes(output.size)}
            badge={formatSavings(percent)}
            badgeMuted={percent < 0}
          />
          <Button size='sm' className='ml-auto font-semibold' onClick={() => downloadBlob(output.blob, fileName)}>
            <DownloadIcon />
            <span className='hidden sm:inline'>Download</span>
          </Button>
        </div>
      </footer>
    </>
  );
}

function SideStats({
  label,
  format,
  dimensions,
  bytes,
  badge,
  badgeMuted,
}: {
  label: string;
  format: string;
  dimensions: string;
  bytes: string;
  badge?: string;
  badgeMuted?: boolean;
}) {
  return (
    <div className='min-w-0 px-3 py-3 sm:px-5'>
      <p className='text-[11px] text-subtle'>{label}</p>
      <p className='mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5'>
        <span className='num text-base font-medium sm:text-lg'>{bytes}</span>
        {badge && (
          <span className={cn('num text-xs font-medium', badgeMuted ? 'text-muted-foreground' : 'text-brand')}>{badge}</span>
        )}
      </p>
      <p className='num mt-0.5 text-[11px] text-muted-foreground sm:truncate'>
        {dimensions}
        <span className='hidden sm:inline'> · </span>
        <span className='block sm:inline'>{format}</span>
      </p>
    </div>
  );
}
