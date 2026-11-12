"""E9 addendum-02 figure (manuscript Fig. 4), from experiments/e9/results/addendum-02/SUMMARY.json at software commit 0441abe (read with git show).
(a) per source: share of tracks without a validator v1.3 error, as emitted (raw) and after smooth resampling at 0.25 x road width (the common rule), Wilson 95 % intervals,
    over the tracks the source produced; diamonds: share of tracks with the UNDERSAMPLED warning in the same arm. Not a ranking.
(b) TUMFTM circuits, share without error at the median and at the per-circuit minimum road width, raw / 0.25 W / 0.10 W.
Designed at its printed width (5.9 in). Usage (from the repository root): python3 -I paper/scripts/fig_e9_addendum.py"""
import json, os, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
import matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.lines import Line2D
style()
S = json.loads(subprocess.check_output(['git', '-C', REPO, 'show', f'{REV}:experiments/e9/results/addendum-02/SUMMARY.json']))
SRC = S['sources']
order = ['gen-trackseed', 'real-tumftm', 'gen-e5-thorimbert', 'gen-juangallostra', 'gen-amz-voronoi', 'gen-carracing', 'gen-zzangupenn', 'real-bacinger-f1', 'gen-driftschool-s2']
lab = {'gen-trackseed': 'TrackSeed (calibration source)', 'real-tumftm': 'TUMFTM circuits', 'gen-e5-thorimbert': 'E5 generator', 'gen-juangallostra': 'juangallostra (integer grid)',
       'gen-amz-voronoi': 'AMZ Voronoi', 'gen-carracing': 'CarRacing', 'gen-zzangupenn': 'track_gen', 'real-bacinger-f1': 'bacinger circuits', 'gen-driftschool-s2': 'drift-school stage 2'}
fig = plt.figure(figsize=(5.9, 3.55))
gs = fig.add_gridspec(1, 2, width_ratios=[2.45, 1], left=0.285, right=0.995, top=0.88, bottom=0.2, wspace=0.30)
ax = fig.add_subplot(gs[0]); ys = list(range(len(order)))[::-1]
BL, OR = OI['blue'], OI['orange']
for y, s in zip(ys, order):
    r = SRC[s]['runs']['main']
    for off, arm, col in ((0.2, 'raw', BL), (-0.2, 'cs25', OR)):
        v = r[arm]['ok13']; u = r[arm]['under']
        ax.barh(y + off, 100 * v['p'], height=0.36, color=col)
        ax.plot([100 * v['lo'], 100 * v['hi']], [y + off] * 2, color='black', lw=0.8)
        ax.plot([100 * u['p']], [y + off], marker='D', ms=4.2, mfc='white', mec='black', mew=0.9, ls='none', zorder=5)
        ax.text(103, y + off, f"{100 * v['p']:.0f}", va='center', fontsize=7)
ax.set_yticks(ys)
ax.set_yticklabels([f"{lab[s]}\n(n = {SRC[s]['produced']}" + (f" of {SRC[s]['attempted']}" if SRC[s]['attempted'] != SRC[s]['produced'] else '') + ')' for s in order], fontsize=6.8)
ax.set_xlim(0, 112); ax.set_xticks([0, 25, 50, 75, 100]); ax.set_xlabel('tracks (%)', fontsize=7.5); ax.xaxis.grid(True, color=GRID, lw=0.5); ax.set_axisbelow(True)
ax.set_title('(a) Validator v1.3, one rule set, nine sources', fontsize=7.5, loc='left')
T = S['tumftmCircuits']; n = len(T); assert n == 25
def share(key): return sum(1 for c in T if c[key] == 'ok')
bars = [('raw', share('raw13'), share('rawMin')), ('0.25 W', share('cs25'), share('cs25Min'))]
# cs10 at median and minimum width from the per-source summary
tm = SRC['real-tumftm']['runs']
b = fig.add_subplot(gs[1])
xs = [0, 1]; w = 0.36
med = [share('raw13'), share('cs25')]; mn = [share('rawMin'), share('cs25Min')]
assert (med, mn) == ([13, 20], [13, 24]), (med, mn)
b.bar([x - w / 2 for x in xs], [100 * m / n for m in med], w, color='#999999', label='median width')
b.bar([x + w / 2 for x in xs], [100 * m / n for m in mn], w, color='#444444', label='minimum width')
for x, m in zip(xs, med): b.text(x - w / 2, 100 * m / n + 2, f'{m}', ha='center', fontsize=7)
for x, m in zip(xs, mn): b.text(x + w / 2, 100 * m / n + 2, f'{m}', ha='center', fontsize=7)
b.set_xticks(xs); b.set_xticklabels(['raw', 'smoothed\n0.25 W'], fontsize=7); b.set_ylim(0, 128); b.set_yticks([0, 25, 50, 75, 100]); 
b.yaxis.grid(True, color=GRID, lw=0.5); b.set_axisbelow(True); b.set_title('(b) TUMFTM (n = 25), %\nby road width used', fontsize=7.5, loc='left')
b.legend(loc='upper left', fontsize=6.5, frameon=False, handlelength=1.0, bbox_to_anchor=(0.0, 0.99))
fig.legend(handles=[Line2D([0], [0], color=BL, lw=5, label='no error, as emitted (raw)'), Line2D([0], [0], color=OR, lw=5, label='no error, smooth-resampled at 0.25 x width'),
                    Line2D([0], [0], marker='D', mfc='white', mec='black', ls='none', ms=4.2, label='UNDERSAMPLED warning, same arm')],
           loc='lower left', bbox_to_anchor=(0.02, 0.0), ncol=1, fontsize=7, frameon=False, handlelength=1.5, labelspacing=0.25)
fig.suptitle('TrackSeed validator applied to tracks of other sources (E9, addendum-02)', fontsize=7.8, x=0.5, y=0.995)
fig.savefig(f'{FIG}/fig_e9_addendum.png'); print('fig_e9_addendum ok')
