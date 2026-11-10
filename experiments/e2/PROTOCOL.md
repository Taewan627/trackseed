# E2 protocol (pre-registration): validity and performance of TrackLab v0.5 at scale

Status: committed before any E2 result exists and before any E2 harness code exists. Later edits to this file are deviations and must be listed in the DEVIATIONS section of results/SUMMARY.md, never made here.

Disclosure: before writing this protocol a throw-away runtime probe (80 generations, 20 per mode, extreme parameters, outside the repository) was run only to size the grid; its validity outcomes were not looked at, only wall time (about 1.5 to 11 ms per generation, 0.6 to 2.1 ms per validation).

## Subject and environment

TrackLab v0.5.0 (this repository, src/ at master 145277e), Node 22 (system `node`), single thread, library API called directly (`generateTrack`, `validateTrack` with default options, `computeMetrics`), bundled with esbuild 0.25 (ESM, node platform). CPU model from `lscpu`, Node/V8 version recorded in the results.

## Grid (no trimming: full factorial, 48,600 cases)

| factor | levels |
|---|---|
| seed | the first 50 entries of the E1 seed list (experiments/e1/cases.mjs `SEEDS.slice(0, 50)`; 16 boundary values then 34 PRNG draws) |
| curves | 3, 6, 10 |
| straight | 0, 0.3, 0.6 |
| width | 20, 40, 80 |
| size | 1, 2, 3 |
| height | 0, 80, 200 |
| mode | auto = `{cornerPattern:'auto'}`; right-angle = `{cornerPattern:'right-angle', cornerCount:2, cornerStrength:60}`; hairpin = `{cornerPattern:'hairpin', cornerCount:1, cornerStrength:80}`; s-curve = `{cornerPattern:'s-curve', cornerCount:3, cornerStrength:40}` |

3^5 x 4 x 50 = 48,600 cases (12,150 per mode = 243 parameter cells x 50 seeds; 4,050 tracks per mode per level of any one factor). All other parameters are the library defaults (obstacles 3, density 10, scene mixed). Case order: mode (slowest), curves, straight, width, size, height, seed (fastest), levels in the order of the table.

## Runs

1. VALIDITY run (no timing code in the loop): for each case `generateTrack`, then if it returned `validateTrack` and `computeMetrics`. A thrown `PatternGenerationError` is a generation failure; any other thrown error is recorded as "other error" (name kept). Output: `results/validity.csv.gz`, one row per case, columns: index, mode, curves, straight, width, size, height, seed, generated (0/1), error, ok, codes (sorted distinct violation codes, `;`-joined), inserted, attempts, then the 13 `TrackMetrics` scalars (sampleCount, length, boundingBoxArea, straightLengthFraction, meanAbsCurvature, maxAbsCurvature, p95AbsCurvature, curvatureEntropyBits, turnCount, elevationRange, maxAbsSlope, meanAbsSlope, totalTurningDegrees), floats written with 6 significant digits (to keep the committed file < 5 MB; all analysis reads this file, not unrounded values).
2. TIMING run, same grid and order, separate process: `performance.now()` around `generateTrack` (generation_ms) and around `validateTrack` (validation_ms). 100 untimed warm-up cases (grid indices 0, 486, 972, ... i.e. every 486th) precede the timed loop. The timing run also writes the deterministic CSV of run 1 again; the two deterministic CSVs must be byte-identical (R1 check, SHA-256 recorded). Output: `results/timing.csv.gz` (index, generation_ms, validation_ms, 3 decimals; validation_ms empty when generation failed).
3. REPEATABILITY of timing: a 500-case subset (grid indices `floor(i * 48600 / 500)`, i = 0..499) is timed in 5 separate fresh processes (N = 5 >= 3), each with the same 100-case warm-up taken from the subset (its first 100 cases, untimed, run first). Output: `results/timing-reps.json`.

## Measures

1. Generation-failure rate per mode = PatternGenerationError cases / 12,150, Wilson 95% CI (z = 1.959964).
2. Validator ok rate per mode (ok = no error-severity violation; warnings never make a track invalid), denominator = generated tracks of that mode; Wilson 95% CI. Also the end-to-end rate (generated and ok) / 12,150.
3. Violation-code incidence per mode: for each code, the number and percentage of generated tracks with at least one violation of that code (tracks, not violation instances).
4. Drivers of invalidity in Auto mode: invalid rate (1 - ok rate, among generated Auto tracks) for each level of curves, straight, width, size, height (4,050 tracks per level) with Wilson 95% CI, and per factor the spread = max level rate - min level rate; factors are ranked by spread. This is one-way marginals of a balanced full factorial: no interactions are modelled and no causal claim beyond "rate by level". The same table is produced for the three pattern modes as exploratory output.
5. Slope distribution: empirical distribution of metrics `maxAbsSlope` over generated tracks, by height level (all modes pooled, and Auto only), quantiles 5/25/50/75/90/95/99/100% (linear interpolation, numpy default), and the fraction exceeding the current default MAX_SLOPE 0.3. Proposal rule (pre-registered; proposal only, src/ is not changed): for each height level report the smallest value on the grid {0.05, 0.10, ..., 2.00} such that at least 95% of generated tracks of that height (all modes pooled) have maxAbsSlope <= value; the proposed MAX_SLOPE default is that grid value for height = 80 (the library default height), with the other two levels shown as context. Also reported: median of maxAbsSlope * length / height for height > 0 (dimensionless; shows how far the slope scales with height/length), as context for a height-aware limit.
6. Performance (from the timing run): generation_ms and validation_ms median, IQR (Q3 - Q1), p95 per mode and by curves level (all modes pooled and Auto only); generation_ms of failed generations is reported separately and excluded from the generated-case distribution; validation_ms for generated cases only. Run-to-run variation from the 5 repetitions: per repetition the median and p95 of both quantities per mode, then min, max and coefficient of variation (sd/mean, n-1 sd) of the 5 medians.

Quantile convention everywhere: numpy `percentile` linear interpolation.

## Predictions (written before any run)

1. Generation-failure rate: Auto 0% (Auto never throws); pattern modes below 5% each; the highest of the three will be hairpin or right-angle, not s-curve.
2. Auto validator ok rate is clearly below 100% and well below that of the pattern modes' ok rate among generated tracks (pattern modes audit geometry at generation time, so their ok rate is predicted >= 95%).
3. In Auto mode the dominant error codes are SELF_INTERSECTION-type and EDGE_FOLD codes (as in S2), and the factors with the largest spread are width and curves (wider road and more waypoints produce more edge self-intersection/folds), with height having near-zero spread (height does not enter the x/z geometry).
4. maxAbsSlope grows roughly proportionally with height: at height 0 it is exactly 0 for every generated track; at height 80 more than 80% of tracks exceed 0.3 (consistent with S2: MAX_SLOPE fired on all 48 cases); the proposed grid value for height 80 is in [0.5, 1.0].
5. Generation time: pattern modes' median generation_ms exceeds Auto's by more than 3x; validation time is below 5 ms median in every mode; the 5-repetition CV of per-mode medians is below 10%.
