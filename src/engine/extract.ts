import type { PageText, PositionedText } from './types.ts';

/**
 * The small part of the pdf.js API this module needs. Declaring it here keeps
 * the engine independent of whether the browser or the Node build is loaded.
 */
export interface PdfTextItemLike {
  str?: string;
  transform?: number[];
  width?: number;
  height?: number;
}

export interface PdfViewportLike {
  width: number;
  height: number;
  convertToViewportPoint(x: number, y: number): number[];
}

export interface PdfPageLike {
  getViewport(params: { scale: number }): PdfViewportLike;
  getTextContent(): Promise<{ items: unknown[] }>;
  cleanup(): void;
}

export interface PdfDocumentLike {
  numPages: number;
  getPage(pageNumber: number): Promise<PdfPageLike>;
}

export interface PdfLoadingTaskLike {
  promise: Promise<PdfDocumentLike>;
  destroy(): Promise<void>;
}

export interface PdfJsLike {
  getDocument(params: {
    data: Uint8Array;
    isEvalSupported?: boolean;
    disableFontFace?: boolean;
    useSystemFonts?: boolean;
    stopAtErrors?: boolean;
    password?: string;
  }): PdfLoadingTaskLike;
}

function isTextItem(item: unknown): item is PdfTextItemLike & { str: string; transform: number[] } {
  if (typeof item !== 'object' || item === null) return false;
  const candidate = item as PdfTextItemLike;
  return typeof candidate.str === 'string' && Array.isArray(candidate.transform);
}

export class PdfPasswordError extends Error {
  constructor() {
    super('This PDF is password protected. Open it, save an unprotected copy, and try again.');
    this.name = 'PdfPasswordError';
  }
}

/**
 * Read every text item on every page with its position, converted to a
 * top-left origin so lines can be sorted top to bottom.
 */
export async function extractPages(pdfjs: PdfJsLike, data: Uint8Array): Promise<PageText[]> {
  const task = pdfjs.getDocument({ data, isEvalSupported: false, disableFontFace: true, useSystemFonts: false });
  let doc: PdfDocumentLike;
  try {
    doc = await task.promise;
  } catch (error) {
    await task.destroy();
    if (error instanceof Error && error.name === 'PasswordException') throw new PdfPasswordError();
    throw error;
  }
  const pages: PageText[] = [];
  try {
    for (let n = 1; n <= doc.numPages; n += 1) {
      const page = await doc.getPage(n);
      const viewport = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();
      const items: PositionedText[] = [];
      for (const raw of content.items) {
        if (!isTextItem(raw)) continue;
        const [a = 0, b = 0, , d = 0, e = 0, f = 0] = raw.transform;
        // Skip rotated text such as vertical margin labels.
        if (Math.abs(b) > Math.abs(a) * 0.1) continue;
        const [vx = 0, vy = 0] = viewport.convertToViewportPoint(e, f);
        const fontHeight = Math.abs(d) || raw.height || 0;
        items.push({ text: raw.str, x: vx, y: vy, width: raw.width ?? 0, height: fontHeight });
      }
      pages.push({ pageNumber: n, width: viewport.width, height: viewport.height, items });
      page.cleanup();
    }
  } finally {
    await task.destroy();
  }
  return pages;
}
