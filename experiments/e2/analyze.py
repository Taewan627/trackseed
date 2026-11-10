"""E2 analysis: reads results/validity.csv.gz, results/timing.csv.gz, results/timing-reps.json (merged from out/rep*.json if present).
Writes results/SUMMARY.json and results/tables.md. Pure numpy/pandas, deterministic."""
import json, glob, os, math
import numpy as np, pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__)); R = os.path.join(HERE, 'results')
MODES = ['auto', 'right-angle', 'hairpin', 's-curve']
FACTORS = ['curves', 'straight', 'width', 'size', 'height']
Z = 1.959964

def wilson(k, n):
    if n == 0: return (float('nan'), float('nan'), float('nan'))
    p = k / n; d = 1 + Z * Z / n
    c = (p + Z * Z / (2 * n)) / d; h = Z * math.sqrt(p * (1 - p) / n + Z * Z / (4 * n * n)) / d
    return (p, max(0.0, c - h), min(1.0, c + h))
def pct(t): return f'{100*t[0]:.2f}% [{100*t[1]:.2f}, {100*t[2]:.2f}]'
def q(a, qs): return [float(x) for x in np.percentile(np.asarray(a, float), qs)]

df = pd.read_csv(os.path.join(R, 'validity.csv.gz'), keep_default_na=False, na_values=[''], low_memory=False)
df['error'] = df['error'].fillna(''); df['codes'] = df['codes'].fillna('')
assert len(df) == 48600
gen = df[df.generated == 1].copy(); gen['ok'] = gen['ok'].astype(int)
S = {}; T = []
T.append('## 1. Generation failures and validator ok rate per mode (Wilson 95% CI)\n')
T.append('| mode | cases | generation failures (PatternGenerationError) | other errors | generated | ok among generated | end-to-end ok / cases |')
T.append('|---|---|---|---|---|---|---|')
S['modes'] = {}
for m in MODES:
    d = df[df['mode'] == m]; g = d[d.generated == 1]
    nf = int((d.error == 'PatternGenerationError').sum()); no = int(((d.generated == 0) & (d.error != 'PatternGenerationError')).sum())
    ok = int(g.ok.sum()); e2e = wilson(ok, len(d))
    S['modes'][m] = dict(cases=len(d), generationFailures=nf, failureRate=wilson(nf, len(d)), otherErrors=no, generated=len(g), ok=ok, okRate=wilson(ok, len(g)), endToEnd=e2e)
    T.append(f'| {m} | {len(d)} | {nf} ({pct(wilson(nf, len(d)))}) | {no} | {len(g)} | {ok} ({pct(wilson(ok, len(g)))}) | {pct(e2e)} |')

T.append('\n## 2. Violation-code incidence per mode (tracks with >= 1 violation of the code, % of generated tracks of the mode)\n')
codes = sorted({c for s in gen.codes for c in s.split(';') if c})
T.append('| code | ' + ' | '.join(MODES) + ' |'); T.append('|---|' + '---|' * len(MODES))
S['codeIncidence'] = {}
for c in codes:
    row = []
    for m in MODES:
        g = gen[gen['mode'] == m]; k = int(g.codes.apply(lambda s: c in s.split(';')).sum())
        S['codeIncidence'].setdefault(c, {})[m] = dict(tracks=k, of=len(g)); row.append(f'{k} ({100*k/len(g):.1f}%)')
    T.append(f'| {c} | ' + ' | '.join(row) + ' |')

T.append('\n## 3. Invalidity (1 - ok rate among generated) by factor level\n')
S['drivers'] = {}
for m in MODES:
    g = gen[gen['mode'] == m]; S['drivers'][m] = {}
    T.append(f'\n### {m} (n = {len(g)} generated)\n')
    T.append('| factor | level | n | invalid rate [Wilson 95% CI] |'); T.append('|---|---|---|---|')
    spreads = {}
    for f in FACTORS:
        rates = []
        for lv in sorted(g[f].unique()):
            h = g[g[f] == lv]; k = int((h.ok == 0).sum()); w = wilson(k, len(h)); rates.append(w[0])
            S['drivers'][m].setdefault(f, {})[str(lv)] = dict(n=len(h), invalid=k, rate=w[0], lo=w[1], hi=w[2])
            T.append(f'| {f} | {lv} | {len(h)} | {pct(w)} |')
        spreads[f] = max(rates) - min(rates)
    rank = sorted(spreads.items(), key=lambda kv: -kv[1]); S['drivers'][m]['spread'] = dict(rank)
    T.append('\nSpread (max level rate - min level rate), ranked: ' + ', '.join(f'{f} {100*s:.2f} pts' for f, s in rank))

T.append('\n## 4. max |slope| distribution by height (generated tracks; metrics.maxAbsSlope)\n')
QS = [5, 25, 50, 75, 90, 95, 99, 100]; GRID = [round(0.05 * i, 2) for i in range(1, 41)]
S['slope'] = {}
for label, sub in [('all modes pooled', gen), ('auto only', gen[gen['mode'] == 'auto'])]:
    T.append(f'\n### {label}\n'); T.append('| height | n | ' + ' | '.join(f'q{x}' for x in QS) + ' | fraction > 0.3 | smallest grid value with >= 95% <= value |')
    T.append('|---|---|' + '---|' * (len(QS) + 2))
    S['slope'][label] = {}
    for h in sorted(sub.height.unique()):
        a = sub[sub.height == h].maxAbsSlope.values; qq = q(a, QS)
        thr = next((x for x in GRID if (a <= x).mean() >= 0.95), None)
        S['slope'][label][str(h)] = dict(n=len(a), quantiles=dict(zip(map(str, QS), qq)), fracAbove0_3=float((a > 0.3).mean()), grid95=thr)
        T.append(f'| {h} | {len(a)} | ' + ' | '.join(f'{x:.4f}' for x in qq) + f' | {100*(a>0.3).mean():.2f}% | {thr} |')
T.append('\nMedian of maxAbsSlope * length / height (height > 0), all modes pooled, by height: ' + ', '.join(
    f'{h}: {np.median(gen[gen.height == h].maxAbsSlope * gen[gen.height == h].length / h):.4f}' for h in (80, 200)))
S['slope']['scaledMedian'] = {str(h): float(np.median(gen[gen.height == h].maxAbsSlope * gen[gen.height == h].length / h)) for h in (80, 200)}
S['slope']['height0MaxOfMaxAbsSlope'] = float(gen[gen.height == 0].maxAbsSlope.max())
T.append(f'\nMaximum maxAbsSlope over all height = 0 tracks: {S["slope"]["height0MaxOfMaxAbsSlope"]}')
S['slope']['proposal'] = S['slope']['all modes pooled']['80']['grid95']
T.append(f'\nProposal (rule of PROTOCOL.md; src not changed): MAX_SLOPE default = {S["slope"]["proposal"]} (smallest grid value covering 95% of generated height-80 tracks, all modes pooled).')
ratio = (gen[gen.height > 0].elevationRange / gen[gen.height > 0].height)
S['elevationRangeOverHeight'] = dict(zip(map(str, QS), q(ratio, QS)))
T.append('\nelevationRange / height for height > 0 (all generated): ' + ', '.join(f'q{k} {v:.3f}' for k, v in S['elevationRangeOverHeight'].items()))

# ---- timing ----
tm = pd.read_csv(os.path.join(R, 'timing.csv.gz'), na_values=['']); assert len(tm) == 48600
tm = tm.merge(df[['index', 'mode', 'curves', 'generated']], on='index')
def stat(a): a = np.asarray(a, float); p = q(a, [25, 50, 75, 95]); return dict(n=len(a), median=p[1], q1=p[0], q3=p[2], iqr=p[2] - p[0], p95=p[3])
def row(name, s): return f'| {name} | {s["n"]} | {s["median"]:.3f} | {s["iqr"]:.3f} | {s["p95"]:.3f} |'
T.append('\n## 5. Timing (timing run over the full grid; ms)\n')
S['timing'] = {'generation_generated': {}, 'generation_failed': {}, 'validation': {}}
for what, col, sel in [('generation_ms, generated cases', 'generation_ms', tm.generated == 1), ('validation_ms (generated cases)', 'validation_ms', tm.generated == 1)]:
    T.append(f'\n### {what}\n'); T.append('| group | n | median | IQR | p95 |'); T.append('|---|---|---|---|---|')
    key = 'generation_generated' if col == 'generation_ms' else 'validation'
    for m in MODES:
        s = stat(tm[sel & (tm['mode'] == m)][col]); S['timing'][key][m] = s; T.append(row(m, s))
    for c in (3, 6, 10):
        s = stat(tm[sel][tm[sel].curves == c][col]); S['timing'][key][f'curves={c} (all modes)'] = s; T.append(row(f'curves={c} (all modes)', s))
        s = stat(tm[sel & (tm['mode'] == 'auto')][tm[sel & (tm['mode'] == 'auto')].curves == c][col]); S['timing'][key][f'curves={c} (auto)'] = s; T.append(row(f'curves={c} (auto)', s))
fl = tm[tm.generated == 0]
T.append('\n### generation_ms, failed generations (excluded above)\n'); T.append('| group | n | median | IQR | p95 |'); T.append('|---|---|---|---|---|')
for m in MODES:
    a = fl[fl['mode'] == m].generation_ms
    if len(a): s = stat(a); S['timing']['generation_failed'][m] = s; T.append(row(m, s))
    else: T.append(f'| {m} | 0 | | | |')
T.append('\nTotal generation_ms + validation_ms over the grid: %.1f s' % ((tm.generation_ms.sum() + tm.validation_ms.fillna(0).sum()) / 1000))

# repetitions
repf = os.path.join(R, 'timing-reps.json')
recs = sorted(glob.glob(os.path.join(HERE, 'out', 'rep*.json')))
if recs:
    reps = [json.load(open(f)) for f in recs]
    json.dump(dict(indices=reps[0]['indices'], reps=[dict(gen=r['gen'], val=r['val']) for r in reps]), open(repf, 'w'), separators=(',', ':'))
rp = json.load(open(repf)); idx = np.array(rp['indices']); modes_of = df.set_index('index').loc[idx, 'mode'].values
T.append(f'\n## 6. Run-to-run variation: {len(rp["reps"])} repetitions of the 500-case subset (fresh process each, 100 untimed warm-up cases)\n')
T.append('| mode | quantity | median per repetition (ms) | min | max | CV of the medians | p95 per repetition (ms) |'); T.append('|---|---|---|---|---|---|---|')
S['reps'] = {}
for m in MODES + ['all']:
    sel = np.ones(len(idx), bool) if m == 'all' else modes_of == m
    for qn in ('gen', 'val'):
        meds, p95s = [], []
        for r in rp['reps']:
            a = np.array([np.nan if x is None else x for x in r[qn]], float)[sel]; a = a[~np.isnan(a)]
            meds.append(float(np.median(a))); p95s.append(float(np.percentile(a, 95)))
        cv = float(np.std(meds, ddof=1) / np.mean(meds))
        S['reps'].setdefault(m, {})[qn] = dict(medians=meds, p95=p95s, cv=cv)
        T.append(f'| {m} | {"generation" if qn == "gen" else "validation"} | ' + ', '.join(f'{x:.3f}' for x in meds) + f' | {min(meds):.3f} | {max(meds):.3f} | {100*cv:.1f}% | ' + ', '.join(f'{x:.2f}' for x in p95s) + ' |')
S['reps']['n'] = len(rp['reps'])
json.dump(S, open(os.path.join(R, 'SUMMARY.json'), 'w'), indent=1, sort_keys=True); open(os.path.join(R, 'SUMMARY.json'), 'a').write('\n')
open(os.path.join(R, 'tables.md'), 'w').write('\n'.join(T) + '\n')
print('\n'.join(T[:40]))
