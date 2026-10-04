import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import { describe, expect, it } from 'vitest';
import { remarkPriceBlocks } from '../../src/lib/remark-price-blocks.ts';

async function render(markdown: string, visible: boolean): Promise<string> {
  const processor = await createMarkdownProcessor({ remarkPlugins: [remarkPriceBlocks(visible)] });
  const { code } = await processor.render(markdown);
  return code;
}

const SAMPLE = `Before.

<!-- if prices -->

## Plans

Pro costs US$9 a month.

- one
- two

<!-- else -->

## Early access

Paid plans will come later.

<!-- endif -->

After.
`;

describe('remarkPriceBlocks', () => {
  it('keeps the priced copy and drops the early-access copy when prices are visible', async () => {
    const html = await render(SAMPLE, true);
    expect(html).toContain('Pro costs US$9 a month.');
    expect(html).toContain('<h2 id="plans">Plans</h2>');
    expect(html).toContain('<li>two</li>');
    expect(html).not.toContain('Paid plans will come later');
    expect(html).toContain('Before.');
    expect(html).toContain('After.');
  });

  it('keeps the early-access copy and drops every price when prices are hidden', async () => {
    const html = await render(SAMPLE, false);
    expect(html).toContain('Paid plans will come later.');
    expect(html).toContain('<h2 id="early-access">Early access</h2>');
    expect(html).not.toContain('US$');
    expect(html).not.toContain('Plans');
    expect(html).not.toContain('<li>');
    expect(html).toContain('Before.');
    expect(html).toContain('After.');
  });

  it('never lets a marker reach the output', async () => {
    for (const visible of [true, false]) {
      const html = await render(SAMPLE, visible);
      expect(html).not.toMatch(/<!--|if prices|endif/);
    }
  });

  it('allows a block without an else part', async () => {
    const markdown = 'A.\n\n<!-- if prices -->\n\nOnly with prices.\n\n<!-- endif -->\n\nB.\n';
    expect(await render(markdown, true)).toContain('Only with prices.');
    expect(await render(markdown, false)).not.toContain('Only with prices.');
  });

  it('works inside a list item and a blockquote', async () => {
    const markdown = '> Quote.\n>\n> <!-- if prices -->\n>\n> Priced.\n>\n> <!-- else -->\n>\n> Early.\n>\n> <!-- endif -->\n';
    expect(await render(markdown, true)).toContain('Priced.');
    expect(await render(markdown, false)).toContain('Early.');
    expect(await render(markdown, false)).not.toContain('Priced.');
  });

  it('fails the build on an unbalanced or misplaced marker, so prices cannot leak by accident', async () => {
    await expect(render('<!-- if prices -->\n\nNever closed.\n', false)).rejects.toThrow(/never closed/);
    await expect(render('<!-- endif -->\n', false)).rejects.toThrow(/without a matching/);
    await expect(render('<!-- else -->\n', false)).rejects.toThrow(/without a matching/);
    await expect(render('<!-- if prices -->\n\nA.\n\n<!-- if prices -->\n\nB.\n\n<!-- endif -->\n\n<!-- endif -->\n', false)).rejects.toThrow(
      /inside another/,
    );
    // A marker at the start of a line that carries other text is read as one raw HTML block.
    await expect(render('<!-- if prices -->US$9<!-- else -->free<!-- endif -->\n', false)).rejects.toThrow(/alone on its line/);
  });

  it('leaves ordinary comments alone', async () => {
    const html = await render('A.\n\n<!-- Owner to confirm: the governing state. -->\n\nB.\n', false);
    expect(html).toContain('Owner to confirm');
  });
});
