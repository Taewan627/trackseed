"""E10 figure: 2 x 2 panels from SUMMARY.json. A: paired spikes, share of must instances (S >= 30 deg) flagged, by gap; B: zigzag patches, error detection by amplitude;
C: regular polygons, error rate by n; D: down-sampled clean tracks, by keep-every-k. Bands = seed-clustered bootstrap 95 % (none in C: seed-free grid, 6 tracks per n).
Usage: python3 -I make-figure.py <results_dir> <out_basename>   (writes <out_basename>.png and .svg)"""
import json, os, sys
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
res, outbase = sys.argv[1], sys.argv[2]
S = json.load(open(os.path.join(res, "SUMMARY.json")))
T = S["tables"]
COL = {"R1": "#1b6ca8", "R4": "#c0392b", "R5": "#7f8c8d", "R2": "#e08a1e"}
NAME = {"R1": "v1.3 default", "R4": "v1.2 (both new checks off)", "R5": "legacy ratio", "R2": "v1.3, SHARP off"}
def get(tab, key, rule, m):
    c = T[tab].get(key)
    return None if c is None else c["rules"][rule][m]
def series(tab, keys, rule, m):
    xs, ys, lo, hi = [], [], [], []
    for i, k in enumerate(keys):
        s = get(tab, k, rule, m)
        if s is None or s.get("p") is None: continue
        xs.append(i); ys.append(100 * s["p"]); lo.append(100 * (s.get("lo") if s.get("lo") is not None else s["p"])); hi.append(100 * (s.get("hi") if s.get("hi") is not None else s["p"]))
    return xs, ys, lo, hi
def line(ax, tab, keys, rule, m, label=None, ls="-", color=None, marker="o", band=True):
    xs, ys, lo, hi = series(tab, keys, rule, m)
    c = color or COL[rule]
    ax.plot(xs, ys, ls, color=c, marker=marker, ms=4, lw=1.6, label=label)
    if band: ax.fill_between(xs, lo, hi, color=c, alpha=0.15, lw=0)
fig, axs = plt.subplots(2, 2, figsize=(11, 7.4), constrained_layout=True)
ax = axs[0, 0]
keys = [f"{g}|must" for g in (2, 3, 4, 5, 6)]
for r in ("R1", "R4", "R5"): line(ax, "paired_gap_size", keys, r, "M2", NAME[r])
ax.axvline(2.5, color="k", ls=":", lw=1); ax.text(2.55, 50, "relative rule's\nreference window ends", fontsize=8, va="center")
ax.set_xticks(range(5)); ax.set_xticklabels([f"gap {g}" for g in (2, 3, 4, 5, 6)]); ax.set_ylim(-3, 103)
ax.set_ylabel("flagged by the kink family (%)"); ax.set_title("A  Paired spikes, turn >= 30 deg: masking of the relative rule", fontsize=10); ax.legend(fontsize=8, loc="center left")
ax = axs[0, 1]
cs = ["0.02", "0.05", "0.1", "0.25", "0.5"]
for p, ls in ((2, "-"), (4, "--")):
    ks = [f"period {p}, c {c}" for c in cs]
    for r in ("R1", "R4"): line(ax, "zig_p_c", ks, r, "M1", f"{NAME[r]}, period {p}", ls=ls)
ax.set_xticks(range(5)); ax.set_xticklabels(cs); ax.set_xlabel("zigzag amplitude (units of road width)"); ax.set_ylim(-3, 103)
ax.set_ylabel("error detection (%)"); ax.set_title("B  Zigzag patches, all lengths pooled", fontsize=10); ax.legend(fontsize=7, loc="lower right")
ax = axs[1, 0]
ns = list(range(3, 17)); keys = [f"n={n}" for n in ns]
for r in ("R1", "R4", "R5"): line(ax, "poly_n", keys, r, "M1", NAME[r], band=False)
line(ax, "poly_n", keys, "R1", "under", "UNDERSAMPLED present (v1.3)", ls=":", color="#2e8b57", marker="s", band=False)
ax.set_xticks(range(len(ns))); ax.set_xticklabels(ns); ax.set_xlabel("regular n-gon (n = 12: 30 deg by construction, decided by rounding)"); ax.set_ylim(-3, 103)
ax.set_ylabel("error rate (%), 6 tracks per n"); ax.set_title("C  Regular polygons", fontsize=10); ax.legend(fontsize=8, loc="center right")
ax = axs[1, 1]
keys = [f"k={k}" for k in (2, 4, 8, 16)]
line(ax, "ds_k", keys, "R1", "M1", "v1.3: any error")
line(ax, "ds_k", keys, "R4", "M1", "v1.2: any error")
line(ax, "ds_k", keys, "R4", "M2", "v1.2: relative kink rule alone", ls="--", color="#8e44ad")
line(ax, "ds_k", keys, "R1", "under", "UNDERSAMPLED present (v1.3)", ls=":", color="#2e8b57", marker="s")
ax.set_xticks(range(4)); ax.set_xticklabels(["every 2nd", "every 4th", "every 8th", "every 16th"]); ax.set_ylim(-3, 103)
ax.set_xlabel("vertices kept of a clean TrackSeed track"); ax.set_ylabel("tracks (%)"); ax.set_title("D  Down-sampled clean tracks", fontsize=10); ax.legend(fontsize=8, loc="center right")
for a in axs.flat: a.grid(alpha=0.3)
fig.suptitle(f"E10: five validator rules on adversarial classes ({S['split']}, {S['seeds']} seeds)", fontsize=11)
fig.savefig(outbase + ".png", dpi=200); fig.savefig(outbase + ".svg")
print("wrote", outbase + ".png/.svg")
