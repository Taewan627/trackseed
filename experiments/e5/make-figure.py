# One figure: pairwise cross-engine agreement matrix (Q1) and validity share per road width (Q2). Reads results/SUMMARY.json.
import json, os
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

here = os.path.dirname(os.path.abspath(__file__))
S = json.load(open(os.path.join(here, "results", "SUMMARY.json")))
labels = S["pairwiseAgreementCounts"]["labels"]
M = np.array(S["pairwiseAgreementCounts"]["counts"], dtype=float) / S["cases"] * 100
names = {"node22": "Node 22", "node22-repeat": "Node 22 (repeat)", "node20": "Node 20", "node24": "Node 24",
         "deno": "Deno", "bun": "Bun (JSC)", "chrome": "Chrome", "firefox": "Firefox (SM)"}
fig, (a, b) = plt.subplots(1, 2, figsize=(11.5, 4.6), gridspec_kw={"width_ratios": [1.5, 1]})
im = a.imshow(M, vmin=0, vmax=100, cmap="Blues")
a.set_xticks(range(len(labels))); a.set_yticks(range(len(labels)))
a.set_xticklabels([names.get(l, l) for l in labels], rotation=40, ha="right"); a.set_yticklabels([names.get(l, l) for l in labels])
for i in range(len(labels)):
    for j in range(len(labels)):
        a.text(j, i, f"{M[i, j]:.0f}", ha="center", va="center", color="white" if M[i, j] > 55 else "black", fontsize=9)
a.set_title(f"Q1: identical output for the same seed (% of {S['cases']} seeds)", fontsize=10)
fig.colorbar(im, ax=a, fraction=0.046, pad=0.03)
W = sorted(S["Q2"]["widths"], key=float)
share = [S["Q2"]["widths"][w]["passShareOfOk"] for w in W]
lo = [S["Q2"]["widths"][w]["passShareOfOk"] - S["Q2"]["widths"][w]["wilson95"][0] for w in W]
hi = [S["Q2"]["widths"][w]["wilson95"][1] - S["Q2"]["widths"][w]["passShareOfOk"] for w in W]
b.bar([f"W = {w}" for w in W], share, yerr=[lo, hi], color="#4477aa", capsize=4)
for i, v in enumerate(share): b.text(i, 2, f"{v:.1f}%", ha="center", color="white", fontsize=10)
b.set_ylim(0, 100); b.set_ylabel("outputs passing TrackLab validator (%)")
b.set_title("Q2: validity at road width W (95% Wilson interval)", fontsize=10)
b.spines[["top", "right"]].set_visible(False)
fig.suptitle("E5: YannThorimbert/RacingTrackGenerator @ 3a359db, seeded Math.random", fontsize=11)
fig.tight_layout()
fig.savefig(os.path.join(here, "results", "figure-e5.png"), dpi=200)
fig.savefig(os.path.join(here, "results", "figure-e5.svg"))
print("wrote results/figure-e5.png and .svg")
