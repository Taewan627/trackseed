"""Combined E9 figure: left, validity (ok rate with Wilson 95 % interval) per source, raw vs smooth; right, three normalised metrics (norm-720 arm) as strip plots,
TUMFTM circuits highlighted. Usage: python3 -I make-figure.py <results_dir> <out_basename>   (writes <out_basename>.png and .svg)"""
import csv, gzip, json, os, random, sys
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
res, outbase = sys.argv[1], sys.argv[2]
S = json.load(open(os.path.join(res, "SUMMARY.json")))
p = os.path.join(res, "tracks.csv")
rows = list(csv.DictReader(gzip.open(p + ".gz", "rt") if not os.path.exists(p) else open(p)))
order = ["real-tumftm", "gen-e5-thorimbert", "gen-juangallostra", "gen-amz-voronoi", "gen-carracing", "gen-zzangupenn", "real-bacinger-f1", "gen-driftschool-s2"]
label = {"real-tumftm": "TUMFTM circuits (n=25)", "gen-e5-thorimbert": "E5 generator", "gen-juangallostra": "juangallostra", "gen-amz-voronoi": "AMZ Voronoi",
         "gen-carracing": "CarRacing", "gen-zzangupenn": "track_gen (CarRacing variant)", "real-bacinger-f1": "bacinger F1 (suppl.)", "gen-driftschool-s2": "drift-school stage 2 (suppl.)"}
order = [s for s in order if s in S["Q1"]]
fig = plt.figure(figsize=(13, 5.2), constrained_layout=True)
gs = fig.add_gridspec(1, 4, width_ratios=[1.5, 1, 1, 1])
ax = fig.add_subplot(gs[0])
ys = list(range(len(order)))[::-1]
for y, s in zip(ys, order):
    a = S["Q1"][s]["runs"]["main"]["arms"]
    for off, arm, col in ((0.18, "raw", "#1b6ca8"), (-0.18, "smooth", "#e08a1e")):
        v = a[arm]; lo, hi = v["wilson95"]
        ax.barh(y + off, v["okRate"], height=0.32, color=col, label=arm if y == ys[0] else None)
        ax.plot([lo, hi], [y + off, y + off], color="black", lw=1)
        ax.text(min(hi + 1.5, 104), y + off, f'{v["okRate"]:.0f}%', va="center", fontsize=8)
ax.set_yticks(ys); ax.set_yticklabels([label[s] + f' (n={S["Q1"][s]["produced"]})' if s != "real-tumftm" else label[s] for s in order], fontsize=8)
ax.set_xlim(0, 115); ax.set_xlabel("tracks passing the validator (%), Wilson 95 % interval"); ax.set_title("Validity: raw polyline vs smooth-resampled", fontsize=10)
ax.legend(loc="upper center", bbox_to_anchor=(0.5, -0.16), ncol=2, fontsize=8, frameon=False)
mets = [("meanAbsCurvatureNorm", "mean |kappa-hat|"), ("straightLengthFractionNorm", "straight length fraction"), ("turnCountNorm", "turn count")]
byres = {}
for r in rows:
    if r["arm"] == "n720" and r["outcome"] == "metrics": byres.setdefault(r["source"], []).append(r)
rng = random.Random(7)
msrc = [s for s in order if s in byres]
for k, (m, title) in enumerate(mets):
    a2 = fig.add_subplot(gs[k + 1])
    for y, s in zip(range(len(msrc))[::-1], msrc):
        v = [float(r[m]) for r in byres[s]]
        real = s.startswith("real-")
        a2.scatter(v, [y + rng.uniform(-0.3, 0.3) for _ in v], s=14 if real else 3, alpha=0.9 if real else 0.25, color="#c0392b" if real else "#555555", linewidths=0, zorder=3 if real else 2)
        if v:
            sv = sorted(v); med = sv[len(sv) // 2]; a2.plot([med, med], [y - 0.38, y + 0.38], color="black", lw=1.6, zorder=4)
    a2.set_yticks(range(len(msrc))[::-1]); a2.set_yticklabels([] if k else [label[s].split(" (")[0] for s in msrc], fontsize=8)
    a2.set_title(title, fontsize=10); a2.grid(axis="x", alpha=0.3)
fig.suptitle("E9: TrackLab validator and metrics on tracks not made by the authors (red = real circuits, black bar = median)", fontsize=11)
fig.savefig(outbase + ".png", dpi=200); fig.savefig(outbase + ".svg")
print("wrote", outbase + ".png/.svg")
