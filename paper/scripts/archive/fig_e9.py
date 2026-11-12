"""E9 figure: validity (raw polyline vs --resample-smooth, Wilson 95% intervals) and two scale-normalised metrics for the TUMFTM circuits and five
open-source generators, from experiments/e9/results at software commit 3765362 (v1.2.0; the files are unchanged since E9 was committed) (read with git show; nothing is recomputed except the strip plots' medians).
Numbers asserted against SUMMARY.json. Usage (from the repository root): python3 -I paper/scripts/fig_e9.py"""
import io, json, os, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
import numpy as np, pandas as pd
import matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt
style()
show = lambda p: subprocess.check_output(['git', '-C', REPO, 'show', f'{REV}:{p}'])
S = json.loads(show('experiments/e9/results/SUMMARY.json'))
T = pd.read_csv(io.BytesIO(show('experiments/e9/results/tracks.csv.gz')), compression='gzip')
order = ['real-tumftm', 'gen-e5-thorimbert', 'gen-juangallostra', 'gen-amz-voronoi', 'gen-carracing', 'gen-zzangupenn']
lab = {'real-tumftm': 'TUMFTM circuits', 'gen-e5-thorimbert': 'E5 generator', 'gen-juangallostra': 'juangallostra', 'gen-amz-voronoi': 'AMZ Voronoi',
       'gen-carracing': 'CarRacing', 'gen-zzangupenn': 'track_gen'}
N = {s: S['Q1'][s]['produced'] for s in order}
assert N == {'real-tumftm': 25, 'gen-e5-thorimbert': 1000, 'gen-juangallostra': 998, 'gen-amz-voronoi': 921, 'gen-carracing': 1000, 'gen-zzangupenn': 1000}
fig = plt.figure(figsize=(5.8, 3.4))
gs = fig.add_gridspec(1, 3, width_ratios=[1.55, 1, 1], left=0.23, right=0.995, top=0.83, bottom=0.25, wspace=0.12)
ax = fig.add_subplot(gs[0]); ys = np.arange(len(order))[::-1]
cols = {'raw': OI['blue'], 'smooth': OI['orange']}
for y, s in zip(ys, order):
    a = S['Q1'][s]['runs']['main']['arms']
    for off, arm in ((0.2, 'raw'), (-0.2, 'smooth')):
        v = a[arm]; k, n = v['ok'], v['n']; lo, hi = wilson(k, n)
        assert abs(100 * k / n - v['okRate']) < 1e-6 and abs(100 * lo - v['wilson95'][0]) < 0.01
        ax.barh(y + off, v['okRate'], height=0.36, color=cols[arm], label='raw polyline' if (y == ys[0] and arm == 'raw') else ('smooth-resampled' if y == ys[0] else None))
        ax.plot([100 * lo, 100 * hi], [y + off] * 2, color='black', lw=0.8)
        ax.text(101.5, y + off, f"{v['okRate']:.0f}", va='center', fontsize=7)
ax.set_yticks(ys); ax.set_yticklabels([f'{lab[s]}\n(n = {N[s]})' for s in order], fontsize=7)
ax.set_xlim(0, 112); ax.set_xticks([0, 25, 50, 75, 100]); ax.set_xlabel('tracks without a validator error (%)', fontsize=7)
ax.set_title('(a) Validity, Wilson 95%', fontsize=7.5, loc='left'); ax.xaxis.grid(True, color=GRID, lw=0.5); ax.set_axisbelow(True)
ax.legend(loc='upper center', bbox_to_anchor=(0.45, -0.17), ncol=2, frameon=False, fontsize=7, handlelength=1.2, columnspacing=1.0)
M = T[(T.arm == 'n720') & (T.outcome == 'metrics') & (T.run == 'main') & T.source.isin(order)]
rng = np.random.Generator(np.random.PCG64(7))
for k, (m, title, log) in enumerate([('meanAbsCurvatureNorm', '(b) mean |κ̂|', True), ('straightLengthFractionNorm', '(c) straight fraction', False)]):
    a2 = fig.add_subplot(gs[k + 1], sharey=ax)
    for y, s in zip(ys, order):
        v = M[M.source == s][m].to_numpy(float)
        real = s.startswith('real-')
        if log: v = np.clip(v, 0.3, None)
        a2.scatter(v, y + rng.uniform(-0.3, 0.3, len(v)), s=9 if real else 1.5, alpha=0.95 if real else 0.25, color=OI['verm'] if real else '#555555', linewidths=0, zorder=3 if real else 2)
        med = np.median(M[M.source == s][m].to_numpy(float)); a2.plot([med] * 2, [y - 0.36, y + 0.36], color='black', lw=1.4, zorder=4)
    if log: a2.set_xscale('log'); a2.set_xlim(0.8, 60); a2.set_xticks([1, 3, 10, 30]); a2.set_xticklabels(['1', '3', '10', '30'])
    else: a2.set_xlim(0, 1); a2.set_xticks([0, 0.5, 1])
    a2.set_title(title, fontsize=7.5, loc='left'); a2.xaxis.grid(True, color=GRID, lw=0.5); a2.set_axisbelow(True)
    plt.setp(a2.get_yticklabels(), visible=False); a2.tick_params(axis='y', length=0)
fig.suptitle('TrackSeed validator and metrics applied to tracks made by others (E9)', fontsize=7.5, x=0.5, y=0.985)
fig.text(0.995, 0.02, 'b, c: red = real circuits, black bar = median;\n720 smooth-resampled samples per track', ha='right', va='bottom', fontsize=7)
fig.savefig(f'{FIG}/fig_e9.png'); print('fig_e9 ok')
