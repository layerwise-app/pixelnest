import { ArrowRightIcon, ChevronDownIcon, DownloadIcon, RotateCwIcon, ScanSearchIcon } from 'lucide-react';
import { useState } from 'react';
import { Button } from '~/components/ui/button';
import type { ImageQueue, QueueItem } from '~/hooks/use-image-queue';
import { downloadBlob } from '~/lib/export';
import { formatBytes, formatDimensions, percentSaved } from '~/lib/format';
import { FORMAT_LABELS, type EncodeFormat } from '~/lib/settings';
import { cn } from '~/lib/utils';
import { ItemPanel } from './item-panel';
import { formatSavings } from './queue-summary';

type QueueListProps = { queue: ImageQueue; onCompare: (id: string) => void };

export function QueueList({ queue, onCompare }: QueueListProps) {
  return (
    <ul aria-label='Images' className='space-y-2'>
      {queue.items.map((item) => (
        <QueueRow
          key={item.id}
          item={item}
          fileName={queue.fileNameFor(item)}
          onCompare={() => onCompare(item.id)}
          onChange={(next) => queue.setItemSettings(item.id, next)}
          onReset={() => queue.resetItem(item.id)}
          onRetry={() => queue.retry(item.id)}
          onRemove={() => queue.remove(item.id)}
        />
      ))}
    </ul>
  );
}

const EXTENSION_FORMAT: Record<string, EncodeFormat> = { jpg: 'jpeg', png: 'png', webp: 'webp', avif: 'avif' };

function describeOutput(item: QueueItem) {
  const { output } = item;
  if (!output) return null;
  const source = { width: output.sourceWidth, height: output.sourceHeight };
  const resized = output.width !== source.width || output.height !== source.height;
  const format = FORMAT_LABELS[EXTENSION_FORMAT[output.extension] ?? 'webp'];
  return [
    resized ? `${formatDimensions(source)} → ${formatDimensions(output)}` : formatDimensions(output),
    output.quality === null ? `${format} lossless` : `${format} q${output.quality}`,
  ].join(' · ');
}

type QueueRowProps = {
  item: QueueItem;
  fileName: string;
  onCompare: () => void;
  onChange: Parameters<typeof ItemPanel>[0]['onChange'];
  onReset: () => void;
  onRetry: () => void;
  onRemove: () => void;
};

function QueueRow({ item, fileName, onCompare, onChange, onReset, onRetry, onRemove }: QueueRowProps) {
  const [open, setOpen] = useState(false);
  const { output } = item;
  const busy = item.status === 'queued' || item.status === 'working';
  const percent = output ? percentSaved(item.file.size, output.size) : 0;
  const missedTarget = output?.targetMet === false && !busy;

  let detail: React.ReactNode = describeOutput(item);
  if (item.status === 'error') detail = <span className='text-destructive'>{item.error}</span>;
  else if (busy && !output) detail = item.status === 'working' ? 'Compressing…' : 'Waiting…';
  else if (missedTarget) {
    detail = <span className='text-destructive'>Can’t reach {formatBytes(item.settings.targetKB * 1024)}, smallest shown</span>;
  }

  return (
    <li
      data-testid='queue-item'
      data-status={item.status}
      className={cn(
        'relative overflow-hidden rounded-xl border bg-surface/70 transition-colors',
        open ? 'border-line-strong bg-surface' : 'border-line hover:border-line-strong',
      )}
    >
      <div className='relative flex items-center gap-3 p-2.5 sm:gap-4 sm:p-3'>
        {busy && <div aria-hidden='true' className='shimmer absolute inset-x-0 bottom-0 h-0.5' />}
        <button
          type='button'
          onClick={onCompare}
          disabled={!output}
          aria-label={`Compare ${item.file.name}`}
          className='checkerboard relative size-12 shrink-0 overflow-hidden rounded-lg ring-1 ring-line outline-none focus-visible:ring-2 focus-visible:ring-brand sm:size-14'
        >
          <img
            src={output?.url ?? item.originalUrl}
            alt=''
            draggable={false}
            className={cn('size-full object-cover transition-opacity', busy && 'opacity-60')}
          />
        </button>

        <div className='flex min-w-0 flex-1 flex-col gap-x-4 gap-y-1 sm:flex-row sm:items-center'>
          <div className='min-w-0 flex-1'>
            <div className='flex min-w-0 items-center gap-2'>
              <p className='truncate text-sm font-medium' title={fileName}>
                {fileName}
              </p>
              {item.custom && (
                <span className='shrink-0 rounded border border-brand/40 px-1 text-[10px] font-medium text-brand uppercase'>
                  Custom
                </span>
              )}
            </div>
            <p className='num mt-0.5 truncate text-[11px] text-subtle'>{detail}</p>
          </div>

          <div className='flex shrink-0 items-center gap-3'>
            <p className='num flex items-center gap-1.5 text-xs text-muted-foreground'>
              <span>{formatBytes(item.file.size)}</span>
              {output && (
                <>
                  <ArrowRightIcon className='size-3 text-subtle' />
                  <span className='text-foreground'>{formatBytes(output.size)}</span>
                </>
              )}
            </p>
            {output && (
              <span
                className={cn(
                  'num min-w-14 rounded-md px-1.5 py-0.5 text-center text-xs font-medium',
                  percent >= 0 ? 'bg-brand-soft text-brand' : 'bg-surface-3 text-muted-foreground',
                )}
              >
                {formatSavings(percent)}
              </span>
            )}
          </div>
        </div>

        <div className='flex shrink-0 items-center gap-0.5'>
          {item.status === 'error' ? (
            <Button size='icon-sm' variant='ghost' aria-label='Try again' onClick={onRetry}>
              <RotateCwIcon />
            </Button>
          ) : (
            <>
              <Button
                size='icon-sm'
                variant='ghost'
                aria-label='Compare'
                disabled={!output}
                onClick={onCompare}
                className='hidden sm:inline-flex'
              >
                <ScanSearchIcon />
              </Button>
              <Button
                size='icon-sm'
                variant='ghost'
                aria-label='Download'
                disabled={!output}
                onClick={() => output && downloadBlob(output.blob, fileName)}
              >
                <DownloadIcon />
              </Button>
            </>
          )}
          <Button
            size='icon-sm'
            variant='ghost'
            aria-label={open ? 'Hide image settings' : 'Image settings'}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            <ChevronDownIcon className={cn('transition-transform', open && 'rotate-180')} />
          </Button>
        </div>
      </div>

      {open && (
        <ItemPanel
          item={item}
          fileName={fileName}
          onChange={onChange}
          onCompare={onCompare}
          onReset={onReset}
          onRemove={onRemove}
        />
      )}
    </li>
  );
}
