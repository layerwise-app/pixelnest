import { ChevronDownIcon } from 'lucide-react';
import { useRef, type ReactNode } from 'react';
import { Button } from '~/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '~/components/ui/collapsible';
import { Input } from '~/components/ui/input';
import { applyNamePattern, NAME_TOKENS, type NameContext } from '~/lib/naming';
import { describeResize, matchPreset, PRESETS, type CompressionSettings } from '~/lib/settings';
import { CompressionControl, CropControl, Field, FormatControl, PresetPicker, ResizeControl } from './settings-controls';

const SAMPLE_NAME: NameContext = { name: 'photo', width: 2048, height: 1365, format: 'webp', quality: 80, index: 1 };

type SettingsPanelProps = {
  settings: CompressionSettings;
  onSettingsChange: (next: CompressionSettings) => void;
  namePattern: string;
  onNamePatternChange: (pattern: string) => void;
  /** Real output used to preview the name pattern, when one exists. */
  nameContext?: NameContext;
  customCount: number;
  onApplyToAll: () => void;
};

export function SettingsPanel({
  settings,
  onSettingsChange,
  namePattern,
  onNamePatternChange,
  nameContext,
  customCount,
  onApplyToAll,
}: SettingsPanelProps) {
  const preset = matchPreset(settings);
  const control = { value: settings, onChange: onSettingsChange };

  return (
    <section aria-label='Settings' className='panel overflow-hidden rounded-2xl'>
      <div className='flex items-center justify-between px-5 pt-4 pb-3'>
        <h2 className='text-sm font-semibold'>Settings</h2>
        <span className='num rounded-full border border-line px-2 py-0.5 text-[11px] text-muted-foreground'>
          {preset === 'custom' ? 'Custom' : PRESETS[preset].label}
        </span>
      </div>
      <div className='space-y-5 px-5 pb-5'>
        <PresetPicker {...control} />
        <FormatControl {...control} />
        <CompressionControl {...control} />
      </div>

      <PanelSection title='Resize & crop' summary={describeResize(settings)}>
        <ResizeControl {...control} />
        <CropControl {...control} />
      </PanelSection>

      <PanelSection title='File names' summary={namePattern || '{name}'}>
        <NamePatternControl pattern={namePattern} onChange={onNamePatternChange} context={nameContext ?? SAMPLE_NAME} />
      </PanelSection>

      {customCount > 0 && (
        <div className='flex items-center justify-between gap-3 border-t border-line bg-brand-soft/40 px-5 py-3.5'>
          <p className='text-xs text-muted-foreground'>
            <span className='num text-foreground'>{customCount}</span> {customCount === 1 ? 'image has' : 'images have'} own
            settings
          </p>
          <Button size='sm' variant='outline' onClick={onApplyToAll}>
            Apply to all
          </Button>
        </div>
      )}
    </section>
  );
}

function PanelSection({ title, summary, children }: { title: string; summary: string; children: ReactNode }) {
  return (
    <Collapsible className='group/section border-t border-line'>
      <CollapsibleTrigger className='flex w-full items-center gap-3 px-5 py-3.5 text-left outline-none hover:bg-white/[0.02] focus-visible:bg-white/[0.03]'>
        <span className='text-[13px] font-medium'>{title}</span>
        <span className='num ml-auto min-w-0 truncate text-[11px] text-subtle'>{summary}</span>
        <ChevronDownIcon className='size-4 shrink-0 text-subtle transition-transform group-data-[state=open]/section:rotate-180' />
      </CollapsibleTrigger>
      <CollapsibleContent className='space-y-5 px-5 pt-1 pb-5'>{children}</CollapsibleContent>
    </Collapsible>
  );
}

function NamePatternControl({
  pattern,
  onChange,
  context,
}: {
  pattern: string;
  onChange: (pattern: string) => void;
  context: NameContext;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function insert(token: string) {
    const input = inputRef.current;
    const start = input?.selectionStart ?? pattern.length;
    const end = input?.selectionEnd ?? pattern.length;
    onChange(pattern.slice(0, start) + token + pattern.slice(end));
    // Put the caret after the inserted token once React has updated the value.
    requestAnimationFrame(() => {
      input?.focus();
      input?.setSelectionRange(start + token.length, start + token.length);
    });
  }

  return (
    <Field
      label='Pattern'
      hint={
        <span className='flex min-w-0 gap-1.5'>
          <span className='shrink-0'>Saves as</span>
          <span className='num truncate text-foreground'>{applyNamePattern(pattern, context)}</span>
        </span>
      }
    >
      <Input
        ref={inputRef}
        aria-label='File name pattern'
        value={pattern}
        spellCheck={false}
        onChange={(event) => onChange(event.target.value)}
        className='num h-8 bg-background/60 text-[13px] md:text-[13px]'
      />
      <div className='flex flex-wrap gap-1'>
        {NAME_TOKENS.map((token) => (
          <button
            key={token}
            type='button'
            onClick={() => insert(token)}
            className='num rounded-md border border-line px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-brand/50 hover:text-brand'
          >
            {token}
          </button>
        ))}
      </div>
    </Field>
  );
}
