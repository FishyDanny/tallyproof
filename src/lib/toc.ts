import type { MarkdownHeading } from 'astro';

/** Pages with fewer section headings than this do not get an "On this page" list. */
const MIN_HEADINGS = 3;

/** The second-level headings of a page, which are the sections a reader jumps between. */
export function tocItems(headings: MarkdownHeading[]): MarkdownHeading[] {
  return headings.filter((heading) => heading.depth === 2);
}

export function wantsToc(headings: MarkdownHeading[]): boolean {
  return tocItems(headings).length >= MIN_HEADINGS;
}
