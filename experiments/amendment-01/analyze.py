"""AMENDMENT-01 analysis: S3b (validator 0.5.0 rule) versus amended (v0.5.1 'ratio') validity for E2 and E4, plus digest checks.
Reads the committed S3b CSVs and the amendment CSVs; writes e2/results/amendment-01/{tables.md,SUMMARY.json},
e4/results/amendment-01/{tables.md,SUMMARY.json} and digests.json. numpy/pandas only, deterministic."""
import hashlib, json, os, sys
import numpy as np, pandas as pd
HERE = os.path.dirname(os.path.abspath(__file__)); EXP = os.path.abspath(os.path.join(HERE, '..')); sys.path.insert(0, EXP)
import _common as C

def rd(path):
    d = pd.read_csv(path, keep_default_na=False, na_values=[''], low_memory=False)
    d['error'] = d['error'].fillna(''); d['codes'] = d['codes'].fillna(''); return d
def prep(d):
    d = d.copy(); d['ok'] = d['ok'].astype(float); return d
def digest_without(path):
    d = pd.read_csv(path, dtype=str, keep_default_na=False).drop(columns=['ok', 'codes'])
    return hashlib.sha256(d.to_csv(index=False).encode()).hexdigest()
def sha(path): return hashlib.sha256(open(path, 'rb').read()).hexdigest()
def has(g, c): return g.codes.apply(lambda s: c in s.split(';'))

old2p, new2p = f'{EXP}/e2/results/validity.csv.gz', f'{EXP}/e2/results/amendment-01/validity.csv.gz'
old4p, new4p = f'{EXP}/e4/results/baselines.csv.gz', f'{EXP}/e4/results/amendment-01/baselines.csv.gz'
DG = {'e2': dict(s3b_noOkCodes=digest_without(old2p), amended_noOkCodes=digest_without(new2p)),
      'e4': dict(s3b_noOkCodes=digest_without(old4p), amended_noOkCodes=digest_without(new4p))}
for k in DG: DG[k]['identical'] = DG[k]['s3b_noOkCodes'] == DG[k]['amended_noOkCodes']
DG['e2']['s3bFileSha256'] = sha(old2p); DG['e4']['s3bFileSha256'] = sha(old4p)
json.dump(DG, open(f'{HERE}/results-digests.json', 'w'), indent=1, sort_keys=True); open(f'{HERE}/results-digests.json', 'a').write('\n')

# ---------------- E2 ----------------
o2, n2 = rd(old2p), rd(new2p); assert len(o2) == len(n2) == 48600
S = {'digests': DG['e2']}; T = ['# E2 amended validity tables (validator v0.5.1, closureTangentMode ratio)\n',
  f"Digest check (CSV without the `ok` and `codes` columns, S3b vs amended): {'IDENTICAL' if DG['e2']['identical'] else 'DIFFERENT'} ({DG['e2']['s3b_noOkCodes']}).\n"]
T.append('## 1. ok rate among generated tracks, S3b (v0.5.0 rule) vs amended (Wilson 95% CI)\n')
T.append('| mode | generated | ok S3b | ok amended | CLOSURE_TANGENT tracks S3b | CLOSURE_TANGENT tracks amended | generation failures |'); T.append('|---|---|---|---|---|---|---|')
S['modes'] = {}
for m in C.MODES:
    go, gn = o2[(o2['mode'] == m) & (o2.generated == 1)], n2[(n2['mode'] == m) & (n2.generated == 1)]
    ko, kn = int(go.ok.sum()), int(gn.ok.sum()); co, cn = int(has(go, 'CLOSURE_TANGENT').sum()), int(has(gn, 'CLOSURE_TANGENT').sum())
    nf = int((n2[n2['mode'] == m].generated == 0).sum())
    S['modes'][m] = dict(generated=len(gn), okOld=C.wilson(ko, len(go)), okNew=C.wilson(kn, len(gn)), closureOld=co, closureNew=cn, failures=nf)
    T.append(f'| {m} | {len(gn)} | {ko} ({C.pct(C.wilson(ko, len(go)))}) | {kn} ({C.pct(C.wilson(kn, len(gn)))}) | {co} ({100*co/len(go):.1f}%) | {cn} ({100*cn/len(gn):.1f}%) | {nf} |')
T.append('\n## 2. Violation-code incidence per mode, amended (% of generated tracks)\n')
gn = n2[n2.generated == 1]; codes = sorted({c for s in gn.codes for c in s.split(';') if c})
T.append('| code | ' + ' | '.join(C.MODES) + ' |'); T.append('|---|' + '---|' * 4)
for c in codes:
    T.append(f'| {c} | ' + ' | '.join(f'{100*has(gn[gn["mode"]==m], c).mean():.1f}%' for m in C.MODES) + ' |')
T.append('\n## 3. Amended invalidity by factor level, Auto mode (and spread); S3b spread in brackets\n')
T.append('| factor | level | n | invalid rate amended [Wilson 95% CI] | invalid rate S3b |'); T.append('|---|---|---|---|---|')
S['drivers'] = {}
ga, go_ = gn[gn['mode'] == 'auto'], o2[(o2['mode'] == 'auto') & (o2.generated == 1)]
for f in ['curves', 'straight', 'width', 'size', 'height']:
    rates = []; ro = []
    for lv in sorted(ga[f].unique()):
        h = ga[ga[f] == lv]; k = int((h.ok == 0).sum()); w = C.wilson(k, len(h)); rates.append(w[0])
        ho = go_[go_[f] == lv]; wo = (ho.ok == 0).mean(); ro.append(wo)
        S['drivers'].setdefault(f, {})[str(lv)] = dict(n=len(h), invalid=k, rate=w[0], lo=w[1], hi=w[2], rateS3b=float(wo))
        T.append(f'| {f} | {lv} | {len(h)} | {C.pct(w)} | {100*wo:.2f}% |')
    S['drivers'][f]['spread'] = max(rates) - min(rates); S['drivers'][f]['spreadS3b'] = float(max(ro) - min(ro))
T.append('\nSpread amended (S3b): ' + ', '.join(f'{f} {100*S["drivers"][f]["spread"]:.2f} ({100*S["drivers"][f]["spreadS3b"]:.2f}) pts' for f in S['drivers']))
# which error codes remain in invalid pattern-mode tracks
pm = gn[(gn['mode'] != 'auto') & (gn.ok == 0)]
rem = {}
for s in pm.codes: 
    for c in s.split(';'):
        if c and c not in C.WARNING_CODES: rem[c] = rem.get(c, 0) + 1
S['patternInvalidCodes'] = rem
T.append(f'\nPattern-mode tracks still invalid under the amended rule: {len(pm)}; error codes among them (tracks): {rem}')
ac = ga[has(ga, 'CLOSURE_TANGENT')]
S['autoClosureRemaining'] = dict(tracks=len(ac), of=len(ga), share=len(ac) / len(ga), ofWhichOnlyErrorIsClosure=int(ac.codes.apply(lambda s: not C.error_codes_noclosure(s)).sum()))
T.append(f'\nAuto-mode CLOSURE_TANGENT failures remaining: {len(ac)} of {len(ga)} ({100*len(ac)/len(ga):.1f}%); S3b: {S["modes"]["auto"]["closureOld"]}.')
os.makedirs(f'{EXP}/e2/results/amendment-01', exist_ok=True)
json.dump(S, open(f'{EXP}/e2/results/amendment-01/SUMMARY.json', 'w'), indent=1, sort_keys=True); open(f'{EXP}/e2/results/amendment-01/SUMMARY.json', 'a').write('\n')
open(f'{EXP}/e2/results/amendment-01/tables.md', 'w').write('\n'.join(T) + '\n')

# ---------------- E4 ----------------
ob, nb = rd(old4p), rd(new4p); assert len(ob) == len(nb) == 24300
def sets(b, e2):
    out = {g: prep(b[(b.generator == g) & (b.spacing == 8)]) for g in ('B1', 'B2')}
    out['TL-Auto'] = prep(e2[e2['mode'] == 'auto']); out['TL-Auto0'] = prep(e2[(e2['mode'] == 'auto') & (e2.straight == 0)])
    for m in C.MODES[1:]: out['TL-' + m] = prep(e2[e2['mode'] == m])
    return out
SO, SN = sets(ob, o2), sets(nb, n2); NAMES = list(SN)
S4 = {'digests': DG['e4']}; T = ['# E4 amended validity tables (validator v0.5.1, closureTangentMode ratio)\n',
  f"Digest check (baseline CSV without `ok` and `codes`, S3b vs amended): {'IDENTICAL' if DG['e4']['identical'] else 'DIFFERENT'} ({DG['e4']['s3b_noOkCodes']}).\n",
  '## 1. ok rate among generated tracks: S3b (v0.5.0 rule) vs amended (Wilson 95% CI)\n',
  '| set | generated | ok S3b | ok amended | exploratory S3b column "ok ignoring CLOSURE_TANGENT" | CLOSURE_TANGENT tracks S3b | CLOSURE_TANGENT tracks amended |', '|---|---|---|---|---|---|---|']
S4['validity'] = {}
for k in NAMES:
    go, gn_ = SO[k][SO[k].generated == 1], SN[k][SN[k].generated == 1]
    ko, kn = int(go.ok.sum()), int(gn_.ok.sum()); nc = int(go.codes.apply(lambda s: not C.error_codes_noclosure(s)).sum())
    co, cn = int(has(go, 'CLOSURE_TANGENT').sum()), int(has(gn_, 'CLOSURE_TANGENT').sum())
    S4['validity'][k] = dict(generated=len(gn_), okOld=C.wilson(ko, len(go)), okNew=C.wilson(kn, len(gn_)), okIgnoringClosureS3b=C.wilson(nc, len(go)), closureOld=co, closureNew=cn)
    T.append(f'| {k} | {len(gn_)} | {ko} ({C.pct(C.wilson(ko, len(go)))}) | {kn} ({C.pct(C.wilson(kn, len(gn_)))}) | {C.pct(C.wilson(nc, len(go)))} | {co} ({100*co/len(go):.1f}%) | {cn} ({100*cn/len(gn_):.1f}%) |')
T.append('\n## 2. Violation-code incidence, amended (% of generated tracks)\n')
cs = sorted({c for k in NAMES for s in SN[k].codes for c in s.split(';') if c})
T.append('| code | ' + ' | '.join(NAMES) + ' |'); T.append('|---|' + '---|' * len(NAMES))
for c in cs: T.append(f'| {c} | ' + ' | '.join(f'{100*has(SN[k][SN[k].generated==1], c).mean():.1f}%' for k in NAMES) + ' |')
T.append('\n## 3. Baseline sampling-spacing sensitivity, amended\n'); T.append('| generator | spacing | ok S3b | ok amended [CI] | CLOSURE_TANGENT amended |'); T.append('|---|---|---|---|---|')
S4['sensitivity'] = {}
for g in ('B1', 'B2'):
    for sp in (4, 8, 12):
        a = prep(nb[(nb.generator == g) & (nb.spacing == sp)]); a0 = prep(ob[(ob.generator == g) & (ob.spacing == sp)])
        w = C.wilson(int(a.ok.sum()), len(a)); S4['sensitivity'][f'{g}@{sp}'] = dict(okNew=w, okOld=float(a0.ok.mean()), closureNew=float(has(a, 'CLOSURE_TANGENT').mean()))
        T.append(f'| {g} | {sp} | {100*a0.ok.mean():.2f}% | {C.pct(w)} | {100*has(a,"CLOSURE_TANGENT").mean():.1f}% |')
order = sorted(['TL-Auto0', 'B1', 'B2'], key=lambda k: -S4['validity'][k]['okNew'][0]); S4['orderAmended'] = order
T.append(f'\nOrder of amended ok rates among TL-Auto0, B1, B2 (high to low): {" > ".join(order)}.')
os.makedirs(f'{EXP}/e4/results/amendment-01', exist_ok=True)
json.dump(S4, open(f'{EXP}/e4/results/amendment-01/SUMMARY.json', 'w'), indent=1, sort_keys=True); open(f'{EXP}/e4/results/amendment-01/SUMMARY.json', 'a').write('\n')
open(f'{EXP}/e4/results/amendment-01/tables.md', 'w').write('\n'.join(T) + '\n')
print('\n'.join(T[:14]))
