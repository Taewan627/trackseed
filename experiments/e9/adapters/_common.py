"""Shared helpers of the E9 adapters (stdlib only).

Polyline file format written for TrackSeed (src/polyline.ts, parsePolylineJson): a JSON object whose "points" are [x, z] pairs
(ground plane x/z; the source's (x, y) plane is mapped to (x, z) WITHOUT flipping or rescaling). The parser ignores the extra keys
("width", "unit", ...), which only document the file; the width must still be passed to the CLI (--width), the value is also in
<source>/manifest.tsv.

Closure policy (the only change an adapter makes to a point list): TrackSeed stores a closed loop as n vertices (an explicit copy of
points[0] at the end is accepted if it is bit-identical). If the LAST point equals the first point exactly, it is kept as the source
produced it. If it differs from the first point by <= 1e-9 * (bounding-box diagonal) but is not bit-identical (floating-point noise of
a periodic spline), that last point is DROPPED (a near-duplicate closing vertex would create a zero-length segment that the source
itself does not contain as a distinct vertex); the manifest records closing_vertex_dropped=1. Nothing else is repaired, smoothed,
de-duplicated, reordered or resampled.
"""
import json, math, os, sys

MANIFEST_COLUMNS = ["id", "n_points", "width", "unit", "length", "median_spacing", "closing_vertex_dropped", "note"]


def normalise_closure(pts):
    """pts: list of (x, z). Returns (pts, dropped)."""
    if len(pts) >= 4 and pts[0] != pts[-1]:
        xs = [p[0] for p in pts]; zs = [p[1] for p in pts]
        diag = math.hypot(max(xs) - min(xs), max(zs) - min(zs))
        if math.hypot(pts[0][0] - pts[-1][0], pts[0][1] - pts[-1][1]) <= 1e-9 * diag:
            return pts[:-1], True
    return pts, False


def spacing_stats(pts):
    """Median edge length and perimeter of the closed polyline (implicit closing edge if the last point is not a copy of the first)."""
    n = len(pts)
    closed_copy = n >= 2 and pts[0] == pts[-1]
    m = n - 1 if closed_copy else n
    d = [math.hypot(pts[(i + 1) % m][0] - pts[i][0], pts[(i + 1) % m][1] - pts[i][1]) for i in range(m)]
    ds = sorted(d)
    med = ds[len(ds) // 2] if len(ds) % 2 else 0.5 * (ds[len(ds) // 2 - 1] + ds[len(ds) // 2])
    return med, sum(d)


class Writer:
    def __init__(self, outdir, source, unit):
        self.dir = os.path.join(outdir, source)
        os.makedirs(self.dir, exist_ok=True)
        self.source, self.unit = source, unit
        self.rows, self.failures = [], []

    def add(self, tid, pts, width, note="", extra=None):
        pts = [(float(x), float(z)) for x, z in pts]
        if not all(math.isfinite(c) for p in pts for c in p):
            self.failures.append((tid, "non-finite coordinate in generator output")); return
        pts, dropped = normalise_closure(pts)
        med, length = spacing_stats(pts)
        doc = {"source": self.source, "id": tid, "unit": self.unit, "width": width, "closed": True, "points": [[x, z] for x, z in pts]}
        if extra: doc["meta"] = extra
        with open(os.path.join(self.dir, f"{tid}.json"), "w") as f:
            json.dump(doc, f, separators=(",", ":")); f.write("\n")
        self.rows.append([tid, len(pts), repr(float(width)), self.unit, repr(length), repr(med), int(dropped), note])

    def fail(self, tid, reason):
        self.failures.append((tid, reason))

    def close(self):
        with open(os.path.join(self.dir, "manifest.tsv"), "w") as f:
            f.write("\t".join(MANIFEST_COLUMNS) + "\n")
            for r in self.rows: f.write("\t".join(str(c) for c in r) + "\n")
        with open(os.path.join(self.dir, "failures.tsv"), "w") as f:
            f.write("id\treason\n")
            for tid, why in self.failures: f.write(f"{tid}\t{why}\n")
        print(f"[{self.source}] wrote {len(self.rows)} polylines, {len(self.failures)} generator failures -> {self.dir}")


def load_seeds(build_dir, limit=None):
    seeds = json.load(open(os.path.join(build_dir, "seeds.json")))
    return seeds[:limit] if limit else seeds


def parse_args(argv, extra=()):
    """--build DIR --limit N (first N seeds of the registered list)"""
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--build", required=True)
    ap.add_argument("--limit", type=int, default=None)
    for e in extra: ap.add_argument(e[0], **e[1])
    return ap.parse_args(argv)


class Timeout(Exception):
    pass


def with_timeout(seconds, fn, *a):
    import signal
    def h(signum, frame): raise Timeout(f"timeout after {seconds}s")
    old = signal.signal(signal.SIGALRM, h)
    signal.setitimer(signal.ITIMER_REAL, seconds)
    try:
        return fn(*a)
    finally:
        signal.setitimer(signal.ITIMER_REAL, 0)
        signal.signal(signal.SIGALRM, old)
