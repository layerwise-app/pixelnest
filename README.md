# PixelNest

<a href="https://layerwise.app"><img src="https://layerwise.app/powered-by.png" alt="Powered by Layerwise" width="320" /></a>

PixelNest compresses JPEG, PNG, WebP and AVIF images in the browser. Images
never leave the device: decoding and encoding run in Web Workers with
WebAssembly codecs.

Inspired by: <https://tinypng.com/>

## Features

- Presets: Web (WebP, 2048 px), Social (JPEG, 1080 px wide), Email (JPEG,
  1280 px), Lossless (WebP lossless), or custom settings.
- Quality slider or **Fit under size**: a bounded search finds the highest
  quality under a KB limit and flags images that cannot reach it.
- Resize by box (proportional or exact) or percentage, and center-crop to
  1:1, 4:5 or 16:9.
- Per-image overrides: change format or settings, re-compress, compare, copy
  to the clipboard, download, or remove. "Apply to all" resets overrides.
- Intake by file picker, folder, drag and drop, or paste; unsupported files
  are skipped with an inline message.
- Output name patterns (`{name}`, `{width}`, `{height}`, `{format}`,
  `{quality}`, `{index}`) for single downloads and the ZIP.
- Before/after viewer with a draggable divider, Fit/100%/200% zoom and pan.
- Session savings summary plus lifetime totals stored in `localStorage`.

## Commands

```bash
pnpm dev
pnpm check-types
pnpm test
pnpm build
pnpm auth:generate
pnpm db:generate --name <migration_name>
pnpm db:migrate
pnpm cf-typegen
pnpm release
```

`pnpm test` runs the `node --test` suites in `tests/` for the pure helpers
(geometry, naming, quality search, settings, file intake).

`db:migrate` applies generated Drizzle migrations to the local D1 database.
Layerwise applies the same migrations to the project's production D1 database
during publishing.

## Important files

- `src/routes/index.tsx`: the compressor page
- `src/components/pixelnest/`: workspace, settings, compare viewer, landing
- `src/hooks/use-image-queue.ts`: queue state, re-runs, ZIP export
- `src/workers/compressor.worker.ts` and `src/lib/compressor-pool.ts`: encoding
  off the main thread
- `src/lib/`: settings, presets, geometry, naming and quality search helpers
- `src/styles/app.css`: theme tokens
- `wrangler.jsonc`: local Worker and D1 bindings

The compressor has no account pages. The starter's D1 database, Drizzle schema
and Better Auth server (`src/lib/auth.ts`, `/api/auth`) are kept for a future
feature such as synced presets. Keep secrets server-side. Variables prefixed with `VITE_` are
included in the browser bundle. `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, and
`AUTH_EMAIL_URL` belong in the Worker environment.
