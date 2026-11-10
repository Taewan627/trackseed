# E4 amended validity tables (validator v0.5.1, closureTangentMode ratio)

Digest check (baseline CSV without `ok` and `codes`, S3b vs amended): IDENTICAL (4b05c503c977e9006f4fa0d3fa01388c2c4db077f44e3e99afae86617dff7f36).

## 1. ok rate among generated tracks: S3b (v0.5.0 rule) vs amended (Wilson 95% CI)

| set | generated | ok S3b | ok amended | exploratory S3b column "ok ignoring CLOSURE_TANGENT" | CLOSURE_TANGENT tracks S3b | CLOSURE_TANGENT tracks amended |
|---|---|---|---|---|---|---|
| B1 | 4050 | 594 (14.67% [13.61, 15.79]) | 1950 (48.15% [46.61, 49.69]) | 48.15% [46.61, 49.69] | 2925 (72.2%) | 54 (1.3%) |
| B2 | 4050 | 366 (9.04% [8.19, 9.96]) | 693 (17.11% [15.98, 18.30]) | 17.11% [15.98, 18.30] | 1674 (41.3%) | 360 (8.9%) |
| TL-Auto | 12150 | 2859 (23.53% [22.79, 24.29]) | 3792 (31.21% [30.39, 32.04]) | 33.46% [32.62, 34.30] | 7506 (61.8%) | 5751 (47.3%) |
| TL-Auto0 | 4050 | 2682 (66.22% [64.75, 67.66]) | 3615 (89.26% [88.27, 90.18]) | 89.26% [88.27, 90.18] | 1350 (33.3%) | 0 (0.0%) |
| TL-right-angle | 12150 | 9699 (79.83% [79.10, 80.53]) | 12150 (100.00% [99.97, 100.00]) | 100.00% [99.97, 100.00] | 2451 (20.2%) | 0 (0.0%) |
| TL-hairpin | 12144 | 10218 (84.14% [83.48, 84.78]) | 12144 (100.00% [99.97, 100.00]) | 100.00% [99.97, 100.00] | 1926 (15.9%) | 0 (0.0%) |
| TL-s-curve | 12150 | 10017 (82.44% [81.76, 83.11]) | 12150 (100.00% [99.97, 100.00]) | 100.00% [99.97, 100.00] | 2133 (17.6%) | 0 (0.0%) |

## 2. Violation-code incidence, amended (% of generated tracks)

| code | B1 | B2 | TL-Auto | TL-Auto0 | TL-right-angle | TL-hairpin | TL-s-curve |
|---|---|---|---|---|---|---|---|
| CLOSURE_TANGENT | 1.3% | 8.9% | 47.3% | 0.0% | 0.0% | 0.0% | 0.0% |
| EDGE_EDGE_INTERSECTION | 0.7% | 14.7% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% |
| EDGE_FOLD | 51.8% | 82.7% | 66.4% | 10.7% | 0.0% | 0.0% | 0.0% |
| MAX_SLOPE | 66.7% | 66.7% | 66.7% | 66.7% | 66.7% | 66.7% | 66.7% |
| MIN_TURN_RADIUS | 56.7% | 84.3% | 70.0% | 11.1% | 0.0% | 0.0% | 0.0% |
| SELF_INTERSECTION_CENTERLINE | 0.7% | 12.9% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% |
| SELF_INTERSECTION_EDGE | 51.3% | 79.6% | 64.9% | 10.6% | 0.0% | 0.0% | 0.0% |

## 3. Baseline sampling-spacing sensitivity, amended

| generator | spacing | ok S3b | ok amended [CI] | CLOSURE_TANGENT amended |
|---|---|---|---|---|
| B1 | 4 | 22.89% | 39.78% [38.28, 41.29] | 0.0% |
| B1 | 8 | 14.67% | 48.15% [46.61, 49.69] | 1.3% |
| B1 | 12 | 12.67% | 54.96% [53.43, 56.49] | 3.8% |
| B2 | 4 | 10.30% | 14.22% [13.18, 15.33] | 4.9% |
| B2 | 8 | 9.04% | 17.11% [15.98, 18.30] | 8.9% |
| B2 | 12 | 8.30% | 20.59% [19.38, 21.87] | 11.3% |

Order of amended ok rates among TL-Auto0, B1, B2 (high to low): TL-Auto0 > B1 > B2.
