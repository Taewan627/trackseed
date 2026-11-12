# E10 PROTOCOL: adversarial classes for the validator (response to red-team finding RT3 / R2-1, R2-2; editor item 2)

Status: pre-registration. This file is committed ALONE, before any E10 harness code exists and before any E10 evaluation (smoke or full) has been run.
Nothing else exists in `experiments/e10/` at this commit. The harness must implement exactly what is written here. Any later change to this protocol is an
addendum committed before the run it affects; any deviation found after the run is listed in `results/NOTES.md`.

Subject: validator v1.3 of TrackSeed (`src/validate.ts`, master 448da59: `SHARP_VERTEX` = heading change at any vertex above 30 degrees, error; `UNDERSAMPLED` =
more than 10 % of the vertices turn by more than 12 degrees, warning; both on by default in mode `kink`), together with the relative local-kink rule of v1.1
(`LOCAL_KINK`/`CLOSURE_TANGENT`: flag iff theta_i > max(12, 3 x max theta at i +- 2..3)). The question: RT3 showed that the relative rule cannot see defects that
are as sharp as their neighbourhood (polygons, sawtooth, paired spikes, zigzag patches). v1.3 added an absolute rule. How do the five rules below behave on
those classes, in size, on TrackSeed's own clean base tracks, and what do they do on clean tracks?

## 0. Disclosure: what had been seen before this protocol (all of it, so the reader can discount)

1. **The 30 degrees of `SHARP_VERTEX` (and the 12 degrees / 10 % of `UNDERSAMPLED`) were chosen after seeing the RT3 probes, and on TrackSeed's own tracks.**
   `docs/validator-v1.3-exploration.md` (exploratory, no protocol) records the choice: the largest turn of any clean generated track (E6 DEV seeds for the selection;
   E6 HELD-OUT seeds, E2 seeds as "confirmation" of clean tracks only) is 13.85 degrees (17.43 with Auto, straight > 0, tangent join), and the weakest RT3 probe
   (sawtooth, alternating +-0.5, 35.5 degrees) bounds it from above. The probe table (4-, 5-, 6-, 8-gon; sawtooth; paired spikes at gaps 2, 3, 4; zigzag patches of 20
   vertices, on a 2000-vertex circle) was read before the threshold was fixed. So 30 degrees is a design choice informed by the probes and by TrackSeed's own tracks
   (the home-advantage objection R2-5 in small); nothing of any other source's tracks was used. E10 is **not** an independent confirmation of the threshold: classes
   (a) to (c) below are variations of the RT3 probes on different base tracks; what is new is the base tracks (E6 held-out seeds, never used with any defect before),
   the size sweeps, the rule ablations and the sampling classes.
2. **Clean held-out tracks have been seen in summary.** The exploration measured the maximum turn and the share of vertices above 12 degrees on the E6 HELD-OUT
   clean tracks (max 13.77 degrees, share 2.08 %). Hence the false-positive predictions of section 5 (P8) on N1/N2 are replays of known numbers, labelled so.
   No defect of classes (a), (b), (c) has been injected into any TrackSeed track by me before this protocol (RT3's own probes were on its own circles).
3. **Before this protocol I ran** `npm run build:cli`, and a size and timing check on clean E6-style base tracks of three seeds that are NOT in `SEEDS`
   (7000001, 7000002, 7000003): number of distinct vertices n (pattern modes: median 291 to 344, range 216 to 580; Auto straight 0: median 360, range 180 to 600) and
   about 1.2 ms per `validateTrack` call. No defect was injected and no detection was scored. The n distribution was used for the UNDERSAMPLED predictions.
4. The red-team documents `R2.md` (issues R2-1, R2-2) and the editor's top-5 (item 2) were read. The E6 PROTOCOL, `lib.mjs` and HELD-OUT summary were read
   (E6 recall of the relative rule: 100 % on must-detect single defects).

## 1. Seeds and bases

- `SEEDS` = the 200-seed list of `experiments/e1/cases.mjs` (via `experiments/e6/lib.mjs`, SHA-256 of `JSON.stringify(SEEDS)` = 5c5e64d680cecf26dacdad15c0766f498c9c85a997c0df1531b49e5a327a9f07, checked).
- **Evaluation seeds: the E6 HELD-OUT seeds only, `SEEDS[100..139]` (40 seeds).** All reported numbers use them.
- **Debug seeds:** the harness may be developed and smoke-tested only on `DEBUG_SEEDS` = 7000001..7000004 (checked to be outside `SEEDS`). Smoke tests may inject and score defects
  there. No protocol parameter (levels, thresholds, predictions) is changed after any smoke test; if a smoke test finds a harness bug it is fixed and listed in NOTES.
- Generated tracks: `gen()` of `experiments/e6/lib.mjs` (`generateTrack` with `autoJoin: 'legacy'`, as E6). A generation exception excludes the case from every denominator and is counted.
- **Bases** (clean tracks into which defects are injected): `baseCases(seed)` of E6 unchanged: size 2, height 80, four modes x curves {3,6,10} x width {20,40,80}, straight 0 for all four
  and 0.3 for the three pattern modes: 63 per seed, 2520 before generation failures. n = number of distinct vertices (`points.length - 1`); indices are closed-loop indices; `points[n]` copies `points[0]`.
- Edges of every modified centreline are recomputed with the generator's formula (`buildEdges` of E6 `lib.mjs`), so a defect is a defective centreline of a track built by the normal pipeline.
- Random draws: `mulberry32(u32)` with u32 = first 4 bytes (big-endian) of SHA-256 of the string given per operator; the first draw is the sign `s = (r() < 0.5 ? -1 : 1)`, the second the index (E6 convention).
  Left normal `u_k` = unit left normal of `(p[k+1] - p[k-1])` of the BASE centreline (E6 `leftNormal`); width `w` = `params.width`.

## 2. Defect and test classes

### (a) Paired spikes `pairedSpike(g, c, pattern)`
Two lateral displacements of the base: vertex i by `s1 x h x u_i` and vertex i + g by `s2 x h x u_(i+g)`, h = c x w (the height in units of road width).
g in {2, 3, 4, 5, 6} (2..4 is the masking range of the relative rule, see P3; 5 and 6 are controls), c in {0.1, 0.25, 0.5, 1}, pattern in {same (s2 = s1), opposite (s2 = -s1)}:
40 instances per base. Key: `${baseKey}|pairedSpike|${g}|${c}|${pattern}`; draws: s1, then `i = 8 + floor(r() x (n - 16 - g))`. Window W = {i - 1, ..., i + g + 1}.

### (b) Periodic zigzag patch `zigzag(p, L, c)`
L consecutive vertices i, ..., i + L - 1 are displaced laterally by `s x c x w x pat[k mod p] x u_(i+k)` (k = 0..L-1), with `pat` = [+1, -1] for period p = 2 (alternating, the RT3 sawtooth) and
[+1, 0, -1, 0] for p = 4 (a sampled triangle wave). p in {2, 4}, L in {8, 16, 32, 64} vertices, c in {0.02, 0.05, 0.1, 0.25, 0.5} (peak amplitude in units of road width): 40 instances per base.
Key: `${baseKey}|zigzag|${p}|${L}|${c}`; draws: s, then `i = 8 + floor(r() x (n - 16 - L))`. Window W = {i - 1, ..., i + L}.

### (c) Coarse polygons
- **(c1) Regular n-gons**, n = 3..16, R in {100, 400}, width in {20, 40, 80}: 84 tracks, seed-free, vertices (R cos(2 pi k/n), R sin(2 pi k/n)) with `dcos`/`dsin`, y = 0, closed copy, edges by `buildEdges` (as the N3 set of E6). Window = all vertices.
- **(c2) Down-sampled clean bases**, k in {2, 4, 8, 16}: from each held-out base keep vertices 0, k, 2k, ... < n (and the closing copy of vertex 0), so about n/k vertices; edges recomputed. Window = all vertices.
  These are not defects; the class asks what each rule says about the same road at coarser sampling.

### (d) E6 regression classes
`seamSpike` d in {1,2,4,8,16}, `interiorSpike` d in {1,2,4,8,16}, `corner` alpha in {20,30,45,60,90}, `tangent` phi in {10,20,45}: E6 `applyDefect` unchanged (same keys, same draws, same windows): 18 instances per base,
the very instances of the E6 HELD-OUT run (heightStep is not included).

### Defect size and class (as E6 section 4)
For classes (a), (b), (c) and (d) the size S of an instance is the largest heading change (degrees, unsigned, x/z, E6 `turnAt` with `datan2`, independent of `src/validate.ts`) over its window.
Class: **must** (S >= 30), **grey** (15 <= S < 30), **sub** (S < 15). The 30 is the same design choice as in E6 and, as disclosed, equals the v1.3 limit; "must" is therefore a claim that is true by
construction for `SHARP_VERTEX` (P2); the informative results are the grey and sub classes, the relative rule (P3, P4), and the other rules. Instances with |S - 30| < 1e-6 are listed and excluded from the must and grey counts.

## 3. Rules compared (library options passed to `validateTrack`; `maxViolationsPerCheck` = 1e9 in all)

| id | name | options |
|---|---|---|
| R1 | v1.3 default | `{}` (kink rule, `SHARP_VERTEX` 30, `UNDERSAMPLED` on) |
| R2 | v1.3, `SHARP_VERTEX` off | `{ sharpVertexDegrees: Infinity }` |
| R3 | v1.3, `UNDERSAMPLED` off | `{ undersampledCheck: false }` |
| R4 | v1.2 (both off) | `V12_VALIDATOR_PIN` of `experiments/_v12-validator.mjs` |
| R5 | legacy ratio | `{ closureTangentMode: 'ratio' }` (v0.5.1/v1.0.0 seam rule, no interior kink check, no new checks) |

Every track and every instance is validated with all five rules, directly (no derivation of one rule from another).

## 4. Measures

Per instance and rule: `ok` (no error-severity violation); `kinkWin` = a `LOCAL_KINK`, `CLOSURE_TANGENT` or `SHARP_VERTEX` violation at a vertex of the window (E6 "detection"); `under` = `UNDERSAMPLED` present;
`newWarn` = a warning code present that the base's report under the same rule does not have; `baseOk` = the base is `ok` under the same rule. For (c1) there is no base: `baseOk` = true.

- **M1 error detection (primary, validator level):** among instances with `baseOk`, the share with `ok` = false. (Folds and crossings count: they are errors the validator reports. A base that already fails is excluded so that
  the rate describes the injected change.)
- **M2 rule-family detection:** share with `kinkWin` (all instances; this isolates the kink rules from fold/crossing errors; it is the E6 measure, so (d) is directly comparable with E6).
- **M3 warning rate:** `under` (UNDERSAMPLED) over all instances; and "warned-only" = `ok` and `newWarn` among instances with `baseOk`; **silent accept** = `baseOk`, `ok`, no `newWarn`.
- Stratification: class x parameter level x size class (must/grey/sub) x rule; also the width, and the mode (Auto / pattern), for the headline classes.
- **Clean negatives** (E6 N1/N2 equivalents on the HELD-OUT seeds, plus the default-join set), same five rules, FP = a kink-family flag (`LOCAL_KINK`, `CLOSURE_TANGENT`, `SHARP_VERTEX`) anywhere on the track (the E6 definition, **primary**);
  secondary: any error (`not ok`, which includes fold and crossing errors of the generator that are not the subject here) and any warning, UNDERSAMPLED in particular:
  - N1: pattern modes, E6 grid (486 per seed); N2: Auto, straight 0, E6 grid (54 per seed), both with the legacy join as in E6 (19436 / 2160 expected). For pattern modes the join option is inert and for straight 0 the tangent join is bit-identical, so N1 and N2 are also the default-join sets.
  - N4: Auto with straight in {0.3, 0.6} x curves {3,6,10} x width {20,40,80} x size {1,2,3} x height {0,200}, with the **default tangent join** (`generateTrack` without `autoJoin`; 108 per seed, 4320 expected): the v1.2 default Auto tracks with straights (the case for which the tangent join was built).
  - N3: the 60 analytic E6 stress tracks (E6 `synthetic()`), seed-free.
  - The bases themselves (63 per seed) are reported as clean negatives too.

### Statistics
- **Unit of resampling is the seed.** Instances from one seed share the base tracks (every cell contains the same bases at several levels), so instance counts are not independent; the 40 held-out seeds are the independent units.
  Interval = **seed-clustered percentile bootstrap**, B = 2000 resamples of the 40 seeds with replacement, ratio estimator (sum of hits over resampled seeds / sum of n), RNG `mulberry32(20261114)`, 2.5 and 97.5 percentiles.
  An iid Wilson 95 % interval is also written to the JSON for comparison only (it ignores the clustering).
- **Degenerate cells** (every seed with the same rate, 0 or 1, so the bootstrap interval has zero width): reported with the seed-level two-sided Clopper-Pearson bound for "no seed with an exception" (0 of 40 seeds: upper bound 8.8 %; this bounds the share of seeds that have any exception, not the share of instances), as R2-9 asked.
- (c1) and N3 are seed-free design grids: counts with Wilson 95 % are descriptive of the grid, not of a population (said in the table).
- Rates are conditional on E6's balanced factorial base grid (R2-9): they are not rates in a natural population of tracks.

## 5. Predictions (numeric, written before any run; each is reported held / failed with the observed value; failed ones are not reframed)

Label **blind** = no sight of any related number; **informed** = a number from the exploration or from E6/E7 documents is the basis (so it is a replay or an extrapolation, not independent evidence); **construction** = true by the definition of the rules, a check of the harness and of the validator code, not evidence about the rules.
Notation: "pooled" = over modes, curves, widths, seeds, and the other parameters of the class; rates over instances with `baseOk` for M1 and over all instances for M2/M3.

**Structural**
- P1 (construction) For every track of every set: `ok` under R1 equals `ok` under R3 (both have `SHARP_VERTEX`; they differ only by the UNDERSAMPLED warning) and `ok` under R2 equals `ok` under R4 (neither has `SHARP_VERTEX`): 0 differences. For (d): `kinkWin` under R4 and under R5 equals the `frozen` and `ratio` columns of `experiments/e6/results/heldout/instances.csv.gz` on all 45,360 instances (key: seed, mode, curves, straight, width, op, level; 0 mismatches). In every class, `kinkWin` under R1 equals `kinkWin` under R4 on every instance with S < 30 (0 differences; a `SHARP_VERTEX` inside the window needs a turn above 30 degrees there).
- P2 (construction) R1 detects (`ok` = false, and `kinkWin`) 100 % of the must instances of classes (a), (b), (d) and of (c1) with n <= 11, because `SHARP_VERTEX` fires at any turn above 30 degrees. A value below 100 % means a harness or validator fault.

**Relative rule (R4), the masking claim of RT3**
- P3 (informed by the RT3 probes, plus a derivation: for gap g <= 4 the second spike or its neighbour, whose turn is about half the spike's, lies in the reference window i +- 2..3 of the first, so the 3 x ratio cannot fire) Paired spikes, R4, M2, must instances: gaps 2, 3, 4 each <= 5 % (expected about 0); gaps 5 and 6 each >= 95 % (the spikes are then isolated for the rule).
- P4 (informed by the RT3 zigzag probe, derived as P3: every vertex of the patch has a reference of the same size within i +- 2) Zigzag patches (both periods, all L and c), R4, M2, pooled over must instances: <= 2 %; the patch ends do not change this.
- P5 (informed, E6) Class (d) under R4: M2 on must instances 100 % for all four operators (E6 HELD-OUT, reproduced by P1). Under R5 (ratio): interior spike and corner M2 = 0 %, seam spike must recall 54.2 % (E6), tangent 93.7 % (E6).

**v1.3 default (R1) and ablations**
- P6 (blind except for the derivation of the turn per vertex: 2 atan(h/s), s about 8 in pattern modes, 2.5 to 18 in Auto) R1, M1, paired spikes pooled over gaps, patterns, widths and modes, by c: c = 0.1: 55 to 85 %; c = 0.25: >= 93 %; c = 0.5 and 1: >= 98 %.
- P7 (blind) R1, M1, zigzag patches pooled over L, by c, period 2: c = 0.02: 25 to 60 %; c = 0.05: 60 to 90 %; c >= 0.1: >= 95 %. Period 4 (half of the vertices turn): c = 0.02: <= 20 %; c = 0.05: 30 to 65 %; c = 0.1: 60 to 90 %; c >= 0.25: >= 95 %.
- P8 (blind) By size class, pooled over (a) and (b), M1 (error detection, folds and crossings included): R1: must 100 % (P2), grey 25 to 60 %, sub <= 15 %; R4 (v1.2): must 35 to 75 %, grey <= 25 %, sub <= 5 %. (R4 detects through EDGE_FOLD and SELF_INTERSECTION_EDGE, which depend on c x w against the spacing; this is the least certain prediction.)
- P9 (construction/informed) Ablations: R3 (UNDERSAMPLED off) has the same M1 as R1 on every set (P1); R2 (SHARP off) has the same M1 as R4 on every set; the whole M1 gain of v1.3 over v1.2 on every class comes from `SHARP_VERTEX`, none from `UNDERSAMPLED`.
- P10 (blind, derived from n and the share rule: a zigzag of L vertices with turn above 12 degrees warns iff L / n > 0.1 i.e. n < 10 L; p = 4 has only L/2 such vertices) UNDERSAMPLED rate (R1), zigzag instances with c >= 0.05, by L: p = 2: L = 8: <= 1 %; L = 16: <= 3 %; L = 32: 35 to 70 %; L = 64: >= 90 %. p = 4: L <= 32: <= 3 %; L = 64: 35 to 70 %. Paired spikes and class (d): <= 2 % pooled.

**Polygons and sampling**
- P11 (informed by RT3 and by the 30-degree arithmetic) (c1): R1 error rate 100 % for n = 3..11, 0 % for n = 13..16 (turn 27.7 to 22.5 degrees: accepted with warning), n = 12 reported separately (30 degrees by construction, decided by rounding per vertex; excluded from the claim); UNDERSAMPLED present in 100 % of all 84 tracks under R1 and R2 (every n <= 29 has share 100 %); R4 error rate for n >= 4 <= 10 % and n = 3 100 % (RT3: only the triangle was flagged; the polygons with the widths used here have apothem above the half width); R5: <= 10 % for n >= 4.
- P12 (blind, extrapolation from the clean per-vertex turn distribution: median of the track maximum 6.4 degrees, 95th percentile about 11, maximum 13.85; decimation by k multiplies the turn of a smooth curve by about k) (c2) R1, `SHARP_VERTEX` error rate over clean bases: k = 2: <= 3 %; k = 4: 20 to 50 %; k = 8: >= 90 %; k = 16: >= 98 %. UNDERSAMPLED present: k = 2: 10 to 55 %; k = 4: >= 85 %; k = 8, 16: >= 98 %. R4 `kinkWin` (the relative rule alone) <= 15 % at every k (curve entries have equally sharp neighbours inside the curve).

**Clean negatives**
- P13 (informed: replay of the exploration's maxima and E6/E7) Kink-family FP (primary), R1: N1 0/19436 expected, N2 0/2160, N4 0/4320, bases 0; UNDERSAMPLED warnings on N1, N2, N4: 0 (largest share seen 2.08 % legacy, 4.44 % tangent join; a share above 10 % in N4 would falsify). R4 and R5: 0 on N1, N2 (E6: 0/19436, 0/2160), R4 0 on N4 (E7 P4: no tangent-join track carries LOCAL_KINK or CLOSURE_TANGENT); R5 on N4 <= 2 % (blind).
- P14 (informed, exploration: six N3 tracks have a vertex above 30 degrees, the 12-gon circles) N3 under R1: kink-family flags in at most 6 of 60 (expected 6, the n = 12 circles, per-vertex rounding), 0 under R4; UNDERSAMPLED on N3 between 12 and 21 of 60.
- P15 (informed by E7: 19.9 % of the tangent-join straight > 0 grid fails with fold/crossing errors) N4 any-error rate (not the subject, context only) 15 to 25 % under every rule except R5 (R5 may differ); the codes are only `EDGE_FOLD` and `SELF_INTERSECTION_EDGE`.

Reporting rule: every P is listed with the observed value and verdict; the summary counts held and failed (construction-labelled checks are counted separately from the others).

## 6. Procedure (fixed order)

1. This file is committed alone.
2. Harness committed: `experiments/e10/lib.mjs` (operators of (a), (b), (c), N4), `run.mjs` (all sets, five rules, writes `instances.csv.gz`, `clean.json`, `env.json`), `analyze.mjs` (`SUMMARY.json`, `SUMMARY.md`, the E6 consistency check of P1),
   `make-figure.py`, `run-all.sh`. Smoke tests only on `DEBUG_SEEDS`. No E6 file is modified; E6 `lib.mjs` is imported unchanged.
3. One full run (`run-all.sh`: build, run twice into scratch directories, analyse, figure, determinism check), then results committed: `results/SUMMARY.md`, `SUMMARY.json`, `NOTES.md`, `DETERMINISM.txt` (sha256 of every non-timing output in the two runs), `instances.csv.gz`, one figure (PNG + SVG).
4. Row E10 in `REPRODUCE.md` and a group `e10` in `scripts/reproduce-check.sh`.

## 7. Limits stated in advance

- The classes are synthetic operators on TrackSeed's own tracks; they show what the rules detect, not how often such defects occur in real data, and E10 says nothing about third-party tracks (E9 and its addendum are the place for that).
- Detection of a class instance is judged against the validator's own threshold (30 degrees) for the must class; a defect whose turn is under 30 degrees is "grey" or "sub" and no claim is made that it must be found. Whether a track is drivable or good is not judged anywhere.
- Spike and zigzag heights are defined against the base centreline; at a curved base the displaced vertex's deviation from its neighbours' chord differs slightly from c x w, which is why S, not c, decides the class.
- The ok-rate of a rule on clean tracks includes fold and crossing errors of the generator (R2-7): FP is defined on the kink family for that reason.
- Rates are conditional on the balanced factorial grid of E6 bases, 40 seeds, one run; polygons and N3 are design grids.
