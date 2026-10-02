import { readFile } from 'node:fs/promises';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { extractPages } from '../../src/engine/extract.ts';
import type { PdfJsLike } from '../../src/engine/extract.ts';
import type { PageText } from '../../src/engine/types.ts';

const lib = pdfjs as unknown as PdfJsLike;

export async function pagesFromFile(path: string): Promise<PageText[]> {
  const bytes = new Uint8Array(await readFile(path));
  return extractPages(lib, bytes);
}
