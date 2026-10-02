import type { ExportFile } from '../engine/export.ts';

const BYTE_ORDER_MARK = String.fromCharCode(0xfeff);

/** Save a generated file in the browser. Nothing leaves the device. */
export function downloadFile(file: ExportFile): void {
  const blob = new Blob([(file.bom ? BYTE_ORDER_MARK : '') + file.content], { type: `${file.mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
