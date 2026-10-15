import type { ShareResult } from './share';

/** Web: download the file through a temporary link. */
export async function shareJsonFile(fileName: string, json: string): Promise<ShareResult> {
  try {
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return 'shared';
  } catch {
    return 'failed';
  }
}
