# E8 protocol: default elevation amplitude (pre-registration)

Status: committed ALONE, before any evaluation harness for E8 exists or runs and before `DEFAULTS` is changed. Later edits to this file are deviations and must be listed in a DEVIATIONS section of `experiments/e8/results/heldout/SUMMARY.md`, never made here. The predictions of section 5 are never edited after results exist.

## 1. Question

Reviewer comment M16: with the default parameters the validator's `MAX_SLOPE` warning (limit `maxSlope` = 0.3, severity warning, does not change `ok`) fires on every track. The elevation function (`elevation()` in `src/core.ts`), the slider range (`LIMITS.height` = 0..200, step 5) and the validator limit stay as they are. Question: with a smaller default `height`, does the default configuration (`DEFAULTS`, size 2, `autoJoin` tangent) stay below a 5% `MAX_SLOPE` rate on unseen seeds, while keeping a visible elevation and a 100% error-free rate?

## 2. The rule under evaluation

`DEFAULTS.height` changes from 80 to **20** (nothing else). The value was chosen on the exploration reported in `experiments/e8/EXPLORATION.md` (commits 650cf51 and its wording follow-up): seeds 10000..10199, which the exploration script asserts are disjoint from the E1 seed list. 20 is the largest value on the slider grid (step 5) with at most 5% warnings there (1/200 at height 20; 40/200 at 25). It was selected on that exploration only and is not tuned on the held-out seeds.

Exploration seeds: 10000..10199 (outside `SEEDS`). No track generated from any seed of the held-out set below was inspected, measured or validated before this protocol was committed.

## 3. Seed set

`SEEDS` = the 200-seed list of `experiments/e1/cases.mjs` (SHA-256 asserted by that file).

- HELD-OUT = SEEDS[100..199] (100 seeds). Evaluated once, after the freeze commit that changes `DEFAULTS.height` and adds the harness. No separate development set is used (the exploration seeds above play that role).

## 4. Evaluation and metrics

For every seed of HELD-OUT: `generateTrack({ seed })` (every other parameter from `DEFAULTS`, which the harness asserts has `height` = 20, `size` = 2, `autoJoin` = 'tangent'), validated with `validateTrack(track)` and `DEFAULT_VALIDATE_OPTIONS` (validator v1.1). Reported with Wilson 95% intervals (z = 1.959964):

- generated: tracks that did not throw;
- MAX_SLOPE rate: tracks with a `MAX_SLOPE` violation;
- ok rate: validator `ok` (no error-severity violation);
- elevation range: `bounds.maxY - bounds.minY` per track (median, min, max);
- maximum slope: `maxAbsSlope` of the `max-slope` check per track (median, 95th percentile = element at index floor(0.95 n) of the sorted values, maximum);
- control (not a prediction about the new default): the same seeds with `height` = 80 (the previous default), same measures.

Every evaluation is executed twice in separate Node processes; the SHA-256 of each output file is recorded in `DETERMINISM.txt`. If the two runs differ the evaluation is reported as non-deterministic.

## 5. Predictions (written before any run)

- P1. MAX_SLOPE rate of the default configuration at `height` = 20 is at most 5% (at most 5 of 100 tracks). The point rate is what is predicted; the Wilson upper bound for 5 of 100 is about 11.3% and is reported, not predicted.
- P2. Validator `ok` (error-severity violations only) is 100% (100 of 100) at `height` = 20 and, as a check that `height` does not touch the error checks, at `height` = 80 too.
- P3. Median elevation range at `height` = 20 is at least 40 units (the exploration gave 48.6; the default road width is 40 units). Minimum over the 100 tracks at least 36.
- P4. No track fails to generate (100 of 100 generated at both heights).
- P5. Control: MAX_SLOPE rate at `height` = 80 is at least 95%.

A prediction that fails is reported as failed, with the numbers, in SUMMARY.md. If P1 fails the default is not re-tuned on these seeds; any new value would need a new protocol and new seeds.

## 6. Method

Harness: `experiments/e8/run.mjs` (written after this commit, together with the `DEFAULTS` change in the freeze commit; no later change to `src/` or the harness before the held-out run) imports the compiled `cli-dist/` modules; `experiments/e8/run-twice.mjs` runs it twice and compares hashes. Output: `experiments/e8/results/heldout/` (`cases.csv`, `SUMMARY.json`, `SUMMARY.md`, `DETERMINISM.txt`).
