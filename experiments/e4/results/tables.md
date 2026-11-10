## 1. Validity (Wilson 95% CI); ok = validator ok (error-severity codes only)

| set | cases | generation failures | ok among generated | end-to-end ok / cases | EXPLORATORY: ok ignoring CLOSURE_TANGENT |
|---|---|---|---|---|---|
| B1 | 4050 | 0 | 594 (14.67% [13.61, 15.79]) | 14.67% [13.61, 15.79] | 48.15% [46.61, 49.69] |
| B2 | 4050 | 0 | 366 (9.04% [8.19, 9.96]) | 9.04% [8.19, 9.96] | 17.11% [15.98, 18.30] |
| TL-Auto | 12150 | 0 | 2859 (23.53% [22.79, 24.29]) | 23.53% [22.79, 24.29] | 33.46% [32.62, 34.30] |
| TL-Auto0 | 4050 | 0 | 2682 (66.22% [64.75, 67.66]) | 66.22% [64.75, 67.66] | 89.26% [88.27, 90.18] |
| TL-right-angle | 12150 | 0 | 9699 (79.83% [79.10, 80.53]) | 79.83% [79.10, 80.53] | 100.00% [99.97, 100.00] |
| TL-hairpin | 12150 | 6 | 10218 (84.14% [83.48, 84.78]) | 84.10% [83.44, 84.74] | 100.00% [99.97, 100.00] |
| TL-s-curve | 12150 | 0 | 10017 (82.44% [81.76, 83.11]) | 82.44% [81.76, 83.11] | 100.00% [99.97, 100.00] |

## 2. Violation-code incidence (% of generated tracks with >= 1 violation of the code)

| code | B1 | B2 | TL-Auto | TL-Auto0 | TL-right-angle | TL-hairpin | TL-s-curve |
|---|---|---|---|---|---|---|---|
| CLOSURE_TANGENT | 72.2% | 41.3% | 61.8% | 33.3% | 20.2% | 15.9% | 17.6% |
| EDGE_EDGE_INTERSECTION | 0.7% | 14.7% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% |
| EDGE_FOLD | 51.8% | 82.7% | 66.4% | 10.7% | 0.0% | 0.0% | 0.0% |
| MAX_SLOPE | 66.7% | 66.7% | 66.7% | 66.7% | 66.7% | 66.7% | 66.7% |
| MIN_TURN_RADIUS | 56.7% | 84.3% | 70.0% | 11.1% | 0.0% | 0.0% | 0.0% |
| SELF_INTERSECTION_CENTERLINE | 0.7% | 12.9% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% |
| SELF_INTERSECTION_EDGE | 51.3% | 79.6% | 64.9% | 10.6% | 0.0% | 0.0% | 0.0% |

## 3. Per-metric median (IQR), PRIMARY: all generated tracks

| metric | B1 | B2 | TL-Auto | TL-Auto0 | TL-right-angle | TL-hairpin | TL-s-curve |
|---|---|---|---|---|---|---|---|
| sampleCount | 337 (74) | 264.5 (92) | 360 (420) | 360 (420) | 307 (73) | 366.5 (203) | 319 (138) |
| length | 3047 (751) | 2463 (851) | 2588 (755) | 2611 (747) | 2781 (728) | 3268 (1.53e+03) | 2932 (1.06e+03) |
| boundingBoxArea | 6.277e+05 (2.79e+05) | 4.195e+05 (3.12e+05) | 4.946e+05 (2.26e+05) | 5.087e+05 (2.31e+05) | 5.919e+05 (2.76e+05) | 7.729e+05 (9.62e+05) | 6.425e+05 (5.78e+05) |
| straightLengthFraction | 0.07586 (0.0673) | 0.2846 (0.258) | 0.3263 (0.535) | 0 (0.0729) | 0.1132 (0.226) | 0.06161 (0.0622) | 0.003368 (0.0212) |
| meanAbsCurvature | 0.004761 (0.00137) | 0.004662 (0.00212) | 0.003274 (0.00116) | 0.003402 (0.00138) | 0.003279 (0.00113) | 0.004264 (0.00194) | 0.005252 (0.00206) |
| maxAbsCurvature | 0.05704 (0.0372) | 0.1657 (0.139) | 0.1448 (0.159) | 0.01524 (0.0186) | 0.01316 (0.00869) | 0.01425 (0.00946) | 0.01222 (0.00833) |
| p95AbsCurvature | 0.01702 (0.00562) | 0.01669 (0.00855) | 0.00856 (0.00713) | 0.009503 (0.0104) | 0.01297 (0.00849) | 0.01417 (0.00938) | 0.01209 (0.00799) |
| curvatureEntropyBits | 2.676 (0.159) | 2.552 (0.333) | 2.105 (0.67) | 2.341 (0.603) | 2.38 (0.272) | 2.344 (0.414) | 2.063 (0.452) |
| turnCount | 13 (5) | 5 (6) | 5 (4) | 4 (3) | 5 (1) | 6 (2) | 14 (4) |
| elevationRange | 194.3 (486) | 194.3 (486) | 194.3 (486) | 194.3 (486) | 194.3 (486) | 194.3 (486) | 194.3 (486) |
| maxAbsSlope | 0.6718 (1.5) | 0.8828 (1.92) | 0.9416 (2.06) | 0.9532 (2.07) | 0.7385 (1.65) | 0.6181 (1.09) | 0.7106 (1.41) |
| meanAbsSlope | 0.288 (0.642) | 0.368 (0.796) | 0.3523 (0.78) | 0.3488 (0.774) | 0.3173 (0.709) | 0.2655 (0.47) | 0.3052 (0.606) |
| totalTurningDegrees | 747 (160) | 534.7 (396) | 360 (18.9) | 360 (35) | 449.7 (127) | 712.8 (4.25) | 769.3 (22.6) |

## 4. Per-metric median (IQR), SECONDARY: valid tracks only

| metric | B1 | B2 | TL-Auto | TL-Auto0 | TL-right-angle | TL-hairpin | TL-s-curve |
|---|---|---|---|---|---|---|---|
| sampleCount | 341 (75) | 294 (63) | 360 (240) | 360 (240) | 313 (69) | 377 (206) | 333 (133) |
| length | 3086 (752) | 2608 (706) | 2738 (670) | 2728 (677) | 2824 (685) | 3435 (1.56e+03) | 3047 (1.03e+03) |
| boundingBoxArea | 6.913e+05 (2.91e+05) | 5.499e+05 (2.24e+05) | 5.829e+05 (2.54e+05) | 5.761e+05 (2.5e+05) | 6.175e+05 (2.65e+05) | 8.371e+05 (1.02e+06) | 7.004e+05 (5.9e+05) |
| straightLengthFraction | 0.06136 (0.0489) | 0.1821 (0.206) | 0.04892 (0.0843) | 0.03833 (0.0781) | 0.1486 (0.212) | 0.05903 (0.0463) | 0 (0.0149) |
| meanAbsCurvature | 0.004559 (0.00127) | 0.003196 (0.000917) | 0.003016 (0.000695) | 0.003039 (0.000697) | 0.003097 (0.000769) | 0.004152 (0.00185) | 0.005049 (0.00184) |
| maxAbsCurvature | 0.04485 (0.0209) | 0.02715 (0.0307) | 0.01216 (0.00653) | 0.01181 (0.00554) | 0.01311 (0.00864) | 0.01415 (0.00932) | 0.01211 (0.00817) |
| p95AbsCurvature | 0.01605 (0.00557) | 0.01174 (0.00575) | 0.007537 (0.00311) | 0.007629 (0.00308) | 0.0129 (0.00846) | 0.01409 (0.00932) | 0.01203 (0.00792) |
| curvatureEntropyBits | 2.602 (0.223) | 2.509 (0.202) | 2.139 (0.67) | 2.133 (0.701) | 2.385 (0.277) | 2.285 (0.426) | 2.008 (0.401) |
| turnCount | 14 (5) | 5 (2) | 5 (2) | 5 (2) | 5 (1) | 7 (3) | 15 (3) |
| elevationRange | 194.3 (486) | 194.3 (486) | 194.3 (486) | 194.3 (486) | 194.3 (486) | 194.3 (486) | 194.3 (486) |
| maxAbsSlope | 0.6628 (1.47) | 0.7698 (1.76) | 0.8652 (1.89) | 0.8659 (1.89) | 0.7228 (1.64) | 0.6015 (1.06) | 0.6801 (1.37) |
| meanAbsSlope | 0.2848 (0.633) | 0.3308 (0.756) | 0.3217 (0.725) | 0.3225 (0.728) | 0.3106 (0.703) | 0.2584 (0.457) | 0.2921 (0.59) |
| totalTurningDegrees | 734.1 (142) | 407.7 (55.7) | 362.2 (56.2) | 362.2 (64.3) | 436.4 (63.6) | 712.9 (4.25) | 771 (22.5) |

## 5. Cliff's delta of each baseline vs TrackLab (positive: baseline values tend to be larger), generated tracks

| metric | B1 vs TL-Auto0 | B2 vs TL-Auto0 | B1 vs TL-Auto | B2 vs TL-Auto |
|---|---|---|---|---|
| sampleCount | -0.08 (negligible) | -0.40 (medium) | -0.08 (negligible) | -0.40 (medium) |
| length | +0.43 (medium) | -0.15 (small) | +0.45 (medium) | -0.13 (negligible) |
| boundingBoxArea | +0.36 (medium) | -0.30 (small) | +0.39 (medium) | -0.27 (small) |
| straightLengthFraction | +0.55 (large) | +0.89 (large) | -0.48 (large) | -0.04 (negligible) |
| meanAbsCurvature | +0.63 (large) | +0.51 (large) | +0.72 (large) | +0.60 (large) |
| maxAbsCurvature | +0.90 (large) | +0.93 (large) | -0.34 (medium) | +0.23 (small) |
| p95AbsCurvature | +0.51 (large) | +0.47 (medium) | +0.69 (large) | +0.63 (large) |
| curvatureEntropyBits | +0.85 (large) | +0.46 (medium) | +0.90 (large) | +0.58 (large) |
| turnCount | +0.97 (large) | +0.19 (small) | +0.93 (large) | +0.04 (negligible) |
| elevationRange | +0.09 (negligible) | +0.02 (negligible) | +0.09 (negligible) | +0.02 (negligible) |
| maxAbsSlope | -0.20 (small) | -0.04 (negligible) | -0.20 (small) | -0.03 (negligible) |
| meanAbsSlope | -0.13 (negligible) | +0.05 (negligible) | -0.14 (negligible) | +0.04 (negligible) |
| totalTurningDegrees | +0.99 (large) | +0.48 (large) | +1.00 (large) | +0.50 (large) |

## 6. Expressive range: occupied bins of the 30 x 30 grid (bin range pooled over ALL seven sets, generated tracks) and 2D histogram entropy (bits)

| pair (x, y) | B1 | B2 | TL-Auto | TL-Auto0 | TL-right-angle | TL-hairpin | TL-s-curve |
|---|---|---|---|---|---|---|---|
| (straightLengthFraction, curvatureEntropyBits) | 67 (5.46 b) | 203 (7.12 b) | 218 (7.02 b) | 72 (5.55 b) | 253 (6.59 b) | 170 (6.32 b) | 132 (5.17 b) |
| (totalTurningDegrees, length) | 273 (7.54 b) | 272 (7.15 b) | 74 (4.59 b) | 73 (4.80 b) | 188 (6.57 b) | 59 (4.53 b) | 71 (4.80 b) |
| (elevationRange, maxAbsSlope) | 12 (2.60 b) | 32 (3.30 b) | 26 (3.33 b) | 26 (3.41 b) | 17 (2.61 b) | 14 (2.78 b) | 17 (2.95 b) |

## 7. Scale and sampling matching check (reported, not adjusted): medians over generated tracks

| set | median length | median boundingBoxArea | median spacing = length / sampleCount | median sampleCount |
|---|---|---|---|---|
| B1 | 3047 | 627706 | 8.43 | 337 |
| B2 | 2463 | 419514 | 8.67 | 264 |
| TL-Auto | 2588 | 494553 | 7.34 | 360 |
| TL-Auto0 | 2611 | 508659 | 7.42 | 360 |
| TL-right-angle | 2781 | 591865 | 8.50 | 307 |
| TL-hairpin | 3268 | 772886 | 8.36 | 366 |
| TL-s-curve | 2932 | 642496 | 8.47 | 319 |

## 8. Sampling-spacing sensitivity of the baselines (target spacing 4 / 8 / 12 units; all 4050 cases each)

| generator | spacing | ok rate [CI] | ok ignoring CLOSURE_TANGENT | median straightLengthFraction | median curvatureEntropyBits | median p95AbsCurvature |
|---|---|---|---|---|---|---|
| B1 | 4 | 22.89% [21.62, 24.21] | 39.78% [38.28, 41.29] | 0.0884 | 2.6773 | 0.01706 |
| B1 | 8 | 14.67% [13.61, 15.79] | 48.15% [46.61, 49.69] | 0.0759 | 2.6762 | 0.01702 |
| B1 | 12 | 12.67% [11.68, 13.73] | 56.00% [54.47, 57.52] | 0.0662 | 2.6714 | 0.01675 |
| B2 | 4 | 10.30% [9.40, 11.27] | 14.22% [13.18, 15.33] | 0.2370 | 2.5779 | 0.01635 |
| B2 | 8 | 9.04% [8.19, 9.96] | 17.11% [15.98, 18.30] | 0.2846 | 2.5517 | 0.01669 |
| B2 | 12 | 8.30% [7.49, 9.19] | 21.26% [20.03, 22.55] | 0.2791 | 2.5508 | 0.01751 |
