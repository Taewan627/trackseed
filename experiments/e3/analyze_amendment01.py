"""AMENDMENT-01 addendum for E3 (../amendment-01/ADDENDUM-E3.md): the SECONDARY (valid-only) tables with `ok`
from the amended validity file (validator 0.5.1). Same statistics, bins and entropy as analyze.py.
Reads ../e2/results/amendment-01/validity.csv.gz (and the original results/SUMMARY.json for the comparison);
writes results/amendment-01/{tables.md,SUMMARY.json}. numpy/pandas only, deterministic."""
import hashlib, json, os, sys
import numpy as np, pandas as pd
MY = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(MY, '..'))
from _common import *

R = os.path.join(MY, 'results', 'amendment-01'); os.makedirs(R, exist_ok=True)
src = os.path.join(MY, '..', 'e2', 'results', 'amendment-01', 'validity.csv.gz')
df = pd.read_csv(src, keep_default_na=False, na_values=[''], low_memory=False)
df['error'] = df['error'].fillna(''); df['codes'] = df['codes'].fillna('')
gen = df[df.generated == 1].copy(); gen['ok'] = gen['ok'].astype(int)
orig = json.load(open(os.path.join(MY, 'results', 'SUMMARY.json')))
SIX = ['straightLengthFraction', 'curvatureEntropyBits', 'length', 'totalTurningDegrees', 'maxAbsSlope', 'elevationRange']

def stats(a):
    a = np.asarray(a, float); p = np.percentile(a, [25, 50, 75])
    return dict(n=int(len(a)), mean=float(a.mean()), sd=float(a.std(ddof=1)), median=float(p[1]), iqr=float(p[2] - p[0]), min=float(a.min()), max=float(a.max()))

pop = gen[gen.ok == 1]
S = {'source': 'experiments/e2/results/amendment-01/validity.csv.gz', 'sourceSha256': hashlib.sha256(open(src, 'rb').read()).hexdigest(),
     'population': 'generated tracks with ok = 1 under validator 0.5.1 (ratio)', 'bins': BINS, 'validOnly': {}, 'validOnlyCoverage': {}}
T = ['# E3 secondary (valid-only) tables under the amended validator (validator 0.5.1, closureTangentMode ratio)\n',
     'Plan and predictions: ../../../amendment-01/ADDENDUM-E3.md. Population: generated tracks with ok = 1 in experiments/e2/results/amendment-01/validity.csv.gz.\n']
for mt in SIX:
    T.append(f'\n### {mt}\n'); T.append('| mode | n | mean | sd | median | IQR | min | max |'); T.append('|---|---|---|---|---|---|---|---|')
    for m in MODES:
        s = stats(pop[pop['mode'] == m][mt]); S['validOnly'].setdefault(mt, {})[m] = s
        T.append(f'| {m} | {s["n"]} | {s["mean"]:.4g} | {s["sd"]:.4g} | {s["median"]:.4g} | {s["iqr"]:.4g} | {s["min"]:.4g} | {s["max"]:.4g} |')
T.append('\n### Coverage of the 30 x 30 grid and 2D histogram entropy (valid-only, amended)\n')
T.append('| pair (x, y) | mode | occupied bins | coverage | histogram entropy (bits) |'); T.append('|---|---|---|---|---|')
for xm, ym in PAIRS:
    xe, ye = pair_edges([pop[pop['mode'] == m] for m in MODES], xm, ym)
    for m in MODES:
        p = pop[pop['mode'] == m]; h = hist2d(p[xm].values, p[ym].values, xe, ye)
        occ = int((h > 0).sum()); e = hist_entropy_bits(h)
        S['validOnlyCoverage'].setdefault(f'{xm}|{ym}', {})[m] = dict(occupied=occ, coverage=occ / (BINS * BINS), entropyBits=e)
        T.append(f'| ({xm}, {ym}) | {m} | {occ} | {occ / (BINS * BINS):.3f} | {e:.3f} |')

# comparison with the original (S3b rule) valid-only tables and with the primary population
T.append('\n## Comparison: valid-only n and medians, original rule (S3b) vs amended vs primary (all generated)\n')
T.append('| mode | metric | n original | n amended | n primary | median original | median amended | median primary |'); T.append('|---|---|---|---|---|---|---|---|')
S['comparison'] = {}
for m in MODES:
    for mt in ['straightLengthFraction', 'totalTurningDegrees', 'length']:
        o, a, pr = orig['validOnly'][mt][m], S['validOnly'][mt][m], orig['primary'][mt][m]
        S['comparison'].setdefault(m, {})[mt] = dict(nOriginal=o['n'], nAmended=a['n'], nPrimary=pr['n'],
            medianOriginal=o['median'], medianAmended=a['median'], medianPrimary=pr['median'])
        T.append(f'| {m} | {mt} | {o["n"]} | {a["n"]} | {pr["n"]} | {o["median"]:.4g} | {a["median"]:.4g} | {pr["median"]:.4g} |')
# identity of the pattern modes' statistics with the primary population (prediction 1) and the other predictions
ident = {m: all(S['validOnly'][mt][m] == orig['primary'][mt][m] for mt in SIX) for m in MODES}
au = pop[pop['mode'] == 'auto']
chk = dict(patternModesStatsEqualPrimary=ident, autoValidN=int(len(au)), autoValidShareStraight0=float((au.straight == 0).mean()),
           autoValidMedianStraightFraction=float(au.straightLengthFraction.median()),
           autoValidMedianTurning=float(au.totalTurningDegrees.median()),
           autoPair1OccupiedPrimary=orig['primaryCoverage']['straightLengthFraction|curvatureEntropyBits']['auto']['occupied'],
           autoPair1OccupiedValidOnly=S['validOnlyCoverage']['straightLengthFraction|curvatureEntropyBits']['auto']['occupied'])
S['checks'] = chk
T.append('\n## Checks for the addendum predictions\n'); T.append('```'); T.append(json.dumps(chk, indent=1, sort_keys=True)); T.append('```')
json.dump(S, open(os.path.join(R, 'SUMMARY.json'), 'w'), indent=1, sort_keys=True); open(os.path.join(R, 'SUMMARY.json'), 'a').write('\n')
open(os.path.join(R, 'tables.md'), 'w').write('\n'.join(T) + '\n')
print('\n'.join(T[-45:]))
