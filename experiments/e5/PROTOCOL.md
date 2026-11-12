# E5 protocol (pre-registration)

Status: committed BEFORE any E5 harness code exists in this repository and before any measurement. Nothing described below has been run
on the registered case set. Any later change to this file is a deviation and must be listed in results/SUMMARY.md.

Disclosure of what was done before this commit (so the predictions are not mistaken for blind ones):
- I read the third-party source (static inspection) and recorded candidates in CANDIDATES.md.
- I ran a wiring smoke test of the adapter idea in a scratch directory outside the repository, on 3 seeds that are NOT in the registered
  set (-1, -2, -3), in Node 22 only. It showed that the script runs headless with injected `document`/`window`/`console`/`Math`, finishes
  in 9-156 ms per case, reached `t === true` in all three, and that the script assigns three implicit globals (`points`, `what`,
  `TRACK_WIDTH`) that the adapter must declare to stay hermetic. No digests, validity or metrics were looked at.
- Prior data used for the predictions: TrackLab's own E1 results (experiments/e1/results/E1_SUMMARY.md), where the legacy generator
  that calls Math.sin/cos/atan2/hypot directly agreed with Node 22 on 100% (Node 20), 48.7% (Node 24) and 0.0% (Deno, Bun, Chrome,
  Firefox) of 1000 cases.

## Research questions

Subject: one third-party procedural track generator, https://github.com/YannThorimbert/RacingTrackGenerator (MIT), pinned commit
3a359db8231df13e7b0cd4cedb3580348f9ae012 (2020-07-31, HEAD of the default branch when fetched), file `index.html`, its single inline
`<script>` (the 2D centre-line generator; the later `<script src=...>` files are the 3D viewer and are not used). Why chosen: CANDIDATES.md.

- Q1 (reproducibility): For the same seed, does the generator produce identical output across JavaScript engines? Engines: Node 22
  (reference), Node 20, Node 24, Deno, Bun (JavaScriptCore), Chrome (V8), Firefox (SpiderMonkey), plus Node 22 run twice. Also: which
  implementation-approximated Math functions does it call (static grep of the script and a dynamic call count)?
- Q2 (validity): What share of its outputs pass TrackLab's validator (src/validate.ts, default options, ratio seam mode) at stated road
  widths, and with which violation codes?
- Q3 (metrics): How do the geometric metrics (src/metrics.ts) of its outputs distribute, next to TrackLab's own modes? Descriptive only.

## Seeding method (the only change to the third-party program)

The shipped script has no seed: `function rand(){ return Math.random(); }` is its only randomness (all other random calls go through
`rand()`; `grep -c "Math.random"` of the script must be 1, asserted by the harness). The adapter runs the UNMODIFIED script text (bytes
checked against the SHA-256 recorded by fetch.sh) as the body of `new Function('document','window','console','Math', prelude + script +
epilogue)`:
- `Math` is a fresh object holding every property of the engine's own `Math`, with each function wrapped by a pass-through that counts
  calls and returns the engine's own result (so the engine's sin/cos/atan2/acos/hypot are exactly what the script uses), except
  `Math.random`, which is replaced by mulberry32(seed) (the same 32-bit integer generator as `random()` in src/core.ts; integer
  arithmetic only, engine independent). This replaces the RNG source and nothing else.
- `document.getElementById(...)` returns a 500x500 canvas object whose 2D context is a recording-free no-op; `window.location.reload`
  records that it was called and returns; `console` is a no-op. The canvas drawing therefore has no effect on the output.
- `prelude` is `var points, what, TRACK_WIDTH;` (declares the script's three implicit globals as function locals so that no state leaks between
  cases); `epilogue` returns `{t, has_collisions, itrials, TRACK_WIDTH, centerline, heights, reloads}` where `heights[i] = get_track_h(i)`
  (the script's own 3D elevation function, called after generation). No line of the script is edited, reordered or removed.
- The algorithm, its constants (R = 150, STL_RES = 2, 10000 trials, ...), its collision tests and its post-processing are untouched.
Consequence to state in every report: the outputs studied are those of the script with a seeded RNG; they are not the outputs a user
of the shipped page would see (a different, unseeded stream), though they come from the same distribution if mulberry32 is acceptable.

## Fixed case set (1000 cases, one parameter configuration: the script has no parameters)

Seeds: the 200 seeds of E1 (experiments/e1/PROTOCOL.md, `JSON.stringify` SHA-256 5c5e64d680cecf26dacdad15c0766f498c9c85a997c0df1531b49e5a327a9f07),
followed by 800 further distinct seeds `Math.floor(r() * 2147483648)` from the mulberry32 stream `random(20261112)` (draws equal to any
earlier seed are skipped until 1000 distinct seeds exist). SHA-256 of `JSON.stringify(seeds)` of all 1000, no whitespace:
`6fc50bc3d1fad596f5593ee17116c15992c0c16b702e8d0b4da2abe1fcbcc095`. The harness asserts it. Case id = the seed.

## Measured quantities

Per case and engine the adapter returns an outcome: `ok` (final branch `t && !has_collisions`), `FAIL` (the script's own failure branch,
which calls `window.location.reload`), or `THROW:<message>` (an exception escaped the script). Nothing is retried or dropped.
- Output polyline = `centerline` (array of [x, y] pairs; ground plane x/z in TrackLab terms with z = their y, height 0).
- `digest` = lower-case hex SHA-256 (pure-JS src/sha256.ts in every engine, never node:crypto; self-test on "abc" emitted) of
  `JSON.stringify({centerline: <array or null>, outcome: <string>})` (key order exactly so).
- `bitsDigest` = SHA-256 of the little-endian IEEE-754 bytes of all centerline coordinates in order (detects -0 and any representation
  issue of `digest`). Secondary: `digest3d` = SHA-256 of `JSON.stringify(heights)`.
- For every engine the full polylines are also written (gitignored out/) for the secondary Q1 measure below; the committed results hold digests,
  counts and summaries, plus the SHA-256 of the polyline files.

### Q1 measure

Agreement of an engine = (cases whose `digest` equals the Node 22 digest of the same seed) / 1000, with the number and the first 10 ids of
mismatches; also the full pairwise agreement matrix over all engines. Secondary (descriptive, from the polylines): among mismatching cases,
the fraction with identical outcome and identical point count, and for those the maximum absolute coordinate difference to Node 22
(median and maximum over cases, in the generator's units; its canvas is 500 units). Static Math audit: the set of `Math.<name>` and
`**` tokens in the script text, classified as implementation-approximated (sin cos tan asin acos atan atan2 sinh cosh tanh exp expm1
log log2 log10 log1p pow cbrt hypot) or exact (sqrt abs min max floor ceil round trunc sign fround imul random, the last one replaced);
dynamic: total calls per function over the 1000 Node 22 cases.

### Q2 measure

Each `ok` polyline is converted with `trackFromPolyline` (src/polyline.ts; the polyline has no repeated closing point, one is appended;
no resampling; y = 0) and validated with `validateTrack` at default options. Pass = `result.ok` (no error-severity violation; warnings
do not fail). Widths (full road width in the generator's units): primary W = 4 (the generator's own road width is
`TRACK_WIDTH = min(min curve radius, 10)/2 - 1`, at most 4; the per-case own value is recorded and the count of cases whose own width is
below 4 is reported); sensitivity W = 8 and W = 14 (14 is TrackLab's default width 40 scaled by 150/420, the ratio of this
generator's R to TrackLab's default base radius 300 + 2*60). Reported per width: n ok-outputs, pass count and share (with the
Wilson 95% interval), per-code number of cases (errors and warnings separately), and the denominator over all 1000 cases when FAIL/THROW
cases are counted as non-passing. Secondary, descriptive: the same validation of the 3D polyline (y = `heights`) at W = 4 for the
MAX_SLOPE warning only.

### Q3 measure

For every `ok` output, `computeMetrics` on the 2D polyline: all scalar fields of TrackMetrics. Comparators: TrackLab modes auto,
right-angle, hairpin, s-curve, extreme (the five E1 configurations, E1 parameters) for the first 200 seeds, generated by the repository's
`generateTrack` at the checked-out commit. Per group and metric: n, median, 25th/75th percentile (nearest rank), min, max. Two
variants for the third-party group: as is, and uniformly scaled by 420/150 = 2.8 (a similarity transform, to show which metrics depend on
the fixed absolute-unit thresholds in src/metrics.ts; TrackLab modes are never scaled). Also the dimensionless quantities
`meanAbsCurvature * length` and `totalTurningDegrees / 360`. No tests, no p-values, no ranking, no statement that either group is better.

## Predictions (recorded before any run)

Q1:
- Node 22 repeat: 100% (0 mismatches). Node 20: 100%.
- Node 24: below 100%; point guess 50% (E1 legacy 48.7%), interval 10-90%.
- Deno, Bun, Chrome, Firefox: each at most 10% (E1 legacy 0.0%).
- Reason for the guess: the script uses Math.sin, Math.cos, Math.atan2, Math.acos and Math.hypot (expected static finding), which engines
  may implement differently; the E1 numbers are only a prior since the function mix differs (acos here, two-argument hypot).
- Secondary: at least 95% of mismatching cases have identical outcome and point count, and for them the maximum absolute coordinate
  difference is below 1e-6 units (divergence is rounding noise, not a different accept/reject branch).
- Falsifiers: any mismatch on Node 20 or the Node 22 repeat; a V8-family engine (Node 24, Deno, Chrome) above 90%; JavaScriptCore or
  SpiderMonkey above 10%.
Q2:
- Outcome `ok` for at least 99% of the 1000 seeds (FAIL and THROW rare).
- Pass share at W = 4: at least 50% (point guess 80%); non-increasing in W (share(4) >= share(8) >= share(14)).
- The most frequent failing error code at every width is a self-intersection code (SELF_INTERSECTION_CENTERLINE, SELF_INTERSECTION_EDGE or
  EDGE_EDGE_INTERSECTION); CLOSURE_* codes occur in fewer than 10% of ok outputs at W = 4.
- Basis: the script's collision tests are centre-line distances with a margin of 15 units that is reset to 0 after the first full-track
  rejection, and the link-segment test is disabled by a comma-operator typo (`if(f(...)>0,false)`); neither refers to road width.
- Falsifiers: share(4) < 50%; share increasing with width; a non-intersection code dominating; CLOSURE_* above 10%.
Q3: no hypothesis; the only structural expectation is that `totalTurningDegrees` is at least 360 for every ok output (a closed loop).

## Pipeline checks

Own-pipeline determinism: the Node 22 collection runs twice in the same invocation (as `node22` and `node22-repeat`), and the analysis
(validation, metrics, figures data) runs twice; the results JSON/Markdown files of the two analysis runs must be byte-identical (no timing
or date fields in them). Harness assertions: seed list SHA-256; script file SHA-256 equal to fetch.sh's record; `Math.random` count 1; SHA-256
self-test; no new global properties after a run (checked in Node).

## Engines (same commands as E1; exact version strings are recorded at run time)

Node 22 (system `node`), Node 20 (`npx -y -p node@20 node`), Node 24 (`npx -y -p node@24 node`), Deno (`npx -y deno`), Bun (`npx -y bun@1`),
Chrome headless (`/usr/bin/google-chrome` through playwright-core), Firefox (Playwright build under PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers).
An engine that cannot run is reported with its error; it is never silently dropped. One esbuild 0.25 ESM bundle (adapter, sha256, case list) is
byte-identical in every engine; the third-party script text is passed in as data (read from the fetched file, or inlined into the browser page),
and its SHA-256 is emitted by each run and compared.

## Reporting rules

- Numbers only; claims are limited to this pinned commit, this RNG injection, these seeds, these engines and versions.
- Violation codes are reported as the validator's output; whether a flagged geometry is a bug of the third-party generator or a
  consequence of the width chosen is not decided here.
- No sentence may imply use of TrackLab by the third-party author or any user; this experiment is the authors applying the tool.
