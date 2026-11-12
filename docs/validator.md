# Validator rules (`validateTrack`), including the post-RT1 local-kink rule ("v1.1")

Scope: this file documents the rules, defaults, rationale and evidence of the geometry validator in `src/validate.ts`. The version number is not changed by the commit that adds it (versioning is handled separately). The README and the CLI describe this rule (see "Known follow-ups" for the remaining gaps).

## Checks

| id | codes | severity | rule |
|---|---|---|---|
| `structure` | `STRUCTURE` | error | at least 4 points; two edge arrays with one entry per centreline point |
| `finite` | `NON_FINITE` | error | every coordinate and `params.width` finite and positive |
| `closure` | `CLOSURE_POSITION`, `CLOSURE_EDGE`, `CLOSURE_HEIGHT`, `CLOSURE_TANGENT` | error | last point equals first within `closureTolerance` (1e-6; edges too), height gap <= `heightTolerance` (1e-6); `CLOSURE_TANGENT` = the seam vertex is flagged by the local-kink rule (mode `kink`) |
| `local-kink` | `LOCAL_KINK` | error | NEW in mode `kink`: the same rule at every other vertex of the closed loop. Not run in the legacy modes (they return the 7 checks of v1.0.0) |
| `self-intersection` | `SELF_INTERSECTION_*`, `EDGE_EDGE_INTERSECTION` | error | planar (x/z) segment intersections of centreline, each edge, edge vs edge |
| `edge-fold` | `EDGE_FOLD` | error | flipped or degenerate ribbon triangles |
| `min-turn-radius` | `MIN_TURN_RADIUS` | warning | local radius < `minRadiusToHalfWidth` x width/2 |
| `max-slope` | `MAX_SLOPE` | warning | rise over run > `maxSlope` |

## The local-kink rule

Closed indexing: vertex i has neighbours i-1 and i+1 modulo n (n = points.length - 1), so the seam (vertex 0) is treated like any vertex. The rule is evaluated at all n vertices; vertex 0 is reported as `CLOSURE_TANGENT` (its historical code), vertices 1..n-1 as `LOCAL_KINK`. Let theta_i be the heading change at vertex i in degrees (x/z plane, unsigned).

Default (`closureTangentMode: 'kink'`, `kinkRule: 'outlier'`): vertex i is flagged iff

    theta_i > max(kinkFloorDegrees, kinkRatio x ref_i),   ref_i = kinkQuantile-quantile of { theta_j : j = i +- 2 .. i +- kinkWindow }

with `kinkWindow` = 3, `kinkQuantile` = 1 (the maximum), `kinkRatio` = 3, `kinkFloorDegrees` = 12. The vertices i +- 1 are excluded from the reference because a single displaced vertex bends them as well; this is exactly why the v0.5.1 'ratio' test (reference = maximum over 3 vertices each side, including the neighbours) missed gross seam kinks. A kink is thus "a vertex that turns by more than 12 degrees AND more than 3 times as much as anything 2-3 vertices away", and a long uniform bend, a coarsely sampled circle or a rounded corner is not a kink. Only + - * /, `Math.sqrt/abs/min/max` and `src/detmath.ts` are used (no sin/cos/atan2/hypot/exp/log/pow).

Other rules are selectable with `kinkRule` for reproducing E6 (`turn`, `curvature`, `spike`, and '+'-joined AND-combinations such as `outlier+curvature`; parameters `kinkTurnDegrees`, `kinkCurvature`, `kinkSpikeSpacing`, `kinkSpikeHalfWidth`). `kinkProfile` / `kinkFlags` / `kinkFlagAt` expose the per-vertex computation.

Legacy modes (`closureTangentMode: 'ratio' | 'absolute'`) reproduce v0.5.1 / v0.5.0 exactly (`tangentToleranceDegrees` = 5, `seamRatio` = 2) and run no `LOCAL_KINK` check. The E2 recheck below shows that 'ratio' reproduces the committed amendment-01 `ok` column bit for bit.

## Rationale and evidence

All numbers: `experiments/e6/` (pre-registered in `PROTOCOL.md`, committed alone before any evaluation).

- Defect (red team RT1): the 'ratio' rule misses seam kinks; there was no interior kink check.
- DEV (20 seeds, `results/dev/`): 711 configurations of four detector families (bare turn, curvature x half width, outlier, geometric spike, and combinations) were scored on clean generated tracks (pattern modes N1, Auto straight 0 N2), a synthetic stress set (N3: circles of 12..384 points, ellipses, stadiums) and five defect operators. The selection criterion fixed in the protocol (admissible = FPR <= 1% and no flag on N3; then maximum macro recall; then ties by fewest false positives, family simplicity, plateau centre) chose `outlier`, window 3, maximum, ratio 3, floor 12: DEV false positives 0/9718 (N1), 0/1080 (N2), 0/60 (N3); recall on must-detect instances 100% for all four planar operators. Bare-turn thresholds <= 30 degrees flag the coarse circles of N3; curvature-times-half-width cannot separate narrow-road Auto curves from kinks.
- HELD-OUT (40 other seeds, evaluated once, `results/heldout/SUMMARY.md`): recall on must-detect instances (heading change >= 30 degrees at the defect) 100% [99.95, 100] for the seam spike, interior spike, interior corner and seam tangent break (8553, 8153, 9111, 7560 instances); false positives 0/19436 on N1, 0/2160 on N2, 0/60 on N3. For comparison, 'ratio' catches 54.2% of must-detect seam spikes and 0% of interior defects; 'absolute' catches all seam spikes but flags 17.5% of clean pattern-mode tracks, 33.3% of clean Auto (straight 0) tracks and 55% of N3. Results are reproducible bit for bit (two runs, identical SHA-256).
- Auto with straight > 0 contains genuine heading discontinuities of the original algorithm (up to 134 degrees); the rule flags 696/696 of the tracks with a join >= 30 degrees (the 'ratio' rule 77.2%).

Limits (stated in advance in the protocol): the kink rule is planar; height steps are not detected by any error-severity check (MAX_SLOPE warns on 55.8% of height-step instances, but also on many clean tracks); the 12 degree floor sits just below the largest clean per-vertex turn seen (13.6 degrees) and relies on the ratio term there; defects are synthetic operators and the generator's sample spacing is 8 units (pattern modes) or 2.5-18 units (Auto), so behaviour on very differently sampled imported tracks is covered only by the analytic N3 set; the must-detect size (30 degrees) is a stated design choice.

## E2 recheck (post-RT1 validator v1.1)

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
