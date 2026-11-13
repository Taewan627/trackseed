# E11 notes (deviations, observations and exploratory analysis after the run)

Run: `experiments/e11/run-all.sh` at commit 31ff35b (harness) on Windows 10, Node 20.19.5 (`env.json`); two runs in parallel, byte-identical (`DETERMINISM.txt`).
All numbers below are from `run-a`. Sections 1 and 2 are deviations and facts about the run; section 3 is exploratory, NOT part of the protocol, and was
decided after seeing the results.

## 1. Deviations from PROTOCOL.md

- The handle levels live in `handles.mjs`, shared by `run.mjs` and `analyze.mjs`; the protocol's file list (section 7) does not name it. The levels are those of section 3.
- Width is listed 80 -> 20 in `handles.mjs`, so "high" = 20, the direction section 4 names as harder; Spearman rho for width uses this order (index ascending = narrower).
- No harness bug was found by the smoke test; nothing was changed after it.

## 2. Facts of the run that a reader needs

- **P3 failed.** Straight 0 -> 0.6 makes the track harder for the delayed drivers (D1 median dSpeed -5.1 %, D2 -8.3 %; D1 +2.0 contacts/km), not easier,
  and has no effect for D0. Reported as failed; not reframed. The geometry explains the direction: at the defaults the generator keeps the waypoint circle,
  so a larger straight share turns the same total heading through fewer, tighter corners (median minimum turn radius 113 at straight 0, 78 at 0.25, 52 at 0.6;
  `tracks.csv.gz`, column `minTurnRadius`).
- **Straight 0.25 and 0.4 give the same tracks** at `curves: 6` (identical length and curvature in all 60 seeds): the number of straight spans is rounded from
  `straight x curves`, so 1.5 and 2.4 both give 2 spans. The level 0.4 therefore repeats the default.
- **Curves is U-shaped, not monotone.** Curves 3 is the hardest condition (median minimum turn radius 25; D0 114 u/s against 147 at the defaults; D2 did not finish
  12 of 60 laps, all `stuck`); curves 4 to 8 are close to the defaults; curves 10 is harder again (radius 44; D2 3 laps stuck). The extreme-level effect
  (3 -> 10, "more curves is easier") is driven by curves 3. D2 has 45 pairs for this handle (15 seeds with an unfinished lap at level 3 or 10).
- **Width: speed rises as the road narrows** for D1 and D2 (median meanSpeed 135 u/s at width 80, 143 at width 20 for D1): with a road only 5.6 units wider than
  the car's hull diameter the edges hold the delayed driver on the line. Contacts are the difficulty signal for width (D1 median 0 contacts/km at widths 80 and 60,
  12.1 at 40, 16.3 at 30, 19.3 at 20; Spearman 0.91); the "strong" verdict comes from contacts.
- **Hairpin strength 20 -> 100 for D2:** slower (-9.6 %) but fewer contacts (-4.6 /km); the cautious speed rule brakes for the tighter hairpins.
- Generation: no exception in any condition. Validator: 4 of 60 curves-3 tracks, 1 of 60 curves-10 tracks and 1 of 60 width-80 tracks are not `ok`
  (`tracks.csv.gz`, `validatorOk`); they are driven like the others, as the protocol does not filter on the validator.
- Height 200 lengthens the centre line (median 3272 against 2471 at height 0) because the length is measured in 3D by `computeMetrics`; the driver's lap
  length L is the planar arc length of `prepare()`, unaffected by height.

## 3. Exploratory (post hoc, not in the protocol): which track metric goes with the outcomes?

Spearman rho over all finished drives of the non-width conditions (width changes contacts without changing the centre line), one value per drive:

| Metric | D0 speed | D1 speed | D1 contacts/km | D2 speed | D2 contacts/km |
|---|---|---|---|---|---|
| minTurnRadius (validator) | 0.29 | 0.43 | -0.19 | 0.57 | 0.13 |
| p95AbsCurvature | 0.20 | -0.38 | 0.36 | -0.50 | -0.01 |
| straightLengthFraction | -0.52 | -0.10 | -0.21 | -0.10 | -0.21 |
| maxAbsSlope | -0.71 | -0.01 | -0.35 | 0.02 | -0.33 |

n = 1020 (D0, D1), 1004 (D2). For the delayed drivers the minimum turn radius goes with speed more than the straight share does; for the ideal driver the
slope does. These are associations within this one-factor design (levels chosen by us), not a model of difficulty.
