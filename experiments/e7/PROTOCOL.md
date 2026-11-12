# E7 protocol: heading-continuous straight-to-arc join of the Auto generator (pre-registration)

Status: committed ALONE, before any E7 evaluation harness exists or runs. No file other than this one is in the commit. Later edits to this file are deviations and must be listed in a DEVIATIONS section of `experiments/e7/results/heldout/SUMMARY.md`, never made here. The predictions of section 7 are never edited after results exist.

## 1. Question

Validator v1.1 (default) rejects every Auto track with a straight segment: 0 of 200 default-parameter seeds (seeds 0..199) pass, and Auto passes 29.75% of the E2 grid overall and about 0% for straight > 0 (experiments/e6/results/e2-recheck). The reported cause is a heading discontinuity where a linear straight segment meets a Catmull-Rom arc (LOCAL_KINK, CLOSURE_TANGENT). Does a heading-continuous construction of that join, offered as an explicit versioned option, remove the defect, and what does it cost in straight length and track length?

## 2. The rule under evaluation

New generator parameter `autoJoin` in `src/core.ts` (`'legacy' | 'tangent'`).

- `legacy`: exact v1.0.0 construction (straight = `lerp` of two waypoints, other segments = uniform Catmull-Rom). A TrackDocumentV1 without an `autoJoin` key is a legacy document.
- `tangent` (the new default of `DEFAULTS`): every segment is a cubic Hermite curve whose end tangents (Catmull-Rom scale, `(next - previous) / 2`) are the Catmull-Rom tangents EXCEPT at a waypoint adjacent to a straight:
  - next to exactly one straight: the tangent direction is that straight's chord direction;
  - between two straights: the tangent direction is the bisector of the two chords, and each of the two straights spends its first/last `JOIN_BLEND = 0.35` of its samples (21 of STEPS = 60) on a Hermite blend from the chord direction to that bisector, the rest staying an exact straight line;
  - in both cases the magnitude is `JOIN_GAIN = 1.75` times the Catmull-Rom magnitude.
  Segments with no adjacent straight are the unchanged Catmull-Rom curve, so Auto with `straight = 0` produces bit-identical points under both joins. Waypoints, RNG stream, straight selection, sample count (STEPS = 60 per segment) and elevation are unchanged.
- The option is inert (canonicalised to `legacy`) when a corner pattern is spliced (`cornerPattern != auto` and `cornerCount > 0`), because pattern mode re-smooths the base circuit; pattern-mode output and documents are therefore v1.0.0-identical.

Constants `JOIN_BLEND` and `JOIN_GAIN` were chosen BEFORE this protocol on exploratory runs of the generator on seeds `500000 + 7919 k` (k = 0..9) and on seeds 0..199, none of which belong to SEEDS[150..199] (the integers 0..199 and these values do not occur in the E1 list at indices 150..199; checked by the harness). Exploration varied JOIN_BLEND in {0.2, 0.35, 0.5} and JOIN_GAIN in {0.6 .. 2}, and counted validator-v1.1 ok; 0.35 and 1.75 were picked from that. They are fixed here and are not tuned on DEV or HELD-OUT.

## 3. Seed sets

`SEEDS` = the 200-seed list of `experiments/e1/cases.mjs` (SHA-256 asserted by that file).

- DEV = SEEDS[150..169] (20 seeds): the only place the code may be run for development of this work package from now on, besides seeds outside the list.
- HELD-OUT = SEEDS[170..199] (30 seeds): not looked at before the freeze commit; evaluated once.
- REPRO = SEEDS[0..49] (the E2 seeds), used only for the legacy reproduction check of prediction P9. It is not used to evaluate the new join.

## 4. Evaluation grid

The E2 grid restricted to `cornerPattern = 'auto'`: curves {3, 6, 10} x straight {0, 0.3, 0.6} x width {20, 40, 80} x size {1, 2, 3} x height {0, 80, 200} = 243 parameter sets (all other parameters at `DEFAULTS`), crossed with the seeds of the set, each generated with `autoJoin: 'legacy'` and with `autoJoin: 'tangent'`. DEV: 4,860 tracks per join; HELD-OUT: 7,290 per join. Validator: `validateTrack(track)` with `DEFAULT_VALIDATE_OPTIONS` (validator v1.1). `ok` = no error-severity violation (the validator's own `ok`).

Default-parameter run: `generateTrack({ seed })` for every seed of the set (no other override; this exercises `DEFAULTS`, i.e. `autoJoin = 'tangent'`, curves 6, straight 0.25), validated the same way. DEV: 20 tracks, HELD-OUT: 30 tracks.

## 5. Metrics

Per join and set, overall and by (curves, straight): ok count and rate with Wilson 95% interval; number of tracks carrying each error code (a track counts once per code); generation failures (thrown errors).
Paired, per case: ok(legacy) and ok(tangent) cross table.
Geometry, per case (centerline x/z, closed loop of `points.length - 1` vertices):
- length = `track.length`; relative change = length(tangent) / length(legacy) - 1;
- realised straight fraction = share of centerline length in vertices whose heading change on both sides is below 0.01 degrees (straight runs); the requested fraction is the nominal `straight` parameter and the quantised fraction `round(straight * curves) / curves`; reported for both joins;
- maximum per-vertex heading change (degrees) and number of vertices with heading change above 12 degrees (the floor of the validator's local-kink rule), for both joins.
Reported as medians (and min/max) over the cases with straight > 0.

## 6. Method

Harness: `experiments/e7/run.mjs` (to be written after this commit) imports the compiled `cli-dist/` modules, evaluates DEV, then HELD-OUT only after a FREEZE commit that contains the code, the DEV results and a statement that no further code change will be made. HELD-OUT is run once; every evaluation (DEV and HELD-OUT) is executed twice and the SHA-256 of each output file is recorded in `DETERMINISM.txt`. If the two runs differ the evaluation is reported as non-deterministic. A code or constant change after the freeze invalidates it and is a deviation.

## 7. Predictions (written before any run)

Rates are over the stated cases; "straight > 0" means the 162 of 243 parameter sets with straight in {0.3, 0.6}.

- P1. Default parameters, tangent join: >= 99% ok on HELD-OUT (with 30 seeds this means 30 of 30), and the same on DEV (20 of 20). The Wilson lower bound of 30/30 is 88.6%; the prediction is about the point rate and is stated as such.
- P2. Legacy join at straight > 0, Auto, HELD-OUT grid: ok rate <= 2%.
- P3. Tangent join at straight > 0, HELD-OUT grid: ok rate >= 75% overall (threshold chosen 10 points below the 85% seen on exploratory out-of-list seeds). By curves: curves = 6 >= 95%, curves = 10 >= 75%, curves = 3 >= 55%. The residual failures are expected to come from road width relative to curve radius (width 80, curves 3), which the legacy join also shows at straight = 0.
- P4. No tangent-join track carries LOCAL_KINK or CLOSURE_TANGENT (0 tracks of 7,290).
- P5. Every failing tangent-join track fails only with SELF_INTERSECTION_EDGE and/or EDGE_FOLD (no other error code).
- P6. At straight = 0 the two joins give bit-identical `points` and identical `ok` and error codes in 100% of the cases.
- P7. No case that is ok under legacy is not ok under tangent (0 cases).
- P8. Median |relative length change| at straight > 0 <= 10%; median ratio (realised straight fraction under tangent) / (under legacy) >= 0.5; median maximum per-vertex heading change under tangent <= 15 degrees (legacy expected well above 30 degrees).
- P9. Legacy reproduction: on REPRO (SEEDS[0..49]) with `autoJoin: 'legacy'`, the 12,150 Auto cases of the E2 grid reproduce the committed `ok_v11` column and error-code column of `experiments/e6/results/e2-recheck/validity-v1.1.csv.gz` exactly (0 mismatches).
- P10. No Auto generation throws under either join, and every evaluation output is byte-identical between its two runs (DETERMINISM.txt).

## 8. Reporting rules

Numbers only; every prediction is reported as held or failed with the observed value, including P1 on DEV. Claims are limited to these seeds, this grid, validator v1.1 defaults and this machine. No post-hoc subsetting; any analysis not listed here is labelled exploratory.
