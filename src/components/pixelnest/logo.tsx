import { cn } from '~/lib/utils';

/** Nested squares: an image frame tucked inside a smaller one. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox='0 0 32 32' aria-hidden='true' className={cn('size-7 shrink-0', className)}>
      <rect width='32' height='32' rx='8' fill='var(--brand)' />
      <rect x='7' y='7' width='18' height='18' rx='3' fill='none' stroke='var(--brand-foreground)' strokeWidth='2.4' />
      <rect x='12.5' y='12.5' width='7' height='7' rx='1.5' fill='var(--brand-foreground)' />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark />
      <span className='text-[15px] font-semibold tracking-tight'>PixelNest</span>
    </span>
  );
}
