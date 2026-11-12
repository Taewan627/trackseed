"""bacinger/f1-circuits (40 F1 circuits, GeoJSON LineString, WGS84 lon/lat) -> TrackSeed polylines.
Run: python3 -I real_bacinger.py --build ../build
Projection (documented, not from the source): local equirectangular plane around the circuit's bounding-box centre,
   x = R * cos(lat0) * (lon - lon0) [rad], z = R * (lat - lat0) [rad], R = 6371008.8 m (mean Earth radius), unit m.
   East = +x, north = +z. For circuits of < 10 km extent the distortion of this projection is < 0.1 % in length.
Points are used exactly as listed (the source LineString repeats its first point as last point; that exact copy is kept).
Width: the dataset has NO width. A constant ASSUMED width of 12 m is declared (FIA minimum track width for F1-grade circuits; this is an
   assumption of the experiment, not a measurement; to be re-checked against the FIA regulation text in phase 2).
The dataset's own 'length' property (metres) is recorded in the note column for a sanity comparison with the projected length.
"""
import glob, json, math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import Writer, parse_args

R = 6371008.8
ASSUMED_WIDTH = 12.0
a = parse_args(sys.argv[1:])
src = os.path.join(a.build, "third_party", "bacinger-f1-circuits", "circuits")
w = Writer(os.path.join(a.build, "polylines"), "real-bacinger-f1", "m")
for f in sorted(glob.glob(os.path.join(src, "*.geojson"))):
    d = json.load(open(f))
    feats = [ft for ft in d["features"] if ft["geometry"]["type"] == "LineString"]
    if len(feats) != 1:
        w.fail(os.path.basename(f), f"{len(feats)} LineString features"); continue
    ft = feats[0]; c = ft["geometry"]["coordinates"]
    lon0 = (min(p[0] for p in c) + max(p[0] for p in c)) / 2; lat0 = (min(p[1] for p in c) + max(p[1] for p in c)) / 2
    k = R * math.cos(math.radians(lat0)) * math.pi / 180.0
    pts = [(k * (p[0] - lon0), R * math.radians(p[1] - lat0)) for p in c]
    props = ft["properties"]
    w.add(props["id"], pts, ASSUMED_WIDTH, f"{props['Name']}; dataset length property {props.get('length')} m; width ASSUMED 12 m (no width in source)")
w.close()
