"""Fig. 1: TrackSeed module structure (file names from src/ at software v1.2.0, commit 3765362; data flow as described in README.md).
Designed at its printed width (5.2 in), so that all text is at least 7 pt in print."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
import matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
style()
fig, ax = plt.subplots(figsize=(5.2, 3.75)); ax.set_xlim(-1, 101); ax.set_ylim(-14, 65); ax.axis('off')
FS, TFS = 7.0, 7.6
def box(x, y, w, h, title, lines, fc, ec):
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle='round,pad=0.2,rounding_size=1.0', fc=fc, ec=ec, lw=0.9))
    ax.text(x + w / 2, y + h - 1.2, title, ha='center', va='top', fontsize=TFS, fontweight='bold', color=INK)
    ax.text(x + w / 2, y + h - 4.6, '\n'.join(lines), ha='center', va='top', fontsize=FS, color=INK, linespacing=1.1)
def arrow(a, b, style='-|>'):
    ax.add_patch(FancyArrowPatch(a, b, arrowstyle=style, mutation_scale=7, lw=0.9, color='#444444', shrinkA=0, shrinkB=0))
LB, LBe = '#E8F1F8', OI['blue']; LO, LOe = '#FBF0DC', OI['orange']; LG, LGe = '#E6F4EE', OI['green']; LP, LPe = '#F7E9F0', OI['purple']; GR, GRe = '#F0F0F0', '#777777'
ax.add_patch(FancyBboxPatch((0, 12), 100, 52, boxstyle='round,pad=0.2,rounding_size=1.0', fc='none', ec='#999999', lw=0.7, ls=(0, (4, 3))))
ax.text(1.5, 15.2, 'Library (runs under Node, no browser)', fontsize=7.0, color='#555555', va='top', style='italic')
box(2, 18, 31, 36, 'Core generator', ['core.ts: 13 parameters,', 'seeded PRNG, spline,', 'autoJoin, elevation', 'patterns.ts: corners', 'detmath.ts: sin, cos,', 'atan2, hypot, exp'], LB, LBe)
box(38, 43.5, 26, 10.5, 'Validator', ['validate.ts: 8 checks,', 'reports, no repair'], LO, LOe)
box(38, 31.5, 26, 10.5, 'Metrics', ['metrics.ts: curvature,', 'normalised κ̂'], LO, LOe)
box(38, 19.5, 26, 10.5, 'Polyline input', ['polyline.ts: closed x/z', 'polyline, smoothing'], LP, LPe)
box(69, 18, 29, 36, 'Exchange v1', ['schema.ts: canonical', 'JSON, import, export', 'sha256.ts: digest and', 'contentDigest', 'JSON Schema file'], LG, LGe)
arrow((33, 48.5), (38, 48.5)); arrow((33, 36.5), (38, 36.5))
ax.plot([17, 83], [59, 59], color='#444444', lw=0.9)
arrow((17, 59), (17, 54.3), '<|-|>'); arrow((83, 59), (83, 54.3), '<|-|>')
ax.text(50, 59.6, 'export Track to document; import by regeneration', fontsize=7.0, ha='center', va='bottom', color='#333333')
box(2, -13, 30, 16, 'Command line', ['cli.ts: generate, batch,', 'validate, metrics,', 'validate-polyline,', 'metrics-polyline'], LP, LPe)
box(36, -13, 28, 16, 'Web UI (Three.js)', ['main.ts, view.ts;', 'vehicle.ts: kinematic', 'driving preview', '(not in determinism)'], LP, LPe)
box(68, -13, 30, 16, 'Experiments, tests', ['experiments/e1 to e9;', 'tests/ (Node, browser)'], GR, GRe)
for x in (17, 50, 83): arrow((x, 3.3), (x, 11.8))
fig.savefig(f'{FIG}/fig1_architecture.png')
print('fig1 ok')
