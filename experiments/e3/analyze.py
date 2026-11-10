"""E3 analysis (PROTOCOL.md): expressive-range statistics per corner-pattern mode from the E2 validity CSV.
Writes results/SUMMARY.json and results/tables.md."""
import json, os, sys
import numpy as np, pandas as pd
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from _common import *

R = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'results'); os.makedirs(R, exist_ok=True)
df = load_e2(); gen = df[df.generated == 1].copy(); gen['ok'] = gen['ok'].astype(int)
SIX = ['straightLengthFraction', 'curvatureEntropyBits', 'length', 'totalTurningDegrees', 'maxAbsSlope', 'elevationRange']
S = {'primaryPopulation': 'all generated tracks of the mode', 'bins': BINS}; T = []

def stats(a):
    a = np.asarray(a, float); p = np.percentile(a, [25, 50, 75])
    return dict(n=int(len(a)), mean=float(a.mean()), sd=float(a.std(ddof=1)), median=float(p[1]), iqr=float(p[2] - p[0]), min=float(a.min()), max=float(a.max()))

for label, pop in [('PRIMARY: all generated tracks', gen), ('SECONDARY: valid tracks only (ok = 1)', gen[gen.ok == 1])]:
    key = 'primary' if label.startswith('PRIMARY') else 'validOnly'
    T.append(f'## Per-mode summary statistics, {label}\n'); S[key] = {}
    for mt in SIX:
        T.append(f'\n### {mt}\n'); T.append('| mode | n | mean | sd | median | IQR | min | max |'); T.append('|---|---|---|---|---|---|---|---|')
        for m in MODES:
            s = stats(pop[pop['mode'] == m][mt]); S[key].setdefault(mt, {})[m] = s
            T.append(f'| {m} | {s["n"]} | {s["mean"]:.4g} | {s["sd"]:.4g} | {s["median"]:.4g} | {s["iqr"]:.4g} | {s["min"]:.4g} | {s["max"]:.4g} |')
    T.append('')
    # coverage
    S.setdefault(key + 'Coverage', {})
    T.append(f'### Coverage of the 30 x 30 grid and 2D histogram entropy ({label})\n'); T.append('| pair (x, y) | mode | occupied bins | coverage | histogram entropy (bits) |'); T.append('|---|---|---|---|---|')
    for xm, ym in PAIRS:
        xe, ye = pair_edges([pop[pop['mode'] == m] for m in MODES], xm, ym)  # pooled over the modes of THIS population
        for m in MODES:
            p = pop[pop['mode'] == m]; h = hist2d(p[xm].values, p[ym].values, xe, ye)
            occ = int((h > 0).sum()); e = hist_entropy_bits(h)
            S[key + 'Coverage'].setdefault(f'{xm}|{ym}', {})[m] = dict(occupied=occ, coverage=occ / (BINS * BINS), entropyBits=e)
            T.append(f'| ({xm}, {ym}) | {m} | {occ} | {occ / (BINS * BINS):.3f} | {e:.3f} |')
    T.append('')

# prediction checks (primary population)
T.append('## Checks for the pre-registered predictions\n')
chk = {}
T.append('| mode | share with totalTurningDegrees >= 360 | min totalTurningDegrees | elevationRange/height range (height>0) | max maxAbsSlope at height 0 |'); T.append('|---|---|---|---|---|')
for m in MODES:
    g = gen[gen['mode'] == m]; h = g[g.height > 0]
    r = (h.elevationRange / h.height)
    chk[m] = dict(shareTurningGE360=float((g.totalTurningDegrees >= 360).mean()), minTurning=float(g.totalTurningDegrees.min()),
                  elevRatioMin=float(r.min()), elevRatioMax=float(r.max()), maxSlopeAtHeight0=float(g[g.height == 0].maxAbsSlope.max()))
    c = chk[m]; T.append(f'| {m} | {100*c["shareTurningGE360"]:.2f}% | {c["minTurning"]:.2f} | {c["elevRatioMin"]:.3f} .. {c["elevRatioMax"]:.3f} | {c["maxSlopeAtHeight0"]} |')
S['checks'] = chk
json.dump(S, open(os.path.join(R, 'SUMMARY.json'), 'w'), indent=1, sort_keys=True); open(os.path.join(R, 'SUMMARY.json'), 'a').write('\n')
open(os.path.join(R, 'tables.md'), 'w').write('\n'.join(T) + '\n')
print('\n'.join(T[-30:]))
