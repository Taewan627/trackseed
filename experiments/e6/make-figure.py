"""E6 figure: detection rate vs nominal defect size per operator and rule (HELD-OUT), height-step MAX_SLOPE rate, false-positive rates.
Usage: python3 experiments/e6/make-figure.py [heldout.json] [out.png]   (matplotlib only; reads the JSON written by run-heldout.mjs)"""
import json, os, sys
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

here = os.path.dirname(os.path.abspath(__file__))
src = sys.argv[1] if len(sys.argv) > 1 else os.path.join(here, 'results', 'heldout', 'heldout.json')
dst = sys.argv[2] if len(sys.argv) > 2 else os.path.join(here, 'results', 'heldout', 'figures', 'e6_detection_and_fpr.png')
os.makedirs(os.path.dirname(dst), exist_ok=True)
r = json.load(open(src))
RULES = [('frozen', 'frozen kink rule (v1.1)', '#1b6ca8', 'o', '-'), ('ratio', "legacy 'ratio' (v1.0.0)", '#d1495b', 's', '--'), ('absolute', "legacy 'absolute' (5 deg)", '#6a994e', '^', ':')]
OPS = [('seamSpike', 'seam lateral spike, d (units)'), ('interiorSpike', 'interior lateral spike, d (units)'), ('corner', 'interior corner, angle (deg)'), ('tangent', 'seam tangent break, angle (deg)')]
fig, axes = plt.subplots(2, 3, figsize=(15, 8.2))
for ax, (op, title) in zip(axes.flat, OPS):
    levels = list(r['defects']['frozen'][op]['levels'].keys())
    xs = range(len(levels))
    for k, (rule, label, col, mk, ls) in enumerate(RULES):
        cells = [r['defects'][rule][op]['levels'][l]['all'] for l in levels]
        y = [c['p'] for c in cells]
        err = [[c['p'] - c['lo'] for c in cells], [c['hi'] - c['p'] for c in cells]]
        ax.errorbar([x + (k - 1) * 0.06 for x in xs], y, yerr=err, color=col, marker=mk, ls=ls, capsize=2.5, lw=1.4, ms=5, label=label)
    # annotate the share of must-detect instances per level
    for x, l in zip(xs, levels):
        c = r['defects']['frozen'][op]['levels'][l]
        ax.text(x, -0.14, f"must {c['must']['n']}/{c['all']['n']}", ha='center', va='top', fontsize=7, color='#444')
    ax.set_xticks(list(xs)); ax.set_xticklabels(levels); ax.set_ylim(-0.03, 1.05); ax.set_title(title, fontsize=10)
    ax.set_ylabel('detection rate (all instances)'); ax.grid(alpha=0.25)
axes[0, 0].legend(fontsize=8, loc='lower right')
# height step
ax = axes.flat[4]
hs = r['heightStep']; levels = list(hs.keys()); cells = [hs[l]['maxSlopeFailuresIncreased'] for l in levels]
ax.errorbar(range(len(levels)), [c['p'] for c in cells], yerr=[[c['p'] - c['lo'] for c in cells], [c['hi'] - c['p'] for c in cells]], color='#555', marker='o', capsize=2.5)
ax.set_xticks(range(len(levels))); ax.set_xticklabels(levels); ax.set_ylim(-0.03, 1.05)
ax.set_title('height step dy (units): MAX_SLOPE warning count rises\n(not a planar kink; no error-severity detection claimed)', fontsize=9); ax.set_ylabel('fraction of instances'); ax.grid(alpha=0.25)
# false positives
ax = axes.flat[5]
sets = ['N1', 'N2', 'N3']; w = 0.26
for k, (rule, label, col, mk, ls) in enumerate(RULES):
    cells = [r['negatives'][rule][s] for s in sets]
    ax.bar([i + (k - 1) * w for i in range(3)], [c['p'] for c in cells], w, color=col, alpha=0.85,
           yerr=[[c['p'] - c['lo'] for c in cells], [c['hi'] - c['p'] for c in cells]], capsize=2.5, label=label)
ax.set_xticks(range(3)); ax.set_xticklabels([f"N1 pattern modes\n(n={r['negatives']['frozen']['N1']['n']})", f"N2 Auto straight 0\n(n={r['negatives']['frozen']['N2']['n']})", f"N3 synthetic\n(n={r['negatives']['frozen']['N3']['n']})"], fontsize=8)
ax.set_ylabel('false-positive rate (clean tracks flagged)'); ax.set_title('false positives on clean negatives (Wilson 95% CI)', fontsize=10); ax.grid(alpha=0.25, axis='y')
fig.suptitle(f"E6 {r['split']}: {len(r['seeds'])} seeds; frozen rule = {r['frozen']['label']}; error bars Wilson 95% CI", fontsize=11)
fig.tight_layout(rect=(0, 0.02, 1, 0.96))
fig.savefig(dst, dpi=150)
print(dst)
