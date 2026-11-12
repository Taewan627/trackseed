"""TUMFTM/racetrack-database (25 real circuits) -> TrackSeed polylines. Run: python3 -I real_tumftm.py --build ../build
Input  tracks/<Name>.csv: '# x_m,y_m,w_tr_right_m,w_tr_left_m' (metres, local Cartesian, centre line smoothed by the authors, ~5 m spacing,
       open vertex list, the loop closes implicitly: last->first gap is also ~5 m).
Output points (x, y) -> (x, z) unchanged, unit m. Width: ONE value per circuit = median over the points of (w_tr_right + w_tr_left);
       the per-point widths (min/median/max) are recorded in the note column because TrackSeed's polyline path takes a single width.
"""
import csv, glob, os, statistics, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import Writer, parse_args

a = parse_args(sys.argv[1:])
src = os.path.join(a.build, "third_party", "tumftm-racetrack-database", "tracks")
w = Writer(os.path.join(a.build, "polylines"), "real-tumftm", "m")
for f in sorted(glob.glob(os.path.join(src, "*.csv"))):
    name = os.path.splitext(os.path.basename(f))[0]
    rows = [r for r in csv.reader(open(f)) if r and not r[0].lstrip().startswith("#")]
    P = [tuple(float(c) for c in r) for r in rows]
    widths = [p[2] + p[3] for p in P]
    width = round(statistics.median(widths), 3)
    note = f"width per point min/median/max = {min(widths):.2f}/{statistics.median(widths):.2f}/{max(widths):.2f}"
    w.add(name, [(p[0], p[1]) for p in P], width, note)
w.close()
