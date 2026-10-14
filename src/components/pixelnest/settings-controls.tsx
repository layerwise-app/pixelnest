import { Link2Icon, Unlink2Icon } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Input } from '~/components/ui/input';
import { Slider } from '~/components/ui/slider';
import { Switch } from '~/components/ui/switch';
import {
  FORMAT_LABELS,
  isLossless,
  MAX_DIMENSION,
  MAX_QUALITY,
  MIN_QUALITY,
  PRESET_IDS,
  PRESETS,
  matchPreset,
  type CompressionSettings,
  type CropAspect,
  type OutputFormat,
  type ResizeMode,
  type SizeMode,
} from '~/lib/settings';
import { cn } from '~/lib/utils';
import { Segmented } from './segmented';

export type ControlProps = { value: CompressionSettings; onChange: (next: CompressionSettings) => void };

export function Field({ label, aside, hint, children }: { label: string; aside?: ReactNode; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className='space-y-2.5'>
      <div className='flex min-h-5 items-center justify-between gap-3'>
        <span className='text-xs font-medium text-muted-foreground'>{label}</span>
        {aside}
      </div>
      {children}
      {hint && <p className='text-xs leading-relaxed text-subtle'>{hint}</p>}
    </div>
  );
}

type NumberFieldProps = {
  label: string;
  value: number | null;
  onCommit: (value: number | null) => void;
  min: number;
  max: number;
  prefix?: string;
  suffix?: string;
  placeholder?: string;
  className?: string;
};

/** Numeric input that lets the field be empty while typing and commits only valid numbers. */
export function NumberField({ label, value, onCommit, min, max, prefix, suffix, placeholder, className }: NumberFieldProps) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <div className={cn('relative', className)}>
      {prefix && (
        <span className='pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-[11px] font-medium text-subtle'>
          {prefix}
        </span>
      )}
      <Input
        aria-label={label}
        inputMode='numeric'
        placeholder={placeholder}
        value={draft ?? (value === null ? '' : String(value))}
        onChange={(event) => {
          const text = event.target.value.replace(/\D/g, '').slice(0, 6);
          setDraft(text);
          if (!text) return onCommit(placeholder ? null : value);
          const number = Math.min(max, Number(text));
          if (number >= min) onCommit(number);
        }}
        onBlur={() => setDraft(null)}
        className={cn('num h-8 bg-background/60 text-[13px] md:text-[13px]', prefix && 'pl-7', suffix && 'pr-9')}
      />
      {suffix && (
        <span className='pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-[11px] text-subtle'>{suffix}</span>
      )}
    </div>
  );
}

export function PresetPicker({ value, onChange, compact }: ControlProps & { compact?: boolean }) {
  const active = matchPreset(value);
  return (
    <div role='radiogroup' aria-label='Preset' className={cn('grid gap-2', compact ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2')}>
      {PRESET_IDS.map((id) => {
        const selected = active === id;
        return (
          <button
            key={id}
            type='button'
            role='radio'
            aria-checked={selected}
            onClick={() => onChange(PRESETS[id].settings)}
            className={cn(
              'group relative flex flex-col items-start rounded-lg border px-3 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand/60',
              compact ? 'py-2' : 'py-2.5',
              selected
                ? 'border-brand/70 bg-brand-soft'
                : 'border-line bg-background/40 hover:border-line-strong hover:bg-surface-2',
            )}
          >
            <span className='flex w-full items-center justify-between text-[13px] font-medium'>
              {PRESETS[id].label}
              <span
                aria-hidden='true'
                className={cn('size-1.5 rounded-full transition-colors', selected ? 'bg-brand' : 'bg-transparent')}
              />
            </span>
            <span className={cn('num mt-0.5 text-[11px]', selected ? 'text-brand/80' : 'text-subtle')}>{PRESETS[id].spec}</span>
          </button>
        );
      })}
    </div>
  );
}

const FORMAT_OPTIONS = (Object.keys(FORMAT_LABELS) as OutputFormat[]).map((format) => ({
  value: format,
  label: FORMAT_LABELS[format],
}));

export function FormatControl({ value, onChange }: ControlProps) {
  return (
    <Field
      label='Format'
      aside={
        value.format === 'webp' && (
          <label className='flex cursor-pointer items-center gap-2 text-xs text-muted-foreground'>
            Lossless
            <Switch size='sm' checked={value.lossless} onCheckedChange={(lossless) => onChange({ ...value, lossless })} />
          </label>
        )
      }
      hint={value.format === 'auto' ? 'JPEG and AVIF keep their format. Everything else becomes WebP.' : undefined}
    >
      <Segmented
        label='Output format'
        value={value.format}
        options={FORMAT_OPTIONS}
        // Lossless only exists for WebP; drop it when leaving so presets still match.
        onChange={(format) => onChange({ ...value, format, lossless: format === 'webp' ? value.lossless : false })}
      />
    </Field>
  );
}

const TARGET_PICKS = [
  { kb: 100, label: '100' },
  { kb: 200, label: '200' },
  { kb: 500, label: '500' },
  { kb: 1024, label: '1 MB' },
];

export function CompressionControl({ value, onChange }: ControlProps) {
  const lossless = isLossless(value);
  const set = (fields: Partial<CompressionSettings>) => onChange({ ...value, ...fields });

  return (
    <Field
      label='Compression'
      hint={
        lossless
          ? 'Lossless output keeps every pixel, so quality and size targets don’t apply.'
          : value.sizeMode === 'target'
            ? 'Quality drops only as far as needed to fit.'
            : undefined
      }
    >
      <Segmented<SizeMode>
        label='Compression mode'
        value={value.sizeMode}
        disabled={lossless}
        onChange={(sizeMode) => set({ sizeMode })}
        options={[
          { value: 'quality', label: 'Quality' },
          { value: 'target', label: 'Fit under size' },
        ]}
      />
      {!lossless && value.sizeMode === 'quality' && (
        <div className='flex h-8 items-center gap-3'>
          <Slider
            aria-label='Quality'
            min={MIN_QUALITY}
            max={MAX_QUALITY}
            step={1}
            value={[value.quality]}
            onValueChange={([quality]) => set({ quality })}
          />
          <span className='num w-8 text-right text-sm text-foreground'>{value.quality}</span>
        </div>
      )}
      {!lossless && value.sizeMode === 'target' && (
        <div className='flex flex-wrap items-center gap-2'>
          <NumberField
            label='Target size in KB'
            value={value.targetKB}
            onCommit={(targetKB) => targetKB && set({ targetKB })}
            min={1}
            max={100_000}
            suffix='KB'
            className='w-24'
          />
          <div className='flex gap-1'>
            {TARGET_PICKS.map((pick) => (
              <button
                key={pick.kb}
                type='button'
                onClick={() => set({ targetKB: pick.kb })}
                className={cn(
                  'num h-8 rounded-md border px-2 text-xs transition-colors',
                  value.targetKB === pick.kb
                    ? 'border-brand/70 bg-brand-soft text-brand'
                    : 'border-line text-muted-foreground hover:border-line-strong hover:text-foreground',
                )}
              >
                {pick.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </Field>
  );
}

export function ResizeControl({ value, onChange }: ControlProps) {
  const { resize } = value;
  const setResize = (fields: Partial<CompressionSettings['resize']>) =>
    onChange({ ...value, resize: { ...resize, ...fields } });

  function setMode(mode: ResizeMode) {
    // Switching to a size with nothing filled in would be a no-op; start from a sensible box.
    if (mode === 'fit' && !resize.width && !resize.height) setResize({ mode, width: 2048, height: 2048 });
    else setResize({ mode });
  }

  return (
    <Field
      label='Resize'
      hint={
        resize.mode === 'fit'
          ? resize.lockAspect
            ? 'Fits inside the box. Never enlarges.'
            : 'Stretches to the exact size.'
          : undefined
      }
    >
      <Segmented<ResizeMode>
        label='Resize mode'
        value={resize.mode}
        onChange={setMode}
        options={[
          { value: 'none', label: 'Original' },
          { value: 'fit', label: 'Size' },
          { value: 'percent', label: 'Scale' },
        ]}
      />
      {resize.mode === 'fit' && (
        <div className='flex items-center gap-1.5'>
          <NumberField
            label='Width in pixels'
            prefix='W'
            placeholder='auto'
            value={resize.width}
            min={1}
            max={MAX_DIMENSION}
            onCommit={(width) => setResize({ width })}
            className='flex-1'
          />
          <button
            type='button'
            aria-pressed={resize.lockAspect}
            aria-label={resize.lockAspect ? 'Keep proportions (on)' : 'Keep proportions (off)'}
            title='Keep proportions'
            onClick={() => setResize({ lockAspect: !resize.lockAspect })}
            className={cn(
              'grid size-8 shrink-0 place-items-center rounded-md border transition-colors',
              resize.lockAspect
                ? 'border-brand/50 bg-brand-soft text-brand'
                : 'border-line text-muted-foreground hover:text-foreground',
            )}
          >
            {resize.lockAspect ? <Link2Icon className='size-4' /> : <Unlink2Icon className='size-4' />}
          </button>
          <NumberField
            label='Height in pixels'
            prefix='H'
            placeholder='auto'
            value={resize.height}
            min={1}
            max={MAX_DIMENSION}
            onCommit={(height) => setResize({ height })}
            className='flex-1'
          />
        </div>
      )}
      {resize.mode === 'percent' && (
        <div className='flex h-8 items-center gap-3'>
          <Slider
            aria-label='Scale'
            min={5}
            max={100}
            step={5}
            value={[resize.percent]}
            onValueChange={([percent]) => setResize({ percent })}
          />
          <span className='num w-10 text-right text-sm'>{resize.percent}%</span>
        </div>
      )}
    </Field>
  );
}

const CROP_GLYPHS: Record<Exclude<CropAspect, 'original'>, string> = {
  '1:1': 'h-2.5 w-2.5',
  '4:5': 'h-3 w-2.5',
  '16:9': 'h-2 w-3.5',
};

export function CropControl({ value, onChange }: ControlProps) {
  return (
    <Field label='Crop'>
      <Segmented<CropAspect>
        label='Crop to aspect ratio'
        value={value.crop}
        onChange={(crop) => onChange({ ...value, crop })}
        options={[
          { value: 'original', label: 'Original' },
          ...(Object.keys(CROP_GLYPHS) as Array<keyof typeof CROP_GLYPHS>).map((aspect) => ({
            value: aspect,
            title: `Crop to ${aspect}`,
            label: (
              <>
                <span aria-hidden='true' className={cn('rounded-[2px] border-[1.5px] border-current', CROP_GLYPHS[aspect])} />
                <span className='num'>{aspect}</span>
              </>
            ),
          })),
        ]}
      />
    </Field>
  );
}
