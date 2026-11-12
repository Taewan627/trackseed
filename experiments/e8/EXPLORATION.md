# E8 exploration (EXPLORATORY, not pre-registered)

Purpose: find out how the slope warning (`MAX_SLOPE`, limit `maxSlope` = 0.3, warning severity) depends on the elevation amplitude `height`, so that a default can be chosen for work package WP3e (reviewer comment M16: the default elevation produces slopes that trigger the warning on every track).

Script: `experiments/e8/exploratory.mjs`; raw output: `experiments/e8/exploratory-output.txt` (run with `node experiments/e8/exploratory.mjs`, after `npm run build:cli`; deterministic, no timings).

## Setup

- Generator: master f305982 (`DEFAULTS` except `height`, `size` and `seed`; `autoJoin` = tangent, curves 6, straight 0.25, cornerPattern auto).
- Exploration seeds: 10000..10199 (200 seeds). The script asserts that none of them occurs in `SEEDS` of `experiments/e1/cases.mjs`, so the held-out seeds SEEDS[100..199] used by the pre-registered evaluation were not looked at.
- `height` 0..200 in steps of 10 (and 5..40 in steps of 5 for size 2), `size` 1, 2, 3. 200 tracks per cell.
- Measure: `MAX_SLOPE` violation present (validator v1.1, `DEFAULT_VALIDATE_OPTIONS`), and `maxAbsSlope` of the `max-slope` check (largest |dy| / horizontal run over the centreline segments).

## Findings

1. The maximum slope is proportional to `height` (the elevation function is linear in `height`; the horizontal run does not depend on it) and varies little between seeds: for size 2 the 95th percentile is only 1.28 times the median. The warning rate therefore switches from about 0 to about 100% over a narrow range of `height`, instead of growing gradually.
2. Size 2 (the default), median of the maximum slope / `MAX_SLOPE` rate by `height`:

   | height | median max slope | p95 max slope | tracks with MAX_SLOPE | Wilson 95% interval |
   |---:|---:|---:|---:|---|
   | 10 | 0.107 | 0.137 | 0/200 | 0.0% to 1.9% |
   | 15 | n/a | n/a | 0/200 | 0.0% to 1.9% |
   | 20 | 0.214 | 0.274 | 1/200 (0.5%) | 0.1% to 2.8% |
   | 25 | n/a | n/a | 40/200 (20.0%) | n/a |
   | 30 | 0.320 | 0.411 | 138/200 (69.0%) | 62.3% to 75.0% |
   | 40 | 0.427 | 0.548 | 200/200 | 98.1% to 100% |
   | 80 (current default) | 0.855 | 1.097 | 200/200 | 98.1% to 100% |

   (rows 15 and 25 come from the fine scan, which records only the warning count.)
3. The same pattern holds at sizes 1 and 3 with the threshold shifted: size 1 has 10.0% warnings at `height` 20 and 96.0% at 30; size 3 has 0% at 20 and 32.0% at 30 (a larger `size` makes the track longer, so the same elevation is spread over more horizontal distance).
4. At the current default `height` = 80 the warning rate is 100% for every size (200/200 each), which reproduces the reviewer's observation (and the README statement for E2).
5. With the default configuration, validator `ok` (error-severity violations only) is 200/200 at `height` 15, 20, 25 and 80, as expected: `height` does not enter the x/z geometry that the error checks look at.
6. Visible elevation: the elevation range of the centreline (max y minus min y) is about 48.6 units at `height` 20 (36.4 at 15, 60.7 at 25, 194.3 at 80), in every one of the 200 tracks to two decimals. For comparison the default road width is 40 units.

## Choice

The largest value on the slider grid (step 5, `LIMITS.height`) with at most 5% warnings in the default configuration (size 2) is `height` = 20 (0.5% observed, Wilson upper bound 2.8%); 25 already gives 20%. `DEFAULTS.height` is therefore changed from 80 to 20 and nothing else (elevation function, slider range, validator limit unchanged). The margin is narrow by construction (finding 1): the p95 of the maximum slope at 20 is 0.274 against the limit 0.3, so the pre-registered prediction (PROTOCOL.md) is a real test, not a foregone conclusion.

## On the limit 0.3

`maxSlope` = 0.3 is a design choice: a configurable plausibility threshold of the validator (a longitudinal slope of 30%, a warning that does not change `ok`), not a figure taken from road-design standards. No primary source for real racing circuit gradients was consulted for this work package, so none is cited. It stays adjustable with `--limit maxSlope=N` / the `maxSlope` validator option. The track's units are model units, and the slope is the dimensionless ratio dy/ds.
