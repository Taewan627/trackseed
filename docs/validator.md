# Validator rules (`validateTrack`), including the local-kink rule added after an internal review ("v1.1") and the absolute per-vertex rule and sampling diagnostic of v1.3

Scope: this file documents the rules, defaults, rationale and evidence of the geometry validator in `src/validate.ts`. The version number is not changed by the commit that adds it (versioning is handled separately). The README and the CLI describe this rule (see "Known follow-ups" for the remaining gaps).

## Checks

| id | codes | severity | rule |
|---|---|---|---|
| `structure` | `STRUCTURE` | error | at least 4 points; two edge arrays with one entry per centreline point |
| `finite` | `NON_FINITE` | error | every coordinate and `params.width` finite and positive |
| `closure` | `CLOSURE_POSITION`, `CLOSURE_EDGE`, `CLOSURE_HEIGHT`, `CLOSURE_TANGENT` | error | last point equals first within `closureTolerance` (1e-6 x f; edges too), height gap <= `heightTolerance` (1e-6 x f), f = 1 for every track of TrackSeed's size (see "Scale-relative tolerances"); `CLOSURE_TANGENT` = the seam vertex is flagged by the local-kink rule (mode `kink`) |
| `local-kink` | `LOCAL_KINK` | error | NEW in mode `kink`: the same rule at every other vertex of the closed loop. Not run in the legacy modes (they return the 7 checks of v1.0.0) |
| `sharp-vertex` | `SHARP_VERTEX` | error | NEW in v1.3, mode `kink` only: heading change at any vertex (seam included) > `sharpVertexDegrees` = 30, independent of the neighbours. See "Absolute per-vertex rule and sampling diagnostic" |
| `self-intersection` | `SELF_INTERSECTION_*`, `EDGE_EDGE_INTERSECTION` | error | planar (x/z) segment intersections of centreline, each edge, edge vs edge |
| `edge-fold` | `EDGE_FOLD` | error | flipped or degenerate ribbon triangles (x/z cross product <= `foldEpsilon` = 1e-5 x f^2) |
| `min-turn-radius` | `MIN_TURN_RADIUS` | warning | local radius < `minRadiusToHalfWidth` x width/2 |
| `max-slope` | `MAX_SLOPE` | warning | rise over run > `maxSlope` |
| `undersampled` | `UNDERSAMPLED` | warning | NEW in v1.3, mode `kink` only: more than `undersampledShare` = 10 % of the vertices turn by more than `undersampledTurnDegrees` = 12 degrees (the polyline is coarser than the sampling requirement below) |

## The local-kink rule

Closed indexing: vertex i has neighbours i-1 and i+1 modulo n (n = points.length - 1), so the seam (vertex 0) is treated like any vertex. The rule is evaluated at all n vertices; vertex 0 is reported as `CLOSURE_TANGENT` (its historical code), vertices 1..n-1 as `LOCAL_KINK`. Let theta_i be the heading change at vertex i in degrees (x/z plane, unsigned).

Default (`closureTangentMode: 'kink'`, `kinkRule: 'outlier'`): vertex i is flagged iff

    theta_i > max(kinkFloorDegrees, kinkRatio x ref_i),   ref_i = kinkQuantile-quantile of { theta_j : j = i +- 2 .. i +- kinkWindow }

with `kinkWindow` = 3, `kinkQuantile` = 1 (the maximum), `kinkRatio` = 3, `kinkFloorDegrees` = 12. The vertices i +- 1 are excluded from the reference because a single displaced vertex bends them as well; this is exactly why the v0.5.1 'ratio' test (reference = maximum over 3 vertices each side, including the neighbours) missed gross seam kinks. A kink is thus "a vertex that turns by more than 12 degrees AND more than 3 times as much as anything 2-3 vertices away", and a long uniform bend, a coarsely sampled circle or a rounded corner is not a kink. Only + - * /, `Math.sqrt/abs/min/max` and `src/detmath.ts` are used (no sin/cos/atan2/hypot/exp/log/pow).

Other rules are selectable with `kinkRule` for reproducing E6 (`turn`, `curvature`, `spike`, and '+'-joined AND-combinations such as `outlier+curvature`; parameters `kinkTurnDegrees`, `kinkCurvature`, `kinkSpikeSpacing`, `kinkSpikeHalfWidth`). `kinkProfile` / `kinkFlags` / `kinkFlagAt` expose the per-vertex computation.

Legacy modes (`closureTangentMode: 'ratio' | 'absolute'`) reproduce v0.5.1 / v0.5.0 exactly (`tangentToleranceDegrees` = 5, `seamRatio` = 2) and run no `LOCAL_KINK` check. The E2 recheck below shows that 'ratio' reproduces the committed amendment-01 `ok` column bit for bit.

## Absolute per-vertex rule and sampling diagnostic (validator v1.3)

Why. The third red team (R2-1, R2-2) showed that the relative local-kink rule above detects locally anomalous turns, not sharp turns: when every vertex of a neighbourhood is equally sharp the reference is as large as the vertex and the ratio test never fires. A 4-vertex square and regular 5-, 6- and 8-gons (R = 500, width 12) were `ok` with no warning; so was a 2000-vertex circle with alternating +-5 radial offsets (about 145 degrees at every vertex); two 88-degree spikes two or four vertices apart masked each other, and a 20-vertex zigzag patch passed. The tool also had everything it needs to say that such input is sampled too coarsely and said nothing (metrics of the square: `turnCount` 1 and `straightLengthFraction` 0 without a warning).

`SHARP_VERTEX` (error). In mode `kink` (the default), vertex i of the closed loop, the seam (index 0) included, fails iff theta_i > `sharpVertexDegrees`, where theta_i is the unsigned x/z heading change of the local-kink rule. Default 30 degrees. The test uses no neighbour, so polygons, uniform sawtooth and paired or periodic defects cannot mask one another. The comparison is strict and exact in double precision, so a polyline whose turn is 30 degrees by construction (a regular 12-gon) is decided by rounding at the 1e-14 level, vertex by vertex; regular polygons of 13 or more vertices pass and of 11 or fewer fail by margin. A spike also bends the vertices next to it, so a single spike usually gives three `SHARP_VERTEX` entries (i - 1, i, i + 1); the seam is reported twice when it is flagged, as `SHARP_VERTEX` at index 0 and as `CLOSURE_TANGENT`. `value` is the turn, `limit` is `sharpVertexDegrees`. `checks[].stats`: `maxTurnDegrees`, `limit`.

`UNDERSAMPLED` (warning). Let over = the number of the n vertices with theta_i > `undersampledTurnDegrees` (default 12). The check warns iff over / n > `undersampledShare` (default 0.1). The 12 degrees are the turn of a vertex on an arc sampled at s = 0.2 R (requirement (1) of "Sampling requirement" below), so a polyline that meets the requirement has no such vertex on its arcs; the check is that requirement in observable form (the turn of an arc vertex, 2 asin(s / 2R), is s / R). The violation is one entry with `value` = the share, `limit` = `undersampledShare`, `index` = the vertex of the largest turn and a message with the count, the largest turn, the median spacing and the width. `checks[].stats`: `share`, `verticesOverTurn`, `turnDegrees`, `maxTurnDegrees`, `medianSpacing`, `maxSpacing`, `width`; `failures` is `verticesOverTurn` when the warning is raised and 0 otherwise. A warning does not change `ok`; `--strict` turns it into exit code 1. `metrics-polyline` runs no validator: it writes the same warning to stderr and leaves its JSON unchanged.

Defaults and derivation. T_abs = 30 degrees and the 10 % share were chosen by exploration on clean generated TrackSeed tracks that were not created for this evaluation ([validator-v1.3-exploration.md](validator-v1.3-exploration.md), labelled exploratory): the largest turn of any of 60,290 clean tracks is 17.43 degrees (13.85 on pattern modes and Auto with straight 0), the largest share of vertices above 12 degrees is 4.44 % (2.69 % on pattern modes). Margins: 30 / 17.43 = 1.72 for the turn, 10 / 4.44 = 2.25 for the share; on the other side the weakest RT3 probe (alternating +-0.5) turns 35.5 degrees, the octagon 45. These are design choices informed by TrackSeed's own tracks (R2-5): nothing about third-party tracks was used.

Selecting. Both checks are on by default in mode `kink`, in the library and the CLI, and not run in the legacy modes (`ratio`, `absolute`; those return the 7 checks of v1.0.0 as before). A disabled check is not listed in `checks`, so with both off the report is the v1.2.0 report.

| Option | Library | CLI |
|---|---|---|
| `SHARP_VERTEX` limit (default 30) | `sharpVertexDegrees` (number) | `--limit sharpVertexDegrees=N` (finite numbers only; 180, the largest possible turn, disables it) |
| switch `SHARP_VERTEX` off | `sharpVertexDegrees: Infinity` | `--no-sharp-vertex` (not together with `--limit sharpVertexDegrees=`) |
| `UNDERSAMPLED` turn (default 12) and share (default 0.1) | `undersampledTurnDegrees`, `undersampledShare` | `--limit undersampledTurnDegrees=N`, `--limit undersampledShare=N` (1 or more disables it) |
| switch `UNDERSAMPLED` off | `undersampledCheck: false` | `--no-undersampled-check` (also silences the `metrics-polyline` warning) |

The flags are accepted by `validate`, `validate-polyline`, `batch` and (`--no-undersampled-check`) `metrics-polyline`. Experiment runners whose committed results predate v1.3 pass `{ sharpVertexDegrees: Infinity, undersampledCheck: false }` (`experiments/_v12-validator.mjs`, `V12_VALIDATOR_PIN`), so that those results reproduce (`docs/test-run-wp13.txt`).

RT3 probe outcomes, before (v1.2, both checks off) and after (v1.3 defaults), from `scripts/validator-v1.3-exploration.mjs`. Polygons: R = 500, width 12; the others: a 2000-vertex circle, R = 1000, width 10 ("sawtooth" = the RT3 zigzag circles; "zigzag patch" = RT3's 20-vertex patch; paired spikes sit at vertices 500 and 500 + gap). Every probe class tested in `tests/sharp-vertex.test.ts`.

| probe | max turn (deg) | v1.2 (new checks off) | v1.3 defaults |
|---|---|---|---|
| regular 4-gon, R=500, width 12 | 90.0 | ok | INVALID [SHARP_VERTEX] warn [UNDERSAMPLED] |
| regular 5-gon, R=500, width 12 | 72.0 | ok | INVALID [SHARP_VERTEX] warn [UNDERSAMPLED] |
| regular 6-gon, R=500, width 12 | 60.0 | ok | INVALID [SHARP_VERTEX] warn [UNDERSAMPLED] |
| regular 8-gon, R=500, width 12 | 45.0 | ok | INVALID [SHARP_VERTEX] warn [UNDERSAMPLED] |
| sawtooth: 2000-gon R=1000, alternating +-0.5, width 10 | 35.5 | ok | INVALID [SHARP_VERTEX] warn [UNDERSAMPLED] |
| sawtooth: 2000-gon R=1000, alternating +-2, width 10 | 103.9 | ok warn [MIN_TURN_RADIUS] | INVALID [SHARP_VERTEX] warn [MIN_TURN_RADIUS,UNDERSAMPLED] |
| sawtooth: 2000-gon R=1000, alternating +-5, width 10 | 145.3 | ok | INVALID [SHARP_VERTEX] warn [UNDERSAMPLED] |
| paired spikes gap 2, h=3, 2000-gon R=1000, width 10 | 87.5 | ok warn [MIN_TURN_RADIUS] | INVALID [SHARP_VERTEX] warn [MIN_TURN_RADIUS] |
| paired spikes gap 2, h=10, 2000-gon R=1000, width 10 | 145.1 | INVALID [EDGE_FOLD] | INVALID [SHARP_VERTEX,EDGE_FOLD] |
| paired spikes gap 3, h=3, 2000-gon R=1000, width 10 | 87.5 | INVALID [SELF_INTERSECTION_EDGE,EDGE_FOLD] warn [MIN_TURN_RADIUS] | INVALID [SHARP_VERTEX,SELF_INTERSECTION_EDGE,EDGE_FOLD] warn [MIN_TURN_RADIUS] |
| paired spikes gap 3, h=10, 2000-gon R=1000, width 10 | 145.1 | INVALID [SELF_INTERSECTION_EDGE,EDGE_FOLD] | INVALID [SHARP_VERTEX,SELF_INTERSECTION_EDGE,EDGE_FOLD] |
| paired spikes gap 4, h=3, 2000-gon R=1000, width 10 | 87.5 | ok warn [MIN_TURN_RADIUS] | INVALID [SHARP_VERTEX] warn [MIN_TURN_RADIUS] |
| paired spikes gap 4, h=10, 2000-gon R=1000, width 10 | 145.1 | INVALID [SELF_INTERSECTION_EDGE,EDGE_FOLD] | INVALID [SHARP_VERTEX,SELF_INTERSECTION_EDGE,EDGE_FOLD] |
| zigzag patch of 20 vertices, amp 1, 2000-gon R=1000, width 10 | 65.1 | ok warn [MIN_TURN_RADIUS] | INVALID [SHARP_VERTEX] warn [MIN_TURN_RADIUS] |
| zigzag patch of 20 vertices, amp 3, 2000-gon R=1000, width 10 | 124.9 | ok warn [MIN_TURN_RADIUS] | INVALID [SHARP_VERTEX] warn [MIN_TURN_RADIUS] |
| zigzag patch of 20 vertices, amp 6, 2000-gon R=1000, width 10 | 150.8 | INVALID [SELF_INTERSECTION_EDGE,EDGE_FOLD] warn [MIN_TURN_RADIUS] | INVALID [SHARP_VERTEX,SELF_INTERSECTION_EDGE,EDGE_FOLD] warn [MIN_TURN_RADIUS] |

Not solved by this change, and what it does not claim. (1) `--resample-smooth` still rounds a coarse polygon: after smoothing at S = 3 the 4-, 5- and 8-gons pass (largest turn 1.4, 0.9, 0.5 degrees). The checks judge the polyline that is validated; report the raw arm too (R2-3 is a separate issue). (2) A polyline that is smooth in the sense of the thresholds can still be wrong: the limits say nothing about drivability. (3) 30 degrees and 10 % are tool conventions chosen on TrackSeed's tracks; real circuits sampled coarsely will raise `UNDERSAMPLED`, and that is intended. (4) E9, E5 and the other committed experiments were not re-run with the new checks on; their committed results stand for the v1.2.0 rule set.

## Rationale and evidence

All numbers: `experiments/e6/` (protocol in `PROTOCOL.md`, committed alone before any evaluation in the local git history).

- Defect (found in an internal review before v1.1): the 'ratio' rule misses seam kinks; there was no interior kink check.
- DEV (20 seeds, `results/dev/`): 711 configurations of four detector families (bare turn, curvature x half width, outlier, geometric spike, and combinations) were scored on clean generated tracks (pattern modes N1, Auto straight 0 N2), a synthetic stress set (N3: circles of 12..384 points, ellipses, stadiums) and five defect operators. The selection criterion fixed in the protocol (admissible = FPR <= 1% and no flag on N3; then maximum macro recall; then ties by fewest false positives, family simplicity, plateau centre) chose `outlier`, window 3, maximum, ratio 3, floor 12: DEV false positives 0/9718 (N1), 0/1080 (N2), 0/60 (N3); recall on must-detect instances 100% for all four planar operators. Bare-turn thresholds <= 30 degrees flag the coarse circles of N3; curvature-times-half-width cannot separate narrow-road Auto curves from kinks.
- HELD-OUT (40 other seeds, evaluated once, `results/heldout/SUMMARY.md`): recall on must-detect instances (heading change >= 30 degrees at the defect) 100% [99.95, 100] for the seam spike, interior spike, interior corner and seam tangent break (8553, 8153, 9111, 7560 instances); false positives 0/19436 on N1, 0/2160 on N2, 0/60 on N3. For comparison, 'ratio' catches 54.2% of must-detect seam spikes and 0% of interior defects; 'absolute' catches all seam spikes but flags 17.5% of clean pattern-mode tracks, 33.3% of clean Auto (straight 0) tracks and 55% of N3. Results are reproducible bit for bit (two runs, identical SHA-256).
- Auto with straight > 0 contains genuine heading discontinuities of the original algorithm (up to 134 degrees); the rule flags 696/696 of the tracks with a join >= 30 degrees (the 'ratio' rule 77.2%).

Limits (stated in advance in the protocol): the kink rule is planar; height steps are not detected by any error-severity check (MAX_SLOPE warns on 55.8% of height-step instances, but also on many clean tracks); the 12 degree floor sits just below the largest clean per-vertex turn seen (13.6 degrees) and relies on the ratio term there; defects are synthetic operators and the generator's sample spacing is 8 units (pattern modes) or 2.5-18 units (Auto), so behaviour on very differently sampled imported tracks is covered only by the analytic N3 set; the must-detect size (30 degrees) is a stated design choice.

## Scale-relative tolerances (WP7a)

Problem (second red team, probe section 5): the three absolute tolerances below were in units, so a valid generated track scaled together with its width by 1e-4 failed with `EDGE_FOLD` (every ribbon triangle has area about segment x width = 8e-4 x 1e-3 = 8e-7, below `foldEpsilon` = 1e-5), and the closure limit of 1e-6 is meaningless for coordinates in kilometres or degrees.

Rule. Let D be the diagonal of the 3D bounding box of the centreline points (`toleranceScale()` in `src/validate.ts`) and

    f = D / 10          if D < 10
    f = D / 100000      if D > 100000
    f = 1               otherwise (also if D is 0 or not finite)

(`TOLERANCE_BAND_LO` = 10, `TOLERANCE_BAND_HI` = 1e5). f is continuous in D and equals 1 on the whole band. The defaults become:

| tolerance | used by | before | after | note |
|---|---|---|---|---|
| `closureTolerance` | `CLOSURE_POSITION`, `CLOSURE_EDGE` (a length) | 1e-6 | 1e-6 x f | |
| `heightTolerance` | `CLOSURE_HEIGHT` (a length) | 1e-6 | 1e-6 x f | |
| `foldEpsilon` | `EDGE_FOLD` (twice a triangle area) | 1e-5 | 1e-5 x f^2 | |
| spatial-hash cell | `self-intersection` (performance only) | max(64, 2 x width) | max(64 x f, 2 x width); if n > 50000 also at most 4 x the mean planar segment length | see "Large inputs" |
| segment intersection test | `self-intersection` | product of two cross products <= 0 | product of the two signs <= 0 | same result; avoids underflow of the product at small scale |

Why this keeps every committed result. TrackSeed's own tracks have D between about 600 and 1600 (measured on 20 seeds x sizes 1-3 x height 0/20/200 x curves 3/10 x three corner patterns), the E6 stress sets (circles of radius 100 and 400, ellipses, stadiums: D from 200 to 1300) are inside [10, 1e5] as well, and the 1000 E5 third-party tracks (D from 225 to 824, no duplicate vertices) are inside it too, so f = 1 and the products 1e-6 x 1 and 1e-5 x 1 x 1 are the old constants bit for bit. Only a track with D < 10 or D > 1e5 is judged differently, and in that regime the old behaviour was wrong: the same shape gave different verdicts depending on its unit. `tests/robust.test.ts` checks that 50 generated tracks (ten seeds, five parameter sets) give identical reports with and without the new rule (`absoluteTolerances: true`); the reproduce check (E2, AMENDMENT-01, E6, E7, E5) is in `docs/test-run-wp7a.txt`.

Uniform scaling. If all coordinates and the width are multiplied by c, then D becomes cD and, outside the band, f becomes c f. Lengths scale as c, areas as c^2, so the closure limit and the fold limit scale like the quantities they bound. `tests/robust.test.ts` scales three valid generated tracks by 1e-4, 1e-3, 1e-2, 1, 1e3 and 1e5 and requires the same `ok`, the same error codes and the same number of failures in every check at every scale, and the same codes at every scale for two invalid tracks (a figure-eight with grade separation and a circle with a spike). The scales 1e-4 to 1e-1 give D below 10 (f = D/10), scale 1e5 gives D above 1e5.

Margin at small scale. For D < 10 the fold limit is 1e-5 x (D/10)^2 = 1e-7 x D^2; a legitimate ribbon triangle has area about spacing x width, i.e. at least about 5e-5 x D^2 for TrackSeed-like proportions, a factor of about 500 above the limit at every small scale. Above the band the limit is not needed to cover noise (a float32 road edge makes the cross products of near-degenerate triangles noisy anyway) and only keeps the unit consistent.

Explicit values and opt-out. A value passed in `options` (library) or by `--limit key=value` (CLI) is used literally, as before. `options.absoluteTolerances: true` (CLI: `--absolute-tolerances`) uses the three defaults literally at every scale, which is the v1.1.0 behaviour. When f is not 1 the `closure` and `edge-fold` checks report `stats.toleranceScale` = f; inside the band the reports are unchanged (no extra key).

Not changed, and why. Rules that are angles or ratios (`kinkFloorDegrees`, `kinkRatio`, `tangentToleranceDegrees`, `minRadiusToHalfWidth` x width/2, `maxSlope`, the `spike` rule's fractions of spacing and half width) are already scale-free. The legacy metrics fields (`straightKappa` = 5e-4, `turnKappa` = 4e-3, the fixed curvature bins) are scale-dependent by definition; their scale-normalised counterparts (`*Norm`, docs/metrics.md) are invariant, which the second red team confirmed from 1e-4 to 1e5, and were left as they are because changing them would change committed results. The generator's own audits (`src/core.ts` bounds check 1e-6, `src/patterns.ts` fold count 1e-5) run on generated tracks only, whose scale is fixed.

## Duplicate vertices (polyline input)

A duplicated consecutive vertex produced `SELF_INTERSECTION_CENTERLINE`, `SELF_INTERSECTION_EDGE` and `EDGE_FOLD` on a clean circle (a zero-length segment has an arbitrary normal, so the ribbon folds there). `trackFromPolyline` now removes consecutive vertices whose 3D distance is at most `DUPLICATE_TOLERANCE` (1e-9) x the bounding-box diagonal of the finite vertices (so exact duplicates always), also the last against the first, and reports the count as `duplicatePointsRemoved` (CLI: `input.duplicatePointsRemoved`). The first vertex of a run is kept; an exact closing copy of the first point is not counted as a duplicate; a vertex with a non-finite coordinate is never a duplicate. If fewer than 3 vertices remain the call throws `RangeError`. The step runs only in the polyline path: TrackSeed-generated tracks never go through it, and `tests/robust.test.ts` checks that 750 generated tracks re-entered as polylines have 0 duplicates and unchanged points and edges (shortest generated segment: more than 1e-3 units, against a tolerance of about 1e-6). A spike whose vertex is duplicated is now `LOCAL_KINK` only, as without the duplicate.

## Large inputs (polyline input)

Cause of the crash at 200,000 vertices: `trackFromPolyline` computed the bounds with `Math.min(...pts.map(...))`, which passes every coordinate as an argument; V8 throws `RangeError: Maximum call stack size exceeded` beyond about 10^5 arguments (reproduced on master ba39114 at N = 200,000). The bounds are now computed in a loop. The rest of the pipeline uses loops and typed arrays and has no recursion.

Complexity. The self-intersection check is a uniform spatial hash: expected O(n + k) time for n vertices and k reported pairs when the segments are about evenly sized, O(n^2) in the worst case (many segments in few cells). For n <= 50,000 the cell is `max(64 f, 2 x width)` as before; above that it is also capped at 4 mean planar segment lengths, which makes a dense polyline linear in practice (circle of radius 1000, width 10: 100,000 vertices 0.55 s, 200,000 vertices 1.0 s, 400,000 vertices 2.2 s on the verification machine, against 4 s, 15 s and 58 s with the 64-unit cell). The set of reported pairs does not depend on the cell; only the order in which they are found, hence which 20 per code are listed, can change above 50,000 vertices. All other checks are O(n) apart from the `outlier` reference (O(n) with a window of 3). Resampling is limited to 5,000,000 output points (`MAX_RESAMPLED_POINTS`); a larger request is a `RangeError` (CLI exit 2) instead of an out-of-memory crash. `tests/robust.test.ts` runs 200,000 vertices through the library and through both CLI commands.

## Sampling requirement (polyline input)

The validator judges the polyline as given. A corner of radius 30 sampled every 20 units really is a polygon with sharp vertices, and a spike one vertex wide really is a kink; the rule is a statement about the vertices, not about a curve the author may have intended (probe sections 1 and 2: the same rounded rectangle with straights 300, corner radius 30 and width 10 is ok at spacing 2 to 15, fails `LOCAL_KINK` at 20 and 30 and `CLOSURE_TANGENT, LOCAL_KINK` at 47). Requirement for an imported polyline, derived from the rule (flag iff theta_i > max(12 degrees, 3 x the largest turn at i+-2..3)). Let s be the spacing of consecutive vertices (mean of the two adjacent segments), R_min the smallest turn radius to be represented and h_min the smallest lateral defect to be found:

1. No false `LOCAL_KINK` on circular arcs. A vertex on an arc of radius R turns by 2 asin(s / 2R); a flag needs more than 12 degrees, i.e. 2 asin(s / 2R) > 0.2094 rad, i.e. s > 2R sin 6 degrees = 0.209 R. So **s <= 0.2 R_min** guarantees that no vertex of any arc, and no straight-to-arc or arc-to-straight entry (the turn there is at most the arc's own), is flagged, whatever its neighbours do. (The 3 x term usually permits more, as the probe shows, but is not a guarantee.)
2. Detection. A vertex displaced by h from the line through its two neighbours turns by 2 atan(h / s) on top of the curve's own turn (about s / R, in radians). It is flagged only if that exceeds 12 degrees and 3 x the turns two and three vertices away. The first condition needs h / s > tan 6 degrees = 0.105, i.e. **s <= 9 h_min** (rounded down from 9.5). The second is met when those neighbouring turns are at most 4 degrees, i.e. s / R_min <= 4 degrees = 0.07, so **s <= 0.07 R_min** makes the detection independent of the neighbours. Without that condition a defect inside a curve is only found if its turn exceeds 3 x the curve's turn (probe: on a circle of radius 500 with 24 vertices, s = 131, the smallest flagged radial spike is 38 units, 3.8 road widths).

Recommended spacing: **s <= min(0.2 R_min, 9 h_min)**, and **s <= min(0.07 R_min, 9 h_min)** if defects must be found inside the tightest curve; h_min = width / 2 is a natural choice. Both are sufficient, not necessary. Checked in `tests/robust.test.ts`: the rounded rectangle at s = 6, 5, 3, 2 (0.2 x R_min = 6) and circles of radius 500 with 32 to 360 vertices are ok; spikes of size s / 9 or more are flagged on circles of radius 500 with s = 0.9 to 35 (N = 90, 360, 720 and 3600, s <= 0.07 R). The probe's smallest flagged spikes on a circle of radius 500 agree with the rule: N = 360 (s = 8.7) 0.85 = 0.097 s (the rule's 0.105 s, less the curve's own 1 degree of turn); N = 3600 (s = 0.87) 0.094 = 0.108 s.

If a polyline is coarser than that, use `--resample-smooth S` (below), not `--resample-spacing S`: linear resampling of a coarse polygon keeps its corners (the spacing-20 rounded rectangle resampled linearly at 2 still gives `LOCAL_KINK`). Noise is a separate matter: jitter of sigma 0.2 on a 2000-vertex circle (radius 1000, width 12) fails 45 of 50 tracks, because every jittered vertex is a genuine small kink at spacing 3; survey or GPS data should be smoothed or fitted before it is validated, and the validator repairs nothing.

### Smooth resampling (`resampleSmooth`, `--resample-smooth S`)

Off by default and exclusive with `resample` / `--resample-spacing` (which stays linear and unchanged). A closed centripetal Catmull-Rom spline (alpha = 1/2, knot interval sqrt(|P_{i+1} - P_i|), Barry-Goldman evaluation; only + - * / and `Math.sqrt`) is laid through the duplicate-free input points, evaluated at max(2, ceil(4 |P_{i+1} - P_i| / S)) parameters per span, and the resulting dense closed polyline is resampled uniformly by 3D arc length at S, starting at the first input point, like `resample` (n = max(4, round(length / S)) samples). The spline interpolates every input vertex, so a vertex that really sticks out stays a sharp feature (the dense polyline passes through the spike apex; the resampled polyline then has a large turn there), while the polygon corners of a coarse but smooth curve are rounded. Tests (`tests/robust.test.ts`): the rounded rectangle (straights 300, R = 30, width 10) with input spacing 20 and 47, which fail raw, is ok after smooth resampling at 5, 2.5 and 1; a circle of radius 500 with 360 vertices and one 20-unit radial spike is still `LOCAL_KINK` (with `SELF_INTERSECTION_EDGE`, `EDGE_FOLD` and `MIN_TURN_RADIUS`) at 5, 2.5 and 1; clean circles of 24, 60 and 360 vertices stay ok. Limits: it changes the validated geometry (a report must say so; the CLI output carries `input.resampleSmoothSpacing`), it cannot reconstruct a corner that the input does not represent, and it is a smoother, not a noise filter.

## E2 recheck (validator v1.1)

See `experiments/e6/results/e2-recheck/SUMMARY.md` (outputs separate from all earlier result files).

Regenerated 48,600 E2 grid cases (seeds SEEDS[0..49]); 'ratio' reproduces the committed amendment-01 `ok` column exactly (0 mismatches). ok rate, Wilson 95% CI:

| mode | generated | ok, 'ratio' (v1.0.0) | ok, v1.1 default | ok -> not ok | not ok -> ok |
|---|---|---|---|---|---|
| auto | 12150 | 31.21% [30.39, 32.04] | 29.75% [28.95, 30.57] | 177 (1.46% [1.26, 1.69]) | 0 [0.00, 0.03] |
| right-angle | 12150 | 100.00% [99.97, 100.00] | 100.00% [99.97, 100.00] | 0 | 0 |
| hairpin | 12144 (6 generation failures) | 100.00% [99.97, 100.00] | 100.00% [99.97, 100.00] | 0 | 0 |
| s-curve | 12150 | 100.00% [99.97, 100.00] | 100.00% [99.97, 100.00] | 0 | 0 |

The pattern modes are unchanged (no false positive of the new rule on 36,444 clean E2 tracks). Only 177 Auto tracks (1.5%) change status because most Auto tracks with joins already fail other error checks (EDGE_FOLD, SELF_INTERSECTION_EDGE); a kink code (LOCAL_KINK and/or CLOSURE_TANGENT) is now reported on 8100 of the 12150 Auto tracks, which equals the number of Auto grid cases with straight > 0 (and none with straight 0). The protocol's prediction that Auto's ok rate would fall by >= 3 points is NOT confirmed (1.46 points).

## Known follow-ups (outside this change)

- The CLI selects the rule with `--closure-tangent-mode kink|ratio|absolute` (default `kink`). `--seam-ratio N` and `--limit seamRatio=N` apply only to `ratio` and are rejected with exit 2 in the other modes. `README.md` documents the eight checks of the default mode and the two legacy modes. `tests/cli.test.ts` covers the mode selection and the rejections; its seam-ratio cases select mode `ratio` explicitly.
- Stored `ok` flags and `violationCodes` of earlier result files (E2, E4, E1b) were computed with the legacy rules and are not overwritten.
