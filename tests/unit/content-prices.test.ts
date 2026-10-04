import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createMarkdownProcessor, parseFrontmatter } from '@astrojs/markdown-remark';
import { describe, expect, it } from 'vitest';
import { remarkPriceBlocks } from '../../src/lib/remark-price-blocks.ts';
import { PRICES_VISIBLE } from '../../src/pricing.ts';
import { findPrices } from '../helpers/price-patterns.ts';

const CONTENT_DIR = join(import.meta.dirname, '..', '..', 'src', 'content');

function markdownFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return markdownFiles(path);
    return entry.name.endsWith('.md') ? [path] : [];
  });
}

interface PageFrontmatter {
  title?: string;
  heading?: string;
  description?: string;
  intro?: string;
  descriptionEarlyAccess?: string;
  introEarlyAccess?: string;
}

async function render(markdown: string, visible: boolean): Promise<string> {
  const processor = await createMarkdownProcessor({ remarkPlugins: [remarkPriceBlocks(visible)] });
  return (await processor.render(markdown)).code;
}

/** The frontmatter strings a visitor or search engine sees for the given state. */
function visibleFrontmatter(frontmatter: PageFrontmatter, visible: boolean): string[] {
  const description = visible ? frontmatter.description : frontmatter.descriptionEarlyAccess ?? frontmatter.description;
  const intro = visible ? frontmatter.intro : frontmatter.introEarlyAccess ?? frontmatter.intro;
  return [frontmatter.title, frontmatter.heading, description, intro].filter((v): v is string => typeof v === 'string');
}

const files = markdownFiles(CONTENT_DIR);

describe('Markdown content, with prices hidden', () => {
  it('finds the content files', () => {
    expect(files.length).toBeGreaterThanOrEqual(17);
  });

  for (const file of files) {
    const name = file.slice(CONTENT_DIR.length + 1);
    const source = readFileSync(file, 'utf8');
    const { frontmatter, content } = parseFrontmatter(source);

    it(`${name} shows no prices or buy calls to action`, async () => {
      const html = await render(content, false);
      expect(findPrices(html), 'body').toEqual([]);
      expect(findPrices(visibleFrontmatter(frontmatter as PageFrontmatter, false).join('\n')), 'frontmatter').toEqual([]);
    });

    it(`${name} keeps its price copy for when prices come back`, async () => {
      // Only files with a price block need to bring prices back; other files never had any.
      if (!content.includes('<!-- if prices -->')) return;
      const html = await render(content, true);
      const frontmatterText = visibleFrontmatter(frontmatter as PageFrontmatter, true).join('\n');
      expect(findPrices(`${html}\n${frontmatterText}`).length).toBeGreaterThan(0);
      expect(html).not.toMatch(/<!--\s*(?:if prices|else|endif)/);
    });
  }
});

describe('PRICES_VISIBLE', () => {
  it('is false until Polar checkout is live', () => {
    // Flip this expectation together with PRICES_VISIBLE, after a test purchase works end to end.
    expect(PRICES_VISIBLE).toBe(false);
  });
});
