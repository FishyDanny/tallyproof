import { extractPages } from '../engine/extract.ts';
import type { PdfJsLike } from '../engine/extract.ts';
import type { PageText } from '../engine/types.ts';

let loader: Promise<PdfJsLike> | null = null;

/**
 * Load pdf.js and start its worker on first use. The library and the worker
 * are served from this site and both are fetched before any file is chosen,
 * so reading a statement makes no network request at all.
 */
function loadPdfJs(): Promise<PdfJsLike> {
  loader ??= (async () => {
    const [lib, worker] = await Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')]);
    lib.GlobalWorkerOptions.workerSrc = worker.default;
    if (typeof Worker !== 'undefined') {
      // A long-lived worker created now, rather than when the first PDF opens.
      lib.GlobalWorkerOptions.workerPort = new Worker(worker.default, { type: 'module' });
    }
    return lib as unknown as PdfJsLike;
  })();
  return loader;
}

export async function readStatement(file: File): Promise<PageText[]> {
  const pdfjs = await loadPdfJs();
  const bytes = new Uint8Array(await file.arrayBuffer());
  return extractPages(pdfjs, bytes);
}

/** Warm the library while the user is choosing a file. */
export function preloadPdfJs(): void {
  void loadPdfJs();
}
