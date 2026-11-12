"""AMZ-Racing/random-track-generator (MIT, Python; bounded Voronoi diagram + periodic spline, Formula Student cone tracks) -> polylines.
Run: MPLBACKEND=Agg python3 -I gen_amz.py --build ../build [--limit N]

track_generator.py is imported UNMODIFIED. The class only emits cones (yaml/gpx/plot); the centre line is the local arrays x, y (1000-point
periodic spline, final iteration of the curvature loop) and is passed to the method visualise_voronoi(vor, sorted_vertices,
random_point_indices, input_points, x, y) at the end of create_track(). The adapter subclasses TrackGenerator and overrides ONLY that
rendering hook to capture x, y (plot_track=False, create_output_file=False, visualise_voronoi=True so that the hook is called). The
generation algorithm is not touched. x, y are in the generator's frame BEFORE its final translate/rotate to the start pose (a rigid
motion; irrelevant for the polyline).
Parameters = those of the repository's main.py/README: n_points=60, n_regions=20, bounds 0..150 m, Mode.EXTEND (the other modes are
available with --mode 1|2|3, default 2). Unit: metres. Width: 3.0 m (self._track_width in the constructor; the generator builds the
track as Polygon(x, y).buffer(+-width/2), so 3 m is the full width).
Seeding: the generator draws from numpy's GLOBAL RNG (np.random.uniform/randint) and exposes no seed argument; np.random.seed(seed) is
called before each track (no RNG replaced). The loops `while True` in create_track() can in principle not terminate: each track runs under a 60 s timeout.
Failures (exceptions from the generator, timeout) are recorded, not retried.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import Writer, parse_args, load_seeds, with_timeout
a = parse_args(sys.argv[1:], [("--mode", dict(type=int, default=2, choices=[1, 2, 3]))])
tp = os.path.join(a.build, "third_party", "amz-random-track-generator")
sys.path.insert(0, tp)
os.environ.setdefault("MPLBACKEND", "Agg")
import numpy as np                              # noqa: E402
import track_generator as tg                    # noqa: E402
from utils import Mode, SimType                 # noqa: E402
assert os.path.dirname(os.path.abspath(tg.__file__)) == os.path.abspath(tp), tg.__file__

class Capture(tg.TrackGenerator):
    captured = None
    def visualise_voronoi(self, vor, sorted_vertices, random_point_indices, input_points, x, y):  # rendering hook only
        self.captured = (np.array(x, dtype=float), np.array(y, dtype=float))

def one():
    g = Capture(60, 20, 0., 150., Mode(a.mode), False, True, False, "/", sim_type=SimType.GPX)
    g.create_track()
    return g.captured

w = Writer(os.path.join(a.build, "polylines"), "gen-amz-voronoi", "m")
for seed in load_seeds(a.build, a.limit):
    np.random.seed(seed % (2**32))
    try:
        cap = with_timeout(60, one)
    except Exception as e:
        w.fail(f"s{seed}", f"{type(e).__name__}: {str(e)[:80]}"); continue
    if cap is None:
        w.fail(f"s{seed}", "hook not called"); continue
    x, y = cap
    w.add(f"s{seed}", list(zip(x.tolist(), y.tolist())), 3.0, f"seed {seed} mode {a.mode}")
w.close()
