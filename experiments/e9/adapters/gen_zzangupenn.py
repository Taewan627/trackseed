"""zzangupenn/track_gen random_trackgen.py (MIT, Python; radial-checkpoint generator adapted by its authors from OpenAI Gym CarRacing,
F1TENTH-oriented) -> polylines.   Run: MPLBACKEND=Agg python3 -I gen_zzangupenn.py --build ../build [--limit N]

NOTE ON INDEPENDENCE: the file states 'Adapted from CarRacing-v0'; the algorithm family is the same as gen_carracing.py. Report it as a
related variant, not as an independent generator.

random_trackgen.py is imported UNMODIFIED (cwd is a temporary directory because the module creates ./gen_maps). TrackGen.create_track()
returns (centre line, inner offset, outer offset) or False/raises when its own checks fail; the script's __main__ loop retries on any
failure. This adapter does the same: per seed, call create_track() until it returns a tuple (max 50 attempts, else recorded as failure).
Polyline = the centre line array (5 m step, TRACK_DETAIL_STEP, open vertex list with implicit closure, 'well glued' criterion of the
generator). Not used: convert_track (rendering to PNG/yaml, obstacle placement).
Seeding (the one deviation from the script's own CLI): the module computes TRACK_TURN_RATE = np.random.uniform(0.05, 0.95) at IMPORT time,
before its __main__ block calls np.random.seed(args.seed), so the script's --seed does not make that parameter reproducible. To get a
deterministic track per seed the adapter calls np.random.seed(seed) and then importlib.reload()s the module (re-drawing TRACK_TURN_RATE from
the seeded stream), then runs create_track(). The generation code is unchanged; only the order of seeding vs import differs from the CLI.
Units: the script's world units (WIDTH = 5.0 is the HALF width => full width 10.0; the script treats units as metres: 'F1TENTH scale' divides by 7).
"""
import importlib, os, sys, tempfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import Writer, parse_args, load_seeds, with_timeout
a = parse_args(sys.argv[1:])
a.build = os.path.abspath(a.build)
tp = os.path.join(a.build, "third_party", "zzangupenn-track-gen")
sys.path.insert(0, tp)
os.environ.setdefault("MPLBACKEND", "Agg")
import numpy as np                              # noqa: E402
os.chdir(tempfile.mkdtemp(prefix="e9-zzang-"))
import random_trackgen as rt                    # noqa: E402
assert os.path.dirname(os.path.abspath(rt.__file__)) == os.path.abspath(tp), rt.__file__
import io, contextlib

def one():
    with contextlib.redirect_stdout(io.StringIO()):
        g = rt.TrackGen()
    for attempt in range(50):
        try:
            with contextlib.redirect_stdout(io.StringIO()):
                r = g.create_track()
        except Exception:
            continue
        if r:
            return r[0], attempt
    raise RuntimeError("50 failed attempts")

w = Writer(os.path.join(a.build, "polylines"), "gen-zzangupenn", "u")
for seed in load_seeds(a.build, a.limit):
    np.random.seed(seed % (2**32))
    importlib.reload(rt)
    try:
        track, attempt = with_timeout(60, one)
    except Exception as e:
        w.fail(f"s{seed}", f"{type(e).__name__}: {str(e)[:80]}"); continue
    w.add(f"s{seed}", [(float(p[0]), float(p[1])) for p in track], 2 * rt.WIDTH, f"seed {seed}; attempts {attempt + 1}; TRACK_TURN_RATE {rt.TRACK_TURN_RATE:.4f}")
w.close()
