import { Logo } from './logo';

const LINKS = [
  { href: '#features', label: 'Features' },
  { href: '#formats', label: 'Formats' },
  { href: '#faq', label: 'FAQ' },
];

export function SiteHeader() {
  return (
    <header className='sticky top-0 z-30 border-b border-line bg-background/80 backdrop-blur-xl'>
      <div className='mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6'>
        <a href='/' className='rounded-md outline-none focus-visible:ring-2 focus-visible:ring-brand/60'>
          <Logo />
        </a>
        <nav aria-label='Sections' className='hidden items-center gap-1 sm:flex'>
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className='rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground'
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
