// Copy only the product's source into a separate folder for the public, open-source
// repository. Business documents (strategy, research, marketing, progress notes) stay
// in this private repository and are never part of the public history.
//   node scripts/export-public.mjs ../tallyproof-public
import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const PUBLIC_PATHS = [
  'src',
  'tests',
  'public',
  'scripts/make-fixtures.ts',
  'scripts/try-statements.ts',
  'scripts/dump-exports.ts',
  'scripts/polar-setup.mjs',
  'scripts/export-public.mjs',
  'astro.config.ts',
  'eslint.config.js',
  'playwright.config.ts',
  'vitest.config.ts',
  'tsconfig.json',
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'LICENSE',
  'README.md',
  '.gitignore',
  '.gitattributes',
  '.env.example',
];

const target = process.argv[2];
if (!target) throw new Error('usage: node scripts/export-public.mjs <target-folder>');
const dest = resolve(target);
if (existsSync(dest) && readdirSync(dest).some((f) => f !== '.git')) {
  throw new Error(`${dest} is not empty; refusing to overwrite`);
}
mkdirSync(dest, { recursive: true });
for (const path of PUBLIC_PATHS) {
  cpSync(path, join(dest, path), { recursive: true });
}
console.log(`Copied ${PUBLIC_PATHS.length} paths to ${dest}`);
