# E2 amended validity tables (validator v0.5.1, closureTangentMode ratio)

Digest check (CSV without the `ok` and `codes` columns, S3b vs amended): IDENTICAL (f2acea554e64a7479ca1dc9dd5dbd2720faa36276ae36f872839f03495f82ed1).

## 1. ok rate among generated tracks, S3b (v0.5.0 rule) vs amended (Wilson 95% CI)

| mode | generated | ok S3b | ok amended | CLOSURE_TANGENT tracks S3b | CLOSURE_TANGENT tracks amended | generation failures |
|---|---|---|---|---|---|---|
| auto | 12150 | 2859 (23.53% [22.79, 24.29]) | 3792 (31.21% [30.39, 32.04]) | 7506 (61.8%) | 5751 (47.3%) | 0 |
| right-angle | 12150 | 9699 (79.83% [79.10, 80.53]) | 12150 (100.00% [99.97, 100.00]) | 2451 (20.2%) | 0 (0.0%) | 0 |
| hairpin | 12144 | 10218 (84.14% [83.48, 84.78]) | 12144 (100.00% [99.97, 100.00]) | 1926 (15.9%) | 0 (0.0%) | 6 |
| s-curve | 12150 | 10017 (82.44% [81.76, 83.11]) | 12150 (100.00% [99.97, 100.00]) | 2133 (17.6%) | 0 (0.0%) | 0 |

## 2. Violation-code incidence per mode, amended (% of generated tracks)

| code | auto | right-angle | hairpin | s-curve |
|---|---|---|---|---|
| CLOSURE_TANGENT | 47.3% | 0.0% | 0.0% | 0.0% |
| EDGE_FOLD | 66.4% | 0.0% | 0.0% | 0.0% |
| MAX_SLOPE | 66.7% | 66.7% | 66.7% | 66.7% |
| MIN_TURN_RADIUS | 70.0% | 0.0% | 0.0% | 0.0% |
| SELF_INTERSECTION_EDGE | 64.9% | 0.0% | 0.0% | 0.0% |

## 3. Amended invalidity by factor level, Auto mode (and spread); S3b spread in brackets

| factor | level | n | invalid rate amended [Wilson 95% CI] | invalid rate S3b |
|---|---|---|---|---|
| curves | 3 | 4050 | 76.96% [75.64, 78.23] | 100.00% |
| curves | 6 | 4050 | 64.52% [63.03, 65.98] | 64.52% |
| curves | 10 | 4050 | 64.89% [63.41, 66.34] | 64.89% |
| straight | 0.0 | 4050 | 10.74% [9.82, 11.73] | 33.78% |
| straight | 0.3 | 4050 | 95.70% [95.03, 96.29] | 95.70% |
| straight | 0.6 | 4050 | 99.93% [99.78, 99.97] | 99.93% |
| width | 20 | 4050 | 62.30% [60.79, 63.78] | 73.41% |
| width | 40 | 4050 | 66.96% [65.50, 68.39] | 77.78% |
| width | 80 | 4050 | 77.11% [75.79, 78.38] | 78.22% |
| size | 1 | 4050 | 70.15% [68.72, 71.54] | 77.26% |
| size | 2 | 4050 | 68.81% [67.37, 70.22] | 76.37% |
| size | 3 | 4050 | 67.41% [65.95, 68.83] | 75.78% |
| height | 0 | 4050 | 68.79% [67.35, 70.20] | 76.47% |
| height | 80 | 4050 | 68.79% [67.35, 70.20] | 76.47% |
| height | 200 | 4050 | 68.79% [67.35, 70.20] | 76.47% |

Spread amended (S3b): curves 12.44 (35.48) pts, straight 89.19 (66.15) pts, width 14.81 (4.81) pts, size 2.74 (1.48) pts, height 0.00 (0.00) pts

Pattern-mode tracks still invalid under the amended rule: 0; error codes among them (tracks): {}

Auto-mode CLOSURE_TANGENT failures remaining: 5751 of 12150 (47.3%); S3b: 7506.
