# E11 PROTOCOL: do the generator parameters work as difficulty handles for a scripted driver on TrackSeed's own vehicle model?

Status: this file is committed ALONE, before any E11 harness code exists in the repository and before any E11 evaluation run (smoke or full) on the evaluation
seeds. It is a protocol committed before the results in the local git history; the dates are self-asserted (no external registry). The harness must implement exactly
what is written here. A later change is an addendum committed before the run it affects; a deviation found after the run is listed in `results/NOTES.md`.

## 1. Question

The maintainer uses the generator parameters to make tracks easier or harder: fewer curves and a larger straight share to make a track easier, and elevation,
width and corner patterns as further handles. Nothing in the repository measures whether these handles change how hard a track is to drive. E11 asks, for each
handle, whether moving it changes the performance of a fixed scripted driver on the vehicle model of TrackSeed's web interface (`src/vehicle.ts`, unchanged),
and how strongly. The driver is a stand-in, not a human: E11 measures the response of one controller family on one arcade vehicle model, nothing about players.

## 0. Disclosure: what had been seen before this protocol (all of it, so the reader can discount)

1. **Exploration on debug seeds.** Before writing this protocol I wrote two prototype drivers outside the repository and ran them on the debug seeds
   8000001..8000008 (outside `SEEDS`, checked) with the defaults and the extreme levels of the handles below (straight 0 and 0.6, curves 3 and 10, height 0 and
   200, width 20/30 and 80, hairpin count 3 at strength 100), `obstacles: 0`. No evaluation seed of section 3 was generated or driven.
2. **What the exploration showed** (8 seeds, medians; these numbers inform the predictions of section 6, which are therefore not blind):
   - A bang-bang steering prototype with a reaction delay oscillated and touched the road edge about 50 times per lap on every track. It was discarded as a
     controller artefact; the driver of section 2 converts the steering demand into key taps instead.
   - Driver D0 (section 2, no delay): about 147 to 148 u/s mean speed (top speed 160) on the defaults and at both straight levels, both widths and height 0;
     about 143 at height 200, 122 at curves 3; zero edge contacts everywhere.
   - Driver D1 (0.2 s delay): mean speed 98 (straight 0) to 103 (straight 0.6), 96 at curves 10, 101 at both heights, 135 at width 80 with zero contacts;
     about 30 contacts per lap on the defaults, about 40 at width 30, about 50 with three hairpins.
   - Driver D2 (0.2 s delay, cautious speed rule): like D1, but slower with hairpins (85 u/s) and at curves 3 (71 u/s; two of eight laps did not finish).
3. Before this protocol I read `src/vehicle.ts`, `src/core.ts` (`project`, `roadContact`, `LIMITS`, `DEFAULTS`, obstacle placement), `src/main.ts` (fixed 1/120 s
   physics step) and the E6/E10 protocols for conventions. The driver constants of section 2 were set during the exploration and are frozen here.

## 2. Subject and driver

- Generator and vehicle: TrackSeed 1.2.0 source at the commit that adds this protocol's harness (`generateTrack` of `src/core.ts`, `spawnVehicle` and
  `updateVehicle` of `src/vehicle.ts`, `computeMetrics` of `src/metrics.ts`, `validateTrack` of `src/validate.ts`), bundled from `src/` with esbuild 0.25.12 as in E1.
  The vehicle model is used exactly as the web interface uses it: one `updateVehicle(car, controls, track, 1/120)` call per physics step, boolean controls.
- The vehicle model uses native `Math` (sin, cos, tan, atan, atan2, hypot, exp). E11 results are therefore claimed for the engine they were run on only
  (Node, version recorded in `results/env.json`), not across engines.
- **Driver** (`experiments/e11/driver.mjs`), one decision per physics step (120 Hz), on the state observed `delay` seconds earlier (a ring buffer of past states):
  - progress `s` = arc length of the projection of the car on the centre line (`project` with the car's `roadIndex` hint); the lap is complete when the
    accumulated signed progress reaches the centre-line length L.
  - **Steering (pure pursuit, key taps):** look-ahead `Ld = max(20, 0.35 x |v|)`; target = centre-line point at `s + Ld`; `alpha` = angle from the car's
    heading to the target; demanded curvature `kappa = 2 sin(alpha) / Ld`; demanded steering angle `delta = atan(11 kappa)` (vehicle.ts: turn rate
    `= v / 11 x tan(angle)`); duty `= clamp(delta / deltaMax(v), -1, 1)` with `deltaMax(v) = 0.48 / (1 + max(|v|, 1) / 115)` (full lock of vehicle.ts).
    Sigma-delta key taps: `acc += duty`; left if `acc >= 0.5` (then `acc -= 1`), right if `acc <= -0.5` (then `acc += 1`), no steering key otherwise.
  - **Speed:** `R_i` = radius of the circle through centre-line vertices i-2, i, i+2 (infinite if collinear); `R_ahead` = minimum `R_i` over centre-line points at
    `s + d`, d = 0, 3, 6, ... <= `v^2 / 300 + 30`; target speed `vt = min(160, 115 x (0.48 / atan(11 f / R_ahead) - 1))`, or 8 if `atan(11 f / R_ahead) >= 0.48`
    (the highest speed whose full-lock turning radius is at most `R_ahead / f`); throttle if `|v| < vt - 2`, brake if `|v| > vt + 2`, neither otherwise.
    Reverse is never pressed.
  - **Three driver profiles:** D0 `delay = 0, f = 1.0` (ideal); D1 `delay = 0.2 s, f = 1.0` (delayed); D2 `delay = 0.2 s, f = 1.5` (delayed, cautious).
- A drive ends when the lap is complete (finished), when no progress of more than 1 unit happened for 15 s of simulated time (stuck), or at 400 s (timeout).

## 3. Seeds and conditions

- `SEEDS` = the 200-seed list of `experiments/e1/cases.mjs`, read through `experiments/e6/lib.mjs` (SHA-256 of `JSON.stringify(SEEDS)` =
  5c5e64d680cecf26dacdad15c0766f498c9c85a997c0df1531b49e5a327a9f07, asserted there). **Evaluation seeds: `SEEDS[140..199]` (60 seeds)**, not used by E6 or E10.
- Debug seeds for harness development and smoke tests: 8000001..8000008 only. No protocol parameter is changed after a smoke test; a harness bug found by a
  smoke test is fixed and listed in NOTES.
- Every track: `generateTrack({ ...DEFAULTS, obstacles: 0, seed, ...level })` (defaults of 1.2.0: curves 6, straight 0.25, width 40, size 2, height 20,
  autoJoin tangent, cornerPattern auto). `obstacles` is 0 because obstacles stand on the road and the driver does not steer around them.
- **Handles (one factor at a time; every other parameter at its default):**
  - straight: 0, 0.1, 0.25, 0.4, 0.6
  - curves: 3, 4, 6, 8, 10
  - height: 0, 20, 80, 200
  - width: 20, 30, 40, 60, 80
  - hairpins: `cornerPattern: 'hairpin'`, `cornerStrength: 60`, `cornerCount` 1, 2, 3 (level 0 = the defaults)
  - hairpin strength: `cornerPattern: 'hairpin'`, `cornerCount: 2`, `cornerStrength` 20, 60, 100
  The default track is the shared middle level (straight 0.25, curves 6, height 20, width 40, hairpins 0). Distinct conditions: 21; tracks: 21 x 60 = 1260;
  drives: 1260 x 3 = 3780. A generation exception excludes the track from every denominator and is counted.

## 4. Measures

Per drive: `finished`, `lapTime` (s), `L` (centre-line length), `meanSpeed = L / lapTime` (u/s), `contacts` (number of maximal runs of physics steps in which
`car.collision` equals 0.25 after the step, i.e. the vehicle model pushed the car back from the road edge or an obstacle), `contactsPerKm = contacts / (L / 1000)`,
`contactTime` (s), `brakeTime` (s), steering reversals per minute (sign changes between consecutive non-zero steering keys). Per track: `computeMetrics`
(length, meanAbsCurvature, maxAbsCurvature, p95AbsCurvature, straightLengthFraction, turnCount, maxAbsSlope) and `validateTrack` `ok` and `min-turn-radius` stats.

**Difficulty outcomes:** `meanSpeed` (lower = harder) and `contactsPerKm` (higher = harder). Unfinished drives: counted, reported per condition, excluded from
the speed medians, included in the contact counts with the contacts made before the end.

**Effect of a handle** (per driver), on the seeds where both extreme levels finished: paired per-seed changes between the extreme levels,
`dSpeed = meanSpeed(high) / meanSpeed(low) - 1` and `dContacts = contactsPerKm(high) - contactsPerKm(low)`, with high/low = the last/first level listed in section 3.
Reported: median of the per-seed changes with a seed bootstrap 95 % interval (B = 2000, PCG-free `mulberry32(20261114)`), the share of seeds where the high level is
harder, and an exact two-sided sign test. Monotonicity: Spearman rho between level index and the outcome over all seed x level drives of the handle.

**Verdict per handle and driver (fixed now):**
- **strong**: sign test p < 0.01 and (|median dSpeed| >= 5 % or |median dContacts| >= 25 % of the low level's median contactsPerKm, with at least 2 contacts per km difference);
- **weak**: sign test p < 0.01, effect below the strong thresholds;
- **none**: otherwise.
For width and hairpin strength the direction "harder" is width 20 vs 80 and strength 100 vs 20; for straight, the high level is expected to be easier.

## 5. Determinism

The full evaluation is run twice in two processes; the two result files must be byte-identical (same machine, same Node). The SHA-256 of both is written to
`results/DETERMINISM.txt`.

## 6. Predictions (written before any evaluation run; informed by the debug exploration of section 0; each reported as held / failed with the observed value)

- P1 width (20 vs 80): strong for D1 and D2 (contacts); none or weak for D0.
- P2 hairpins (0 vs 3): strong for D1 (contacts); strong for D2 (speed or contacts).
- P3 straight (0 vs 0.6, higher expected easier): at most weak for every driver (|median dSpeed| < 5 %).
- P4 curves (3 vs 10): not monotone harder with more curves for D0 (curves 3 is slower than curves 10 in median meanSpeed).
- P5 height (0 vs 200): none or weak for D1 and D2; for D0 meanSpeed lower at 200 (median dSpeed < 0).
- P6 D0 completes every lap; D1 at least 95 % of laps.
- P7 the two runs are byte-identical.

## 7. Procedure (fixed order)

1. Commit this protocol alone.
2. Commit the harness (`entry.mjs`, `driver.mjs`, `run.mjs`, `analyze.mjs`, `build.sh`, `run-all.sh`); smoke test on the debug seeds only.
3. Run the evaluation twice, analyse, write `results/drives.csv.gz`, `results/tracks.csv.gz`, `results/SUMMARY.json`, `results/SUMMARY.md`,
   `results/DETERMINISM.txt`, `results/env.json`, `results/NOTES.md`; commit the results unchanged.

## 8. Limits stated in advance

- The driver is a scripted controller on an arcade vehicle model without tyre grip limits (the only cornering limit is the steering angle), so speed matters
  only in corners tighter than about 55 to 80 units of radius, and edge contacts come mostly from the reaction delay. Results describe this controller and this
  model, not human difficulty.
- One controller family with three settings; other controllers may rank handles differently.
- The handles are varied one at a time around the defaults; interactions are not measured.
- Native `Math` in the vehicle model: same-machine determinism only.
- The protocol author also writes and runs the harness; the protocol, not the ordering, is what the reader can check.
