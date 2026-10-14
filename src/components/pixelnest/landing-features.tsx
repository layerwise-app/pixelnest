import { ArrowRightIcon, ChevronsLeftRightIcon, DownloadIcon, FileArchiveIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '~/lib/utils';

// Static replicas of the real controls; the numbers mirror a typical run.

function Tile({ title, text, className, children }: { title: string; text: string; className?: string; children: ReactNode }) {
  return (
    <article className={cn('panel flex flex-col overflow-hidden rounded-2xl', className)}>
      <div aria-hidden='true' className='relative flex min-h-[200px] flex-1 flex-col justify-center border-b border-line bg-background/40 p-5 sm:p-6'>
        {children}
      </div>
      <div className='px-5 py-4 sm:px-6'>
        <h3 className='text-[15px] font-semibold tracking-tight'>{title}</h3>
        <p className='mt-1 text-sm text-muted-foreground'>{text}</p>
      </div>
    </article>
  );
}

// A binary search toward 200 KB: over-target probes are dimmed, the kept encode is highlighted.
const ATTEMPTS = [
  { quality: 95, kb: 412 },
  { quality: 50, kb: 141 },
  { quality: 72, kb: 206 },
  { quality: 61, kb: 172 },
  { quality: 66, kb: 186 },
  { quality: 69, kb: 196, kept: true },
];
const TARGET_KB = 200;
const SCALE_KB = 440;

function SizeSearch() {
  return (
    <div className='space-y-2'>
      {ATTEMPTS.map((attempt) => {
        const over = attempt.kb > TARGET_KB;
        return (
          <div key={attempt.quality} className='num grid grid-cols-[2.5rem_1fr_4.5rem] items-center gap-3 text-xs'>
            <span className={cn(attempt.kept ? 'text-brand' : 'text-subtle')}>q{attempt.quality}</span>
            <div className='relative h-2 rounded-full bg-surface-3'>
              <div
                className={cn('h-full rounded-full', attempt.kept ? 'bg-brand' : over ? 'bg-white/12' : 'bg-white/35')}
                style={{ width: `${(attempt.kb / SCALE_KB) * 100}%` }}
              />
              <div className='absolute -inset-y-1 w-px bg-brand/70' style={{ left: `${(TARGET_KB / SCALE_KB) * 100}%` }} />
            </div>
            <span className={cn('text-right', attempt.kept ? 'text-foreground' : over ? 'text-subtle line-through' : 'text-muted-foreground')}>
              {attempt.kb} KB
            </span>
          </div>
        );
      })}
      <div className='num grid grid-cols-[2.5rem_1fr_4.5rem] gap-3 pt-1 text-[11px] text-subtle'>
        <span />
        <span style={{ paddingLeft: `calc(${(TARGET_KB / SCALE_KB) * 100}% - 1.5rem)` }} className='text-brand/80'>
          200 KB
        </span>
      </div>
    </div>
  );
}

function Scene({ pixelated }: { pixelated?: boolean }) {
  return (
    <div className='absolute inset-0 bg-[linear-gradient(180deg,#34343b_0%,#4a4a52_42%,#26262b_43%,#17171a_100%)]'>
      <div className='absolute top-[24%] left-[58%] size-14 rounded-full bg-brand shadow-[0_0_60px_10px_rgb(255_214_10/35%)]' />
      <div className='absolute inset-x-0 bottom-0 h-[62%] bg-[#1d1d21] [clip-path:polygon(0_45%,22%_18%,40%_40%,62%_6%,84%_34%,100%_20%,100%_100%,0_100%)]' />
      <div className='absolute inset-x-0 bottom-0 h-[40%] bg-[#111113] [clip-path:polygon(0_40%,30%_10%,55%_38%,78%_16%,100%_42%,100%_100%,0_100%)]' />
      {pixelated && (
        <div className='absolute inset-0 bg-[linear-gradient(rgb(0_0_0/28%)_1px,transparent_1px),linear-gradient(90deg,rgb(0_0_0/28%)_1px,transparent_1px)] bg-[size:9px_9px]' />
      )}
    </div>
  );
}

function SplitView() {
  return (
    <div className='relative h-full min-h-[260px] overflow-hidden rounded-xl ring-1 ring-line'>
      <Scene />
      <div className='absolute inset-0 [clip-path:inset(0_0_0_56%)]'>
        <Scene pixelated />
      </div>
      <div className='absolute inset-y-0 left-[56%] w-px bg-brand' />
      <div className='absolute top-1/2 left-[56%] grid size-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-brand text-brand-foreground shadow-lg'>
        <ChevronsLeftRightIcon className='size-4' />
      </div>
      <span className='absolute top-3 left-3 rounded-md bg-black/60 px-2 py-1 text-[11px] font-medium'>Original</span>
      <span className='num absolute top-3 right-3 rounded-md bg-black/60 px-2 py-1 text-[11px] font-medium'>200%</span>
    </div>
  );
}

function PresetReplica() {
  const presets = [
    ['Web', 'WebP · 2048'],
    ['Social', 'JPEG · 1080w'],
    ['Email', 'JPEG · 1280'],
    ['Lossless', 'WebP · exact'],
  ];
  return (
    <div className='grid grid-cols-2 gap-2'>
      {presets.map(([label, spec], index) => (
        <div
          key={label}
          className={cn(
            'rounded-lg border px-3 py-2.5',
            index === 1 ? 'border-brand/70 bg-brand-soft' : 'border-line bg-background/40',
          )}
        >
          <p className='text-[13px] font-medium'>{label}</p>
          <p className={cn('num mt-0.5 text-[11px]', index === 1 ? 'text-brand/80' : 'text-subtle')}>{spec}</p>
        </div>
      ))}
    </div>
  );
}

function CropReplica() {
  return (
    <div className='relative mx-auto grid h-40 w-full max-w-64 place-items-center'>
      <div className='absolute aspect-video w-full rounded-md border border-dashed border-white/20' />
      <div className='absolute aspect-[4/5] h-full rounded-md border border-white/30' />
      <div className='crop-marks absolute aspect-square h-[78%] bg-brand-soft' />
      <span className='num relative rounded bg-black/60 px-1.5 py-0.5 text-[11px] text-brand'>1080 × 1080</span>
    </div>
  );
}

function NamingReplica() {
  const rows = [
    ['harbor.jpg', 'harbor-1080w.jpg'],
    ['IMG_2041.png', 'IMG_2041-1080w.webp'],
  ];
  return (
    <div className='space-y-3'>
      <div className='num rounded-md border border-line-strong bg-background/60 px-3 py-2 text-[13px]'>
        {'{name}'}-<span className='text-brand'>{'{width}'}</span>w
      </div>
      <div className='space-y-1.5'>
        {rows.map(([from, to]) => (
          <p key={from} className='num flex min-w-0 items-center gap-2 text-xs'>
            <span className='truncate text-subtle'>{from}</span>
            <ArrowRightIcon className='size-3 shrink-0 text-subtle' />
            <span className='truncate text-foreground'>{to}</span>
          </p>
        ))}
      </div>
    </div>
  );
}

function ZipReplica() {
  const files = [
    ['harbor-min.webp', '182 KB', 0.72],
    ['studio-min.webp', '96 KB', 0.38],
    ['market-min.webp', '241 KB', 0.95],
    ['skyline-min.webp', '154 KB', 0.61],
  ] as const;
  return (
    <div className='grid items-center gap-5 sm:grid-cols-[1fr_auto]'>
      <div className='space-y-2'>
        {files.map(([name, size, share]) => (
          <div key={name} className='num grid grid-cols-[minmax(0,9rem)_1fr_4rem] items-center gap-3 text-xs'>
            <span className='truncate text-muted-foreground'>{name}</span>
            <div className='h-1.5 rounded-full bg-surface-3'>
              <div className='h-full rounded-full bg-white/35' style={{ width: `${share * 100}%` }} />
            </div>
            <span className='text-right text-foreground'>{size}</span>
          </div>
        ))}
      </div>
      <div className='flex items-center gap-3 rounded-xl border border-line-strong bg-surface-2 p-3 pr-4'>
        <div className='grid size-10 place-items-center rounded-lg bg-brand-soft text-brand'>
          <FileArchiveIcon className='size-5' />
        </div>
        <div>
          <p className='num text-[13px]'>images.zip</p>
          <p className='num text-[11px] text-subtle'>4 files · 673 KB</p>
        </div>
        <DownloadIcon className='ml-2 size-4 text-brand' />
      </div>
    </div>
  );
}

export function LandingFeatures() {
  return (
    <section id='features' className='scroll-mt-20'>
      <h2 className='text-2xl font-semibold tracking-tight sm:text-3xl'>Built for batches</h2>
      <div className='mt-8 grid gap-4 lg:grid-cols-3'>
        <Tile
          className='lg:col-span-2'
          title='Fit under a size'
          text='Set a limit. Each image gets the highest quality that fits.'
        >
          <SizeSearch />
        </Tile>
        <Tile className='lg:row-span-2' title='Compare up close' text='Drag the divider at 100% or 200% to check detail.'>
          <SplitView />
        </Tile>
        <Tile title='Presets' text='Web, social, email or lossless in one click.'>
          <PresetReplica />
        </Tile>
        <Tile title='Resize and crop' text='Fit a box, scale by percent, or center-crop to a ratio.'>
          <CropReplica />
        </Tile>
        <Tile title='Name your files' text='Patterns apply to every download.'>
          <NamingReplica />
        </Tile>
        <Tile className='lg:col-span-2' title='One ZIP for everything' text='Fine-tune single images, then download the batch.'>
          <ZipReplica />
        </Tile>
      </div>
    </section>
  );
}
