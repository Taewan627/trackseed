// E9 POST-HOC DIAGNOSTIC. EXPLORATORY. Not part of the pre-registered E9 predictions (PROTOCOL.md) and it changes no E9 result:
// results/ is only read (cross-check below). See README.md in this directory.
//
// Reruns the validator exactly as run.mjs does (library defaults; arms: raw = as emitted, smooth = resampleSmooth at 0.25 x width;
// main width) on three groups of tracks and lists EVERY LOCAL_KINK / CLOSURE_TANGENT vertex with its geometry:
//   (a) every real-tumftm circuit that fails in the raw or the smooth arm (both arms are listed for each such circuit);
//   (b) the 2 supplementary real-bacinger-f1 circuits with the most LOCAL_KINK vertices in the raw arm (ties: id order; both arms listed);
//   (c) the first 6 gen-carracing and the first 6 gen-zzangupenn tracks, in numeric seed order, that fail with LOCAL_KINK in the smooth arm.
// Usage: node flagged.mjs   (needs build/polylines from extract.sh and cli-dist from `npm run build:cli`)
// Writes: out/flagged.csv (one row per flagged vertex), out/flagged.json (per track-arm summary and consistency checks),
//         ../build/diagnostics/*.json (plot inputs for plot.py; build output, gitignored).
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const e9 = resolve(here, '..');
const root = resolve(e9, '..', '..');
const lib = f => import(pathToFileURL(join(root, 'cli-dist', f)).href);
const { trackFromPolyline, parsePolylineJson } = await lib('polyline.js');
const { validateTrack, DEFAULT_VALIDATE_OPTIONS, kinkProfile, kinkFlags } = await lib('validate.js');

const polyRoot = join(e9, 'build', 'polylines');
const outDir = join(here, 'out');
const plotDir = join(e9, 'build', 'diagnostics');
mkdirSync(outDir, { recursive: true });
mkdirSync(plotDir, { recursive: true });
for (const f of readdirSync(plotDir)) if (f.endsWith('.json')) rmSync(join(plotDir, f)); // no stale plot inputs

const SMOOTH_FACTOR = 0.25; // run.mjs
const CAP = 4;              // panels per track-arm, largest turn first
const RAD = 180 / Math.PI;

// ---- committed E9 results, read only: every track evaluated here must reproduce its row in results/tracks.csv.gz ----
const committed = new Map();
{
  const lines = gunzipSync(readFileSync(join(e9, 'results', 'tracks.csv.gz'))).toString('utf8').trim().split('\n');
  const hdr = lines[0].split(',');
  for (const l of lines.slice(1)) {
    const f = l.split(','), r = Object.fromEntries(hdr.map((h, i) => [h, f[i] ?? '']));
    if (r.run === 'main' && (r.arm === 'raw' || r.arm === 'smooth')) committed.set(`${r.source}|${r.id}|${r.arm}`, r);
  }
}
const mismatches = [];
let crossChecked = 0;

const idsOf = source => readdirSync(join(polyRoot, source)).filter(f => f.endsWith('.json')).map(f => f.slice(0, -5));
const median = xs => { const s = [...xs].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const dist = (a, b) => Math.hypot(b.x - a.x, b.z - a.z);
const r4 = x => (Number.isFinite(x) ? Math.round(x * 1e4) / 1e4 : '');

function loadDoc(source, id) {
  const doc = JSON.parse(readFileSync(join(polyRoot, source, id + '.json'), 'utf8'));
  return { doc, raw: parsePolylineJson(JSON.stringify(doc)) };
}

// the E9 evaluation of run.mjs (main width; W = doc.width; smooth spacing = 0.25 W)
function evaluate(source, id, doc, raw, arm) {
  const W = doc.width, s = SMOOTH_FACTOR * W;
  const options = arm === 'raw' ? {} : { resampleSmooth: { spacing: s } };
  const track = trackFromPolyline({ points: raw, width: W, closed: true }, options);
  const v = validateTrack(track);
  const errors = [...new Set(v.violations.filter(x => x.severity === 'error').map(x => x.code))].sort().join(';');
  const outcome = v.ok ? 'ok' : 'fail';
  const c = committed.get(`${source}|${id}|${arm}`);
  crossChecked++;
  if (!c || c.outcome !== outcome || c.errors !== errors || Number(c.width) !== W) mismatches.push({ source, id, arm, outcome, errors, committed: c ? [c.outcome, c.errors] : null });
  return { track, v, W, s, outcome, errors, lkCheck: v.checks.find(c => c.id === 'local-kink'), closeCheck: v.checks.find(c => c.id === 'closure') };
}

// ---- per-vertex analysis of one validated track (vertex indices as in the validator: closed loop of n vertices, 0 = seam) ----
function analyse(source, id, arm, doc, raw, ev) {
  const { track, W, s } = ev, pts = track.points, n = pts.length - 1, edges = track.roadEdges;
  const prof = kinkProfile(pts, W);          // the library's own profile (theta = |turn| in degrees)
  const flags = kinkFlags(prof, DEFAULT_VALIDATE_OPTIONS);
  // signed turn at each vertex, computed here (same atan2 form as kinkProfile; checked against |theta| below)
  const sturn = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const a = pts[(i - 1 + n) % n], b = pts[i], c = pts[(i + 1) % n];
    const ax = b.x - a.x, az = b.z - a.z, bx = c.x - b.x, bz = c.z - b.z;
    sturn[i] = Math.atan2(ax * bz - az * bx, ax * bx + az * bz) * RAD;
  }
  let maxThetaDiff = 0;
  for (let i = 0; i < n; i++) maxThetaDiff = Math.max(maxThetaDiff, Math.abs(Math.abs(sturn[i]) - prof.theta[i]));
  const seg = []; for (let i = 0; i < n; i++) seg.push(dist(pts[i], pts[i + 1]));
  const medSeg = median(seg);
  const cum = [0]; for (let i = 0; i < n; i++) cum.push(cum[i] + seg[i]);
  // the rule's reference, recomputed here: max |turn| over i+-2 and i+-3 (distinct, excluding i, i+-1); threshold = max(floor, ratio x reference)
  const refOf = i => {
    let best = 0, arg = -1; const seen = new Set([i, (i + 1) % n, (i - 1 + n) % n]);
    for (const k of [2, 3]) for (const j of [(i + k) % n, ((i - k) % n + n) % n]) {
      if (seen.has(j)) continue; seen.add(j);
      if (prof.theta[j] > best) { best = prof.theta[j]; arg = j; }
    }
    return { ref: best, refIdx: arg };
  };
  let ruleMismatch = 0;
  const flagged = [];
  for (let i = 0; i < n; i++) {
    const { ref, refIdx } = refOf(i);
    const thr = Math.max(DEFAULT_VALIDATE_OPTIONS.kinkFloorDegrees, DEFAULT_VALIDATE_OPTIONS.kinkRatio * ref);
    const mine = prof.theta[i] > thr;
    if (mine !== (flags[i] === 1)) ruleMismatch++;
    if (flags[i] !== 1) continue;
    const pv = pts[(i - 1 + n) % n], p = pts[i], nx = pts[(i + 1) % n];
    const dPrev = seg[(i - 1 + n) % n], dNext = seg[i], sMean = (dPrev + dNext) / 2;
    const chord = dist(pv, nx);
    const dev = chord > 0 ? Math.abs((nx.x - pv.x) * (p.z - pv.z) - (nx.z - pv.z) * (p.x - pv.x)) / chord : 0;
    const theta = prof.theta[i], th = theta / RAD;
    const Rimpl = th > 0 ? sMean / (2 * Math.sin(th / 2)) : Infinity;
    const net3 = sturn[(i - 1 + n) % n] + sturn[i] + sturn[(i + 1) % n];
    const t = [-2, -1, 0, 1, 2].map(k => sturn[(i + k + n * 4) % n]);
    // turn run: contiguous vertices around i with the same sign as the peak and |turn| >= 25 % of the peak (at most 4 each side)
    const sg = Math.sign(sturn[i]);
    let left = 0, right = 0;
    while (left < 4 && Math.sign(sturn[(i - left - 1 + n * 8) % n]) === sg && Math.abs(sturn[(i - left - 1 + n * 8) % n]) >= 0.25 * theta) left++;
    while (right < 4 && Math.sign(sturn[(i + right + 1) % n]) === sg && Math.abs(sturn[(i + right + 1) % n]) >= 0.25 * theta) right++;
    let runTotal = 0; for (let k = -left; k <= right; k++) runTotal += sturn[(i + k + n * 8) % n];
    let runLength = 0; for (let j = i - left - 1; j <= i + right; j++) runLength += seg[(j + n * 8) % n];
    const runRadius = Math.abs(runTotal) > 0 ? runLength / (Math.abs(runTotal) / RAD) : Infinity;
    flagged.push({
      runVertices: left + right + 1, runTotalDeg: runTotal, runArcLength: runLength, runRadius,
      spacingOverRunRadius: sMean / runRadius, runRadiusOverHalfWidth: runRadius / (W / 2),
      concentration: Math.abs(sturn[i]) / (Math.abs(runTotal) / (left + right + 1)),
      index: i, code: i === 0 ? 'CLOSURE_TANGENT' : 'LOCAL_KINK',
      turn: theta, signedTurn: sturn[i], ref, refIdx, threshold: thr, margin: theta - thr,
      prevIndex: (i - 1 + n) % n, nextIndex: (i + 1) % n, distPrev: dPrev, distNext: dNext, meanSpacing: sMean,
      turnPrev: sturn[(i - 1 + n) % n], turnNext: sturn[(i + 1) % n], net3, devFromChord: dev,
      impliedRadius: Rimpl, impliedRadiusOverHalfWidth: Rimpl / (W / 2),
      localWidth: W, edgeOffsetLeft: dist(edges[0][i], p), edgeOffsetRight: dist(edges[1][i], p),
      cumDistance: cum[i], trackLength: track.length, medianSpacing: medSeg,
      turns5: t.map(r4).join(';'),
    });
  }
  // classification (first pass, rule-based; see README for the definitions and what is uncertain)
  // Categories (first pass, geometry only; definitions in README.md). The rule's reference excludes i+-1, so a turn spread over
  // several consecutive vertices is flagged at its peak: the run (runVertices) makes that visible.
  // concentration = |peak turn| / mean turn of the run; s/R_run = mean spacing / run radius (the validator's guideline is s <= 0.2 R_min,
  // which keeps a circular arc under the 12 degree floor, cli.ts). Borderline values are tagged 'uncertain'.
  for (const f of flagged) {
    const t = Math.abs(f.signedTurn), net = Math.abs(f.net3), sg = Math.sign(f.signedTurn), s1 = Math.sign(f.turnPrev), s2 = Math.sign(f.turnNext);
    const minSeg = Math.min(f.distPrev, f.distNext);
    const borderline = [];
    if (minSeg < 0.25 * f.medianSpacing) { f.category = 'short segment next to the peak'; borderline.push('short segment'); }
    else if (net <= 0.25 * t && s1 === -sg && s2 === -sg) {
      // out and back: the heading returns after the vertex
      f.category = 'single-vertex displacement (out and back)';
      if (f.devFromChord < 0.25 * f.meanSpacing) borderline.push('small displacement');
    }
    else if (net <= 0.25 * t && (s1 === -sg || s2 === -sg)) { f.category = 'alternating turns (spike or S-bend)'; borderline.push('spike vs S-bend'); }
    else if (f.concentration > 1.3) {
      f.category = 'concentrated turn (peak above run mean)';
      if (f.concentration < 1.4) borderline.push('concentration 1.3-1.4');
    }
    else {
      f.category = f.spacingOverRunRadius <= 0.2 ? 'even run, s/R <= 0.2 (guideline met for the run radius)' : 'even run, s/R > 0.2 (guideline not met for the run radius)';
      if (Math.abs(f.spacingOverRunRadius - 0.2) < 0.02) borderline.push('s/R near 0.2');
    }
    if (f.concentration <= 1.3 && f.concentration > 1.2) borderline.push('concentration 1.2-1.3');
    f.certain = borderline.length === 0;
    if (!f.certain) f.category += ' [uncertain: ' + borderline.join(', ') + ']';
  }
  const counts = { LOCAL_KINK: flags.reduce((a, b, i) => a + (i > 0 && b ? 1 : 0), 0), CLOSURE_TANGENT: flags[0] ? 1 : 0 };
  const lib = ev.lkCheck ? ev.lkCheck.failures : null;
  const consistency = {
    thetaMatchesSignedTurn: maxThetaDiff < 1e-6,
    ruleRecomputedMatches: ruleMismatch === 0,
    localKinkCountMatchesValidatorCheck: lib === counts.LOCAL_KINK,
    closureFlagMatchesValidator: ev.v.violations.some(x => x.code === 'CLOSURE_TANGENT') === (flags[0] === 1),
    edgeOffsetsEqualHalfWidth: flagged.every(f => Math.abs(f.edgeOffsetLeft - W / 2) < 1e-3 && Math.abs(f.edgeOffsetRight - W / 2) < 1e-3),
    // the same points with width parameters 2 and 30 give the same flags (the default outlier rule uses no width; kinkProfile's width enters only other rules)
    flagsIndependentOfWidth: [2, 30].every(w => kinkFlags(kinkProfile(pts, w), DEFAULT_VALIDATE_OPTIONS).every((b, i) => b === flags[i])),
  };
  return { flagged, counts, consistency, n, W, s, medSeg, pts, edges, raw, trackLength: track.length };
}

// ---- selection ----
const groups = [];
{ // (a) TUMFTM: fail in raw or smooth (main width)
  const ids = idsOf('real-tumftm').sort();
  for (const id of ids) {
    const { doc, raw } = loadDoc('real-tumftm', id);
    const r = evaluate('real-tumftm', id, doc, raw, 'raw'), sm = evaluate('real-tumftm', id, doc, raw, 'smooth');
    if (r.outcome === 'fail' || sm.outcome === 'fail') groups.push({ group: 'a', source: 'real-tumftm', id, arms: ['raw', 'smooth'] });
  }
}
{ // (b) bacinger: most LOCAL_KINK vertices in the raw arm (ties: id order)
  const ids = idsOf('real-bacinger-f1').sort();
  const rows = [];
  for (const id of ids) {
    const { doc, raw } = loadDoc('real-bacinger-f1', id);
    const ev = evaluate('real-bacinger-f1', id, doc, raw, 'raw');
    const cnt = analyse('real-bacinger-f1', id, 'raw', doc, raw, ev).counts.LOCAL_KINK;
    rows.push({ id, cnt });
  }
  rows.sort((a, b) => b.cnt - a.cnt || (a.id < b.id ? -1 : 1));
  for (const r of rows.slice(0, 2)) groups.push({ group: 'b', source: 'real-bacinger-f1', id: r.id, arms: ['raw', 'smooth'], rawLocalKinkCount: r.cnt });
  groups.bacingerRanking = rows.map(r => `${r.id}:${r.cnt}`).join(' ');
}
// seed order = the order of manifest.tsv, which is the registered E5 seed-list order (checked: build/seeds.json and manifest ids agree)
const manifestOrder = source => readFileSync(join(polyRoot, source, 'manifest.tsv'), 'utf8').trim().split('\n').slice(1).map(l => l.split('\t')[0]);
for (const source of ['gen-carracing', 'gen-zzangupenn']) { // (c) first 6 in seed order that fail with LOCAL_KINK in the smooth arm
  let k = 0;
  for (const id of manifestOrder(source)) {
    if (k >= 6) break;
    const { doc, raw } = loadDoc(source, id);
    const ev = evaluate(source, id, doc, raw, 'smooth');
    if (ev.v.violations.some(x => x.code === 'LOCAL_KINK' && x.severity === 'error')) { groups.push({ group: 'c', source, id, arms: ['smooth'] }); k++; }
  }
}

// ---- run the selected track-arms ----
const allFlagged = [], summaries = [], plotIndex = [];
for (const g of groups.filter(x => x.group)) {
  const { doc, raw } = loadDoc(g.source, g.id);
  for (const arm of g.arms) {
    const ev = evaluate(g.source, g.id, doc, raw, arm);
    const A = analyse(g.source, g.id, arm, doc, raw, ev);
    const key = `${g.source}__${g.id}__${arm}`;
    const panels = [...A.flagged].sort((a, b) => b.turn - a.turn || a.index - b.index).slice(0, CAP).map(f => f.index);
    summaries.push({
      key, group: g.group, source: g.source, id: g.id, arm, width: A.W, spacing: arm === 'raw' ? null : A.s,
      outcome: ev.outcome, errors: ev.errors, vertices: A.n, trackLength: A.trackLength, medianSpacing: A.medSeg,
      LOCAL_KINK: A.counts.LOCAL_KINK, CLOSURE_TANGENT: A.counts.CLOSURE_TANGENT, consistency: A.consistency,
      categories: A.flagged.reduce((m, f) => (m[f.category] = (m[f.category] ?? 0) + 1, m), {}),
      panelIndices: panels,
    });
    for (const f of A.flagged) allFlagged.push({ key, group: g.group, source: g.source, id: g.id, arm, width: A.W, spacing: arm === 'raw' ? '' : A.s, ...f,
      panel: panels.includes(f.index) ? 1 : 0 });
    if (A.flagged.length) {
      const pd = {
        key, source: g.source, id: g.id, arm, W: A.W, spacing: arm === 'raw' ? null : A.s, units: g.source.startsWith('real-bacinger') || g.source.startsWith('real-tumftm') ? 'm' : 'u',
        trackLength: A.trackLength, n: A.n,
        pts: A.pts.slice(0, A.n).map(p => [p.x, p.z]), edgeL: A.edges[0].slice(0, A.n).map(p => [p.x, p.z]), edgeR: A.edges[1].slice(0, A.n).map(p => [p.x, p.z]),
        raw: raw.map(p => [p.x, p.z]),
        flagged: A.flagged.map(f => ({ index: f.index, code: f.code, turn: f.turn, threshold: f.threshold, ref: f.ref, category: f.category })),
        panels,
      };
      writeFileSync(join(plotDir, key + '.json'), JSON.stringify(pd));
      plotIndex.push(key);
    }
  }
}

// ---- outputs ----
const cols = ['group', 'source', 'id', 'arm', 'width', 'spacing', 'index', 'code', 'turn_deg', 'signed_turn_deg', 'ref_deg', 'ref_index', 'threshold_deg',
  'margin_deg', 'prev_index', 'next_index', 'dist_prev', 'dist_next', 'mean_spacing', 'turn_prev_deg', 'turn_next_deg', 'net3_deg',
  'dev_from_chord', 'implied_radius', 'implied_radius_over_half_width', 'local_width', 'edge_offset_left', 'edge_offset_right',
  'cum_distance', 'track_length', 'median_spacing', 'turns_i-2..i+2_deg', 'run_vertices', 'run_total_deg', 'run_arc_length',
  'run_radius', 'run_radius_over_half_width', 'spacing_over_run_radius', 'concentration', 'category', 'certain', 'panel'];
const csv = [cols.join(',')];
for (const f of allFlagged) {
  const row = [f.group, f.source, f.id, f.arm, r4(f.width), f.spacing === '' ? '' : r4(f.spacing), f.index, f.code, r4(f.turn), r4(f.signedTurn),
    r4(f.ref), f.refIdx, r4(f.threshold), r4(f.margin), f.prevIndex, f.nextIndex, r4(f.distPrev), r4(f.distNext), r4(f.meanSpacing),
    r4(f.turnPrev), r4(f.turnNext), r4(f.net3), r4(f.devFromChord), r4(f.impliedRadius), r4(f.impliedRadiusOverHalfWidth), r4(f.localWidth),
    r4(f.edgeOffsetLeft), r4(f.edgeOffsetRight), r4(f.cumDistance), r4(f.trackLength), r4(f.medianSpacing), f.turns5,
    f.runVertices, r4(f.runTotalDeg), r4(f.runArcLength), r4(f.runRadius), r4(f.runRadiusOverHalfWidth), r4(f.spacingOverRunRadius), r4(f.concentration), f.category, f.certain ? 1 : 0, f.panel];
  csv.push(row.map(v => (typeof v === 'string' && v.includes(',') ? `"${v}"` : v)).join(','));
}
writeFileSync(join(outDir, 'flagged.csv'), csv.join('\n') + '\n');
// markdown table and category counts for README.md (generated; not hand-edited)
{
  const unitOf = src => (src.startsWith('real-') ? 'm' : 'u');
  const shortCat = c => c.replace(/ \[uncertain: .*\]$/, '');
  const describe = f => {
    const u = unitOf(f.source);
    if (f.category.startsWith('spike') || f.category.startsWith('single-vertex')) return `single vertex ${f.devFromChord.toFixed(2)} ${u} off the line of its neighbours; heading returns`;
    return `turn run of ${f.runVertices} vertices, total ${f.runTotalDeg.toFixed(0)} deg over ${f.runArcLength.toFixed(0)} ${u}; run radius ${f.runRadius.toFixed(1)} ${u} (${f.runRadiusOverHalfWidth.toFixed(2)} x half width); peak = ${f.concentration.toFixed(2)} x run mean; s/R ${f.spacingOverRunRadius.toFixed(2)}`;
  };
  const md = ['| track | arm | vertex | code | turn (deg) | reference (deg) | limit (deg) | prev / next (' + 'm or u' + ') | cum. dist (m or u) | category | what is visible |',
    '|---|---|---|---|---|---|---|---|---|---|---|'];
  for (const f of allFlagged) md.push(`| ${f.source} ${f.id} | ${f.arm} | ${f.index} | ${f.code} | ${f.turn.toFixed(1)} | ${f.ref.toFixed(1)} | ${f.threshold.toFixed(1)} | ${f.distPrev.toFixed(2)} / ${f.distNext.toFixed(2)} | ${f.cumDistance.toFixed(0)} | ${shortCat(f.category)} | ${describe(f)} |`);
  const cnt = {};
  for (const f of allFlagged) { const k = `${f.source} | ${f.arm}`; cnt[k] ??= {}; const c = shortCat(f.category); cnt[k][c] = (cnt[k][c] ?? 0) + 1; }
  const tot = {}, unc = {};
  for (const f of allFlagged) { const c = shortCat(f.category); tot[c] = (tot[c] ?? 0) + 1; if (!f.certain) unc[c] = (unc[c] ?? 0) + 1; }
  md.push('', '| category | count | of which uncertain |', '|---|---|---|');
  for (const [c, v] of Object.entries(tot).sort((a, b) => b[1] - a[1])) md.push(`| ${c} | ${v} | ${unc[c] ?? 0} |`);
  md.push('', '| source | arm | category | count |', '|---|---|---|---|');
  for (const [k, o] of Object.entries(cnt)) for (const [c, v] of Object.entries(o)) md.push(`| ${k.split(' | ')[0]} | ${k.split(' | ')[1]} | ${c} | ${v} |`);
  writeFileSync(join(outDir, 'tables.md'), md.join('\n') + '\n');
}
const bacRanking = groups.bacingerRanking;
writeFileSync(join(outDir, 'flagged.json'), JSON.stringify({
  note: 'EXPLORATORY post-hoc diagnostic of E9 (not a pre-registered prediction; changes no E9 result). Validator rerun as run.mjs; see README.md.',
  rule: { kinkRule: DEFAULT_VALIDATE_OPTIONS.kinkRule, window: DEFAULT_VALIDATE_OPTIONS.kinkWindow, quantile: DEFAULT_VALIDATE_OPTIONS.kinkQuantile,
    ratio: DEFAULT_VALIDATE_OPTIONS.kinkRatio, floorDegrees: DEFAULT_VALIDATE_OPTIONS.kinkFloorDegrees },
  selection: groups.filter(x => x.group).map(g => ({ group: g.group, source: g.source, id: g.id, arms: g.arms, rawLocalKinkCount: g.rawLocalKinkCount ?? null })),
  bacingerRankingRawLocalKink: bacRanking,
  crossCheckedTrackArms: crossChecked, crossCheckMismatchesAgainstResults: mismatches.length, mismatches,
  tracks: summaries,
}, null, 1) + '\n');
console.log(`flagged.mjs: ${groups.filter(x => x.group).length} selected tracks, ${summaries.length} track-arms, ${allFlagged.length} flagged vertices, ${plotIndex.length} plot inputs`);
console.log(`cross-check against results/tracks.csv.gz (main width, raw and smooth): ${crossChecked} track-arms compared, ${mismatches.length} mismatches`);
if (mismatches.length) { console.error(JSON.stringify(mismatches.slice(0, 5))); process.exitCode = 1; }
