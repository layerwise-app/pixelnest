/// <reference types="vite/client" />
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext
} from '@tanstack/react-router';
import type { QueryClient } from '@tanstack/react-query';
import type * as React from 'react';
import { ThemeProvider } from 'next-themes';
import { DefaultCatchBoundary } from '~/components/DefaultCatchBoundary';
import { NotFound } from '~/components/NotFound';
import { Toaster } from '~/components/ui/sonner';
import { TooltipProvider } from '~/components/ui/tooltip';
import { seo } from '~/utils/seo';
import '~/styles/app.css';

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { name: 'theme-color', content: '#0b0b0c' },
      ...seo({
        title: 'PixelNest — Image compression',
        description: 'Compress JPEG, PNG, WebP and AVIF images in your browser.'
      })
    ],
    links: [
      { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
      { rel: 'icon', href: '/favicon.ico', sizes: 'any' },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Geist:wght@400..700&family=Geist+Mono:wght@400..600&display=swap'
      }
    ]
  }),
  errorComponent: (props) => (
    <RootDocument>
      <DefaultCatchBoundary {...props} />
    </RootDocument>
  ),
  notFoundComponent: () => <NotFound />,
  component: RootComponent
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang='en' className='dark' suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider
          attribute='class'
          forcedTheme='dark'
          disableTransitionOnChange
        >
          <TooltipProvider>
            {children}
            <Toaster theme='dark' position='bottom-center' />
          </TooltipProvider>
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}
