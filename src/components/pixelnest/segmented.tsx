import { ToggleGroup } from 'radix-ui';
import type { ReactNode } from 'react';
import { cn } from '~/lib/utils';

export type SegmentedOption<T extends string> = {
  value: T;
  label: ReactNode;
  /** Accessible name when the label is an icon or glyph. */
  title?: string;
  disabled?: boolean;
};

type SegmentedProps<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  options: Array<SegmentedOption<T>>;
  label: string;
  size?: 'sm' | 'md';
  disabled?: boolean;
  className?: string;
};

/** A single-choice pill switcher that never ends up with nothing selected. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  size = 'md',
  disabled,
  className,
}: SegmentedProps<T>) {
  return (
    <ToggleGroup.Root
      type='single'
      value={value}
      // Radix clears the value when the active item is pressed again; ignore that.
      onValueChange={(next) => next && onChange(next as T)}
      aria-label={label}
      disabled={disabled}
      className={cn(
        'grid w-full auto-cols-fr grid-flow-col gap-0.5 rounded-lg bg-background/60 p-0.5 ring-1 ring-line ring-inset',
        disabled && 'opacity-50',
        className,
      )}
    >
      {options.map((option) => (
        <ToggleGroup.Item
          key={option.value}
          value={option.value}
          aria-label={option.title}
          title={option.title}
          disabled={option.disabled}
          className={cn(
            'inline-flex min-w-0 items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap text-muted-foreground transition-colors outline-none',
            'hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand/60 disabled:pointer-events-none disabled:opacity-40',
            'data-[state=on]:bg-surface-3 data-[state=on]:text-foreground data-[state=on]:shadow-[inset_0_1px_0_rgb(255_255_255/6%),0_1px_2px_rgb(0_0_0/50%)]',
            size === 'sm' ? 'h-7 px-2 text-xs' : 'h-8 px-2.5 text-[13px]',
          )}
        >
          {option.label}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}
