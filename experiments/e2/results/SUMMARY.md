# E2 results: validity and performance of TrackLab v0.5 at scale

Protocol: PROTOCOL.md (commit 85d3941, before any harness code or result). Grid: 48,600 cases (full factorial, no trimming; 50 seeds x 3^5 parameter levels x 4 modes). Data: results/validity.csv.gz (deterministic columns, metrics at 6 significant digits), results/timing.csv.gz, results/timing-reps.json; analysis: analyze.py (deterministic: two runs gave identical SUMMARY.json, SHA-256 d847268f...); full machine-generated tables: results/tables.md (copied below), numbers: results/SUMMARY.json. Figures: results/figures/.

## Environment

See results/environment.txt (lscpu, node, V8, nproc, uname). CPU: Intel(R) Xeon(R) Processor @ 2.30GHz, 2 vCPUs (shared sandbox VM), Node v22.23.4 (V8 12.4.254.21-node.57), single-threaded runs, Linux. Bundle: build/run.mjs (esbuild 0.25, SHA-256 b071c423...). Validity run wall time 4 min 0.9 s; timing run wall time 242.7 s (sum of timed generation + validation 235.7 s).

## Determinism check (R1)

The deterministic CSV written by the VALIDITY run and the one written by the TIMING run (separate processes) are byte-identical: SHA-256 812f416cc413dded87889c83652a42c47569b4118d5364b0a0571e47a8d65312 (out/determinism.log, `cmp` exit 0).

## Headline numbers

- Generation failures: Auto 0 / 12,150, right-angle 0, s-curve 0, hairpin 6 (0.05%, Wilson [0.02, 0.11]). All six failures: hairpin, curves 3, straight 0.6, width 80, size 1, two seeds (1436848794, 1469734568) at each of the three heights. No error other than PatternGenerationError occurred.
- Validator ok rate among generated tracks: Auto 23.53% [22.79, 24.29]; right-angle 79.83% [79.10, 80.53]; hairpin 84.14% [83.48, 84.78]; s-curve 82.44% [81.76, 83.11].
- In the three pattern modes every error-severity violation is CLOSURE_TANGENT (seam tangent > 5 degrees); they have no self-intersection, edge-fold or turn-radius finding. Their invalidity is concentrated at curves = 3 (44% to 57% invalid) and width 20 (about 31%).
- Auto: SELF_INTERSECTION_EDGE 64.9%, EDGE_FOLD 66.4%, MIN_TURN_RADIUS (warning) 70.0%, CLOSURE_TANGENT 61.8% of tracks. Auto tracks are valid almost only when straight = 0 and curves >= 6 (ok rate 1.000 and 0.987); with straight = 0.3 and curves >= 6 the ok rate is 0.064, with straight = 0.6 it is 0.000 to 0.002, and with curves = 3 it is 0.000 for every straight level (cell-level ok rates from the Auto grid, 1,350 tracks per cell).
- Invalidity spread by single factor (Auto): straight 66.15 points, curves 35.48, width 4.81, size 1.48, height 0.00.
- max |slope|: height 0 always exactly 0; height 80 median 0.744, q95 1.253 (pooled), 100% of height-80 and height-200 tracks exceed the default MAX_SLOPE 0.3. Rule-based proposal (PROTOCOL rule, proposal only): MAX_SLOPE = 1.3 for height 80; for height 200 no grid value up to 2.0 covers 95% (q95 3.13). elevationRange / height is 2.427 to 2.429 for every generated track with height > 0 (it depends only on height and seed, not on the mode).
- Timing (median generation ms): Auto 0.456, right-angle 4.477, hairpin 5.405, s-curve 4.321; median validation ms 0.42 to 0.51 in every mode.

## Full tables (results/tables.md)

## 1. Generation failures and validator ok rate per mode (Wilson 95% CI)

| mode | cases | generation failures (PatternGenerationError) | other errors | generated | ok among generated | end-to-end ok / cases |
|---|---|---|---|---|---|---|
| auto | 12150 | 0 (0.00% [0.00, 0.03]) | 0 | 12150 | 2859 (23.53% [22.79, 24.29]) | 23.53% [22.79, 24.29] |
| right-angle | 12150 | 0 (0.00% [0.00, 0.03]) | 0 | 12150 | 9699 (79.83% [79.10, 80.53]) | 79.83% [79.10, 80.53] |
| hairpin | 12150 | 6 (0.05% [0.02, 0.11]) | 0 | 12144 | 10218 (84.14% [83.48, 84.78]) | 84.10% [83.44, 84.74] |
| s-curve | 12150 | 0 (0.00% [0.00, 0.03]) | 0 | 12150 | 10017 (82.44% [81.76, 83.11]) | 82.44% [81.76, 83.11] |

## 2. Violation-code incidence per mode (tracks with >= 1 violation of the code, % of generated tracks of the mode)

| code | auto | right-angle | hairpin | s-curve |
|---|---|---|---|---|
| CLOSURE_TANGENT | 7506 (61.8%) | 2451 (20.2%) | 1926 (15.9%) | 2133 (17.6%) |
| EDGE_FOLD | 8073 (66.4%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) |
| MAX_SLOPE | 8100 (66.7%) | 8100 (66.7%) | 8096 (66.7%) | 8100 (66.7%) |
| MIN_TURN_RADIUS | 8508 (70.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) |
| SELF_INTERSECTION_EDGE | 7881 (64.9%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) |

## 3. Invalidity (1 - ok rate among generated) by factor level


### auto (n = 12150 generated)

| factor | level | n | invalid rate [Wilson 95% CI] |
|---|---|---|---|
| curves | 3 | 4050 | 100.00% [99.91, 100.00] |
| curves | 6 | 4050 | 64.52% [63.03, 65.98] |
| curves | 10 | 4050 | 64.89% [63.41, 66.34] |
| straight | 0.0 | 4050 | 33.78% [32.34, 35.25] |
| straight | 0.3 | 4050 | 95.70% [95.03, 96.29] |
| straight | 0.6 | 4050 | 99.93% [99.78, 99.97] |
| width | 20 | 4050 | 73.41% [72.02, 74.75] |
| width | 40 | 4050 | 77.78% [76.47, 79.03] |
| width | 80 | 4050 | 78.22% [76.92, 79.47] |
| size | 1 | 4050 | 77.26% [75.94, 78.52] |
| size | 2 | 4050 | 76.37% [75.04, 77.65] |
| size | 3 | 4050 | 75.78% [74.43, 77.07] |
| height | 0 | 4050 | 76.47% [75.14, 77.75] |
| height | 80 | 4050 | 76.47% [75.14, 77.75] |
| height | 200 | 4050 | 76.47% [75.14, 77.75] |

Spread (max level rate - min level rate), ranked: straight 66.15 pts, curves 35.48 pts, width 4.81 pts, size 1.48 pts, height 0.00 pts

### right-angle (n = 12150 generated)

| factor | level | n | invalid rate [Wilson 95% CI] |
|---|---|---|---|
| curves | 3 | 4050 | 57.11% [55.58, 58.63] |
| curves | 6 | 4050 | 2.52% [2.08, 3.05] |
| curves | 10 | 4050 | 0.89% [0.64, 1.23] |
| straight | 0.0 | 4050 | 13.33% [12.32, 14.42] |
| straight | 0.3 | 4050 | 23.11% [21.84, 24.43] |
| straight | 0.6 | 4050 | 24.07% [22.78, 25.41] |
| width | 20 | 4050 | 30.74% [29.34, 32.18] |
| width | 40 | 4050 | 22.74% [21.48, 24.06] |
| width | 80 | 4050 | 7.04% [6.29, 7.87] |
| size | 1 | 4050 | 20.30% [19.09, 21.56] |
| size | 2 | 4050 | 20.00% [18.80, 21.26] |
| size | 3 | 4050 | 20.22% [19.01, 21.49] |
| height | 0 | 4050 | 20.17% [18.97, 21.44] |
| height | 80 | 4050 | 20.17% [18.97, 21.44] |
| height | 200 | 4050 | 20.17% [18.97, 21.44] |

Spread (max level rate - min level rate), ranked: curves 56.22 pts, width 23.70 pts, straight 10.74 pts, size 0.30 pts, height 0.00 pts

### hairpin (n = 12144 generated)

| factor | level | n | invalid rate [Wilson 95% CI] |
|---|---|---|---|
| curves | 3 | 4044 | 44.29% [42.76, 45.82] |
| curves | 6 | 4050 | 2.52% [2.08, 3.05] |
| curves | 10 | 4050 | 0.81% [0.58, 1.14] |
| straight | 0.0 | 4050 | 10.15% [9.26, 11.12] |
| straight | 0.3 | 4050 | 17.63% [16.49, 18.83] |
| straight | 0.6 | 4044 | 19.81% [18.61, 21.06] |
| width | 20 | 4050 | 30.67% [29.27, 32.10] |
| width | 40 | 4050 | 16.52% [15.41, 17.69] |
| width | 80 | 4044 | 0.37% [0.22, 0.61] |
| size | 1 | 4044 | 15.06% [13.99, 16.19] |
| size | 2 | 4050 | 15.85% [14.76, 17.01] |
| size | 3 | 4050 | 16.67% [15.55, 17.85] |
| height | 0 | 4048 | 15.86% [14.77, 17.02] |
| height | 80 | 4048 | 15.86% [14.77, 17.02] |
| height | 200 | 4048 | 15.86% [14.77, 17.02] |

Spread (max level rate - min level rate), ranked: curves 43.47 pts, width 30.30 pts, straight 9.66 pts, size 1.61 pts, height 0.00 pts

### s-curve (n = 12150 generated)

| factor | level | n | invalid rate [Wilson 95% CI] |
|---|---|---|---|
| curves | 3 | 4050 | 49.26% [47.72, 50.80] |
| curves | 6 | 4050 | 2.52% [2.08, 3.05] |
| curves | 10 | 4050 | 0.89% [0.64, 1.23] |
| straight | 0.0 | 4050 | 11.48% [10.54, 12.50] |
| straight | 0.3 | 4050 | 19.85% [18.65, 21.11] |
| straight | 0.6 | 4050 | 21.33% [20.10, 22.62] |
| width | 20 | 4050 | 30.67% [29.27, 32.10] |
| width | 40 | 4050 | 20.59% [19.38, 21.87] |
| width | 80 | 4050 | 1.41% [1.09, 1.82] |
| size | 1 | 4050 | 17.48% [16.34, 18.68] |
| size | 2 | 4050 | 17.63% [16.49, 18.83] |
| size | 3 | 4050 | 17.56% [16.41, 18.76] |
| height | 0 | 4050 | 17.56% [16.41, 18.76] |
| height | 80 | 4050 | 17.56% [16.41, 18.76] |
| height | 200 | 4050 | 17.56% [16.41, 18.76] |

Spread (max level rate - min level rate), ranked: curves 48.37 pts, width 29.26 pts, straight 9.85 pts, size 0.15 pts, height 0.00 pts

## 4. max |slope| distribution by height (generated tracks; metrics.maxAbsSlope)


### all modes pooled

| height | n | q5 | q25 | q50 | q75 | q90 | q95 | q99 | q100 | fraction > 0.3 | smallest grid value with >= 95% <= value |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 16198 | 0.0000 | 0.0000 | 0.0000 | 0.0000 | 0.0000 | 0.0000 | 0.0000 | 0.0000 | 0.00% | 0.05 |
| 80 | 16198 | 0.4213 | 0.6239 | 0.7441 | 0.8859 | 1.0593 | 1.2528 | 1.9393 | 2.5202 | 100.00% | 1.3 |
| 200 | 16198 | 1.0533 | 1.5597 | 1.8602 | 2.2147 | 2.6483 | 3.1319 | 4.8483 | 6.3004 | 100.00% | None |

### auto only

| height | n | q5 | q25 | q50 | q75 | q90 | q95 | q99 | q100 | fraction > 0.3 | smallest grid value with >= 95% <= value |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 4050 | 0.0000 | 0.0000 | 0.0000 | 0.0000 | 0.0000 | 0.0000 | 0.0000 | 0.0000 | 0.00% | 0.05 |
| 80 | 4050 | 0.6697 | 0.8101 | 0.9416 | 1.1600 | 1.6098 | 1.8895 | 2.2766 | 2.5202 | 100.00% | 1.9 |
| 200 | 4050 | 1.6743 | 2.0253 | 2.3540 | 2.8999 | 4.0246 | 4.7238 | 5.6916 | 6.3004 | 100.00% | None |

Median of maxAbsSlope * length / height (height > 0), all modes pooled, by height: 80: 24.1128, 200: 30.2408

Maximum maxAbsSlope over all height = 0 tracks: 0.0

Proposal (rule of PROTOCOL.md; src not changed): MAX_SLOPE default = 1.3 (smallest grid value covering 95% of generated height-80 tracks, all modes pooled).

elevationRange / height for height > 0 (all generated): q5 2.428, q25 2.429, q50 2.429, q75 2.429, q90 2.429, q95 2.429, q99 2.429, q100 2.429

## 5. Timing (timing run over the full grid; ms)


### generation_ms, generated cases

| group | n | median | IQR | p95 |
|---|---|---|---|---|
| auto | 12150 | 0.456 | 0.487 | 1.118 |
| right-angle | 12150 | 4.477 | 1.717 | 7.217 |
| hairpin | 12144 | 5.405 | 5.139 | 13.876 |
| s-curve | 12150 | 4.321 | 2.963 | 8.620 |
| curves=3 (all modes) | 16194 | 3.891 | 4.300 | 12.124 |
| curves=3 (auto) | 4050 | 0.248 | 0.048 | 0.559 |
| curves=6 (all modes) | 16200 | 4.014 | 3.392 | 9.628 |
| curves=6 (auto) | 4050 | 0.448 | 0.068 | 0.792 |
| curves=10 (all modes) | 16200 | 4.139 | 3.068 | 10.370 |
| curves=10 (auto) | 4050 | 0.807 | 0.208 | 1.339 |

### validation_ms (generated cases)

| group | n | median | IQR | p95 |
|---|---|---|---|---|
| auto | 12150 | 0.438 | 0.514 | 1.131 |
| right-angle | 12150 | 0.418 | 0.143 | 0.794 |
| hairpin | 12144 | 0.507 | 0.313 | 1.193 |
| s-curve | 12150 | 0.422 | 0.187 | 0.912 |
| curves=3 (all modes) | 16194 | 0.376 | 0.255 | 0.909 |
| curves=3 (auto) | 4050 | 0.216 | 0.045 | 0.291 |
| curves=6 (all modes) | 16200 | 0.438 | 0.165 | 0.862 |
| curves=6 (auto) | 4050 | 0.433 | 0.099 | 0.732 |
| curves=10 (all modes) | 16200 | 0.510 | 0.370 | 1.228 |
| curves=10 (auto) | 4050 | 0.856 | 0.298 | 1.353 |

### generation_ms, failed generations (excluded above)

| group | n | median | IQR | p95 |
|---|---|---|---|---|
| auto | 0 | | | |
| right-angle | 0 | | | |
| hairpin | 6 | 5.566 | 0.860 | 6.062 |
| s-curve | 0 | | | |

Total generation_ms + validation_ms over the grid: 235.7 s

## 6. Run-to-run variation: 5 repetitions of the 500-case subset (fresh process each, 100 untimed warm-up cases)

| mode | quantity | median per repetition (ms) | min | max | CV of the medians | p95 per repetition (ms) |
|---|---|---|---|---|---|---|
| auto | generation | 0.515, 0.484, 0.570, 0.526, 0.457 | 0.457 | 0.570 | 8.4% | 1.12, 1.45, 1.13, 1.16, 0.99 |
| auto | validation | 0.584, 0.540, 0.651, 0.610, 0.476 | 0.476 | 0.651 | 11.7% | 1.66, 1.41, 1.37, 1.67, 1.70 |
| right-angle | generation | 4.219, 3.822, 4.060, 4.673, 4.198 | 3.822 | 4.673 | 7.4% | 8.32, 8.12, 9.09, 10.07, 10.17 |
| right-angle | validation | 0.429, 0.385, 0.414, 0.448, 0.386 | 0.385 | 0.448 | 6.6% | 0.69, 0.79, 0.60, 0.94, 0.90 |
| hairpin | generation | 4.659, 4.545, 4.798, 4.782, 4.268 | 4.268 | 4.798 | 4.7% | 11.95, 10.95, 11.14, 11.64, 10.44 |
| hairpin | validation | 0.507, 0.484, 0.507, 0.499, 0.403 | 0.403 | 0.507 | 9.2% | 1.04, 0.99, 0.94, 0.97, 0.90 |
| s-curve | generation | 4.278, 3.408, 4.182, 4.131, 3.553 | 3.408 | 4.278 | 10.2% | 9.22, 7.00, 10.28, 8.33, 7.49 |
| s-curve | validation | 0.445, 0.347, 0.423, 0.397, 0.363 | 0.347 | 0.445 | 10.3% | 0.90, 0.64, 0.71, 1.01, 0.68 |
| all | generation | 3.824, 3.404, 3.774, 3.920, 3.558 | 3.404 | 3.920 | 5.7% | 10.85, 9.49, 10.54, 10.56, 9.23 |
| all | validation | 0.468, 0.414, 0.468, 0.469, 0.392 | 0.392 | 0.469 | 8.3% | 1.17, 1.09, 1.04, 1.20, 1.29 |

## Figures

- results/figures/e2_validity_by_mode.png: validator ok rate and generation-failure rate per mode with Wilson 95% CI.
- results/figures/e2_auto_invalidity_by_level.png: Auto-mode invalid rate by level of each parameter.
- results/figures/e2_max_slope_cdf.png: empirical CDF of max |slope| at heights 80 and 200 with the default 0.3 and the proposed value.
- results/figures/e2_timing.png: generation and validation time per mode (IQR, median, p95).

## Predictions vs observed

1. Failure rates (Auto 0; pattern modes < 5%; highest among pattern modes hairpin or right-angle): CONFIRMED (Auto 0%, hairpin 0.05% highest, right-angle and s-curve 0%).
2. Auto ok rate clearly below 100% and well below the pattern modes, whose ok rate among generated tracks was predicted >= 95%: PARTLY WRONG. Auto 23.5% vs 79.8% to 84.1% is as predicted in direction, but the pattern modes' ok rate is below 95% (all their failures are CLOSURE_TANGENT).
3. Dominant Auto codes self-intersection and edge fold: CONFIRMED. Largest-spread factors width and curves, height near zero: PARTLY WRONG. The largest spread is `straight` (66 points), then curves (35); width is third (4.8 points); height spread is exactly 0.00 as predicted.
4. height 0 slope exactly 0: CONFIRMED. More than 80% of height-80 tracks exceed 0.3: CONFIRMED (100%). Proposed grid value for height 80 in [0.5, 1.0]: WRONG (1.3).
5. Pattern generation median > 3x Auto: CONFIRMED (about 9.5x to 11.9x). Validation median < 5 ms in every mode: CONFIRMED (< 0.52 ms). Per-mode repetition CV < 10%: PARTLY WRONG; 5 of 8 per-mode series have CV below 10% (4.7% to 9.2%), but Auto validation (11.7%), s-curve generation (10.2%) and s-curve validation (10.3%) exceed it; the pooled "all" series are 5.7% (generation) and 8.3% (validation). The sandbox is a shared 2-vCPU VM, so timing noise is not controlled.

## DEVIATIONS

1. The runs were executed as two background batches (validity run first; timing run, determinism check and the five repetitions afterwards, with no other load) rather than through run-all.sh in one go, so analysis code could be written while the validity run was in progress. The commands are the ones in run-all.sh; the analysis was run after all data existed.
2. results/timing-reps.json was merged from out/rep1..5.json by analyze.py (the raw out/ files are not committed).
3. analyze.py received one cosmetic fix (read_csv low_memory=False, to silence a dtype warning) before the committed results were produced; no result changed.
4. No change to PROTOCOL.md was made after any result existed.
