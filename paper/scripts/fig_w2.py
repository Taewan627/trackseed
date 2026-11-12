"""W2 figure (manuscript Fig. 3): TUMFTM Melbourne through validate-polyline at validator v1.3 (software commit 0441abe).
(a) whole circuit, as emitted (5 m vertex spacing, width 12.24 m), the vertices flagged in the raw arm marked; (b, c) the two flagged vertices with +-8 vertices around them:
raw vertices, road edges at the supplied width, and the --resample-smooth polyline (spacing 0.25 x width) that passes the validator.
Input: w2_melbourne_points.json and w2_melbourne_raw.json written by w2_example.mjs (the points are third-party data, not committed).
Usage: python3 -I paper/scripts/fig_w2.py <dir with w2_melbourne_*.json>"""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
import matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt
style()
d = sys.argv[1]
P = json.load(open(os.path.join(d, 'w2_melbourne_points.json'))); R = json.load(open(os.path.join(d, 'w2_melbourne_raw.json')))
raw = P['raw'][:-1]; n = len(raw); W = P['width']; sm = P['smooth']; eL, eR = P['edges'][0][:-1], P['edges'][1][:-1]
assert n == R['input']['pointCount'] == 1060
fl = {}
for v in R['violations']:
    fl.setdefault(v['index'], []).append((v['code'], v['value']))
assert set(fl) == {379, 835}, fl
fig = plt.figure(figsize=(5.9, 2.35))
gs = fig.add_gridspec(1, 3, width_ratios=[1.25, 1, 1], left=0.005, right=0.995, top=0.86, bottom=0.09, wspace=0.04)
ax = fig.add_subplot(gs[0])
xs = [p[0] for p in raw] + [raw[0][0]]; zs = [p[1] for p in raw] + [raw[0][1]]
ax.plot(xs, zs, '-', color='#555555', lw=0.9)
for i, v in fl.items():
    ax.plot(*raw[i], 'o', ms=6, mfc=OI['verm'], mec='white', mew=0.8, zorder=5)
    ax.annotate(f'vertex {i}', raw[i], xytext=(10, -13) if i == 379 else (-52, -4), textcoords='offset points', fontsize=7, color=INK)
ax.set_aspect('equal'); ax.axis('off'); ax.set_title('(a) Melbourne, as emitted', fontsize=7.5, loc='left')
ax.text(0.0, -0.01, '1060 vertices, 5 m apart;\nroad width 12.24 m', transform=ax.transAxes, fontsize=7, va='top')
def zoom(a, i, title):
    win = [(i + k) % n for k in range(-8, 9)]
    wx = [raw[j][0] for j in win]; wz = [raw[j][1] for j in win]
    a.plot([eL[j][0] for j in win], [eL[j][1] for j in win], '--', color='#888888', lw=0.7); a.plot([eR[j][0] for j in win], [eR[j][1] for j in win], '--', color='#888888', lw=0.7)
    cx, cz = (max(wx) + min(wx)) / 2, (max(wz) + min(wz)) / 2; half = max(max(wx) - min(wx), max(wz) - min(wz)) / 2 + 0.9 * W
    a.plot(wx, wz, '-o', color='#555555', ms=3, lw=0.8, label='as emitted')
    # smoothed points inside the window
    inside = [(x, z) for x, z in sm if abs(x - cx) < half and abs(z - cz) < half]
    a.plot([p[0] for p in inside], [p[1] for p in inside], '.', color=OI['blue'], ms=2.2, label='smooth-resampled')
    a.plot(*raw[i], 'o', ms=7, mfc=OI['verm'], mec='white', mew=0.8, zorder=5)
    a.set_xlim(cx - half, cx + half); a.set_ylim(cz - half, cz + half); a.set_aspect('equal'); a.set_xticks([]); a.set_yticks([])
    for s in a.spines.values(): s.set_visible(True); s.set_edgecolor('#999999')
    a.set_title(title, fontsize=7.5, loc='left')
b = fig.add_subplot(gs[1]); zoom(b, 835, '(b) vertex 835: turn 33.8°\nLOCAL_KINK and SHARP_VERTEX')
c = fig.add_subplot(gs[2]); zoom(c, 379, '(c) vertex 379: turn 25.6°\nLOCAL_KINK')
h, l = b.get_legend_handles_labels(); fig.legend(h, l, loc='lower right', bbox_to_anchor=(0.995, 0.0), ncol=2, fontsize=7, frameon=False, handlelength=1.2)
fig.savefig(f'{FIG}/fig_w2.png'); print('fig_w2 ok')
