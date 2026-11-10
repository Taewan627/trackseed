"""Regenerates every figure of E1b-E4 from committed results (matplotlib, Agg). Usage: python3 -I experiments/make-figures.py
Palette: Okabe-Ito (colour-vision-deficiency safe), one fixed colour per entity; every plot also carries labels/legends."""
import json, os, sys
import numpy as np, pandas as pd
import matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt
ROOT = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, ROOT)
from _common import *
plt.rcParams.update({'font.size': 8, 'axes.spines.top': False, 'axes.spines.right': False, 'axes.linewidth': 0.6, 'figure.dpi': 100, 'savefig.dpi': 100})
OI = {'auto': '#0072B2', 'right-angle': '#D55E00', 'hairpin': '#009E73', 's-curve': '#CC79A7'}
GEN_COL = {'B1': '#E69F00', 'B2': '#56B4E9', 'TL-Auto': '#0072B2', 'TL-Auto0': '#000000', 'TL-right-angle': '#D55E00', 'TL-hairpin': '#009E73', 'TL-s-curve': '#CC79A7'}
def _e(p, lo, hi): return [[max(0, 100 * (p - lo))], [max(0, 100 * (hi - p))]]
def out(exp, name):
    d = os.path.join(ROOT, exp, 'results', 'figures'); os.makedirs(d, exist_ok=True); return os.path.join(d, name)
def save(fig, path):
    fig.savefig(path, bbox_inches='tight'); plt.close(fig)
    assert os.path.getsize(path) <= 300 * 1024, (path, os.path.getsize(path))

# ---------------- E1b ----------------
s = json.load(open(os.path.join(ROOT, 'e1b/results/SUMMARY.json')))
eng = [e for e in s['engines'] if e['available']]
fig, ax = plt.subplots(figsize=(6.2, 2.8)); x = np.arange(len(eng)); w = 0.38
ax.bar(x - w / 2, [e['secondary']['casesWithDifferentLength'] for e in eng], w, color='#E69F00', label='track.length differs bitwise from Node 22')
ax.bar(x + w / 2, [e['casesWithAnyDiscreteDisagreement'] for e in eng], w, color='#0072B2', label='any discrete field differs (observed: 0)')
ax.set_xticks(x); ax.set_xticklabels([e['name'].replace(' (', '\n(') for e in eng], fontsize=6); ax.set_ylabel('cases of 1000'); ax.legend(frameon=False, fontsize=7)
ax.set_title('E1b: legacy v0.4 continuous drift vs discrete outcomes'); save(fig, out('e1b', 'e1b_drift_vs_discrete.png'))

# ---------------- E2 ----------------
S2 = json.load(open(os.path.join(ROOT, 'e2/results/SUMMARY.json')))
fig, axs = plt.subplots(1, 2, figsize=(6.6, 2.7))
for i, (key, ttl) in enumerate([('okRate', 'validator ok rate (among generated)'), ('failureRate', 'generation-failure rate')]):
    ax = axs[i]
    for j, m in enumerate(MODES):
        p, lo, hi = S2['modes'][m][key]; ax.bar(j, 100 * p, color=OI[m], width=0.6); ax.errorbar(j, 100 * p, yerr=_e(p, lo, hi), color='k', lw=0.8, capsize=2)
    ax.set_xticks(range(4)); ax.set_xticklabels(MODES, fontsize=7); ax.set_ylabel('%'); ax.set_title(ttl, fontsize=8)
fig.suptitle('E2: 12,150 cases per mode, Wilson 95% CI', fontsize=8); save(fig, out('e2', 'e2_validity_by_mode.png'))

fig, axs = plt.subplots(1, 5, figsize=(8, 2.4), sharey=True)
for ax, f in zip(axs, ['curves', 'straight', 'width', 'size', 'height']):
    d = S2['drivers']['auto'][f]; lv = list(d.keys())
    p = [100 * d[k]['rate'] for k in lv]; lo = [max(0, 100 * (d[k]['rate'] - d[k]['lo'])) for k in lv]; hi = [max(0, 100 * (d[k]['hi'] - d[k]['rate'])) for k in lv]
    ax.bar(range(len(lv)), p, color=OI['auto'], width=0.6); ax.errorbar(range(len(lv)), p, yerr=[lo, hi], fmt='none', color='k', lw=0.8, capsize=2)
    ax.set_xticks(range(len(lv))); ax.set_xticklabels([str(float(k)).rstrip('0').rstrip('.') for k in lv]); ax.set_xlabel(f)
axs[0].set_ylabel('invalid, % (Auto)'); fig.suptitle('E2: Auto-mode invalidity by parameter level (n = 4,050 per bar)', fontsize=8); save(fig, out('e2', 'e2_auto_invalidity_by_level.png'))

d2 = load_e2(); g2 = d2[d2.generated == 1]
fig, ax = plt.subplots(figsize=(5, 3))
for h, c in [(80, '#0072B2'), (200, '#D55E00')]:
    a = np.sort(g2[g2.height == h].maxAbsSlope.values); ax.plot(a, np.arange(1, len(a) + 1) / len(a), color=c, lw=1.2, label=f'height {h} (n = {len(a)})')
ax.axvline(0.3, color='k', lw=0.8, ls='--'); ax.text(0.27, 0.5, 'default MAX_SLOPE 0.3', fontsize=7, rotation=90, ha='right', va='center')
ax.axvline(S2['slope']['proposal'], color='#009E73', lw=0.8, ls=':'); ax.text(S2['slope']['proposal'] + 0.05, 0.25, f"rule-based proposal {S2['slope']['proposal']}", fontsize=7, color='#009E73')
ax.set_xlabel('max |slope| of the track (rise / run)'); ax.set_ylabel('empirical CDF'); ax.legend(frameon=False, fontsize=7, loc='lower right')
ax.set_title('E2: max |slope| by height (height 0: always 0)', fontsize=8); save(fig, out('e2', 'e2_max_slope_cdf.png'))

tm = pd.read_csv(os.path.join(ROOT, 'e2/results/timing.csv.gz')); tm = tm.merge(d2[['index', 'mode', 'generated']], on='index'); tm = tm[tm.generated == 1]
fig, axs = plt.subplots(1, 2, figsize=(6.6, 2.7))
for ax, col in zip(axs, ['generation_ms', 'validation_ms']):
    for j, m in enumerate(MODES):
        a = tm[tm['mode'] == m][col].values; q1, q2, q3, p95 = np.percentile(a, [25, 50, 75, 95])
        ax.plot([j, j], [q1, q3], color=OI[m], lw=5, solid_capstyle='butt'); ax.plot(j, q2, 'o', color='white', ms=3, mec='k', mew=0.6); ax.plot(j, p95, '_', color='k', ms=8)
    ax.set_xticks(range(4)); ax.set_xticklabels(MODES, fontsize=7); ax.set_ylabel('ms'); ax.set_title(col, fontsize=8)
fig.suptitle('E2 timing (bar: IQR, dot: median, tick: p95)', fontsize=8); save(fig, out('e2', 'e2_timing.png'))

# ---------------- E3 ----------------
gen = g2
LAB = {'straightLengthFraction': 'straightLengthFraction', 'curvatureEntropyBits': 'curvatureEntropyBits', 'totalTurningDegrees': 'totalTurningDegrees (deg)', 'length': 'length', 'elevationRange': 'elevationRange', 'maxAbsSlope': 'maxAbsSlope'}
for n, (xm, ym) in enumerate(PAIRS, 1):
    xe, ye = pair_edges([gen[gen['mode'] == m] for m in MODES], xm, ym)
    hs = [hist2d(gen[gen['mode'] == m][xm].values, gen[gen['mode'] == m][ym].values, xe, ye) for m in MODES]; vmax = np.log10(max(h.max() for h in hs) + 1)
    fig, axs = plt.subplots(2, 4, figsize=(8, 4.2), sharex=True, sharey=True)
    for j, m in enumerate(MODES):
        im = axs[0, j].pcolormesh(xe, ye, np.log10(hs[j].T + 1), cmap='viridis', vmin=0, vmax=vmax); axs[0, j].set_title(m, fontsize=8, color=OI[m])
        p = gen[gen['mode'] == m]; axs[1, j].scatter(p[xm], p[ym], s=1, alpha=0.15, color=OI[m], linewidths=0, rasterized=True)
        axs[1, j].set_xlabel(LAB[xm])
    axs[0, 0].set_ylabel(LAB[ym] + '\n(histogram)'); axs[1, 0].set_ylabel(LAB[ym] + '\n(scatter)')
    fig.colorbar(im, ax=axs[0, :], label='log10(count + 1)', shrink=0.8, pad=0.01)
    fig.suptitle(f'E3 pair {n}: ({xm}, {ym}), all generated tracks of the E2 grid', fontsize=8); save(fig, out('e3', f'e3_pair{n}_{xm}_{ym}.png'))

# ---------------- E4 ----------------
S4 = json.load(open(os.path.join(ROOT, 'e4/results/SUMMARY.json'))); NAMES = list(S4['sets'])
fig, ax = plt.subplots(figsize=(6.6, 2.9)); x = np.arange(len(NAMES)); w = 0.38
for off, key, col, lab in [(-w / 2, 'okRate', '#0072B2', 'validator ok'), (w / 2, 'okIgnoringClosure', '#999999', 'ok ignoring CLOSURE_TANGENT (exploratory)')]:
    p = [S4['validity'][k][key][0] * 100 for k in NAMES]; lo = [max(0, 100 * (S4['validity'][k][key][0] - S4['validity'][k][key][1])) for k in NAMES]; hi = [max(0, 100 * (S4['validity'][k][key][2] - S4['validity'][k][key][0])) for k in NAMES]
    ax.bar(x + off, p, w, color=col, label=lab); ax.errorbar(x + off, p, yerr=[lo, hi], fmt='none', color='k', lw=0.7, capsize=1.5)
ax.set_xticks(x); ax.set_xticklabels(NAMES, fontsize=6.5); ax.set_ylabel('% of generated tracks'); ax.legend(frameon=False, fontsize=7, loc='upper left')
ax.set_title('E4: validity under the same validator (Wilson 95% CI)', fontsize=8); save(fig, out('e4', 'e4_validity.png'))

b4 = load_e4_baselines(); b4 = b4[b4.spacing == 8]
gens = {'B1': b4[b4.generator == 'B1'], 'B2': b4[b4.generator == 'B2'], 'TL-Auto': d2[d2['mode'] == 'auto'], 'TL-Auto0': d2[(d2['mode'] == 'auto') & (d2.straight == 0)],
        **{'TL-' + m: d2[d2['mode'] == m] for m in MODES[1:]}}
gens = {k: v[v.generated == 1] for k, v in gens.items()}
for n, (xm, ym) in enumerate(PAIRS, 1):
    xe, ye = pair_edges(list(gens.values()), xm, ym); hs = {k: hist2d(v[xm].values, v[ym].values, xe, ye) for k, v in gens.items()}
    vmax = np.log10(max(h.max() for h in hs.values()) + 1)
    fig, axs = plt.subplots(2, 4, figsize=(8, 4.2), sharex=True, sharey=True)
    for ax, k in zip(axs.flat, NAMES):
        im = ax.pcolormesh(xe, ye, np.log10(hs[k].T + 1), cmap='viridis', vmin=0, vmax=vmax); ax.set_title(f'{k} ({int((hs[k] > 0).sum())} bins)', fontsize=8)
    axs[1, 3].axis('off'); [axs[1, j].set_xlabel(LAB[xm]) for j in range(3)]; [axs[i, 0].set_ylabel(LAB[ym]) for i in range(2)]
    fig.colorbar(im, ax=axs[1, 3], label='log10(count + 1)', location='left', shrink=0.8)
    fig.suptitle(f'E4 pair {n}: ({xm}, {ym}), shared bins over all generators', fontsize=8); save(fig, out('e4', f'e4_expressive_pair{n}_{xm}_{ym}.png'))

fig, axs = plt.subplots(2, 3, figsize=(8, 4.2))
for ax, mt in zip(axs.flat, ['straightLengthFraction', 'curvatureEntropyBits', 'totalTurningDegrees', 'maxAbsCurvature', 'turnCount', 'length']):
    bp = ax.boxplot([gens[k][mt].values for k in NAMES], tick_labels=NAMES, showfliers=False, patch_artist=True, widths=0.6, medianprops=dict(color='k'))
    for patch, k in zip(bp['boxes'], NAMES): patch.set_facecolor(GEN_COL[k]); patch.set_alpha(0.8)
    ax.set_title(mt, fontsize=8); ax.tick_params(axis='x', labelrotation=60, labelsize=6)
fig.suptitle('E4: metric distributions of generated tracks (box: IQR, whiskers 1.5 IQR, no outliers drawn)', fontsize=8); fig.tight_layout(); save(fig, out('e4', 'e4_metric_distributions.png'))

# ---------------- AMENDMENT-01 (validator v0.5.1) ----------------
def amend_dir(exp):
    d = os.path.join(ROOT, exp, 'results', 'amendment-01', 'figures'); os.makedirs(d, exist_ok=True); return d
def grouped(ax, names, old, new, ylab):
    x = np.arange(len(names)); w = 0.38
    for off, vals, col, lab in [(-w / 2, old, '#999999', 'S3b rule (v0.5.0, absolute 5 deg)'), (w / 2, new, '#0072B2', 'amended rule (v0.5.1, seam outlier)')]:
        p = [100 * v[0] for v in vals]; ax.bar(x + off, p, w, color=col, label=lab)
        ax.errorbar(x + off, p, yerr=[[max(0, 100 * (v[0] - v[1])) for v in vals], [max(0, 100 * (v[2] - v[0])) for v in vals]], fmt='none', color='k', lw=0.7, capsize=1.5)
    ax.set_xticks(x); ax.set_xticklabels(names, fontsize=6.5); ax.set_ylabel(ylab); ax.legend(frameon=False, fontsize=7, loc='lower right')
A2 = os.path.join(ROOT, 'e2/results/amendment-01/SUMMARY.json'); A4 = os.path.join(ROOT, 'e4/results/amendment-01/SUMMARY.json')
if os.path.exists(A2) and os.path.exists(A4):
    a2 = json.load(open(A2)); a4 = json.load(open(A4))
    fig, ax = plt.subplots(figsize=(6.2, 2.9)); grouped(ax, MODES, [a2['modes'][m]['okOld'] for m in MODES], [a2['modes'][m]['okNew'] for m in MODES], '% ok among generated')
    ax.set_title('E2 validator ok rate (amended validator v0.5.1), Wilson 95% CI', fontsize=8); save(fig, os.path.join(amend_dir('e2'), 'e2_validity_by_mode_amended.png'))
    fig, axs = plt.subplots(1, 5, figsize=(8, 2.4), sharey=True)
    for ax, f in zip(axs, ['curves', 'straight', 'width', 'size', 'height']):
        d = a2['drivers'][f]; lv = [k for k in d if k not in ('spread', 'spreadS3b')]; x = np.arange(len(lv))
        ax.bar(x - 0.2, [100 * d[k]['rateS3b'] for k in lv], 0.38, color='#999999', label='S3b rule (v0.5.0)'); ax.bar(x + 0.2, [100 * d[k]['rate'] for k in lv], 0.38, color='#0072B2', label='amended (v0.5.1)')
        ax.set_xticks(x); ax.set_xticklabels([str(float(k)).rstrip('0').rstrip('.') for k in lv]); ax.set_xlabel(f)
    axs[0].set_ylabel('invalid, % (Auto)'); axs[0].legend(frameon=False, fontsize=6, loc='lower left'); fig.suptitle('E2 Auto-mode invalidity by level (amended validator v0.5.1)', fontsize=8)
    save(fig, os.path.join(amend_dir('e2'), 'e2_auto_invalidity_by_level_amended.png'))
    fig, ax = plt.subplots(figsize=(6.6, 2.9)); names = list(a4['validity'])
    grouped(ax, names, [a4['validity'][k]['okOld'] for k in names], [a4['validity'][k]['okNew'] for k in names], '% ok among generated')
    ax.legend(frameon=False, fontsize=7, loc='upper left'); ax.set_title('E4 validity under the same validator (amended validator v0.5.1), Wilson 95% CI', fontsize=8); save(fig, os.path.join(amend_dir('e4'), 'e4_validity_amended.png'))
print('figures ok')
