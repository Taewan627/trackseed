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
