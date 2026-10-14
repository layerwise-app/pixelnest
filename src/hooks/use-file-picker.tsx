import { useRef, useSyncExternalStore, type ChangeEvent } from 'react';
import { ACCEPTED_MIME } from '~/lib/file-intake';

const ACCEPT = [...ACCEPTED_MIME, '.jpg', '.jpeg', '.png', '.webp', '.avif'].join(',');
// React has no typed prop for folder selection; the attribute is passed through as-is.
const FOLDER_ATTRIBUTES = { webkitdirectory: '', directory: '' } as Record<string, string>;

/** Hidden file and folder inputs plus functions to open them from any button. */
export function useFilePicker(onFiles: (files: File[]) => void) {
  const filesRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files ?? []);
    // Reset so choosing the same files again still fires a change.
    event.currentTarget.value = '';
    if (files.length) onFiles(files);
  }

  const inputs = (
    <>
      <input
        ref={filesRef}
        type='file'
        multiple
        accept={ACCEPT}
        className='sr-only'
        tabIndex={-1}
        aria-label='Choose images'
        data-testid='file-input'
        onChange={handleChange}
      />
      <input
        ref={folderRef}
        type='file'
        className='sr-only'
        tabIndex={-1}
        aria-label='Choose a folder'
        onChange={handleChange}
        {...FOLDER_ATTRIBUTES}
      />
    </>
  );

  return {
    inputs,
    chooseFiles: () => filesRef.current?.click(),
    chooseFolder: () => folderRef.current?.click(),
  };
}

const noopSubscribe = () => () => {};

/** "⌘" on Apple platforms, "Ctrl" elsewhere. The server render assumes a Mac. */
export function usePasteKey() {
  return useSyncExternalStore(
    noopSubscribe,
    () => (/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? '⌘' : 'Ctrl+'),
    () => '⌘',
  );
}
