import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '~/components/ui/accordion';
import { formatBytes, percentSaved } from '~/lib/format';
import { useLifetimeStats } from '~/lib/lifetime-stats';
import { cn } from '~/lib/utils';
import { LandingFeatures } from './landing-features';
import { LogoMark } from './logo';
import { formatSavings } from './queue-summary';

// Measured with PixelNest itself: one 1920 × 1080 photo saved as PNG, then encoded at quality 80.
const SAMPLE_ORIGINAL = 2_609_720;
const FORMATS = [
  { name: 'PNG', bytes: SAMPLE_ORIGINAL, use: 'Exact pixels, screenshots', original: true },
  { name: 'JPEG', bytes: 215_937, use: 'Opens everywhere' },
  { name: 'WebP', bytes: 144_908, use: 'Websites and apps' },
  { name: 'AVIF', bytes: 119_368, use: 'Smallest files' },
];

function FormatComparison() {
  return (
    <section id='formats' className='grid scroll-mt-20 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-16'>
      <div>
        <h2 className='text-2xl font-semibold tracking-tight sm:text-3xl'>Same photo, four formats</h2>
        <p className='mt-3 max-w-sm text-muted-foreground'>A 1920 × 1080 photo at quality 80.</p>
      </div>
      <div className='panel rounded-2xl p-5 sm:p-6'>
        <ul className='space-y-5'>
          {FORMATS.map((format) => {
            const share = format.bytes / SAMPLE_ORIGINAL;
            return (
              <li key={format.name} className='grid grid-cols-[3.25rem_minmax(0,1fr)] items-center gap-x-4 gap-y-1.5'>
                <span className='num text-sm font-medium'>{format.name}</span>
                <div className='flex items-center gap-3'>
                  <div className='h-2.5 min-w-0 flex-1 rounded-full bg-surface-3'>
                    <div
                      className={cn('h-full rounded-full', format.original ? 'bg-white/25' : 'bg-brand')}
                      style={{ width: `${Math.max(share * 100, 1.5)}%` }}
                    />
                  </div>
                  <span className='num w-16 text-right text-sm'>{formatBytes(format.bytes)}</span>
                </div>
                <span />
                <p className='flex justify-between text-xs text-subtle'>
                  <span>{format.use}</span>
                  {!format.original && (
                    <span className='num text-brand/90'>{formatSavings(percentSaved(SAMPLE_ORIGINAL, format.bytes))}</span>
                  )}
                </p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

const FAQ = [
  {
    question: 'Which format should I pick?',
    answer:
      'WebP for websites, JPEG when a file must open anywhere, AVIF for the smallest files in modern browsers, and PNG for screenshots or graphics that need exact pixels.',
  },
  {
    question: 'How does “Fit under size” work?',
    answer:
      'Each image is encoded a few times, narrowing in on the highest quality that stays under your limit. If even the lowest quality is too large, you get the smallest version and a note on that image.',
  },
  {
    question: 'Why did a file get bigger?',
    answer:
      'Some images are already tightly compressed, and flat graphics can grow when saved as a photo format. Try WebP or a lower quality for that image.',
  },
  {
    question: 'Is metadata kept?',
    answer: 'No. Camera details and location are stripped. Rotation is applied to the pixels first, so photos stay upright.',
  },
  {
    question: 'Are there limits?',
    answer: 'Up to 50 MB per image. Batch size is limited only by your device’s memory.',
  },
];

function Faq() {
  return (
    <section id='faq' className='grid scroll-mt-20 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-16'>
      <h2 className='text-2xl font-semibold tracking-tight sm:text-3xl'>Questions</h2>
      <Accordion type='single' collapsible className='border-t border-line'>
        {FAQ.map((entry) => (
          <AccordionItem key={entry.question} value={entry.question} className='border-line'>
            <AccordionTrigger className='py-4.5 text-[15px] hover:no-underline hover:text-brand'>{entry.question}</AccordionTrigger>
            <AccordionContent className='max-w-xl pr-6 leading-relaxed text-muted-foreground'>{entry.answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}

function SiteFooter() {
  const lifetime = useLifetimeStats();
  return (
    <footer className='border-t border-line'>
      <div className='mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-8 text-sm text-subtle sm:px-6'>
        <span className='flex items-center gap-2.5'>
          <LogoMark className='size-5' />
          <span className='text-muted-foreground'>PixelNest</span>
        </span>
        {lifetime.images > 0 && (
          <span className='num text-xs'>
            {formatBytes(Math.max(0, lifetime.originalBytes - lifetime.outputBytes))} saved across{' '}
            {lifetime.images.toLocaleString('en-US')} images
          </span>
        )}
        <a href='#top' className='hover:text-foreground'>
          Back to top
        </a>
      </div>
    </footer>
  );
}

export function Landing() {
  return (
    <>
      <div className='mx-auto max-w-7xl space-y-24 px-4 py-24 sm:space-y-32 sm:px-6 sm:py-32'>
        <LandingFeatures />
        <FormatComparison />
        <Faq />
      </div>
      <SiteFooter />
    </>
  );
}
