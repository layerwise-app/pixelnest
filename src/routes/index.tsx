import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { CompareDialog } from '~/components/pixelnest/compare-dialog';
import { AddMoreStrip, DropOverlay, Dropzone, IntakeNotice } from '~/components/pixelnest/intake';
import { Landing } from '~/components/pixelnest/landing';
import { QueueList } from '~/components/pixelnest/queue-list';
import { QueueSummary } from '~/components/pixelnest/queue-summary';
import { SettingsPanel } from '~/components/pixelnest/settings-panel';
import { SiteHeader } from '~/components/pixelnest/site-header';
import { useFilePicker } from '~/hooks/use-file-picker';
import { useImageQueue } from '~/hooks/use-image-queue';
import { useWindowIntake } from '~/hooks/use-window-intake';
import { downloadBlob } from '~/lib/export';
import { seo } from '~/utils/seo';

export const Route = createFileRoute('/')({
  head: () => ({
    meta: seo({
      title: 'PixelNest — Compress images in your browser',
      description: 'Compress JPEG, PNG, WebP and AVIF images on your device. Presets, size targets, resize, crop and batch ZIP.',
    }),
  }),
  component: Home,
});

const ZIP_NAME = 'pixelnest-images.zip';

function Home() {
  const queue = useImageQueue();
  const picker = useFilePicker(queue.add);
  const dragging = useWindowIntake(queue.add);
  const [compareId, setCompareId] = useState<string | null>(null);

  const hasItems = queue.items.length > 0;
  const compareItem = queue.items.find((item) => item.id === compareId) ?? null;
  const sample = queue.items.find((item) => item.output);

  async function downloadAll() {
    const ready = queue.items.filter((item) => item.status === 'done' && item.output);
    if (ready.length === 1) return downloadBlob(ready[0].output!.blob, queue.fileNameFor(ready[0]));
    downloadBlob(await queue.buildZip(), ZIP_NAME);
  }

  return (
    <div id='top' className='min-h-dvh'>
      <SiteHeader />
      {picker.inputs}
      <main>
        <div className='relative'>
          <div
            aria-hidden='true'
            className='pointer-events-none absolute inset-x-0 top-0 h-[560px] bg-[radial-gradient(ellipse_55%_60%_at_20%_0%,rgb(255_214_10/6%),transparent_70%)]'
          />
          <div className='relative mx-auto max-w-7xl px-4 pt-10 sm:px-6 sm:pt-16'>
            <div className={hasItems ? 'sr-only' : 'mb-8 max-w-3xl sm:mb-12'}>
              <h1 className='text-4xl font-semibold tracking-tight text-balance sm:text-6xl'>
                Smaller files. <span className='text-muted-foreground'>Sharp images.</span>
              </h1>
              <p className='mt-4 text-base text-muted-foreground sm:text-lg'>
                Compress JPEG, PNG, WebP and AVIF — private, on-device.
              </p>
            </div>

            <div className='grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-6'>
              <div className='min-w-0 space-y-3'>
                {queue.notice && <IntakeNotice message={queue.notice} onDismiss={queue.dismissNotice} />}
                {hasItems ? (
                  <>
                    <QueueSummary
                      items={queue.items}
                      onAdd={picker.chooseFiles}
                      onClear={queue.clear}
                      onDownloadAll={downloadAll}
                    />
                    <QueueList queue={queue} onCompare={setCompareId} />
                    <AddMoreStrip onChooseFiles={picker.chooseFiles} onChooseFolder={picker.chooseFolder} />
                  </>
                ) : (
                  <Dropzone dragging={dragging} onChooseFiles={picker.chooseFiles} onChooseFolder={picker.chooseFolder} />
                )}
              </div>
              <SettingsPanel
                settings={queue.settings}
                onSettingsChange={queue.setSettings}
                namePattern={queue.namePattern}
                onNamePatternChange={queue.setNamePattern}
                nameContext={
                  sample?.output && {
                    name: sample.name,
                    width: sample.output.width,
                    height: sample.output.height,
                    format: sample.output.extension,
                    quality: sample.output.quality,
                    index: 1,
                  }
                }
                customCount={queue.items.filter((item) => item.custom).length}
                onApplyToAll={queue.applyToAll}
              />
            </div>
          </div>
        </div>
        <Landing />
      </main>
      <DropOverlay visible={dragging && hasItems} />
      <CompareDialog
        item={compareItem}
        fileName={compareItem ? queue.fileNameFor(compareItem) : ''}
        onClose={() => setCompareId(null)}
      />
    </div>
  );
}
