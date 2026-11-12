# E9 ADDENDUM-02: re-analysis at a common sampling rule, with TrackSeed as a source (response to red-team findings R2-4, R2-5, R2-8)

Status: pre-registration of a **re-analysis**. Committed ALONE, before any harness code of the addendum and before any validator v1.3 run on any E9 polyline or on any TrackSeed polyline exported for it.
`PROTOCOL.md`, `results/` and `results/NOTES.md` of the original E9 stay untouched; all outputs of this addendum go to `results/addendum-02/`. Deviations found after the run are listed in `results/addendum-02/NOTES.md`.

## 0. The question, and what this is not

**Question:** what does validator v1.3 (`SHARP_VERTEX` and `UNDERSAMPLED` on, library defaults, nothing else changed) report about each source's *sampling and geometry* under one rule set, when each source is looked at (i) as it emits its polyline and (ii) after smooth resampling at one spacing rule that is the same, relative to road width, for every source?
**This is not a quality ranking of generators and not a validity verdict on any source.** E9's `ok` rates mix three things the validator cannot separate: the source's sampling density, the width the authors chose (a width is an input, usually a drawing constant), and the geometry. R2-4 showed that the raw rates mostly measure the first two. The addendum reports the diagnostics that make that visible (UNDERSAMPLED share, spacing/width) beside every ok rate.

## 1. Disclosure: what was seen before this addendum

1. **All E9 results are known to me** (`results/SUMMARY.md`, `NOTES.md`, `diagnostics/README.md`): the v1.2 raw and smooth ok rates per source, the error codes, the TUMFTM width runs, the finding that flagged real-circuit vertices are apexes of same-direction runs. The predictions below are therefore **informed** by E9 numbers and by arithmetic about v1.3, not blind. Each prediction says which.
2. **Validator v1.3 was designed after E9 and calibrated on TrackSeed's own tracks** (`docs/validator-v1.3-exploration.md`; 30 degrees and 10 % chosen on E6 DEV seeds' clean tracks and after reading the RT3 probes). The exploration expected coarsely sampled real circuits to raise `UNDERSAMPLED`. Putting TrackSeed in as a source (R2-5) shows how a rule calibrated on it treats it; it cannot show that the rule is neutral. Home advantage is the first limit of this addendum.
3. **No validation or metric of any TrackSeed polyline in the E9 pipeline has been run.** The TrackSeed tracks were generated, with the same defaults, in E7 (30 default-parameter tracks, 100 % ok under v1.1) and in the exploration of v1.3 (no clean generated track turns more than 13.85 degrees, 17.43 with Auto straight > 0 and the tangent join).
4. No v1.3 run on any E9 source has been made. The E10 experiment (adversarial classes) is run in parallel on TrackSeed's own tracks and uses no E9 data.

## 2. Sources

Exactly the pinned E9 sources and polylines (`fetch.sh`, `extract.sh`; the polyline set hash must equal `results/env.json`, `polylinesSha256`), every row of E9: `real-tumftm` (25), `gen-e5-thorimbert`, `gen-juangallostra`, `gen-amz-voronoi`, `gen-carracing`, `gen-zzangupenn`, supplementary `real-bacinger-f1` (40) and `gen-driftschool-s0..s4`, with the E9 widths (TUMFTM: median per-point width, and the minimum per-point width as the second run).

**Added source `gen-trackseed`:** TrackSeed itself (`generateTrack` of the built `cli-dist`, library defaults: `curves` 6, `straight` 0.25, `size` 2, `height` 20, `cornerPattern` auto, **default tangent join**, `width` 40), seeds = the 1000 E5 seeds (`build/seeds.json`, same list as every other generator), one track per seed, a generation exception is a failure and is not retried. The centreline `points[0..n-1]` (planar x/z, the closing copy dropped, heights ignored) is written as a polyline file in the E9 format (`unit u`, `width` 40, `closed`) by `adapters/gen_trackseed.mjs`, and read back through the same `parsePolylineJson` and `trackFromPolyline` as every other source. TrackSeed is a primary source of the addendum, not part of the original E9.

## 3. Arms and the common sampling rule

For each track and width W of its run: `trackFromPolyline({points, width: W, closed: true}, options)` then `validateTrack(track)`; heights ignored; the built-in duplicate removal always applies.

| arm | options | role |
|---|---|---|
| raw | `{}` | the polyline as emitted (every source's own sampling) |
| cs25 | `{ resampleSmooth: { spacing: 0.25 x W } }` | **the common sampling rule (primary smooth arm): spacing = one quarter of the road width, for every source** (so s/W = 0.25 everywhere; E9's own smooth arm used the same rule, now stated as the common rule). |
| cs10 | `{ resampleSmooth: { spacing: 0.10 x W } }` | sensitivity: a finer common rule |

Validator: `validateTrack(track)` with **library defaults of v1.3** (primary), and, as a regression check only, the same calls with `V12_VALIDATOR_PIN` (both new checks off) on raw and cs25, whose outcomes must equal E9's committed `results/tracks.csv.gz` track by track.
Why s/W and not s/R_min (R2-4 suggested either): R_min of an unknown source is not an input; a spacing relative to width is a single rule, and the sampling requirement of `docs/validator.md` (s <= 0.2 R_min) then says which radii are adequately sampled: R_min >= 1.25 W for cs25 and >= 0.5 W for cs10. A track whose tightest curve is below that stays `UNDERSAMPLED` after smoothing; that is a statement about the track (tight against its width), reported, not corrected.
Smoothing rounds corners and can hide spikes (R2-3, `docs/validator.md`): the smooth arms are always shown beside raw and never replace it.

## 4. Measures (per source, arm, width run)

- n produced, n attempted (produced + generation failures, from the E9 `failures.tsv`; TrackSeed attempted = 1000); `ok` = `validateTrack(...).ok`; build error counts as not ok. **ok rate with both denominators**: over produced and over attempted (a generation failure counts as not ok), Wilson 95 % (one track per seed, no seed clustering across sources; the 25 circuits are 25 circuits).
- `UNDERSAMPLED` warning rate (tracks carrying the warning) and, from the check's `stats` (always present), per track: share of vertices over 12 degrees, largest turn, median spacing; reported as medians per source; the median spacing / W ratio of the raw arm.
- `SHARP_VERTEX` rate (tracks with the error), `LOCAL_KINK` rate, error-code table, `ok` among tracks with and without `UNDERSAMPLED`; raw -> cs25 transition table (as E9); v1.2 ok next to v1.3 ok.
- TUMFTM: per circuit, median-width and minimum-width runs, all arms.
- **juangallostra quantisation caveat:** per source, share of tracks all of whose coordinates are integers, median spacing, and q = 2 atan(0.5 / median spacing) in degrees (the heading change that one vertex displaced by half a grid unit causes). Its raw `SHARP_VERTEX`/`UNDERSAMPLED` rates are reported with this caveat and are **not** headline numbers: the input is an integer pixel grid at 2-4 px spacing with a 40 px road, so the rule measures the grid.
- **Self-filtering (known from the E9 protocol section 1 and the adapters' source, not tested here):** AMZ rejects its own tracks for curvature above its limit and for self-crossing (79 of 1000 produce nothing); CarRacing and track_gen build with a turn-rate limit and close the loop by their own construction; drift-school validates its own tracks (single commit, 2026-11-12); the E5 generator rejects crossing candidates; juangallostra has its own minimum point distance and angle limit. TrackSeed does not filter: the generator never calls its validator. Rates for filtering generators describe generated-and-accepted tracks and hold partly by construction; this is stated beside every table.
- Statistics: Wilson 95 % for proportions (as E9). No significance test, no ranking.

## 5. Predictions (numeric, written before any run; each reported held / failed with the observed value; failed ones are not reframed)

Label **construction** = true by definition, a check of the harness; **informed** = based on E9 numbers or on arithmetic about the rule, never blind here. Rates over tracks produced.

- A1 (construction) The v1.2-pinned outcomes (`ok`, error code set) of raw and cs25 on every E9 track and width run equal the committed E9 `tracks.csv.gz` (0 mismatches); the polyline set hash equals E9's.
- A2 (construction) For every track and arm, ok under v1.3 implies ok under v1.2 (v1.3 only adds an error): 0 tracks with v1.2 not ok and v1.3 ok. Hence raw and cs25 ok rates under v1.3 are <= the E9 rates for every source.
- A3 (informed: E7 default tracks 30/30 ok; exploration maxima 13.85 / 17.43 degrees, share <= 4.44 %) TrackSeed raw: ok >= 95 % (of 1000, both denominators equal if no generation failure), `UNDERSAMPLED` <= 1 %, `SHARP_VERTEX` <= 0.5 %.
- A4 (informed) TrackSeed cs25: ok >= 95 %, |raw ok - cs25 ok| <= 3 percentage points, `UNDERSAMPLED` <= 1 %.
- A5 (informed by E9 spacing and construction notes) raw `UNDERSAMPLED` rate: AMZ <= 2 % (own R >= 3.75, 0.3 m step: 4.6 degrees per vertex); drift-school (each stage) <= 1 % (near-circular, 376-613 points); E5 <= 25 %; CarRacing >= 80 % (0.31 rad = 17.8 degrees per 3.5-unit step at its maximum turn rate); track_gen >= 80 % (random turn rate up to 0.95 rad per 5-unit step); juangallostra >= 90 % (quantisation: q about 19 degrees at 3 px); bacinger >= 40 % (12-38 m spacing); TUMFTM 0 to 3 of 25 (a 10 % share needs about 90 vertices over 12 degrees at 5 m spacing; the E9 diagnostic found isolated corner apexes).
- A6 (informed) raw `SHARP_VERTEX` rate: AMZ 0 %; drift-school 0 % in every stage; CarRacing <= 5 % (maximum 17.8 degrees per step except at the loop closure); E5 <= 2 %; track_gen 30 to 70 %; bacinger >= 40 %; TUMFTM <= 4 of 25.
- A7 (informed) cs25: |ok(v1.3) - ok(v1.2)| <= 2 percentage points for E5, AMZ, CarRacing, each drift-school stage and TrackSeed, and <= 2 circuits for TUMFTM (smoothing rounds the isolated sharp vertices; after cs25 the largest turn of a smooth curve is s/R).
- A8 (informed) cs25 `UNDERSAMPLED`: E5, AMZ, TrackSeed and every drift-school stage <= 5 %; CarRacing >= 60 % (R_min about 11 against the adequacy bound 1.25 W = 16.7); track_gen >= 50 %; TUMFTM <= 3 of 25.
- A9 (informed by E9: smooth ok 20 -> 24 from median to minimum width) TUMFTM, cs25, v1.3: ok at the minimum width >= ok at the median width, by at least 2 circuits; raw v1.3 ok at the two widths differs by <= 1 circuit.
- A10 (informed) juangallostra: raw ok under v1.3 <= 0.5 % (E9: 0.00 %); cs25 ok <= 12.83 % (A2); share of tracks with all-integer coordinates >= 99 %; q >= 15 degrees at the median spacing.
- A11 (informed by the E9 diagnostic) The sampling diagnostic does not explain the real-circuit failures: of the TUMFTM circuits that fail raw under v1.3, at most 30 % carry `UNDERSAMPLED`; for CarRacing and track_gen at least 90 % of the raw failures carry it.
- A12 (construction) Two complete runs of the addendum harness give identical sha256 for every non-timing output.

## 6. Procedure (fixed order)

1. This file is committed alone.
2. Harness committed: `adapters/gen_trackseed.mjs`, `addendum-02.mjs` (runs all arms, writes the track table), `analyze-addendum-02.mjs` (SUMMARY.json/.md, the A1 comparison), `make-figure-addendum-02.py`, `addendum-02.sh` (extract, TrackSeed adapter, two runs, analysis, figure, determinism). Smoke tests only on synthetic ellipses outside the repository (`E9_POLYLINES` override) and on the first 20 TrackSeed seeds without looking at their validity; no E9 data is evaluated before the run.
3. One run, results in `results/addendum-02/`: `SUMMARY.md`, `SUMMARY.json`, `tracks.csv.gz`, `NOTES.md`, `DETERMINISM.txt`, one figure for the paper (ok rate raw vs cs25 per source including TrackSeed, with the `UNDERSAMPLED` share beside each bar; PNG + SVG).
4. Row "E9 addendum-02" in `REPRODUCE.md` and group `e9a2` in `scripts/reproduce-check.sh`; `npm test` once at the end.

## 7. Limits stated in advance

- Home advantage: v1.3 was calibrated on TrackSeed; the addendum describes agreement with that rule, not validity. No drivability ground truth exists (R2-4(d) is not done here).
- cs25 is not an adequate sampling for every track (a curve tighter than 1.25 W stays under-sampled); cs10 is a sensitivity. Smoothing can hide spikes and create folds (E9 NOTES); results are always both arms.
- The widths of generators are the authors' constants; only TUMFTM has a width run. A width sensitivity for the others (R2-8) is not part of this addendum.
- One track per seed, default parameters of each generator (TrackSeed included), one machine; self-filtering generators hold part of their rates by construction.
- juangallostra's numbers measure its integer grid (section 4). Real-circuit files are smoothed, hand-measured data; the verdict concerns the files.
