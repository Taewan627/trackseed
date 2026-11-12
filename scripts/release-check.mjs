// Release gate: exits non-zero while anything is left that must be resolved before a release.
//   1. no unresolved PI tokens (the marker "[PI:" followed by a topic) in any tracked file outside experiments/
//   2. package.json, src/version.ts and CITATION.cff carry the same version
//   3. `npm pack --dry-run` lists only the intended files (no node_modules, test-results, .env*, tmp, ...)
// Usage (repository root): node scripts/release-check.mjs      (or: npm run release-check)
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const run = (cmd, args) => execFileSync(cmd, args, { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, shell: process.platform === 'win32' && cmd === 'npm' });
const problems = [];

// 1. PI tokens. The marker is assembled here so that this file does not match itself.
const marker = '[PI' + ':';
const tracked = run('git', ['ls-files', '-z']).split('\0').filter(Boolean);
const scanned = tracked.filter(f => !f.startsWith('experiments/'));
const hits = [];
for (const file of scanned) {
  const bytes = readFileSync(resolve(root, file));
  if (bytes.includes(0)) continue; // binary
  bytes.toString('utf8').split(/\r?\n/).forEach((line, i) => {
    let from = 0;
    for (let at = line.indexOf(marker, from); at !== -1; at = line.indexOf(marker, from)) {
      const end = line.indexOf(']', at);
      hits.push(`${file}:${i + 1}: ${line.slice(at, end === -1 ? at + 40 : end + 1)}`);
      from = at + marker.length;
    }
  });
}
if (hits.length) problems.push(`${hits.length} unresolved PI token(s) in ${new Set(hits.map(h => h.split(':')[0])).size} file(s):\n    ${hits.join('\n    ')}`);

// 2. Versions.
const versions = {
  'package.json': JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')).version,
  'src/version.ts': /VERSION\s*=\s*'([^']+)'/.exec(readFileSync(resolve(root, 'src/version.ts'), 'utf8'))?.[1],
  'CITATION.cff': /^version:\s*"?([^"\s#]+)"?/m.exec(readFileSync(resolve(root, 'CITATION.cff'), 'utf8'))?.[1],
};
if (new Set(Object.values(versions)).size !== 1 || Object.values(versions).some(v => !v)) {
  problems.push(`version mismatch: ${Object.entries(versions).map(([f, v]) => `${f}=${v}`).join(', ')}`);
}

// 3. Package contents. Build first (as `npm pack` does through prepack) and list without running scripts, so that
// script output cannot corrupt the JSON.
run('npm', ['run', 'build:cli']);
const packed = JSON.parse(run('npm', ['pack', '--dry-run', '--json', '--ignore-scripts']))[0];
const files = packed.files.map(f => f.path.replaceAll('\\', '/'));
const allowedTop = new Set(['package.json', 'README.md', 'LICENSE', 'Licence.txt', 'CHANGELOG.md', 'THIRD_PARTY_NOTICES.md']);
const allowed = f => allowedTop.has(f) || /^cli-dist\/[A-Za-z0-9_-]+\.(js|d\.ts)$/.test(f) || /^schema\/[A-Za-z0-9_.-]+\.json$/.test(f);
const forbidden = f => /(^|\/)(node_modules|test-results|tmp|\.test-build|dist|\.vercel|\.git|\.github)(\/|$)/.test(f) || /(^|\/)\.env/.test(f);
const unexpected = files.filter(f => forbidden(f) || !allowed(f));
if (unexpected.length) problems.push(`npm pack --dry-run lists ${unexpected.length} unexpected file(s):\n    ${unexpected.join('\n    ')}`);
for (const needed of ['cli-dist/index.js', 'cli-dist/index.d.ts', 'cli-dist/cli.js', 'schema/trackdocument-v1.schema.json', 'LICENSE']) {
  if (!files.includes(needed)) problems.push(`npm pack --dry-run does not list ${needed}`);
}

console.log(`release-check: ${scanned.length} tracked files scanned (experiments/ excluded), version ${[...new Set(Object.values(versions))].join(' / ')}, ${files.length} files in the package`);
if (problems.length) {
  console.error(`release-check FAILED (${problems.length} problem group(s)):\n  - ${problems.join('\n  - ')}`);
  process.exit(1);
}
console.log('release-check: ok');
