// Measured effect of --resample-smooth on a single spike (manuscript Sec. 2.2, "Smoothing"): circle of radius 500, vertex spacing s, road width W = 10, one vertex displaced radially by h.
// A spike counts as detected if the validator v1.3 (defaults) reports LOCAL_KINK, CLOSURE_TANGENT or SHARP_VERTEX. Raw arm = as given; smooth arm = resampleSmooth at 0.25 x W = 2.5.
// A clean circle with the same sampling is run as control. Usage: node smoothing_probe.mjs <software checkout with cli-dist> <out.json>
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const sw = path.resolve(process.argv[2]);
const lib = f => import(pathToFileURL(path.join(sw, 'cli-dist', f)).href);
const { trackFromPolyline } = await lib('polyline.js'); const { validateTrack } = await lib('validate.js');
const R = 500, W = 10, S = 0.25 * W;
const KINK = new Set(['LOCAL_KINK', 'CLOSURE_TANGENT', 'SHARP_VERTEX']);
function verdict(pts, opts) {
  const t = trackFromPolyline({ points: pts, width: W, closed: true }, opts); const v = validateTrack(t);
  return { ok: v.ok, kink: v.violations.some(x => KINK.has(x.code)), codes: [...new Set(v.violations.filter(x => x.severity === 'error').map(x => x.code))].sort() };
}
const rows = [];
for (const s of [5, 20]) {
  const n = Math.round(2 * Math.PI * R / s);
  for (const h of [0, 1, 2, 5, 10, 20]) {
    const pts = Array.from({ length: n }, (_, i) => { const a = 2 * Math.PI * i / n, r = R + (i === Math.floor(n / 4) ? h : 0); return { x: r * Math.cos(a), y: 0, z: r * Math.sin(a) }; });
    const raw = verdict(pts, {}), sm = verdict(pts, { resampleSmooth: { spacing: S } });
    rows.push({ spacing: s, n, h, h_over_W: h / W, raw_detected: raw.kink, smooth_detected: sm.kink, raw_ok: raw.ok, smooth_ok: sm.ok, raw_codes: raw.codes, smooth_codes: sm.codes });
  }
}
writeFileSync(path.resolve(process.argv[3]), JSON.stringify({ note: 'single radial spike on a circle of radius 500, width 10; h = 0 is the clean control', radius: R, width: W, smoothSpacing: S, rows }, null, 1) + '\n');
for (const r of rows) console.log(`s=${r.spacing} n=${r.n} h=${r.h}: raw ${r.raw_detected ? 'detected' : '-'} (${r.raw_codes}) | smooth ${r.smooth_detected ? 'detected' : '-'} (${r.smooth_codes})`);
