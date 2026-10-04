/**
 * Show or hide price copy in Markdown content, depending on PRICES_VISIBLE.
 *
 * Markdown pages keep both wordings side by side, using HTML comments as markers, each on a line of its own:
 *
 *   <!-- if prices -->
 *   Pro costs ...
 *   <!-- else -->
 *   Paid plans are not available yet.
 *   <!-- endif -->
 *
 * The `else` part is optional. Markers sit between blocks (paragraphs, headings,
 * lists), with a blank line around each one. They cannot be used inline: a line that
 * starts with a comment is read by Markdown as a raw HTML block, text and all. A marker
 * that is misplaced or unbalanced fails the build, so a typo cannot leak prices by
 * accident. Blocks cannot be nested. The markers themselves never reach the output.
 */

interface MdNode {
  type: string;
  value?: string;
  children?: MdNode[];
}

type Marker = 'if' | 'else' | 'endif';

const MARKER = /^<!--\s*(if prices|else|endif)\s*-->$/;
const MARKER_ANYWHERE = /<!--\s*(if prices|else|endif)\s*-->/;

function markerOf(node: MdNode): Marker | null {
  if (node.type !== 'html' || node.value === undefined) return null;
  const match = MARKER.exec(node.value.trim());
  if (!match) {
    if (MARKER_ANYWHERE.test(node.value)) {
      throw new Error(`remark-price-blocks: a marker must be alone on its line, with a blank line around it: ${node.value.slice(0, 80)}`);
    }
    return null;
  }
  if (match[1] === 'if prices') return 'if';
  return match[1] === 'else' ? 'else' : 'endif';
}

type State = 'outside' | 'priced' | 'early';

function filterChildren(children: MdNode[], visible: boolean): MdNode[] {
  const kept: MdNode[] = [];
  let state: State = 'outside';
  for (const child of children) {
    const marker = markerOf(child);
    if (marker === 'if') {
      if (state !== 'outside') throw new Error('remark-price-blocks: "<!-- if prices -->" inside another price block');
      state = 'priced';
    } else if (marker === 'else') {
      if (state !== 'priced') throw new Error('remark-price-blocks: "<!-- else -->" without a matching "<!-- if prices -->"');
      state = 'early';
    } else if (marker === 'endif') {
      if (state === 'outside') throw new Error('remark-price-blocks: "<!-- endif -->" without a matching "<!-- if prices -->"');
      state = 'outside';
    } else if (state === 'outside' || (state === 'priced' && visible) || (state === 'early' && !visible)) {
      kept.push(child);
    }
  }
  if (state !== 'outside') throw new Error('remark-price-blocks: "<!-- if prices -->" is never closed with "<!-- endif -->"');
  return kept;
}

function walk(node: MdNode, visible: boolean): void {
  if (!node.children) return;
  node.children = filterChildren(node.children, visible);
  for (const child of node.children) walk(child, visible);
}

export function remarkPriceBlocks(visible: boolean) {
  return () => (tree: MdNode) => {
    walk(tree, visible);
  };
}
