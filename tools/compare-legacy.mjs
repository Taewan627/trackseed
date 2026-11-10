// Usage: node tools/compare-legacy.mjs [baselineRef=master]
// Builds the baseline commit (Math.* generator) in a temporary git worktree, builds the current
// working tree (detmath generator), and reports max |delta| between the two geometries for
// the 5 legacy parameter cases and the golden pattern-mode cases.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildCore, repo } from './build-core.mjs';

const ref = process.argv[2] ?? 'master';
const tmp = mkdtempSync(join(tmpdir(), 'tl-compare-'));
const worktree = join(tmp, 'baseline');
const git = (...a) => execFileSync('git', a, { cwd: repo, encoding: 'utf8' }).trim();
let oldBuild, newBuild;
try {
  git('worktree', 'add', '--detach', worktree, ref);
  console.log(`baseline ref ${ref} = ${git('rev-parse', '--short', ref)} (${git('log', '-1', '--format=%s', ref)})`);
  oldBuild = await buildCore(worktree, join(tmp, 'old'));
  newBuild = await buildCore(repo, join(tmp, 'new'));
} finally {
  try { git('worktree', 'remove', '--force', worktree); } catch { /* already gone */ }
}

const legacy = JSON.parse(readFileSync(join(repo, 'tests/fixtures/legacy-layouts.json'), 'utf8'));
const golden = JSON.parse(readFileSync(join(repo, 'tests/fixtures/golden-v05.json'), 'utf8'));
const cases = [
  ...legacy.cases.map((c, i) => ({ name: `legacy-${i + 1}`, params: c.params })),
  ...golden.patternCases.map(c => ({ name: c.name, params: c.params })),
];

const maxDelta = (a, b, keys) => {
  let m = 0;
  if (a.length !== b.length) return NaN;
  a.forEach((p, i) => keys.forEach(k => { m = Math.max(m, Math.abs(p[k] - b[i][k])); }));
  return m;
};
const fmt = v => Number.isNaN(v) ? 'LENGTH-MISMATCH' : v.toExponential(3);
console.log('case'.padEnd(22), ['points(xyz)', 'normals', 'roadEdges', 'waypoints', 'obstacles', 'props', 'length', 'bounds'].map(s => s.padStart(15)).join(''), ' structure');
let overall = 0;
for (const { name, params } of cases) {
  const o = oldBuild.core.generateTrack(params), n = newBuild.core.generateTrack(params);
  const row = {
    points: maxDelta(o.points, n.points, ['x', 'y', 'z']),
    normals: maxDelta(o.normals, n.normals, ['x', 'z']),
    roadEdges: Math.max(maxDelta(o.roadEdges[0], n.roadEdges[0], ['x', 'y', 'z']), maxDelta(o.roadEdges[1], n.roadEdges[1], ['x', 'y', 'z'])),
    waypoints: maxDelta(o.waypoints, n.waypoints, ['x', 'y', 'z']),
    obstacles: maxDelta(o.obstacles, n.obstacles, ['x', 'y', 'z', 'radius', 'heading']),
    props: maxDelta(o.props, n.props, ['x', 'y', 'z', 'scale', 'heading']),
    length: Math.abs(o.length - n.length),
    bounds: Math.max(...Object.keys(o.bounds).map(k => Math.abs(o.bounds[k] - n.bounds[k]))),
  };
  const same = JSON.stringify(o.straightSegments) === JSON.stringify(n.straightSegments)
    && o.points.length === n.points.length && o.props.map(p => p.kind).join() === n.props.map(p => p.kind).join()
    && o.patternReport.inserted === n.patternReport.inserted && o.patternReport.attempts === n.patternReport.attempts;
  overall = Math.max(overall, row.points);
  console.log(name.padEnd(22), Object.values(row).map(v => fmt(v).padStart(15)).join(''), same ? ' identical' : ' DIFFERS');
}
console.log(`max |delta| over all point coordinates, all cases: ${fmt(overall)}`);
rmSync(tmp, { recursive: true, force: true });
