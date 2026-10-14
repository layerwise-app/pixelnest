import { useEffect, useEffectEvent, useState } from 'react';
import { filesFromClipboard, filesFromDataTransfer } from '~/lib/file-intake';

function carriesFiles(event: DragEvent) {
  return Array.from(event.dataTransfer?.types ?? []).includes('Files');
}

function isTextField(target: EventTarget | null) {
  return target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA)$/.test(target.tagName));
}

/** Accepts files dropped anywhere on the page or pasted with ⌘V / Ctrl+V. */
export function useWindowIntake(onFiles: (files: File[]) => void) {
  const [dragging, setDragging] = useState(false);
  const deliver = useEffectEvent(onFiles);

  useEffect(() => {
    // dragenter/dragleave fire for every child element; count them to know when the drag truly leaves.
    let depth = 0;
    const onEnter = (event: DragEvent) => {
      if (!carriesFiles(event)) return;
      event.preventDefault();
      depth++;
      setDragging(true);
    };
    const onOver = (event: DragEvent) => {
      if (carriesFiles(event)) event.preventDefault();
    };
    const onLeave = (event: DragEvent) => {
      if (!carriesFiles(event)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setDragging(false);
    };
    const onDrop = (event: DragEvent) => {
      if (!carriesFiles(event) || !event.dataTransfer) return;
      event.preventDefault();
      depth = 0;
      setDragging(false);
      void filesFromDataTransfer(event.dataTransfer).then(deliver);
    };
    const onPaste = (event: ClipboardEvent) => {
      if (!event.clipboardData?.files.length) return;
      // Let text fields keep normal paste behaviour unless an image is on the clipboard.
      if (isTextField(event.target) && !Array.from(event.clipboardData.files).some((file) => file.type.startsWith('image/'))) {
        return;
      }
      event.preventDefault();
      deliver(filesFromClipboard(event.clipboardData));
    };

    window.addEventListener('dragenter', onEnter);
    window.addEventListener('dragover', onOver);
    window.addEventListener('dragleave', onLeave);
    window.addEventListener('drop', onDrop);
    window.addEventListener('paste', onPaste);
    return () => {
      window.removeEventListener('dragenter', onEnter);
      window.removeEventListener('dragover', onOver);
      window.removeEventListener('dragleave', onLeave);
      window.removeEventListener('drop', onDrop);
      window.removeEventListener('paste', onPaste);
    };
  }, []);

  return dragging;
}
