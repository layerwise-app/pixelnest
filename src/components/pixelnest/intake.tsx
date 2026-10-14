import { CircleAlertIcon, FolderOpenIcon, ImageIcon, ImagePlusIcon, XIcon } from 'lucide-react';
import { usePasteKey } from '~/hooks/use-file-picker';
import { cn } from '~/lib/utils';
import { Button } from '~/components/ui/button';

type PickerProps = { onChooseFiles: () => void; onChooseFolder: () => void };

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className='num inline-flex h-5 items-center rounded border border-line-strong bg-surface-3 px-1.5 text-[11px] text-foreground'>
      {children}
    </kbd>
  );
}

function StackGlyph({ active }: { active: boolean }) {
  return (
    <div className='relative size-16'>
      <div className='absolute inset-0 translate-x-2.5 -translate-y-2 rotate-[8deg] rounded-xl border border-line-strong bg-surface-3' />
      <div
        className={cn(
          'absolute inset-0 grid place-items-center rounded-xl border bg-surface-2 shadow-[0_12px_30px_-10px_rgb(0_0_0/80%)] transition-transform duration-300',
          active ? '-translate-y-1 border-brand' : 'border-brand/35',
        )}
      >
        <ImageIcon className='size-6 text-brand' strokeWidth={1.75} />
      </div>
    </div>
  );
}

/** The empty-state drop target. Drops are handled at the window level, so this is purely visual plus buttons. */
export function Dropzone({ dragging, onChooseFiles, onChooseFolder }: PickerProps & { dragging: boolean }) {
  const pasteKey = usePasteKey();
  return (
    <div
      onClick={(event) => event.target === event.currentTarget && onChooseFiles()}
      className={cn(
        'panel relative isolate cursor-pointer overflow-hidden rounded-2xl transition-[box-shadow,background-color]',
        dragging && 'bg-brand-soft ring-2 ring-brand',
      )}
    >
      <div aria-hidden='true' className='studio-grid pointer-events-none absolute inset-0 -z-10' />
      <div aria-hidden='true' className='crop-marks pointer-events-none absolute inset-3 opacity-90 sm:inset-5' />
      <div className='pointer-events-none flex min-h-[360px] flex-col items-center justify-center px-6 py-14 text-center sm:min-h-[440px]'>
        <StackGlyph active={dragging} />
        <h2 className='mt-7 text-xl font-semibold tracking-tight'>{dragging ? 'Release to add' : 'Drop images or a folder'}</h2>
        <p className='mt-2 flex items-center gap-1.5 text-sm text-muted-foreground'>
          or paste with <Kbd>{pasteKey}V</Kbd>
        </p>
        <div className='pointer-events-auto mt-7 flex flex-wrap justify-center gap-2'>
          <Button size='lg' className='h-10 px-4 font-semibold' onClick={onChooseFiles}>
            <ImagePlusIcon />
            Choose images
          </Button>
          <Button size='lg' variant='outline' className='h-10 px-4' onClick={onChooseFolder}>
            <FolderOpenIcon />
            Folder
          </Button>
        </div>
        <p className='num mt-9 text-[11px] tracking-[0.12em] text-subtle uppercase'>JPEG · PNG · WebP · AVIF · 50 MB max</p>
      </div>
    </div>
  );
}

/** Compact add-more target shown under the queue. */
export function AddMoreStrip({ onChooseFiles, onChooseFolder }: PickerProps) {
  const pasteKey = usePasteKey();
  return (
    <div className='flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 rounded-xl border border-dashed border-line-strong px-4 py-4 text-sm text-muted-foreground'>
      <span>Drop more, paste with</span>
      <Kbd>{pasteKey}V</Kbd>
      <span>, or</span>
      <button type='button' onClick={onChooseFiles} className='font-medium text-foreground underline-offset-4 hover:text-brand hover:underline'>
        choose files
      </button>
      <span>/</span>
      <button type='button' onClick={onChooseFolder} className='font-medium text-foreground underline-offset-4 hover:text-brand hover:underline'>
        a folder
      </button>
    </div>
  );
}

export function DropOverlay({ visible }: { visible: boolean }) {
  return (
    <div
      aria-hidden='true'
      className={cn(
        'pointer-events-none fixed inset-0 z-50 grid place-items-center bg-background/75 p-6 backdrop-blur-sm transition-opacity duration-150',
        visible ? 'opacity-100' : 'opacity-0',
      )}
    >
      <div className='crop-marks grid h-full max-h-[520px] w-full max-w-3xl place-items-center rounded-3xl bg-brand-soft'>
        <div className='flex flex-col items-center gap-5'>
          <StackGlyph active />
          <p className='text-lg font-semibold'>Drop to add images</p>
        </div>
      </div>
    </div>
  );
}

export function IntakeNotice({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div
      role='alert'
      className='flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-foreground'
    >
      <CircleAlertIcon className='mt-0.5 size-4 shrink-0 text-destructive' />
      <p className='min-w-0 flex-1 break-words'>{message}</p>
      <button
        type='button'
        onClick={onDismiss}
        aria-label='Dismiss'
        className='-m-1 rounded p-1 text-muted-foreground hover:text-foreground'
      >
        <XIcon className='size-4' />
      </button>
    </div>
  );
}
