# E3 secondary (valid-only) tables under the amended validator (validator 0.5.1, closureTangentMode ratio)

Plan and predictions: ../../../amendment-01/ADDENDUM-E3.md. Population: generated tracks with ok = 1 in experiments/e2/results/amendment-01/validity.csv.gz.


### straightLengthFraction

| mode | n | mean | sd | median | IQR | min | max |
|---|---|---|---|---|---|---|---|
| auto | 3792 | 0.05133 | 0.07472 | 0.02552 | 0.07941 | 0 | 0.5733 |
| right-angle | 12150 | 0.1351 | 0.1266 | 0.1132 | 0.2257 | 0 | 0.5318 |
| hairpin | 12144 | 0.09612 | 0.07854 | 0.06161 | 0.06219 | 0.02409 | 0.5671 |
| s-curve | 12150 | 0.02475 | 0.05803 | 0.003368 | 0.02115 | 0 | 0.5017 |

### curvatureEntropyBits

| mode | n | mean | sd | median | IQR | min | max |
|---|---|---|---|---|---|---|---|
| auto | 3792 | 2.153 | 0.3809 | 2.286 | 0.614 | 1.187 | 2.71 |
| right-angle | 12150 | 2.334 | 0.197 | 2.38 | 0.272 | 1.486 | 2.731 |
| hairpin | 12144 | 2.283 | 0.2993 | 2.344 | 0.4138 | 1.244 | 2.789 |
| s-curve | 12150 | 2.075 | 0.3065 | 2.063 | 0.4524 | 1.084 | 2.802 |

### length

| mode | n | mean | sd | median | IQR | min | max |
|---|---|---|---|---|---|---|---|
| auto | 3792 | 2657 | 477.6 | 2657 | 727.1 | 1473 | 3727 |
| right-angle | 12150 | 2779 | 519.6 | 2781 | 727.7 | 1363 | 5909 |
| hairpin | 12144 | 3492 | 904.8 | 3268 | 1529 | 1668 | 5833 |
| s-curve | 12150 | 2959 | 678.3 | 2932 | 1063 | 1368 | 5670 |

### totalTurningDegrees

| mode | n | mean | sd | median | IQR | min | max |
|---|---|---|---|---|---|---|---|
| auto | 3792 | 385 | 43.01 | 360 | 40.43 | 360 | 560.6 |
| right-angle | 12150 | 480.9 | 81.51 | 449.7 | 126.6 | 360.6 | 696.4 |
| hairpin | 12144 | 713.9 | 8.136 | 712.8 | 4.255 | 703 | 813.9 |
| s-curve | 12150 | 770.3 | 12.24 | 769.3 | 22.56 | 743.3 | 849.2 |

### maxAbsSlope

| mode | n | mean | sd | median | IQR | min | max |
|---|---|---|---|---|---|---|---|
| auto | 3792 | 1.192 | 1.183 | 0.9201 | 2.016 | 0 | 6.3 |
| right-angle | 12150 | 0.8848 | 0.8051 | 0.7385 | 1.65 | 0 | 3.317 |
| hairpin | 12144 | 0.7075 | 0.6716 | 0.6181 | 1.093 | 0 | 2.711 |
| s-curve | 12150 | 0.8448 | 0.7913 | 0.7106 | 1.41 | 0 | 3.304 |

### elevationRange

| mode | n | mean | sd | median | IQR | min | max |
|---|---|---|---|---|---|---|---|
| auto | 3792 | 226.7 | 199.7 | 194.3 | 485.8 | 0 | 485.9 |
| right-angle | 12150 | 226.7 | 199.7 | 194.3 | 485.8 | 0 | 485.9 |
| hairpin | 12144 | 226.7 | 199.7 | 194.3 | 485.8 | 0 | 485.9 |
| s-curve | 12150 | 226.7 | 199.7 | 194.3 | 485.8 | 0 | 485.9 |

### Coverage of the 30 x 30 grid and 2D histogram entropy (valid-only, amended)

| pair (x, y) | mode | occupied bins | coverage | histogram entropy (bits) |
|---|---|---|---|---|
| (straightLengthFraction, curvatureEntropyBits) | auto | 160 | 0.178 | 6.257 |
| (straightLengthFraction, curvatureEntropyBits) | right-angle | 384 | 0.427 | 7.148 |
| (straightLengthFraction, curvatureEntropyBits) | hairpin | 245 | 0.272 | 6.907 |
| (straightLengthFraction, curvatureEntropyBits) | s-curve | 204 | 0.227 | 5.587 |
| (totalTurningDegrees, length) | auto | 133 | 0.148 | 5.472 |
| (totalTurningDegrees, length) | right-angle | 353 | 0.392 | 7.618 |
| (totalTurningDegrees, length) | hairpin | 100 | 0.111 | 4.914 |
| (totalTurningDegrees, length) | s-curve | 105 | 0.117 | 5.495 |
| (elevationRange, maxAbsSlope) | auto | 35 | 0.039 | 3.615 |
| (elevationRange, maxAbsSlope) | right-angle | 24 | 0.027 | 2.980 |
| (elevationRange, maxAbsSlope) | hairpin | 21 | 0.023 | 3.160 |
| (elevationRange, maxAbsSlope) | s-curve | 22 | 0.024 | 3.213 |

## Comparison: valid-only n and medians, original rule (S3b) vs amended vs primary (all generated)

| mode | metric | n original | n amended | n primary | median original | median amended | median primary |
|---|---|---|---|---|---|---|---|
| auto | straightLengthFraction | 2859 | 3792 | 12150 | 0.04892 | 0.02552 | 0.3263 |
| auto | totalTurningDegrees | 2859 | 3792 | 12150 | 362.2 | 360 | 360 |
| auto | length | 2859 | 3792 | 12150 | 2738 | 2657 | 2588 |
| right-angle | straightLengthFraction | 9699 | 12150 | 12150 | 0.1486 | 0.1132 | 0.1132 |
| right-angle | totalTurningDegrees | 9699 | 12150 | 12150 | 436.4 | 449.7 | 449.7 |
| right-angle | length | 9699 | 12150 | 12150 | 2824 | 2781 | 2781 |
| hairpin | straightLengthFraction | 10218 | 12144 | 12144 | 0.05903 | 0.06161 | 0.06161 |
| hairpin | totalTurningDegrees | 10218 | 12144 | 12144 | 712.9 | 712.8 | 712.8 |
| hairpin | length | 10218 | 12144 | 12144 | 3435 | 3268 | 3268 |
| s-curve | straightLengthFraction | 10017 | 12150 | 12150 | 0 | 0.003368 | 0.003368 |
| s-curve | totalTurningDegrees | 10017 | 12150 | 12150 | 771 | 769.3 | 769.3 |
| s-curve | length | 10017 | 12150 | 12150 | 3047 | 2932 | 2932 |

## Checks for the addendum predictions

```
{
 "autoPair1OccupiedPrimary": 263,
 "autoPair1OccupiedValidOnly": 160,
 "autoValidMedianStraightFraction": 0.025525,
 "autoValidMedianTurning": 360.0,
 "autoValidN": 3792,
 "autoValidShareStraight0": 0.9533227848101266,
 "patternModesStatsEqualPrimary": {
  "auto": false,
  "hairpin": true,
  "right-angle": true,
  "s-curve": true
 }
}
```
