export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  // Give the browser a moment to start the download before releasing the URL.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function toPng(blob: Blob) {
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0);
  bitmap.close();
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((png) => (png ? resolve(png) : reject(new Error('Could not prepare the image.'))), 'image/png'),
  );
}

/**
 * Browsers only accept PNG image data on the clipboard, so other formats are
 * re-encoded losslessly from the compressed pixels. The blob is passed as a
 * promise so Safari keeps the user gesture while it is prepared.
 */
export async function copyImageToClipboard(blob: Blob) {
  if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
    throw new Error('This browser cannot copy images.');
  }
  const png = blob.type === 'image/png' ? Promise.resolve(blob) : toPng(blob);
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
}
