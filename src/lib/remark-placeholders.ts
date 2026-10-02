/**
 * Replace SUPPORT_EMAIL and GITHUB_REPO_URL tokens in Markdown content with
 * the configured values, or with wording that points at the site footer when
 * a value has not been configured yet.
 */

interface MdNode {
  type: string;
  value?: string;
  url?: string;
  children?: MdNode[];
}

export interface PlaceholderValues {
  supportEmail: string;
  repoUrl: string;
}

function textFor(token: string, values: PlaceholderValues): string {
  if (token === 'SUPPORT_EMAIL') return values.supportEmail || 'us (a contact address is being set up and will appear in the site footer)';
  return values.repoUrl || 'a public repository (link coming soon in the site footer)';
}

function walk(node: MdNode, values: PlaceholderValues): void {
  if (node.type === 'text' && node.value) {
    node.value = node.value.replace(/SUPPORT_EMAIL|GITHUB_REPO_URL/g, (t) => textFor(t, values));
  }
  if (node.url) {
    if (node.url.includes('SUPPORT_EMAIL')) node.url = node.url.replace('SUPPORT_EMAIL', values.supportEmail);
    if (node.url.includes('GITHUB_REPO_URL')) node.url = node.url.replace('GITHUB_REPO_URL', values.repoUrl);
  }
  for (const child of node.children ?? []) walk(child, values);
}

export function remarkPlaceholders(values: PlaceholderValues) {
  return () => (tree: MdNode) => {
    walk(tree, values);
  };
}
