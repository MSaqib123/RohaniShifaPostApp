/**
 * Dev utility: report broken relative imports across TypeScript sources.
 * Run: node scripts/check-imports.mjs
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const ROOT = resolve('src');

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

const EXTENSIONS = ['.ts', '.tsx', '/index.ts', '.scss', '.html'];

function resolves(from, spec) {
  const base = resolve(dirname(from), spec);
  if (existsSync(base) && statSync(base).isFile()) return true;
  return EXTENSIONS.some((ext) => existsSync(base + ext));
}

const problems = [];
for (const file of walk(ROOT)) {
  const source = readFileSync(file, 'utf8');
  const re = /from\s+'(\.[^']*)'|import\('(\.[^']*)'\)/g;
  let match;
  while ((match = re.exec(source))) {
    const spec = match[1] || match[2];
    if (!resolves(file, spec)) {
      problems.push(`${file.replace(ROOT, 'src')} -> ${spec}`);
    }
  }
}

console.log(problems.length ? problems.join('\n') : 'all relative imports resolve');
