# E8 summary: default elevation amplitude

Protocol: `PROTOCOL.md` (committed alone, before the harness existed; not edited since). Freeze commit a01f2f8 (`DEFAULTS.height` 80 to 20, harness, README). Held-out run executed once, afterwards, with `node experiments/e8/run-twice.mjs experiments/e8/results/heldout` (two runs, byte-identical; `results/heldout/DETERMINISM.txt`). Machine-generated tables: `results/heldout/SUMMARY.md`, `SUMMARY.json`, per-track rows in `cases.csv`.

Held-out seeds: SEEDS[100..199] (100 seeds) of `experiments/e1/cases.mjs`. Exploration seeds (value choice, `EXPLORATION.md`): 10000..10199. Validator v1.1, `maxSlope` 0.3.

| measure (100 tracks) | default, height 20 | control, height 80 |
|---|---|---|
| generated | 100/100 (Wilson 95%: 96.3% to 100%) | 100/100 (96.3% to 100%) |
| MAX_SLOPE warning | 0/100 = 0.0% (0.0% to 3.7%) | 100/100 = 100% (96.3% to 100%) |
| ok (no error-severity violation) | 100/100 (96.3% to 100%) | 100/100 (96.3% to 100%) |
| elevation range, median / min / max | 48.58 / 48.58 / 48.58 | 194.33 / 194.32 / 194.34 |
| maximum slope, median / p95 / max | 0.207 / 0.252 / 0.289 | 0.827 / 1.007 / 1.155 |

## Predictions

P1 (MAX_SLOPE <= 5%) held: 0 of 100. P2 (ok 100% at both heights) held. P3 (median elevation range >= 40, minimum >= 36) held. P4 (all generated) held. P5 (control >= 95%) held: 100%. No prediction failed.

## Reading

- The 5% criterion is met with room in the point estimate, but not with a large margin in slope terms: the largest maximum slope over the 100 tracks is 0.289 against the limit 0.3, because the maximum slope varies little between seeds (it is set by `height` and by the track length). The Wilson upper bound for 0/100 is 3.7%. A track configured with a smaller `size` (shorter track) or other parameters can still exceed 0.3 at height 20 (the exploration measured 10% at size 1); the claim is about the default configuration only.
- The elevation is kept (range about 48.6 units for a 40-unit road width); only its amplitude is reduced to a quarter.
- `maxSlope` = 0.3 remains a design-choice threshold; see README, "Limitations".

## Deviations from the protocol

None in the evaluation. Changes made in the freeze commit beyond `DEFAULTS.height` (needed because several goldens and tests relied on the implicit former default): `scripts/ci-digests.mjs` and `.github/workflows/ci.yml` pin `height` 80 so that the unchanged golden files check the same documents; tests that read golden fixtures without a stored height pin `height: 80`. Experiment scripts of E1 to E7 that leave `height` unset now generate at 20; they were not modified.
