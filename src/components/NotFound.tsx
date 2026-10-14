import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { Button } from '~/components/ui/button';
import { LogoMark } from '~/components/pixelnest/logo';

export function NotFound({ children }: { children?: ReactNode }) {
  return (
    <div className='grid min-h-dvh place-items-center px-4'>
      <div className='flex max-w-sm flex-col items-center text-center'>
        <LogoMark className='size-10' />
        <h1 className='mt-6 text-2xl font-semibold tracking-tight'>Page not found</h1>
        <div className='mt-2 text-sm text-muted-foreground'>{children ?? <p>This page doesn’t exist.</p>}</div>
        <div className='mt-6 flex gap-2'>
          <Button variant='outline' onClick={() => window.history.back()}>
            Go back
          </Button>
          <Button asChild className='font-semibold'>
            <Link to='/'>Open PixelNest</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
