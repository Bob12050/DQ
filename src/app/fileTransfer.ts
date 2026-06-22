/** Browser helpers for exporting/importing save backups. */

export function downloadText(filename: string, text: string): void {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Share a backup via the Web Share API when available, else download it. */
export async function shareOrDownload(filename: string, text: string): Promise<void> {
  const file = new File([text], filename, { type: 'application/json' });
  const navAny = navigator as Navigator & { canShare?: (d: unknown) => boolean; share?: (d: unknown) => Promise<void> };
  if (navAny.canShare && navAny.share && navAny.canShare({ files: [file] })) {
    try {
      await navAny.share({ files: [file], title: 'Echoes of Beast セーブ' });
      return;
    } catch {
      /* user cancelled or failed — fall through to download */
    }
  }
  downloadText(filename, text);
}

/** Opens a file picker and resolves the selected file's text (or null if cancelled). */
export function pickTextFile(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => resolve(null);
      reader.readAsText(file);
    };
    input.click();
  });
}
