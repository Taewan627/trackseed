// Compiles src/core.ts + src/coins.ts of a source tree to plain ESM JS in a temp dir
// (using this repo's TypeScript) so old and new generators can be loaded side by side.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export async function buildCore(srcRoot, outDir) {
  mkdirSync(outDir, { recursive: true });
  mkdirSync(join(outDir, 'no-types'), { recursive: true });
  writeFileSync(join(outDir, 'package.json'), '{"type":"module"}\n');
  const tsc = join(repo, 'node_modules', 'typescript', 'bin', 'tsc');
  execFileSync(process.execPath, [tsc, '--outDir', outDir, '--rootDir', srcRoot, '--module', 'NodeNext',
    '--moduleResolution', 'NodeNext', '--target', 'ES2022', '--lib', 'ES2022', '--skipLibCheck', '--strict',
    '--typeRoots', join(outDir, 'no-types'), join(srcRoot, 'src/core.ts'), join(srcRoot, 'src/coins.ts')], { cwd: srcRoot, stdio: 'pipe' });
  return {
    core: await import(pathToFileURL(join(outDir, 'src/core.js')).href),
    coins: await import(pathToFileURL(join(outDir, 'src/coins.js')).href),
  };
}
export { repo };
