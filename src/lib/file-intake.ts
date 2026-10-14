export const ACCEPTED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
export const MAX_FILE_BYTES = 50 * 1024 * 1024;

const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  jfif: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
};

export type Rejection = { name: string; reason: 'type' | 'size' };

/** Browsers sometimes leave `type` empty (e.g. folder drops), so fall back to the extension. */
export function imageMime(file: File) {
  if (ACCEPTED_MIME.includes(file.type)) return file.type;
  if (file.type && !file.type.startsWith('application/octet-stream')) return '';
  return MIME_BY_EXTENSION[file.name.split('.').pop()?.toLowerCase() ?? ''] ?? '';
}

export function partitionFiles(files: File[]) {
  const accepted: File[] = [];
  const rejected: Rejection[] = [];
  for (const file of files) {
    // Hidden files like .DS_Store ride along with folder drops; ignore them quietly.
    if (file.name.startsWith('.')) continue;
    if (!imageMime(file)) rejected.push({ name: file.name, reason: 'type' });
    else if (file.size > MAX_FILE_BYTES) rejected.push({ name: file.name, reason: 'size' });
    else accepted.push(file);
  }
  return { accepted, rejected };
}

export function describeRejections(rejected: Rejection[]) {
  const type = rejected.filter((entry) => entry.reason === 'type').map((entry) => entry.name);
  const size = rejected.filter((entry) => entry.reason === 'size').map((entry) => entry.name);
  const list = (names: string[]) =>
    names.length > 2 ? `${names.slice(0, 2).join(', ')} and ${names.length - 2} more` : names.join(' and ');
  const parts: string[] = [];
  if (type.length) parts.push(`${list(type)} ${type.length === 1 ? "isn't" : "aren't"} JPEG, PNG, WebP or AVIF`);
  if (size.length) parts.push(`${list(size)} ${size.length === 1 ? 'is' : 'are'} over 50 MB`);
  return `Skipped ${parts.join('; ')}.`;
}

function readEntries(reader: FileSystemDirectoryReader) {
  return new Promise<FileSystemEntry[]>((resolve, reject) => reader.readEntries(resolve, reject));
}

async function filesFromEntry(entry: FileSystemEntry): Promise<File[]> {
  if (entry.isFile) {
    return [await new Promise<File>((resolve, reject) => (entry as FileSystemFileEntry).file(resolve, reject))];
  }
  if (!entry.isDirectory) return [];
  const reader = (entry as FileSystemDirectoryEntry).createReader();
  const files: File[] = [];
  // readEntries returns results in batches until it yields an empty array.
  for (let batch = await readEntries(reader); batch.length; batch = await readEntries(reader)) {
    for (const child of batch) files.push(...(await filesFromEntry(child)));
  }
  return files;
}

/** Expands dropped folders. Entries must be grabbed synchronously, before the drop event ends. */
export function filesFromDataTransfer(dataTransfer: DataTransfer): Promise<File[]> {
  const entries = Array.from(dataTransfer.items)
    .filter((item) => item.kind === 'file')
    .map((item) => item.webkitGetAsEntry());
  if (!entries.length || entries.some((entry) => !entry)) {
    return Promise.resolve(Array.from(dataTransfer.files));
  }
  return Promise.all(entries.map((entry) => filesFromEntry(entry!))).then((groups) => groups.flat());
}

/** Clipboard images usually arrive as `image.png`; give each paste a distinct name. */
export function filesFromClipboard(clipboard: DataTransfer) {
  const stamp = new Date().toTimeString().slice(0, 8).replaceAll(':', '');
  return Array.from(clipboard.files).map((file, index) => {
    const extension = file.type.split('/')[1]?.replace('jpeg', 'jpg') ?? 'png';
    const suffix = clipboard.files.length > 1 ? `-${index + 1}` : '';
    return new File([file], `pasted-${stamp}${suffix}.${extension}`, { type: file.type, lastModified: Date.now() });
  });
}
