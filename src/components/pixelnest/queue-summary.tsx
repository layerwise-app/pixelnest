import { useMutation } from '@tanstack/react-query';
import { ArrowRightIcon, DownloadIcon, PlusIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '~/components/ui/button';
import { Spinner } from '~/components/ui/spinner';
import type { QueueItem } from '~/hooks/use-image-queue';
import { formatBytes, percentSaved } from '~/lib/format';
import { useLifetimeStats } from '~/lib/lifetime-stats';
import { cn } from '~/lib/utils';

type QueueSummaryProps = {
  items: QueueItem[];
  onAdd: () => void;
  onClear: () => void;
  /** Saves every finished image: one file directly, several as a ZIP. */
  onDownloadAll: () => Promise<void>;
};

export function formatSavings(percent: number) {
  // A typographic minus reads better than a hyphen at display sizes.
  return percent >= 0 ? `−${percent}%` : `+${Math.abs(percent)}%`;
}

export function QueueSummary({ items, onAdd, onClear, onDownloadAll }: QueueSummaryProps) {
  const download = useMutation({
    mutationFn: onDownloadAll,
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Could not prepare the download.'),
  });

  const measured = items.filter((item) => item.output);
  const originalBytes = measured.reduce((sum, item) => sum + item.file.size, 0);
  const outputBytes = measured.reduce((sum, item) => sum + item.output!.size, 0);
  const pending = items.filter((item) => item.status === 'queued' || item.status === 'working').length;
  const failed = items.filter((item) => item.status === 'error').length;
  const ready = items.filter((item) => item.status === 'done').length;
  const percent = percentSaved(originalBytes, outputBytes);
  const outputShare = originalBytes ? Math.min(1, outputBytes / originalBytes) : 0;

  const status = [
    `${items.length} ${items.length === 1 ? 'image' : 'images'}`,
    pending ? `${pending} in progress` : null,
    failed ? `${failed} failed` : null,
  ].filter(Boolean);

  return (
    <section aria-label='Summary' className='panel relative overflow-hidden rounded-2xl'>
      <div className='flex flex-wrap items-end justify-between gap-x-6 gap-y-5 p-5 sm:p-6'>
        <div className='min-w-0'>
          <p
            data-testid='total-savings'
            className={cn(
              'num text-5xl leading-none font-semibold tracking-tight sm:text-6xl',
              measured.length ? (percent >= 0 ? 'text-brand' : 'text-foreground') : 'text-subtle',
            )}
          >
            {measured.length ? formatSavings(percent) : '—'}
          </p>
          <p className='num mt-3 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground'>
            <span>{formatBytes(originalBytes)}</span>
            <ArrowRightIcon className='size-3.5 text-subtle' />
            <span className='text-foreground'>{formatBytes(outputBytes)}</span>
            <span className='text-subtle'>·</span>
            <span className='font-sans'>{status.join(' · ')}</span>
          </p>
        </div>
        <div className='flex flex-wrap gap-2'>
          <Button variant='ghost' onClick={onClear} className='text-muted-foreground'>
            Clear
          </Button>
          <Button variant='outline' onClick={onAdd}>
            <PlusIcon />
            Add
          </Button>
          <Button
            className='px-3.5 font-semibold'
            disabled={!ready || pending > 0 || download.isPending}
            onClick={() => download.mutate()}
          >
            {download.isPending ? <Spinner /> : <DownloadIcon />}
            {ready > 1 ? 'Download all' : 'Download'}
          </Button>
        </div>
      </div>

      <div className='px-5 pb-5 sm:px-6'>
        <div className='flex h-2 overflow-hidden rounded-full bg-surface-3' aria-hidden='true'>
          <div className='h-full bg-white/30 transition-[width] duration-500' style={{ width: `${outputShare * 100}%` }} />
          {measured.length > 0 && <div className='h-full flex-1 bg-brand' />}
        </div>
        <div className='num mt-2 flex justify-between text-[11px] text-subtle'>
          <span>Output</span>
          <span className={cn(originalBytes > outputBytes && 'text-brand/90')}>
            {formatBytes(Math.max(0, originalBytes - outputBytes))} saved
          </span>
        </div>
      </div>
      {pending > 0 && <div aria-hidden='true' className='shimmer absolute inset-x-0 top-0 h-px' />}
      <LifetimeLine />
    </section>
  );
}

function LifetimeLine() {
  const lifetime = useLifetimeStats();
  if (!lifetime.images) return null;
  return (
    <p className='border-t border-line px-5 py-3 text-xs text-subtle sm:px-6'>
      All time on this device:{' '}
      <span className='num text-muted-foreground'>{lifetime.images.toLocaleString('en-US')}</span> images,{' '}
      <span className='num text-muted-foreground'>
        {formatBytes(Math.max(0, lifetime.originalBytes - lifetime.outputBytes))}
      </span>{' '}
      saved
    </p>
  );
}
