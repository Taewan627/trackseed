"""Seed-clustered 95% intervals for the E6 and E7 rates reported in the manuscript.

Tracks of one seed share their random waypoints, so the tracks of an experiment are not independent.
This script resamples SEEDS (clusters) with replacement and recomputes the pooled rate (percentile interval).
Deterministic: numpy Generator(PCG64) seeded with 20261113, B = 10000 resamples.
Inputs are read with `git show <rev>:<path>` from the read-only software repository (default rev 3765362, v1.2.0; see common.py).
Output: paper/data/cluster_intervals.json and paper/data/cluster_intervals.md (both deterministic).
Usage (from the repository root): python3 -I paper/scripts/cluster_intervals.py   (TLSX_OUT=<dir> to write elsewhere)
Zero-event cells: a bootstrap interval of 0 events is degenerate ([0, 0]); the table says so and gives the exact
Clopper-Pearson upper bound 1 - 0.025**(1/m) for 0 events in m seed clusters instead.
"""
import io, json, os, subprocess, sys
import numpy as np, pandas as pd
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import REPO, REV, DATA
B, RNG_SEED = 10000, 20261113

def show(path):
    return subprocess.check_output(['git', '-C', REPO, 'show', f'{REV}:{path}'])

def cluster_ci(k_by_seed, n_by_seed, rng):
    """pooled rate with percentile interval of the seed-cluster bootstrap; k, n: arrays over seeds"""
    k = np.asarray(k_by_seed, float); n = np.asarray(n_by_seed, float); m = len(k)
    idx = rng.integers(0, m, size=(B, m))
    rates = k[idx].sum(1) / n[idx].sum(1)
    lo, hi = np.percentile(rates, [2.5, 97.5])
    return 100 * k.sum() / n.sum(), 100 * lo, 100 * hi, m

def wilson(k, n, z=1.959964):
    p = k / n; d = 1 + z * z / n; c = (p + z * z / (2 * n)) / d
    h = z * np.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return 100 * (c - h), 100 * (c + h)

def main():
    rng = np.random.Generator(np.random.PCG64(RNG_SEED))
    out = []
    def add(exp, label, k, n, kseed, nseed, note=''):
        r, lo, hi, m = cluster_ci(kseed, nseed, rng)
        wl, wh = wilson(k, n)
        out.append(dict(exp=exp, quantity=label, k=int(k), n=int(n), clusters=m, rate=round(r, 2), cluster_lo=round(lo, 2), cluster_hi=round(hi, 2),
                        wilson_lo=round(wl, 2), wilson_hi=round(wh, 2), note=note))
    # ---- E6 HELD-OUT (40 seeds; instances.csv.gz at the rev)
    d6 = pd.read_csv(io.BytesIO(show('experiments/e6/results/heldout/instances.csv.gz')), compression='gzip')
    assert len(d6) == 45360 and d6.seed.nunique() == 40
    for op, name in [('seamSpike', 'seam spike'), ('interiorSpike', 'interior spike'), ('corner', 'interior corner'), ('tangent', 'seam tangent break')]:
        s = d6[(d6.op == op) & (d6.cls == 'must')]
        g = s.groupby('seed').frozen.agg(['sum', 'count']).reindex(d6.seed.unique()).fillna(0)
        add('E6', f'recall of the v1.1 kink rule, must-detect {name}', s.frozen.sum(), len(s), g['sum'], g['count'],
            'all clusters 100%: interval degenerate' if s.frozen.sum() == len(s) else '')
    s = d6[(d6.op == 'seamSpike') & (d6.cls == 'must')]
    g = s.groupby('seed').ratio.agg(['sum', 'count']).reindex(d6.seed.unique()).fillna(0)
    add('E6', "recall of the legacy 'ratio' rule, must-detect seam spike", s.ratio.sum(), len(s), g['sum'], g['count'])
    for op, name, lev in [('seamSpike', 'seam spike', 1), ('interiorSpike', 'interior spike', 1), ('seamSpike', 'seam spike', 2)]:
        s = d6[(d6.op == op) & (d6.level == lev)]
        g = s.groupby('seed').frozen.agg(['sum', 'count'])
        add('E6', f'detection of the v1.1 kink rule, all {name} instances, level {lev}', s.frozen.sum(), len(s), g['sum'], g['count'])
    # false positives: the clean-track outcomes of E6 are committed only as counts (heldout.json), not per case
    h = json.loads(show('experiments/e6/results/heldout/heldout.json'))
    neg = h['negatives']['frozen']
    fp = {k: (neg[k]['k'], neg[k]['n']) for k in ('N1', 'N2', 'N3')}
    m = len(h['seeds'])
    # ---- E7 HELD-OUT (30 seeds; cases.csv.gz)
    d7 = pd.read_csv(io.BytesIO(show('experiments/e7/results/heldout/cases.csv.gz')), compression='gzip')
    assert len(d7) == 14580 and d7.seed.nunique() == 30
    def e7(label, join, mask=None, note=''):
        s = d7[d7['join'] == join]
        if mask is not None: s = s[mask(s)]
        g = s.groupby('seed').ok.agg(['sum', 'count'])
        add('E7', label, s.ok.sum(), len(s), g['sum'], g['count'], note)
    e7('ok rate, legacy join, all Auto cases', 'legacy')
    e7('ok rate, tangent join, all Auto cases', 'tangent')
    e7('ok rate, tangent join, straight > 0', 'tangent', lambda s: s.straight > 0)
    e7('ok rate, tangent join, straight = 0', 'tangent', lambda s: s.straight == 0)
    e7('ok rate, tangent join, straight > 0, width 80', 'tangent', lambda s: (s.straight > 0) & (s.width == 80))
    e7('ok rate, tangent join, straight > 0, curves 3', 'tangent', lambda s: (s.straight > 0) & (s.curves == 3))
    t = d7[(d7['join'] == 'tangent')].groupby('seed').ok.mean() * 100
    per_seed = dict(min=round(t.min(), 1), max=round(t.max(), 1), median=round(t.median(), 1))
    res = dict(rev=REV, rng='numpy PCG64', rng_seed=RNG_SEED, resamples=B, intervals=out, e6_false_positives=dict(
        counts=fp, seeds=m, note='clean-track outcomes are committed only as counts; 0 events in every set'),
        e6_fp_seed_level_upper95=round(100 * (1 - 0.025 ** (1 / m)), 2), e7_tangent_per_seed_ok=per_seed)
    json.dump(res, open(os.path.join(DATA, 'cluster_intervals.json'), 'w'), indent=1, sort_keys=True)
    L = [f'# Seed-clustered intervals (generated by paper/scripts/cluster_intervals.py; software rev {REV}; B = {B}, PCG64 seed {RNG_SEED})', '',
         '| exp | quantity | k / n | seeds | rate % | cluster-bootstrap 95% | Wilson 95% (tracks iid) | note |', '|---|---|---|---|---|---|---|---|']
    for r in out:
        L.append(f"| {r['exp']} | {r['quantity']} | {r['k']} / {r['n']} | {r['clusters']} | {r['rate']:.2f} | [{r['cluster_lo']:.2f}, {r['cluster_hi']:.2f}] | [{r['wilson_lo']:.2f}, {r['wilson_hi']:.2f}] | {r['note']} |")
    L += ['', f"E6 false positives of the v1.1 rule on clean tracks (counts only): N1 {fp['N1'][0]}/{fp['N1'][1]}, N2 {fp['N2'][0]}/{fp['N2'][1]}, N3 {fp['N3'][0]}/{fp['N3'][1]}; "
          f"0 events in {m} seeds, exact upper 95% bound at seed level {res['e6_fp_seed_level_upper95']}%.",
          f"E7 tangent join, ok rate per seed: min {per_seed['min']}%, median {per_seed['median']}%, max {per_seed['max']}%."]
    open(os.path.join(DATA, 'cluster_intervals.md'), 'w').write('\n'.join(L) + '\n')
    print('\n'.join(L))

if __name__ == '__main__':
    main()
