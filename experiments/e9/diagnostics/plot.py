"""E9 POST-HOC DIAGNOSTIC (exploratory, not a pre-registered E9 prediction; see README.md). Renders the flagged tracks of flagged.mjs.

Run (after `node flagged.mjs`):  python3 -I plot.py
Input : ../build/diagnostics/<source>__<id>__<arm>.json   (written by flagged.mjs; build output, gitignored)
Output: out/overview_<source>__<id>__<arm>.png   whole track, validated polyline, every flagged vertex marked
        out/zoom_<source>__<id>__<arm>.png       up to 4 panels (largest turns), window of +-8 vertices around each flagged vertex:
                                                 raw input as dots and lines, the smooth-resampled polyline if the arm is smooth,
                                                 the flagged vertex highlighted, both road edges at the width used, angles in the titles.
Units are those of the source (m for TUMFTM and bacinger, generator units u otherwise); nothing is rescaled.
"""
import glob
import json
import os

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
IN = os.path.normpath(os.path.join(HERE, "..", "build", "diagnostics"))
OUT = os.path.join(HERE, "out")
WINDOW = 8
COL = {"LOCAL_KINK": "#d62728", "CLOSURE_TANGENT": "#ff7f0e"}
RAW_DOT, RAW_LINE, SMOOTH, EDGE = "#505050", "#c8c8c8", "#1f77b4", "#2b2b2b"


def draw_raw(ax, raw):
    xs = [p[0] for p in raw] + [raw[0][0]]
    zs = [p[1] for p in raw] + [raw[0][1]]
    ax.plot(xs, zs, "-", color=RAW_LINE, lw=0.8, zorder=1)
    ax.plot(xs[:-1], zs[:-1], "o", color=RAW_DOT, ms=2.2, zorder=2)


def overview(d, path):
    fig, ax = plt.subplots(figsize=(5.2, 5.2))
    draw_raw(ax, d["raw"])
    pts = d["pts"] + [d["pts"][0]]
    ax.plot([p[0] for p in pts], [p[1] for p in pts], "-", color=SMOOTH if d["arm"] == "smooth" else "k", lw=1.1, zorder=3)
    for f in d["flagged"]:
        x, z = d["pts"][f["index"]]
        ax.plot(x, z, "o" if f["code"] == "LOCAL_KINK" else "s", color=COL[f["code"]], ms=6, mec="white", mew=0.6, zorder=5)
    ax.set_aspect("equal")
    ax.set_xticks([])
    ax.set_yticks([])
    nk = sum(1 for f in d["flagged"] if f["code"] == "LOCAL_KINK")
    nc = len(d["flagged"]) - nk
    arm = "smooth arm (s = %.4g)" % d["spacing"] if d["arm"] == "smooth" else "raw arm"
    ax.set_title(f"{d['source']} {d['id']}\n{arm}, W = {d['W']:.4g} {d['units']}, {nk} LOCAL_KINK, {nc} CLOSURE_TANGENT",
                 fontsize=8.5)
    fig.text(0.01, 0.01, "dots: raw input; red circle: LOCAL_KINK; orange square: CLOSURE_TANGENT (seam)",
             fontsize=6.2, color="#444")
    fig.tight_layout(rect=(0, 0.03, 1, 1))
    fig.savefig(path, dpi=95)
    plt.close(fig)


def panel(ax, d, i):
    pts, n, W = d["pts"], d["n"], d["W"]
    win = [(i + k) % n for k in range(-WINDOW, WINDOW + 1)]
    wx = [pts[j][0] for j in win]
    wz = [pts[j][1] for j in win]
    span = max(max(wx) - min(wx), max(wz) - min(wz), 1e-9)
    cx, cz = (max(wx) + min(wx)) / 2, (max(wz) + min(wz)) / 2
    half = span / 2 + 1.2 * W
    draw_raw(ax, d["raw"])
    if d["arm"] == "smooth":
        ax.plot(wx, wz, "-", color=SMOOTH, lw=1.6, zorder=3)
    for edge in (d["edgeL"], d["edgeR"]):
        ax.plot([edge[j][0] for j in win], [edge[j][1] for j in win], "--", color=EDGE, lw=0.8, zorder=4)
    f = next(g for g in d["flagged"] if g["index"] == i)
    ax.plot(pts[i][0], pts[i][1], "o" if f["code"] == "LOCAL_KINK" else "s", color=COL[f["code"]], ms=8,
            mec="white", mew=0.8, zorder=6)
    ax.set_xlim(cx - half, cx + half)
    ax.set_ylim(cz - half, cz + half)
    ax.set_aspect("equal")
    ax.set_xticks([])
    ax.set_yticks([])
    dprev = ((pts[i][0] - pts[(i - 1) % n][0]) ** 2 + (pts[i][1] - pts[(i - 1) % n][1]) ** 2) ** 0.5
    dnext = ((pts[(i + 1) % n][0] - pts[i][0]) ** 2 + (pts[(i + 1) % n][1] - pts[i][1]) ** 2) ** 0.5
    ax.set_title(f"{f['code']} at vertex {i}: turn {f['turn']:.1f} deg\n"
                 f"reference {f['ref']:.1f} deg, limit {f['threshold']:.1f} deg\n"
                 f"prev {dprev:.2f}, next {dnext:.2f} {d['units']}; W {W:.3g}", fontsize=7)


def zoom_sheet(d, path):
    panels = d["panels"]
    k = len(panels)
    cols = 2 if k > 1 else 1
    rows = (k + 1) // 2
    fig, axes = plt.subplots(rows, cols, figsize=(max(4.6 * cols, 7.4), 4.4 * rows + 0.4), squeeze=False)
    for ax in axes.flat:
        ax.set_visible(False)
    for ax, i in zip(axes.flat, panels):
        ax.set_visible(True)
        panel(ax, d, i)
    nk = sum(1 for f in d["flagged"] if f["code"] == "LOCAL_KINK")
    arm = "smooth arm" if d["arm"] == "smooth" else "raw arm"
    fig.suptitle(f"{d['source']} {d['id']} ({arm})\nzoom on the {k} largest of {len(d['flagged'])} flagged vertices "
                 f"(window +-{WINDOW} vertices; {nk} LOCAL_KINK)", fontsize=9)
    fig.text(0.01, 0.005, "grey dots and lines: raw input; blue: smooth-resampled polyline; dashed: road edges at W; "
             "marker: flagged vertex", fontsize=6.5, color="#444")
    fig.tight_layout(rect=(0, 0.02, 1, 0.93))
    fig.savefig(path, dpi=90)
    plt.close(fig)


def main():
    os.makedirs(OUT, exist_ok=True)
    for stale in glob.glob(os.path.join(OUT, "*.png")):
        os.remove(stale)  # no PNG of an earlier selection survives
    files = sorted(glob.glob(os.path.join(IN, "*.json")))
    if not files:
        raise SystemExit(f"no plot inputs in {IN}; run `node flagged.mjs` first")
    for f in files:
        with open(f, encoding="utf-8") as fh:
            d = json.load(fh)
        overview(d, os.path.join(OUT, f"overview_{d['key']}.png"))
        zoom_sheet(d, os.path.join(OUT, f"zoom_{d['key']}.png"))
    print(f"plot.py: {len(files)} track-arms -> {OUT}")


if __name__ == "__main__":
    main()
