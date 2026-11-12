"""E9 addendum-02 figure: per source, share of tracks passing validator v1.3 raw (as emitted) and after smooth resampling at the common rule (0.25 x road width), Wilson 95 % intervals,
with the share of tracks carrying the UNDERSAMPLED warning (diamonds) in the same arm. A sampling-and-geometry report under one rule set, not a ranking.
Usage: python3 -I make-figure-addendum-02.py <results_dir> <out_basename>   (writes <out_basename>.png and .svg)"""
import json, os, sys
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.lines import Line2D
res, outbase = sys.argv[1], sys.argv[2]
S = json.load(open(os.path.join(res, "SUMMARY.json")))["sources"]
order = [s for s in ["gen-trackseed", "real-tumftm", "gen-e5-thorimbert", "gen-juangallostra", "gen-amz-voronoi", "gen-carracing", "gen-zzangupenn", "real-bacinger-f1", "gen-driftschool-s2"] if s in S]
label = {"gen-trackseed": "TrackSeed (default parameters)", "real-tumftm": "TUMFTM circuits", "gen-e5-thorimbert": "E5 generator", "gen-juangallostra": "juangallostra (integer pixel grid)", "gen-amz-voronoi": "AMZ Voronoi",
         "gen-carracing": "CarRacing", "gen-zzangupenn": "track_gen", "real-bacinger-f1": "bacinger F1 (suppl.)", "gen-driftschool-s2": "drift-school stage 2 (suppl.)"}
fig, ax = plt.subplots(figsize=(9.2, 5.6), constrained_layout=True)
ys = list(range(len(order)))[::-1]
for y, s in zip(ys, order):
    a = S[s]["runs"]["main"]
    for off, arm, col in ((0.19, "raw", "#1b6ca8"), (-0.19, "cs25", "#e08a1e")):
        v = a[arm]["ok13"]
        ax.barh(y + off, 100 * v["p"], height=0.34, color=col, alpha=0.9)
        ax.plot([100 * v["lo"], 100 * v["hi"]], [y + off, y + off], color="black", lw=1)
        u = a[arm]["under"]
        ax.plot([100 * u["p"]], [y + off], marker="D", ms=6, mfc="white", mec="black", mew=1.2, ls="none", zorder=5)
        ax.text(min(100 * v["hi"] + 1.5, 104), y + off, f'{100 * v["p"]:.0f}%', va="center", fontsize=8)
ax.set_yticks(ys); ax.set_yticklabels([f"{label[s]} (n={S[s]['produced']})" for s in order], fontsize=8)
ax.set_xlim(0, 112); ax.set_xlabel("tracks (%)"); ax.grid(axis="x", alpha=0.3)
ax.legend(handles=[Line2D([0], [0], color="#1b6ca8", lw=6, label="passes v1.3, as emitted (raw)"), Line2D([0], [0], color="#e08a1e", lw=6, label="passes v1.3, smooth-resampled at 0.25 x road width"),
                   Line2D([0], [0], marker="D", mfc="white", mec="black", ls="none", label="carries the UNDERSAMPLED warning (same arm)")], fontsize=8, loc="upper center", bbox_to_anchor=(0.5, -0.12), ncol=1, frameon=False)
ax.set_title("What validator v1.3 reports about each source's sampling and geometry, one rule set\n(not a ranking; v1.3 was calibrated on TrackSeed's tracks)", fontsize=10)
fig.savefig(outbase + ".png", dpi=200); fig.savefig(outbase + ".svg")
print("wrote", outbase + ".png/.svg")
