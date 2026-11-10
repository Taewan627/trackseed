# E3 results: expressive range of TrackLab v0.5 by corner-pattern mode

Protocol: PROTOCOL.md (commit 942901a, before any result). Data: the E2 validity run (experiments/e2/results/validity.csv.gz); no new generation. Primary population: all generated tracks per mode (12,150 for auto, right-angle, s-curve; 12,144 for hairpin). Analysis: analyze.py (two runs gave identical SUMMARY.json); numbers: results/SUMMARY.json; plots from ../make-figures.py. The idea of an expressive-range analysis follows Smith and Whitehead (PCG Workshop 2010) as an idea only.

Caveat that applies to every number below: the E2 design is a balanced full factorial over fixed parameter levels (curves 3/6/10, straight 0/0.3/0.6, width, size, height at three levels each), not a natural parameter distribution, so ranges and coverage reflect that grid. `elevationRange` depends only on height and seed (identical across modes), so pair 3 shows three height clusters rather than mode differences.

## Per-mode statistics, coverage, and checks (results/tables.md)

## Per-mode summary statistics, PRIMARY: all generated tracks


### straightLengthFraction

| mode | n | mean | sd | median | IQR | min | max |
|---|---|---|---|---|---|---|---|
| auto | 12150 | 0.3319 | 0.2452 | 0.3263 | 0.5352 | 0 | 0.7245 |
| right-angle | 12150 | 0.1351 | 0.1266 | 0.1132 | 0.2257 | 0 | 0.5318 |
| hairpin | 12144 | 0.09612 | 0.07854 | 0.06161 | 0.06219 | 0.02409 | 0.5671 |
| s-curve | 12150 | 0.02475 | 0.05803 | 0.003368 | 0.02115 | 0 | 0.5017 |

### curvatureEntropyBits

| mode | n | mean | sd | median | IQR | min | max |
|---|---|---|---|---|---|---|---|
| auto | 12150 | 2.065 | 0.3859 | 2.105 | 0.6696 | 1.187 | 2.71 |
| right-angle | 12150 | 2.334 | 0.197 | 2.38 | 0.272 | 1.486 | 2.731 |
| hairpin | 12144 | 2.283 | 0.2993 | 2.344 | 0.4138 | 1.244 | 2.789 |
| s-curve | 12150 | 2.075 | 0.3065 | 2.063 | 0.4524 | 1.084 | 2.802 |

### length

| mode | n | mean | sd | median | IQR | min | max |
|---|---|---|---|---|---|---|---|
| auto | 12150 | 2595 | 487.9 | 2588 | 754.9 | 1422 | 3727 |
| right-angle | 12150 | 2779 | 519.6 | 2781 | 727.7 | 1363 | 5909 |
| hairpin | 12144 | 3492 | 904.8 | 3268 | 1529 | 1668 | 5833 |
| s-curve | 12150 | 2959 | 678.3 | 2932 | 1063 | 1368 | 5670 |

### totalTurningDegrees

| mode | n | mean | sd | median | IQR | min | max |
|---|---|---|---|---|---|---|---|
| auto | 12150 | 377.6 | 34.84 | 360 | 18.95 | 360 | 560.6 |
| right-angle | 12150 | 480.9 | 81.51 | 449.7 | 126.6 | 360.6 | 696.4 |
| hairpin | 12144 | 713.9 | 8.136 | 712.8 | 4.255 | 703 | 813.9 |
| s-curve | 12150 | 770.3 | 12.24 | 769.3 | 22.56 | 743.3 | 849.2 |

### maxAbsSlope

| mode | n | mean | sd | median | IQR | min | max |
|---|---|---|---|---|---|---|---|
| auto | 12150 | 1.23 | 1.223 | 0.9416 | 2.059 | 0 | 6.3 |
| right-angle | 12150 | 0.8848 | 0.8051 | 0.7385 | 1.65 | 0 | 3.317 |
| hairpin | 12144 | 0.7075 | 0.6716 | 0.6181 | 1.093 | 0 | 2.711 |
| s-curve | 12150 | 0.8448 | 0.7913 | 0.7106 | 1.41 | 0 | 3.304 |

### elevationRange

| mode | n | mean | sd | median | IQR | min | max |
|---|---|---|---|---|---|---|---|
| auto | 12150 | 226.7 | 199.6 | 194.3 | 485.8 | 0 | 485.9 |
| right-angle | 12150 | 226.7 | 199.7 | 194.3 | 485.8 | 0 | 485.9 |
| hairpin | 12144 | 226.7 | 199.7 | 194.3 | 485.8 | 0 | 485.9 |
| s-curve | 12150 | 226.7 | 199.7 | 194.3 | 485.8 | 0 | 485.9 |

### Coverage of the 30 x 30 grid and 2D histogram entropy (PRIMARY: all generated tracks)

| pair (x, y) | mode | occupied bins | coverage | histogram entropy (bits) |
|---|---|---|---|---|
| (straightLengthFraction, curvatureEntropyBits) | auto | 263 | 0.292 | 7.314 |
| (straightLengthFraction, curvatureEntropyBits) | right-angle | 316 | 0.351 | 6.891 |
| (straightLengthFraction, curvatureEntropyBits) | hairpin | 201 | 0.223 | 6.688 |
| (straightLengthFraction, curvatureEntropyBits) | s-curve | 165 | 0.183 | 5.403 |
| (totalTurningDegrees, length) | auto | 141 | 0.157 | 5.195 |
| (totalTurningDegrees, length) | right-angle | 353 | 0.392 | 7.618 |
| (totalTurningDegrees, length) | hairpin | 100 | 0.111 | 4.914 |
| (totalTurningDegrees, length) | s-curve | 105 | 0.117 | 5.495 |
| (elevationRange, maxAbsSlope) | auto | 36 | 0.040 | 3.676 |
| (elevationRange, maxAbsSlope) | right-angle | 24 | 0.027 | 2.980 |
| (elevationRange, maxAbsSlope) | hairpin | 21 | 0.023 | 3.160 |
| (elevationRange, maxAbsSlope) | s-curve | 22 | 0.024 | 3.213 |

## Per-mode summary statistics, SECONDARY: valid tracks only (ok = 1)


### straightLengthFraction

| mode | n | mean | sd | median | IQR | min | max |
|---|---|---|---|---|---|---|---|
| auto | 2859 | 0.06039 | 0.08054 | 0.04892 | 0.08431 | 0 | 0.5733 |
| right-angle | 9699 | 0.1584 | 0.1279 | 0.1486 | 0.2118 | 0 | 0.5318 |
| hairpin | 10218 | 0.08231 | 0.05813 | 0.05903 | 0.04628 | 0.02409 | 0.5671 |
| s-curve | 10017 | 0.01517 | 0.04051 | 0 | 0.01486 | 0 | 0.5017 |

### curvatureEntropyBits

| mode | n | mean | sd | median | IQR | min | max |
|---|---|---|---|---|---|---|---|
| auto | 2859 | 2.044 | 0.3739 | 2.139 | 0.6698 | 1.187 | 2.656 |
| right-angle | 9699 | 2.333 | 0.2034 | 2.385 | 0.2772 | 1.486 | 2.731 |
| hairpin | 10218 | 2.226 | 0.2883 | 2.285 | 0.4265 | 1.244 | 2.764 |
| s-curve | 10017 | 2.012 | 0.2762 | 2.008 | 0.4013 | 1.084 | 2.763 |

### length

| mode | n | mean | sd | median | IQR | min | max |
|---|---|---|---|---|---|---|---|
| auto | 2859 | 2737 | 451.9 | 2738 | 670 | 1790 | 3727 |
| right-angle | 9699 | 2823 | 490.2 | 2824 | 684.5 | 1388 | 5909 |
| hairpin | 10218 | 3617 | 901.2 | 3435 | 1559 | 1735 | 5833 |
| s-curve | 10017 | 3046 | 666.2 | 3047 | 1034 | 1390 | 5670 |

### totalTurningDegrees

| mode | n | mean | sd | median | IQR | min | max |
|---|---|---|---|---|---|---|---|
| auto | 2859 | 393.2 | 46.71 | 362.2 | 56.17 | 360 | 560.6 |
| right-angle | 9699 | 454.5 | 63.96 | 436.4 | 63.6 | 360.6 | 696.4 |
| hairpin | 10218 | 714.1 | 8.731 | 712.9 | 4.247 | 703 | 813.9 |
| s-curve | 10017 | 771.2 | 12.66 | 771 | 22.48 | 743.3 | 849.2 |

### maxAbsSlope

| mode | n | mean | sd | median | IQR | min | max |
|---|---|---|---|---|---|---|---|
| auto | 2859 | 1.017 | 0.9263 | 0.8652 | 1.895 | 0 | 3.21 |
| right-angle | 9699 | 0.8611 | 0.7764 | 0.7228 | 1.637 | 0 | 3.26 |
| hairpin | 10218 | 0.6763 | 0.6399 | 0.6015 | 1.065 | 0 | 2.605 |
| s-curve | 10017 | 0.8113 | 0.7562 | 0.6801 | 1.373 | 0 | 3.253 |

### elevationRange

| mode | n | mean | sd | median | IQR | min | max |
|---|---|---|---|---|---|---|---|
| auto | 2859 | 226.7 | 199.7 | 194.3 | 485.8 | 0 | 485.9 |
| right-angle | 9699 | 226.7 | 199.7 | 194.3 | 485.8 | 0 | 485.9 |
| hairpin | 10218 | 226.7 | 199.7 | 194.3 | 485.8 | 0 | 485.9 |
| s-curve | 10017 | 226.7 | 199.7 | 194.3 | 485.8 | 0 | 485.9 |

### Coverage of the 30 x 30 grid and 2D histogram entropy (SECONDARY: valid tracks only (ok = 1))

| pair (x, y) | mode | occupied bins | coverage | histogram entropy (bits) |
|---|---|---|---|---|
| (straightLengthFraction, curvatureEntropyBits) | auto | 133 | 0.148 | 6.049 |
| (straightLengthFraction, curvatureEntropyBits) | right-angle | 390 | 0.433 | 7.411 |
| (straightLengthFraction, curvatureEntropyBits) | hairpin | 203 | 0.226 | 6.610 |
| (straightLengthFraction, curvatureEntropyBits) | s-curve | 162 | 0.180 | 5.196 |
| (totalTurningDegrees, length) | auto | 131 | 0.146 | 5.781 |
| (totalTurningDegrees, length) | right-angle | 325 | 0.361 | 7.200 |
| (totalTurningDegrees, length) | hairpin | 99 | 0.110 | 4.921 |
| (totalTurningDegrees, length) | s-curve | 103 | 0.114 | 5.499 |
| (elevationRange, maxAbsSlope) | auto | 27 | 0.030 | 3.686 |
| (elevationRange, maxAbsSlope) | right-angle | 40 | 0.044 | 3.391 |
| (elevationRange, maxAbsSlope) | hairpin | 31 | 0.034 | 3.566 |
| (elevationRange, maxAbsSlope) | s-curve | 37 | 0.041 | 3.702 |

## Checks for the pre-registered predictions

| mode | share with totalTurningDegrees >= 360 | min totalTurningDegrees | elevationRange/height range (height>0) | max maxAbsSlope at height 0 |
|---|---|---|---|---|
| auto | 100.00% | 360.00 | 2.428 .. 2.429 | 0.0 |
| right-angle | 100.00% | 360.59 | 2.427 .. 2.429 | 0.0 |
| hairpin | 100.00% | 703.01 | 2.428 .. 2.429 | 0.0 |
| s-curve | 100.00% | 743.34 | 2.427 .. 2.429 | 0.0 |

## Figures

- results/figures/e3_pair1_straightLengthFraction_curvatureEntropyBits.png: histogram (top) and scatter (bottom) per mode, x = straightLengthFraction, y = curvatureEntropyBits.
- results/figures/e3_pair2_totalTurningDegrees_length.png: x = totalTurningDegrees, y = length.
- results/figures/e3_pair3_elevationRange_maxAbsSlope.png: x = elevationRange, y = maxAbsSlope.

## Observations (descriptive; no hypothesis tests)

- Auto median straightLengthFraction 0.326 (the `straight` level takes three clusters, visible as three bands in pair 1); right-angle 0.113, hairpin 0.062, s-curve 0.003. Median curvatureEntropyBits: Auto 2.105, right-angle 2.380, hairpin 2.344, s-curve 2.063.
- Median totalTurningDegrees: Auto 360 (almost a pure 360-degree loop), right-angle 449.7, hairpin 712.8, s-curve 769.3. Median length: 2588, 2781, 3268, 2932.
- Coverage of the 30 x 30 grid (pooled bins over the four modes) for pair 1: auto 263 bins, right-angle 316, hairpin 201, s-curve 165; pair 2: 141, 353, 100, 105; pair 3: 36, 24, 21, 22.

## Predictions vs observed

1. All tracks totalTurningDegrees >= 360, pattern-mode medians above Auto's: CONFIRMED (share 100.00% in every mode, minimum 360.00; medians 449.7, 712.8, 769.3 vs 360).
2. Pattern modes' median straightLengthFraction <= Auto's: CONFIRMED (0.113, 0.062, 0.003 vs 0.326).
3. elevationRange/height between 1.5 and 2.8 for height > 0; maxAbsSlope = 0 at height 0: CONFIRMED (2.427 to 2.429 in every mode; maximum maxAbsSlope at height 0 is 0.0 in every mode).
4. Pair-1 coverage largest for Auto and smallest for hairpin: WRONG on both parts (largest right-angle 316, Auto second with 263; smallest s-curve with 165, hairpin 201).

## DEVIATIONS

1. The secondary (valid-only) coverage in tables.md uses bin edges pooled over the valid-only population, not over the primary population, so its bin counts are not comparable with the primary coverage table. (The protocol says the secondary population is "reported in the summary tables"; the bin rule for it was not stated.)
2. No change to PROTOCOL.md after any result existed.
