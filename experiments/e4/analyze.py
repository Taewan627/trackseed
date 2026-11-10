"""E4 analysis (PROTOCOL.md): baselines B1, B2 vs TrackLab sets under the same validator and metrics.
Reads e4/results/baselines.csv.gz and e2/results/validity.csv.gz; writes results/SUMMARY.json and results/tables.md."""
import json, os, sys
import numpy as np, pandas as pd
from scipy.stats import rankdata
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, '..'))
from _common import *

R = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'results')
b = load_e4_baselines(); e2 = load_e2()
def prep(d):
    d = d.copy(); d['ok'] = d['ok'].astype(float)
    d['ok_nc'] = d.codes.apply(lambda s: 0 if error_codes_noclosure(s) else 1).where(d.generated == 1)  # exploratory: ok ignoring CLOSURE_TANGENT
    return d
SETS = {}
for g in ('B1', 'B2'): SETS[g] = prep(b[(b.generator == g) & (b.spacing == 8)])
tl = e2
SETS['TL-Auto'] = prep(tl[tl['mode'] == 'auto']); SETS['TL-Auto0'] = prep(tl[(tl['mode'] == 'auto') & (tl.straight == 0)])
for m in ('right-angle', 'hairpin', 's-curve'): SETS['TL-' + m] = prep(tl[tl['mode'] == m])
NAMES = list(SETS)
assert len(SETS['B1']) == 4050 and len(SETS['TL-Auto0']) == 4050 and len(SETS['TL-Auto']) == 12150
S = {'sets': {k: len(v) for k, v in SETS.items()}}; T = []

T.append('## 1. Validity (Wilson 95% CI); ok = validator ok (error-severity codes only)\n')
T.append('| set | cases | generation failures | ok among generated | end-to-end ok / cases | EXPLORATORY: ok ignoring CLOSURE_TANGENT |'); T.append('|---|---|---|---|---|---|')
S['validity'] = {}
for k in NAMES:
    d = SETS[k]; g = d[d.generated == 1]; nf = int((d.generated == 0).sum()); ok = int(g.ok.sum()); nc = int(g.ok_nc.sum())
    S['validity'][k] = dict(cases=len(d), failures=nf, generated=len(g), ok=ok, okRate=wilson(ok, len(g)), endToEnd=wilson(ok, len(d)), okIgnoringClosure=wilson(nc, len(g)))
    T.append(f'| {k} | {len(d)} | {nf} | {ok} ({pct(wilson(ok, len(g)))}) | {pct(wilson(ok, len(d)))} | {pct(wilson(nc, len(g)))} |')

T.append('\n## 2. Violation-code incidence (% of generated tracks with >= 1 violation of the code)\n')
codes = sorted({c for k in NAMES for s in SETS[k].codes for c in s.split(';') if c})
T.append('| code | ' + ' | '.join(NAMES) + ' |'); T.append('|---|' + '---|' * len(NAMES)); S['codeIncidence'] = {}
for c in codes:
    row = []
    for k in NAMES:
        g = SETS[k][SETS[k].generated == 1]; v = float(g.codes.apply(lambda s: c in s.split(';')).mean()); S['codeIncidence'].setdefault(c, {})[k] = v; row.append(f'{100 * v:.1f}%')
    T.append(f'| {c} | ' + ' | '.join(row) + ' |')

def iqr(a): p = np.percentile(a, [25, 50, 75]); return p[1], p[2] - p[0]
for title, key, filt in [('3. Per-metric median (IQR), PRIMARY: all generated tracks', 'metricsAll', lambda d: d[d.generated == 1]),
                         ('4. Per-metric median (IQR), SECONDARY: valid tracks only', 'metricsValid', lambda d: d[(d.generated == 1) & (d.ok == 1)])]:
    T.append(f'\n## {title}\n'); T.append('| metric | ' + ' | '.join(NAMES) + ' |'); T.append('|---|' + '---|' * len(NAMES)); S[key] = {}
    for mt in METRICS:
        row = []
        for k in NAMES:
            a = filt(SETS[k])[mt].values; med, r = iqr(a); S[key].setdefault(mt, {})[k] = dict(n=int(len(a)), median=float(med), iqr=float(r)); row.append(f'{med:.4g} ({r:.3g})')
        T.append(f'| {mt} | ' + ' | '.join(row) + ' |')

def cliff(x, y):
    n1, n2 = len(x), len(y); r = rankdata(np.concatenate([x, y])); u = r[:n1].sum() - n1 * (n1 + 1) / 2
    return float(2 * u / (n1 * n2) - 1)
def label(dv): a = abs(dv); return 'negligible' if a < 0.147 else 'small' if a < 0.33 else 'medium' if a < 0.474 else 'large'
T.append('\n## 5. Cliff\'s delta of each baseline vs TrackLab (positive: baseline values tend to be larger), generated tracks\n')
T.append('| metric | B1 vs TL-Auto0 | B2 vs TL-Auto0 | B1 vs TL-Auto | B2 vs TL-Auto |'); T.append('|---|---|---|---|---|'); S['cliff'] = {}
for mt in METRICS:
    row = []
    for ref in ('TL-Auto0', 'TL-Auto'):
        for g in ('B1', 'B2'):
            dv = cliff(SETS[g][SETS[g].generated == 1][mt].values, SETS[ref][SETS[ref].generated == 1][mt].values)
            S['cliff'].setdefault(mt, {})[f'{g} vs {ref}'] = dict(delta=dv, label=label(dv))
    T.append(f'| {mt} | ' + ' | '.join(f'{S["cliff"][mt][f"{g} vs {ref}"]["delta"]:+.2f} ({S["cliff"][mt][f"{g} vs {ref}"]["label"]})' for ref in ('TL-Auto0', 'TL-Auto') for g in ('B1', 'B2')) + ' |')

T.append('\n## 6. Expressive range: occupied bins of the 30 x 30 grid (bin range pooled over ALL seven sets, generated tracks) and 2D histogram entropy (bits)\n')
T.append('| pair (x, y) | ' + ' | '.join(NAMES) + ' |'); T.append('|---|' + '---|' * len(NAMES)); S['expressive'] = {}
gens = {k: SETS[k][SETS[k].generated == 1] for k in NAMES}
for xm, ym in PAIRS:
    xe, ye = pair_edges(list(gens.values()), xm, ym); row = []
    for k in NAMES:
        h = hist2d(gens[k][xm].values, gens[k][ym].values, xe, ye); occ = int((h > 0).sum()); e = hist_entropy_bits(h)
        S['expressive'].setdefault(f'{xm}|{ym}', {})[k] = dict(occupied=occ, entropyBits=e); row.append(f'{occ} ({e:.2f} b)')
    T.append(f'| ({xm}, {ym}) | ' + ' | '.join(row) + ' |')

T.append('\n## 7. Scale and sampling matching check (reported, not adjusted): medians over generated tracks\n')
T.append('| set | median length | median boundingBoxArea | median spacing = length / sampleCount | median sampleCount |'); T.append('|---|---|---|---|---|'); S['matching'] = {}
for k in NAMES:
    g = gens[k]; sp = (g.length / g.sampleCount)
    S['matching'][k] = dict(length=float(g.length.median()), bbox=float(g.boundingBoxArea.median()), spacing=float(sp.median()), samples=float(g.sampleCount.median()))
    m = S['matching'][k]; T.append(f'| {k} | {m["length"]:.0f} | {m["bbox"]:.0f} | {m["spacing"]:.2f} | {m["samples"]:.0f} |')

T.append('\n## 8. Sampling-spacing sensitivity of the baselines (target spacing 4 / 8 / 12 units; all 4050 cases each)\n')
T.append('| generator | spacing | ok rate [CI] | ok ignoring CLOSURE_TANGENT | median straightLengthFraction | median curvatureEntropyBits | median p95AbsCurvature |'); T.append('|---|---|---|---|---|---|---|'); S['sensitivity'] = {}
for g in ('B1', 'B2'):
    for sp in (4, 8, 12):
        d = prep(b[(b.generator == g) & (b.spacing == sp)]); d = d[d.generated == 1]
        S['sensitivity'][f'{g}@{sp}'] = dict(okRate=wilson(int(d.ok.sum()), len(d)), okIgnoringClosure=wilson(int(d.ok_nc.sum()), len(d)), straightFraction=float(d.straightLengthFraction.median()),
                                            entropy=float(d.curvatureEntropyBits.median()), p95=float(d.p95AbsCurvature.median()))
        s = S['sensitivity'][f'{g}@{sp}']
        T.append(f'| {g} | {sp} | {pct(s["okRate"])} | {pct(s["okIgnoringClosure"])} | {s["straightFraction"]:.4f} | {s["entropy"]:.4f} | {s["p95"]:.5f} |')

json.dump(S, open(os.path.join(R, 'SUMMARY.json'), 'w'), indent=1, sort_keys=True); open(os.path.join(R, 'SUMMARY.json'), 'a').write('\n')
open(os.path.join(R, 'tables.md'), 'w').write('\n'.join(T) + '\n')
