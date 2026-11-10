import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync, cpSync, unlinkSync } from 'node:fs';
import { resolve, dirname, relative, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const environment = process.argv[2] ?? 'preview';
if (!['preview', 'production'].includes(environment)) throw new Error('Use preview or production.');
const auditFile = `tmp/vercel-${environment}-audit.json`;
const local = path => resolve(root, path);
const output = local('.vercel/output');
const tmp = local('tmp');
const files = directory => readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
  if (entry.isSymbolicLink()) throw new Error('Symbolic links are not allowed in deployment inputs.');
  const path = resolve(directory, entry.name);
  return entry.isDirectory() ? files(path) : [path];
});
const checks = [
  ['game-ip-name', /nexon|넥슨|kartrider|카트라이더|maplestory|메이플스토리|mabinogi|마비노기|던전앤파이터/i],
  ['confidential-marker', /confidential|사내\s*기밀|대외비|영업\s*비밀/i],
  ['private-key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['credential-token', /\b(?:AKIA[0-9A-Z]{16}|sk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{24,}|gh[pousr]_[A-Za-z0-9]{30,})\b/],
  ['private-email', /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i],
  ['korean-phone', /\b01[016789][- ]?\d{3,4}[- ]?\d{4}\b/],
  ['private-filesystem-path', /\b[A-Z]:[\\/](?:Users|phd)[\\/]|file:\/\/\//i],
  ['auth-environment-marker', /VERCEL_OIDC_TOKEN|VERCEL_AUTOMATION_BYPASS_SECRET|VITE_[A-Z_]*(?:SECRET|TOKEN|KEY)/],
];
const inspect = paths => paths.flatMap(path => {
  const text = readFileSync(path, 'utf8');
  return checks.filter(([, regex]) => regex.test(text)).map(([check]) => ({ file: relative(root, path), check }));
});
const dist = local('dist');
if (!existsSync(dist)) throw new Error('Run npm run build before preparing a deployment.');
const built = files(dist);
const allowed = new Set(['.html', '.js', '.css', '.svg']);
for (const file of built) {
  if (!allowed.has(extname(file))) throw new Error(`Unexpected deployment file: ${relative(dist, file)}`);
  if (/sourceMappingURL\s*=/.test(readFileSync(file, 'utf8'))) throw new Error('Source maps must not be deployed.');
  if (readFileSync(file, 'utf8').includes('__tracklab')) throw new Error('Development diagnostic API is present in the build.');
}
const source = [...files(local('src')), ...files(local('public')), local('index.html')];
const findings = [...inspect(source), ...inspect(built)];
mkdirSync(tmp, { recursive: true });
if (findings.length) {
  writeFileSync(local(auditFile), JSON.stringify({ status: 'review-required', findings }, null, 2));
  throw new Error(`Deployment audit needs review (${findings.length} findings); values were not printed.`);
}

// Preserve any previous generated artifact instead of deleting files.
if (output !== resolve(root, '.vercel', 'output') || !output.startsWith(root + sep)) throw new Error('Invalid output path.');
if (existsSync(output)) {
  const archive = local(`tmp/vercel-output-${Date.now()}`);
  if (!archive.startsWith(tmp + sep)) throw new Error('Invalid archive path.');
  const previous = files(output); // Reject links before copying or pruning.
  cpSync(output, archive, { recursive: true, force: false, errorOnExist: true });
  const expected = new Set(['config.json', 'static/THIRD_PARTY_NOTICES.txt', 'static/robots.txt',
    ...built.map(file => `static/${relative(dist, file).replaceAll('\\', '/')}`)]);
  for (const file of previous) {
    if (!file.startsWith(output + sep)) throw new Error('Invalid previous asset path.');
    // Only stale generated files are pruned, after their complete backup.
    if (!expected.has(relative(output, file).replaceAll('\\', '/'))) unlinkSync(file);
  }
}
const staticDir = resolve(output, 'static');
mkdirSync(staticDir, { recursive: true });
for (const file of built) {
  const target = resolve(staticDir, relative(dist, file));
  if (!target.startsWith(staticDir + sep)) throw new Error('Invalid asset path.');
  mkdirSync(dirname(target), { recursive: true }); copyFileSync(file, target);
}
const threeLicense = readFileSync(local('node_modules/three/LICENSE'), 'utf8');
const viteLicense = readFileSync(local('node_modules/vite/LICENSE.md'), 'utf8').split('# Licenses of bundled dependencies')[0];
writeFileSync(resolve(staticDir, 'THIRD_PARTY_NOTICES.txt'),
  `Third-party notices (these do not license the application or its source materials).\n\nthree.js and OrbitControls\n${threeLicense}\n\nVite module-preload runtime\n${viteLicense}`);
writeFileSync(resolve(staticDir, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
writeFileSync(resolve(output, 'config.json'), JSON.stringify({ version: 3, routes: [
  { src: '/(.*)', headers: { 'X-Robots-Tag': 'noindex, nofollow, noarchive', 'X-Content-Type-Options': 'nosniff' }, continue: true },
  { handle: 'filesystem' },
] }, null, 2));

const staged = files(output);
const stagedFindings = inspect(staged);
if (stagedFindings.length) throw new Error('Generated deployment files need a separate content review.');
const manifest = staged.map(file => ({ path: relative(output, file).replaceAll('\\', '/'),
  bytes: readFileSync(file).length, sha256: createHash('sha256').update(readFileSync(file)).digest('hex') }));
const report = { status: 'prepared-not-uploaded', environment,
  sourceFilesChecked: source.length, builtFilesChecked: built.length, findings: [],
  manualReview: 'Only procedural basic geometry, a generic SVG icon, and local UI code. Hosting authorization is recorded separately in the deployment report.',
  excluded: ['source files', 'PDF/PPTX', 'original Processing', 'reports', 'tests/traces/screenshots', 'node_modules', '.env*', 'CLI credentials', 'local paths', 'source maps'],
  sourceAuditsCannotEstablishCopyrightPermission: true, manifest,
  totalBytes: manifest.reduce((sum, file) => sum + file.bytes, 0) };
writeFileSync(local(auditFile), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ status: report.status, files: manifest.map(f => ({ path: f.path, bytes: f.bytes })), totalBytes: report.totalBytes }, null, 2));
