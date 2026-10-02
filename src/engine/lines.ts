import type { Cell, Line, PageText, PositionedText } from './types.ts';

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2 : (sorted[mid] ?? 0);
}

/** Split an item on runs of 3+ spaces, which some PDFs use instead of separate items for columns. */
function splitWideGaps(item: PositionedText): PositionedText[] {
  if (!/\S\s{3,}\S/.test(item.text)) return [item];
  const parts: PositionedText[] = [];
  const charWidth = item.text.length > 0 ? item.width / item.text.length : 0;
  const re = /\S+(?:\s{1,2}\S+)*/g;
  for (const m of item.text.matchAll(re)) {
    const start = m.index;
    parts.push({
      text: m[0],
      x: item.x + start * charWidth,
      y: item.y,
      width: m[0].length * charWidth,
      height: item.height,
    });
  }
  return parts;
}

function toCells(items: PositionedText[], gapThreshold: number): Cell[] {
  const sorted = [...items].sort((a, b) => a.x - b.x);
  const cells: Cell[] = [];
  for (const item of sorted) {
    const text = item.text.replace(/\s+/g, ' ').trim();
    if (text.length === 0) continue;
    const x0 = item.x;
    const x1 = item.x + item.width;
    const last = cells[cells.length - 1];
    if (last && x0 - last.x1 <= gapThreshold) {
      const touching = x0 - last.x1 <= gapThreshold * 0.15;
      const needsSpace = !touching && !last.text.endsWith(' ');
      last.text = `${last.text}${needsSpace ? ' ' : ''}${text}`;
      last.x1 = Math.max(last.x1, x1);
    } else {
      cells.push({ text, x0, x1 });
    }
  }
  return cells;
}

/**
 * Group positioned text into visual lines, top to bottom, page by page.
 * Items whose baselines are within a fraction of the text height share a line.
 * Within a line, items separated by less than about half a character height
 * are merged into one cell; wider gaps start a new cell (a new column).
 */
export function groupLines(pages: PageText[]): Line[] {
  const lines: Line[] = [];
  for (const page of pages) {
    const items = page.items.flatMap(splitWideGaps).filter((i) => i.text.trim().length > 0);
    if (items.length === 0) continue;
    const typicalHeight = median(items.map((i) => i.height).filter((h) => h > 0)) || 10;
    const yTolerance = Math.max(1.5, typicalHeight * 0.45);
    const sorted = [...items].sort((a, b) => a.y - b.y || a.x - b.x);

    const groups: PositionedText[][] = [];
    let current: PositionedText[] = [];
    let currentY = Number.NEGATIVE_INFINITY;
    for (const item of sorted) {
      if (current.length > 0 && Math.abs(item.y - currentY) <= yTolerance) {
        current.push(item);
      } else {
        if (current.length > 0) groups.push(current);
        current = [item];
        currentY = item.y;
      }
    }
    if (current.length > 0) groups.push(current);

    for (const group of groups) {
      const height = median(group.map((i) => i.height)) || typicalHeight;
      const cells = toCells(group, Math.max(2, height * 0.55));
      if (cells.length === 0) continue;
      lines.push({
        page: page.pageNumber,
        y: median(group.map((i) => i.y)),
        height,
        cells,
        text: cells.map((c) => c.text).join(' '),
      });
    }
  }
  return lines;
}
