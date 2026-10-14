import { useMutation } from '@tanstack/react-query';
import { ClipboardCopyIcon, DownloadIcon, RotateCcwIcon, ScanSearchIcon, Trash2Icon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '~/components/ui/button';
import { Spinner } from '~/components/ui/spinner';
import type { QueueItem } from '~/hooks/use-image-queue';
import { copyImageToClipboard, downloadBlob } from '~/lib/export';
import type { CompressionSettings } from '~/lib/settings';
import { CompressionControl, CropControl, FormatControl, PresetPicker, ResizeControl } from './settings-controls';

type ItemPanelProps = {
  item: QueueItem;
  fileName: string;
  onChange: (next: CompressionSettings) => void;
  onCompare: () => void;
  onReset: () => void;
  onRemove: () => void;
};

/** Per-image settings. Any change marks the image as custom and re-encodes just this one. */
export function ItemPanel({ item, fileName, onChange, onCompare, onReset, onRemove }: ItemPanelProps) {
  const control = { value: item.settings, onChange };
  const copy = useMutation({
    mutationFn: () => copyImageToClipboard(item.output!.blob),
    onSuccess: () => toast.success('Image copied'),
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Could not copy this image.'),
  });

  return (
    <div className='space-y-5 border-t border-line bg-background/30 px-3 py-4 sm:px-4'>
      <PresetPicker {...control} compact />
      <div className='grid gap-5 md:grid-cols-2'>
        <FormatControl {...control} />
        <CompressionControl {...control} />
        <ResizeControl {...control} />
        <CropControl {...control} />
      </div>
      <div className='flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4'>
        <div className='flex flex-wrap gap-2'>
          <Button size='sm' variant='outline' disabled={!item.output} onClick={onCompare}>
            <ScanSearchIcon />
            Compare
          </Button>
          <Button size='sm' variant='outline' disabled={!item.output || copy.isPending} onClick={() => copy.mutate()}>
            {copy.isPending ? <Spinner /> : <ClipboardCopyIcon />}
            Copy
          </Button>
          <Button
            size='sm'
            variant='outline'
            disabled={!item.output}
            onClick={() => item.output && downloadBlob(item.output.blob, fileName)}
          >
            <DownloadIcon />
            Download
          </Button>
        </div>
        <div className='flex flex-wrap gap-2'>
          {item.custom && (
            <Button size='sm' variant='ghost' onClick={onReset} className='text-muted-foreground'>
              <RotateCcwIcon />
              Use global settings
            </Button>
          )}
          <Button size='sm' variant='ghost' onClick={onRemove} className='text-muted-foreground hover:text-destructive'>
            <Trash2Icon />
            Remove
          </Button>
        </div>
      </div>
    </div>
  );
}
