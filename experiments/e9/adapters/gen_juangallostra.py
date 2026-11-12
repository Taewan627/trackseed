"""juangallostra/procedural-tracks (MIT, Python; convex hull + random displacement + periodic spline) -> polylines.
Run: SDL_VIDEODRIVER=dummy python3 -I gen_juangallostra.py --build ../build [--limit N]

Generator code is imported UNMODIFIED from build/third_party/juangallostra-procedural-tracks (main.py; its pygame import is satisfied by the
installed pygame/pygame-ce package, no window is opened). The functions are called in exactly the order of that file's main():
    points = random_points(); hull = ConvexHull(points); track_points = shape_track(get_track_points(hull, points)); f_points = smooth_track(track_points)
Output polyline = f_points (1000 integer pixel positions of the periodic spline; the last equals the first). Corner/kerb/checkpoint
code of main() is rendering only and is not called.
Seeding: the generator draws only from Python's global `random` module (imported as rn) and its source has a commented-out `rn.seed(...)`
(COOL_TRACK_SEEDS), i.e. seeding is the generator's own documented mechanism: rn.seed(seed) is called before each track. No RNG is replaced.
Units: pixels (screen 800x600, margin 50). Width: TRACK_WIDTH = 40 px (constants.py; the road is drawn 40 px wide: radius = TRACK_WIDTH // 2).
Failures (an exception inside the generator, e.g. ZeroDivisionError from coincident points, or a 60 s timeout) are recorded, not retried.
"""
import os, sys, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import Writer, parse_args, load_seeds, with_timeout
a = parse_args(sys.argv[1:])
tp = os.path.join(a.build, "third_party", "juangallostra-procedural-tracks")
sys.path.insert(0, tp)
os.environ.setdefault("SDL_VIDEODRIVER", "dummy"); os.environ.setdefault("SDL_AUDIODRIVER", "dummy")
import main as gen                       # noqa: E402  (third-party main.py; the __main__ guard keeps it from running)
from scipy.spatial import ConvexHull     # noqa: E402
assert os.path.dirname(os.path.abspath(gen.__file__)) == os.path.abspath(tp), gen.__file__

def one():
    points = gen.random_points()
    hull = ConvexHull(points)
    track_points = gen.shape_track(gen.get_track_points(hull, points))
    return gen.smooth_track(track_points)

w = Writer(os.path.join(a.build, "polylines"), "gen-juangallostra", "px")
for seed in load_seeds(a.build, a.limit):
    random.seed(seed)
    try:
        f = with_timeout(60, one)
    except Exception as e:
        w.fail(f"s{seed}", f"{type(e).__name__}: {str(e)[:80]}"); continue
    w.add(f"s{seed}", f, gen.TRACK_WIDTH, f"seed {seed}")
w.close()
