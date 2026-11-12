"""Farama Gymnasium CarRacing-v3 track generator (MIT; checkpoint-radial 'car follows destinations' track, from OpenAI Gym) -> polylines.
Run: python3 -I gen_carracing.py --build ../build [--limit N]

gymnasium is imported from build/third_party/gymnasium (tag v1.4.0, unmodified) and asserted to be that copy. The environment is created
with render_mode=None and reset(seed=seed) is called; CarRacing._create_track() runs inside reset() (retrying internally until it
succeeds) and leaves the centre line in env.unwrapped.track = [(alpha, beta, x, y), ...]. The polyline is (x, y) of that list in the
generator's world units (Box2D 'metres' as defined by the environment: TRACK_RAD = 900/SCALE = 150, TRACK_DETAIL_STEP = 21/SCALE = 3.5;
SCALE = 6 is the render zoom). Width: the road tiles extend +-TRACK_WIDTH = 40/SCALE = 6.667 from the centre line => full width 13.333.
The track list is an open vertex list whose closing gap (last -> first, 3.5-7 units) is the generator's own 'glue' criterion.
Seeding: reset(seed=...) is the environment's public seeding API (self.np_random); nothing is replaced. The Box2D car/world that reset()
also builds is not used. Failures (exceptions) are recorded, not retried.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import Writer, parse_args, load_seeds, with_timeout
a = parse_args(sys.argv[1:])
tp = os.path.join(a.build, "third_party", "gymnasium")
sys.path.insert(0, tp)
os.environ.setdefault("PYGAME_HIDE_SUPPORT_PROMPT", "1")
import gymnasium                                           # noqa: E402
assert os.path.abspath(gymnasium.__file__).startswith(os.path.abspath(tp)), gymnasium.__file__
from gymnasium.envs.box2d import car_racing as cr          # noqa: E402

env = cr.CarRacing(render_mode=None)
half = cr.TRACK_WIDTH
w = Writer(os.path.join(a.build, "polylines"), "gen-carracing", "u")
for seed in load_seeds(a.build, a.limit):
    try:
        with_timeout(60, lambda: env.reset(seed=seed))
    except Exception as e:
        w.fail(f"s{seed}", f"{type(e).__name__}: {str(e)[:80]}"); continue
    track = env.unwrapped.track
    w.add(f"s{seed}", [(t[2], t[3]) for t in track], 2 * half, f"seed {seed}; gymnasium {gymnasium.__version__}")
w.close()
