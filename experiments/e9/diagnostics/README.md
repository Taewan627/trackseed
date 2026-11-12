# E9 post-hoc diagnostic: the LOCAL_KINK flags on real and generated tracks

**Status: exploratory and post hoc.** This is not part of the pre-registered E9 predictions in `../PROTOCOL.md` and tests none of them. It changes no file under `../results/`, `../PROTOCOL.md` or `../NOTES.md`. `results/` is read only: every validator outcome recomputed here is compared with `results/tracks.csv.gz` (178 evaluations, 0 mismatches). The diagnostic describes geometry. It does not decide whether any flag is a defect, a sharp feature or a false positive of the rule.

## Question

A reviewer will ask whether the LOCAL_KINK flags on real circuits (TUMFTM: 10 of 25 fail raw, 5 of 25 fail after `--resample-smooth`) mark genuine sharp features, or whether they are artefacts of the input's sampling or false positives of the rule.

## What was done

- **Inputs.** `fetch.sh` and `extract.sh` were rerun into the gitignored `../build/`; `npm run build:cli` was run. The polyline set hash (`build/polylines/SHA256SUMS`, 44a1b435...) equals the one in `../results/env.json`, so the inputs are byte-identical to the E9 run.
- **Validator.** `flagged.mjs` reruns the validator as `../run.mjs` does: `trackFromPolyline` then `validateTrack`, library defaults, main width, arms `raw` (as emitted) and `smooth` (`resampleSmooth` at 0.25 x width). Each outcome and error list is compared with `results/tracks.csv.gz`.
- **Selection** (25 tracks, 38 track-arms):
  - (a) the 11 TUMFTM circuits that fail in the raw or the smooth arm: Budapest, Melbourne, MexicoCity, MoscowRaceway, Sakhir, Sepang, Shanghai, Sochi, Spa, Suzuka, YasMarina. Both arms are listed for each. Suzuka fails in both arms with no LOCAL_KINK (its codes are the planar edge and self-intersection codes).
  - (b) the 2 bacinger circuits with the most LOCAL_KINK vertices in the raw arm: sg-2008 (7) and az-2016 (4). az-2016 is chosen over mc-1929 (also 4) by id order. Both arms are listed. The ranking is in `out/flagged.json`.
  - (c) the first 6 `gen-carracing` and the first 6 `gen-zzangupenn` tracks, in seed order, that fail with LOCAL_KINK in the smooth arm. Seed order is the manifest order, which is the registered E5 seed-list order (checked against `build/seeds.json`). Generator IDs are seed values, so a numeric sort would not give this order.
- **Rule** (validator defaults: `kinkRule` outlier, window 3, quantile 1, ratio 3, floor 12 deg). Vertex i is flagged iff theta_i > max(12, 3 x max(theta_{i-2}, theta_{i-3}, theta_{i+2}, theta_{i+3})). Here theta is the absolute heading change at a vertex. The seam vertex 0 is reported as CLOSURE_TANGENT. `flagged.mjs` recomputes the reference and the flags, and checks them against the library's flags, the validator's own `local-kink` failure count, and the width independence of the flags. All 38 track-arms pass every check.
- **Listing.** The validator caps listed violations at 20 per code. The tables here list every flagged vertex from the library's kink profile, not the capped list.

### Geometry per flagged vertex

| column | meaning |
|---|---|
| turn | absolute heading change at the vertex (deg), as the library computes it |
| reference | max turn at i+-2 and i+-3, excluding i and i+-1 (the rule's reference) |
| limit | max(12, 3 x reference): the vertex is flagged when turn > limit |
| prev / next | planar distances to the previous and next vertex (units of the source) |
| cum. dist | cumulative distance along the validated polyline from vertex 0 |
| local road width | W, constant by construction (both edges are offset W/2 along the normal). Checked at every flagged vertex. |
| run | contiguous vertices with the same turn sign as the peak and turn at least 25 % of the peak (at most 4 each side) |
| concentration | peak turn / mean turn over the run |
| run radius | arc length of the run / total turn (rad). For bacinger this arc length includes long adjacent segments, so it is less meaningful there. |
| s/R | mean adjacent spacing at the vertex / run radius. The validator's sampling guideline is s <= 0.2 R_min, which keeps a circular arc under the 12 deg floor (`src/cli.ts`). |

### Categories (first-pass, geometry only; thresholds are mine)

1. **spike / out and back**: heading returns after the vertex and both neighbours turn the other way. Also "short segment" (a neighbouring segment under 25 % of the median spacing) and "alternating turns" (possible S-bend).
2. **concentrated turn**: concentration > 1.3. The apex carries more of its run's turn than the mean vertex does.
3. **even run**: concentration <= 1.3, split by s/R of the run against the 0.2 guideline.

Borderline values are tagged `[uncertain: ...]` in the tables: concentration 1.2 to 1.4, s/R within 0.02 of 0.2, a displacement under 0.25 mean spacing, and short segments. **The definitions were revised twice after I had looked at the output.** The first version split corner and arc, and the second used a run-based split. The current definitions are the ones in `flagged.mjs`, and no E9 quantity depends on them.

## Results

### Per track and arm

| track | arm | outcome (main width) | LOCAL_KINK | CLOSURE_TANGENT | flagged vertices by category |
|---|---|---|---|---|---|
| real-tumftm Budapest | raw | fail | 1 | 0 | 1 x concentrated turn (peak above run mean) |
| real-tumftm Budapest | smooth | ok | 0 | 0 | - |
| real-tumftm Melbourne | raw | fail | 2 | 0 | 2 x concentrated turn (peak above run mean) |
| real-tumftm Melbourne | smooth | ok | 0 | 0 | - |
| real-tumftm MexicoCity | raw | fail | 3 | 0 | 3 x concentrated turn (peak above run mean) |
| real-tumftm MexicoCity | smooth | ok | 0 | 0 | - |
| real-tumftm MoscowRaceway | raw | fail | 4 | 0 | 3 x concentrated turn (peak above run mean); 1 x even run, s/R <= 0.2 (guideline met for the run radius) |
| real-tumftm MoscowRaceway | smooth | ok | 0 | 0 | - |
| real-tumftm Sakhir | raw | fail | 3 | 0 | 3 x concentrated turn (peak above run mean) |
| real-tumftm Sakhir | smooth | fail | 1 | 0 | 1 x even run, s/R <= 0.2 (guideline met for the run radius) |
| real-tumftm Sepang | raw | fail | 2 | 0 | 2 x concentrated turn (peak above run mean) |
| real-tumftm Sepang | smooth | ok | 0 | 0 | - |
| real-tumftm Shanghai | raw | fail | 2 | 0 | 2 x concentrated turn (peak above run mean) |
| real-tumftm Shanghai | smooth | fail | 1 | 0 | 1 x even run, s/R > 0.2 (guideline not met for the run radius) |
| real-tumftm Sochi | raw | fail | 2 | 0 | 1 x even run, s/R <= 0.2 (guideline met for the run radius); 1 x concentrated turn (peak above run mean) |
| real-tumftm Sochi | smooth | fail | 1 | 0 | 1 x concentrated turn (peak above run mean) |
| real-tumftm Spa | raw | ok | 0 | 0 | - |
| real-tumftm Spa | smooth | fail | 1 | 0 | 1 x concentrated turn (peak above run mean) |
| real-tumftm Suzuka | raw | fail | 0 | 0 | - |
| real-tumftm Suzuka | smooth | fail | 0 | 0 | - |
| real-tumftm YasMarina | raw | fail | 3 | 0 | 3 x concentrated turn (peak above run mean) |
| real-tumftm YasMarina | smooth | ok | 0 | 0 | - |
| real-bacinger-f1 sg-2008 | raw | fail | 7 | 0 | 5 x even run, s/R > 0.2 (guideline not met for the run radius); 2 x even run, s/R <= 0.2 (guideline met for the run radius) |
| real-bacinger-f1 sg-2008 | smooth | ok | 0 | 0 | - |
| real-bacinger-f1 az-2016 | raw | fail | 4 | 0 | 1 x even run, s/R <= 0.2 (guideline met for the run radius); 3 x even run, s/R > 0.2 (guideline not met for the run radius) |
| real-bacinger-f1 az-2016 | smooth | fail | 1 | 0 | 1 x concentrated turn (peak above run mean) |
| gen-carracing s1 | smooth | fail | 1 | 0 | 1 x concentrated turn (peak above run mean) |
| gen-carracing s2 | smooth | fail | 1 | 0 | 1 x concentrated turn (peak above run mean) |
| gen-carracing s7 | smooth | fail | 1 | 0 | 1 x concentrated turn (peak above run mean) |
| gen-carracing s12345 | smooth | fail | 2 | 0 | 1 x concentrated turn (peak above run mean); 1 x even run, s/R <= 0.2 (guideline met for the run radius) |
| gen-carracing s99999 | smooth | fail | 1 | 0 | 1 x concentrated turn (peak above run mean) |
| gen-carracing s16777216 | smooth | fail | 2 | 0 | 1 x even run, s/R <= 0.2 (guideline met for the run radius); 1 x concentrated turn (peak above run mean) |
| gen-zzangupenn s1211967129 | smooth | fail | 1 | 0 | 1 x concentrated turn (peak above run mean) |
| gen-zzangupenn s1436848794 | smooth | fail | 2 | 0 | 2 x concentrated turn (peak above run mean) |
| gen-zzangupenn s464855833 | smooth | fail | 2 | 0 | 2 x even run, s/R > 0.2 (guideline not met for the run radius) |
| gen-zzangupenn s1835407073 | smooth | fail | 1 | 0 | 1 x even run, s/R <= 0.2 (guideline met for the run radius) |
| gen-zzangupenn s466535511 | smooth | fail | 1 | 0 | 1 x concentrated turn (peak above run mean) |
| gen-zzangupenn s1994105342 | smooth | fail | 1 | 0 | 1 x concentrated turn (peak above run mean) |

### Counts by category

Whole set: 54 flagged vertices, all LOCAL_KINK (0 CLOSURE_TANGENT). Every flagged vertex is the apex of a same-direction run of 2 to 6 vertices. The runs have total turns of 23 to 109 deg. No flagged vertex is an isolated spike, an alternating (chicane-like) pattern, or next to a short segment. The category rules above yield these counts (the `of which uncertain` column counts the `[uncertain]` tags):

| category | count | of which uncertain |
|---|---|---|
| concentrated turn (peak above run mean) | 34 | 4 |
| even run, s/R > 0.2 (guideline not met for the run radius) | 11 | 1 |
| even run, s/R <= 0.2 (guideline met for the run radius) | 9 | 6 |

### Best classification

These are my readings of the geometry, not verdicts.

- **A. Real turn, concentrated apex (34; 4 uncertain).** The input polyline has a sharp turn, and the flagged vertex is its apex. It is not a single-vertex defect. Whether the road has the same apex cannot be decided from the polyline.
- **B. Real turn over 2 to 3 vertices, s/R above 0.2 (11; 1 uncertain).** The spacing is above the validator's guideline for the run radius. The validator's own sampling note (`src/cli.ts`) says that a circular arc sampled at this ratio can produce LOCAL_KINK, so sampling is a candidate explanation for these flags.
- **C. Real turn over 2 to 3 vertices, s/R at or below 0.2 (9; 6 uncertain).** The guideline is met for the run radius, so spacing alone does not obviously account for the flag. Whether the turn is a feature of the road is not decided.
- **D. Isolated spike, chicane or artefact (0).** None of the 54 flags has this form.

### Per-vertex table (all 54 flagged vertices)

| track | arm | vertex | code | turn (deg) | reference (deg) | limit (deg) | prev / next (m or u) | cum. dist (m or u) | category | what is visible |
|---|---|---|---|---|---|---|---|---|---|---|
| real-tumftm Budapest | raw | 486 | LOCAL_KINK | 19.6 | 6.2 | 18.7 | 4.89 / 4.79 | 2428 | concentrated turn (peak above run mean) | turn run of 4 vertices, total 51 deg over 25 m; run radius 27.5 m (5.52 x half width); peak = 1.53 x run mean; s/R 0.18 |
| real-tumftm Melbourne | raw | 379 | LOCAL_KINK | 25.6 | 7.7 | 23.0 | 4.88 / 4.53 | 1895 | concentrated turn (peak above run mean) | turn run of 4 vertices, total -71 deg over 25 m; run radius 20.0 m (3.27 x half width); peak = 1.44 x run mean; s/R 0.24 |
| real-tumftm Melbourne | raw | 835 | LOCAL_KINK | 33.8 | 4.1 | 12.4 | 4.54 / 4.78 | 4174 | concentrated turn (peak above run mean) | turn run of 3 vertices, total -72 deg over 19 m; run radius 15.5 m (2.54 x half width); peak = 1.41 x run mean; s/R 0.30 |
| real-tumftm MexicoCity | raw | 197 | LOCAL_KINK | 26.5 | 8.8 | 26.3 | 4.64 / 4.89 | 985 | concentrated turn (peak above run mean) | turn run of 5 vertices, total -87 deg over 29 m; run radius 19.5 m (3.35 x half width); peak = 1.53 x run mean; s/R 0.24 |
| real-tumftm MexicoCity | raw | 216 | LOCAL_KINK | 25.7 | 6.4 | 19.2 | 4.82 / 4.97 | 1080 | concentrated turn (peak above run mean) | turn run of 3 vertices, total 56 deg over 20 m; run radius 20.5 m (3.51 x half width); peak = 1.38 x run mean; s/R 0.24 |
| real-tumftm MexicoCity | raw | 225 | LOCAL_KINK | 26.0 | 7.9 | 23.8 | 4.76 / 4.53 | 1125 | concentrated turn (peak above run mean) | turn run of 5 vertices, total -75 deg over 29 m; run radius 22.4 m (3.85 x half width); peak = 1.73 x run mean; s/R 0.21 |
| real-tumftm MoscowRaceway | raw | 112 | LOCAL_KINK | 23.8 | 6.4 | 19.3 | 4.73 / 4.74 | 560 | concentrated turn (peak above run mean) | turn run of 4 vertices, total 67 deg over 25 m; run radius 21.1 m (3.94 x half width); peak = 1.42 x run mean; s/R 0.22 |
| real-tumftm MoscowRaceway | raw | 247 | LOCAL_KINK | 14.4 | 4.6 | 13.7 | 4.99 / 4.89 | 1234 | concentrated turn (peak above run mean) | turn run of 5 vertices, total 44 deg over 30 m; run radius 39.1 m (7.31 x half width); peak = 1.65 x run mean; s/R 0.13 |
| real-tumftm MoscowRaceway | raw | 366 | LOCAL_KINK | 16.7 | 3.4 | 12.0 | 4.77 / 4.87 | 1829 | even run, s/R <= 0.2 (guideline met for the run radius) | turn run of 3 vertices, total 40 deg over 20 m; run radius 28.0 m (5.24 x half width); peak = 1.25 x run mean; s/R 0.17 |
| real-tumftm MoscowRaceway | raw | 575 | LOCAL_KINK | 17.1 | 3.7 | 12.0 | 4.93 / 4.84 | 2873 | concentrated turn (peak above run mean) | turn run of 3 vertices, total -31 deg over 20 m; run radius 36.3 m (6.79 x half width); peak = 1.64 x run mean; s/R 0.13 |
| real-tumftm Sakhir | raw | 317 | LOCAL_KINK | 18.3 | 3.1 | 12.0 | 4.89 / 4.87 | 1584 | concentrated turn (peak above run mean) | turn run of 3 vertices, total -37 deg over 20 m; run radius 30.7 m (4.75 x half width); peak = 1.48 x run mean; s/R 0.16 |
| real-tumftm Sakhir | raw | 450 | LOCAL_KINK | 18.9 | 6.1 | 18.4 | 4.95 / 4.70 | 2248 | concentrated turn (peak above run mean) | turn run of 6 vertices, total -63 deg over 35 m; run radius 31.6 m (4.89 x half width); peak = 1.80 x run mean; s/R 0.15 |
| real-tumftm Sakhir | raw | 451 | LOCAL_KINK | 21.2 | 6.0 | 18.0 | 4.70 / 4.95 | 2253 | concentrated turn (peak above run mean) | turn run of 5 vertices, total -58 deg over 30 m; run radius 29.4 m (4.56 x half width); peak = 1.84 x run mean; s/R 0.16 |
| real-tumftm Sakhir | smooth | 698 | LOCAL_KINK | 14.7 | 4.2 | 12.7 | 3.22 / 3.21 | 2251 | even run, s/R <= 0.2 (guideline met for the run radius) | turn run of 4 vertices, total -46 deg over 16 m; run radius 20.1 m (3.12 x half width); peak = 1.28 x run mean; s/R 0.16 |
| real-tumftm Sepang | raw | 321 | LOCAL_KINK | 19.7 | 5.7 | 17.1 | 4.97 / 4.77 | 1604 | concentrated turn (peak above run mean) | turn run of 4 vertices, total -53 deg over 25 m; run radius 26.6 m (3.66 x half width); peak = 1.48 x run mean; s/R 0.18 |
| real-tumftm Sepang | raw | 535 | LOCAL_KINK | 14.8 | 4.5 | 13.6 | 4.93 / 4.84 | 2674 | concentrated turn (peak above run mean) | turn run of 4 vertices, total -40 deg over 25 m; run radius 35.7 m (4.93 x half width); peak = 1.48 x run mean; s/R 0.14 |
| real-tumftm Shanghai | raw | 316 | LOCAL_KINK | 26.0 | 6.9 | 20.7 | 4.86 / 5.13 | 1579 | concentrated turn (peak above run mean) | turn run of 4 vertices, total -57 deg over 25 m; run radius 25.1 m (3.94 x half width); peak = 1.84 x run mean; s/R 0.20 |
| real-tumftm Shanghai | raw | 1037 | LOCAL_KINK | 29.1 | 7.7 | 23.1 | 4.41 / 5.02 | 5180 | concentrated turn (peak above run mean) | turn run of 4 vertices, total 70 deg over 25 m; run radius 20.3 m (3.19 x half width); peak = 1.67 x run mean; s/R 0.23 |
| real-tumftm Shanghai | smooth | 1627 | LOCAL_KINK | 20.3 | 4.9 | 14.6 | 3.17 / 3.16 | 5178 | even run, s/R > 0.2 (guideline not met for the run radius) | turn run of 3 vertices, total 57 deg over 13 m; run radius 12.8 m (2.01 x half width); peak = 1.07 x run mean; s/R 0.25 |
| real-tumftm Sochi | raw | 647 | LOCAL_KINK | 20.1 | 6.0 | 18.0 | 4.92 / 4.65 | 3234 | even run, s/R <= 0.2 (guideline met for the run radius) | turn run of 3 vertices, total 47 deg over 20 m; run radius 23.9 m (3.98 x half width); peak = 1.29 x run mean; s/R 0.20 |
| real-tumftm Sochi | raw | 946 | LOCAL_KINK | 35.9 | 6.9 | 20.8 | 4.61 / 4.51 | 4728 | concentrated turn (peak above run mean) | turn run of 3 vertices, total -74 deg over 19 m; run radius 14.9 m (2.49 x half width); peak = 1.46 x run mean; s/R 0.31 |
| real-tumftm Sochi | smooth | 1078 | LOCAL_KINK | 13.2 | 4.1 | 12.3 | 2.99 / 2.99 | 3236 | concentrated turn (peak above run mean) | turn run of 5 vertices, total 48 deg over 18 m; run radius 21.4 m (3.57 x half width); peak = 1.38 x run mean; s/R 0.14 |
| real-tumftm Spa | smooth | 176 | LOCAL_KINK | 21.8 | 6.6 | 19.9 | 2.29 / 2.29 | 405 | concentrated turn (peak above run mean) | turn run of 6 vertices, total -65 deg over 16 m; run radius 14.1 m (3.07 x half width); peak = 2.00 x run mean; s/R 0.16 |
| real-tumftm YasMarina | raw | 267 | LOCAL_KINK | 33.2 | 6.4 | 19.3 | 4.61 / 4.59 | 1335 | concentrated turn (peak above run mean) | turn run of 3 vertices, total 63 deg over 19 m; run radius 17.6 m (2.75 x half width); peak = 1.59 x run mean; s/R 0.26 |
| real-tumftm YasMarina | raw | 567 | LOCAL_KINK | 34.8 | 10.7 | 32.1 | 4.73 / 4.43 | 2834 | concentrated turn (peak above run mean) | turn run of 4 vertices, total -84 deg over 24 m; run radius 16.4 m (2.58 x half width); peak = 1.66 x run mean; s/R 0.28 |
| real-tumftm YasMarina | raw | 926 | LOCAL_KINK | 31.9 | 10.6 | 31.7 | 4.62 / 4.83 | 4627 | concentrated turn (peak above run mean) | turn run of 5 vertices, total -93 deg over 30 m; run radius 18.2 m (2.85 x half width); peak = 1.71 x run mean; s/R 0.26 |
| real-bacinger-f1 sg-2008 | raw | 2 | LOCAL_KINK | 16.9 | 3.2 | 12.0 | 28.27 / 14.17 | 248 | even run, s/R > 0.2 (guideline not met for the run radius) | turn run of 2 vertices, total -38 deg over 57 m; run radius 85.7 m (14.28 x half width); peak = 0.89 x run mean; s/R 0.25 |
| real-bacinger-f1 sg-2008 | raw | 7 | LOCAL_KINK | 19.0 | 3.0 | 12.0 | 7.41 / 8.51 | 359 | even run, s/R <= 0.2 (guideline met for the run radius) | turn run of 3 vertices, total -57 deg over 46 m; run radius 46.2 m (7.70 x half width); peak = 1.00 x run mean; s/R 0.17 |
| real-bacinger-f1 sg-2008 | raw | 18 | LOCAL_KINK | 54.4 | 17.9 | 53.6 | 6.79 / 19.28 | 715 | even run, s/R > 0.2 (guideline not met for the run radius) | turn run of 2 vertices, total 89 deg over 37 m; run radius 24.0 m (4.00 x half width); peak = 1.22 x run mean; s/R 0.54 |
| real-bacinger-f1 sg-2008 | raw | 55 | LOCAL_KINK | 48.8 | 13.7 | 41.1 | 8.18 / 11.74 | 2278 | even run, s/R > 0.2 (guideline not met for the run radius) | turn run of 2 vertices, total 98 deg over 33 m; run radius 19.5 m (3.26 x half width); peak = 1.00 x run mean; s/R 0.51 |
| real-bacinger-f1 sg-2008 | raw | 74 | LOCAL_KINK | 41.0 | 11.5 | 34.5 | 9.25 / 6.98 | 3052 | even run, s/R <= 0.2 (guideline met for the run radius) | turn run of 3 vertices, total 109 deg over 163 m; run radius 86.1 m (14.34 x half width); peak = 1.13 x run mean; s/R 0.09 |
| real-bacinger-f1 sg-2008 | raw | 79 | LOCAL_KINK | 36.1 | 6.4 | 19.2 | 15.94 / 9.11 | 3263 | even run, s/R > 0.2 (guideline not met for the run radius) | turn run of 2 vertices, total -80 deg over 42 m; run radius 30.0 m (5.00 x half width); peak = 0.90 x run mean; s/R 0.42 |
| real-bacinger-f1 sg-2008 | raw | 80 | LOCAL_KINK | 44.0 | 9.1 | 27.3 | 9.11 / 16.92 | 3272 | even run, s/R > 0.2 (guideline not met for the run radius) | turn run of 2 vertices, total -80 deg over 42 m; run radius 30.0 m (5.00 x half width); peak = 1.10 x run mean; s/R 0.43 |
| real-bacinger-f1 az-2016 | raw | 9 | LOCAL_KINK | 23.8 | 3.0 | 12.0 | 8.44 / 9.11 | 519 | even run, s/R <= 0.2 (guideline met for the run radius) | turn run of 3 vertices, total 88 deg over 279 m; run radius 181.2 m (30.19 x half width); peak = 0.81 x run mean; s/R 0.05 |
| real-bacinger-f1 az-2016 | raw | 58 | LOCAL_KINK | 36.5 | 7.4 | 22.1 | 11.11 / 226.82 | 3623 | even run, s/R > 0.2 (guideline not met for the run radius) | turn run of 2 vertices, total 66 deg over 257 m; run radius 223.3 m (37.21 x half width); peak = 1.11 x run mean; s/R 0.53 |
| real-bacinger-f1 az-2016 | raw | 62 | LOCAL_KINK | 35.0 | 4.7 | 14.1 | 28.98 / 14.43 | 3961 | even run, s/R > 0.2 (guideline not met for the run radius) | turn run of 2 vertices, total 79 deg over 67 m; run radius 48.7 m (8.12 x half width); peak = 0.89 x run mean; s/R 0.45 |
| real-bacinger-f1 az-2016 | raw | 63 | LOCAL_KINK | 43.7 | 4.4 | 13.3 | 14.43 / 23.57 | 3976 | even run, s/R > 0.2 (guideline not met for the run radius) | turn run of 2 vertices, total 79 deg over 67 m; run radius 48.7 m (8.12 x half width); peak = 1.11 x run mean; s/R 0.39 |
| real-bacinger-f1 az-2016 | smooth | 875 | LOCAL_KINK | 21.8 | 6.2 | 18.7 | 2.98 / 2.99 | 2625 | concentrated turn (peak above run mean) | turn run of 4 vertices, total -55 deg over 15 m; run radius 15.5 m (2.59 x half width); peak = 1.58 x run mean; s/R 0.19 |
| gen-carracing s1 | smooth | 59 | LOCAL_KINK | 14.9 | 4.0 | 12.0 | 3.32 / 3.33 | 197 | concentrated turn (peak above run mean) | turn run of 3 vertices, total 26 deg over 13 u; run radius 29.1 u (4.36 x half width); peak = 1.71 x run mean; s/R 0.11 |
| gen-carracing s2 | smooth | 291 | LOCAL_KINK | 17.3 | 1.6 | 12.0 | 3.33 / 3.33 | 969 | concentrated turn (peak above run mean) | turn run of 2 vertices, total -23 deg over 10 u; run radius 24.9 u (3.73 x half width); peak = 1.50 x run mean; s/R 0.13 |
| gen-carracing s7 | smooth | 183 | LOCAL_KINK | 14.5 | 3.5 | 12.0 | 3.32 / 3.33 | 610 | concentrated turn (peak above run mean) | turn run of 3 vertices, total 26 deg over 13 u; run radius 29.2 u (4.38 x half width); peak = 1.66 x run mean; s/R 0.11 |
| gen-carracing s12345 | smooth | 104 | LOCAL_KINK | 17.4 | 5.6 | 16.8 | 3.33 / 3.33 | 347 | concentrated turn (peak above run mean) | turn run of 3 vertices, total -34 deg over 13 u; run radius 22.6 u (3.40 x half width); peak = 1.55 x run mean; s/R 0.15 |
| gen-carracing s12345 | smooth | 150 | LOCAL_KINK | 17.5 | 3.9 | 12.0 | 3.32 / 3.32 | 500 | even run, s/R <= 0.2 (guideline met for the run radius) | turn run of 3 vertices, total 43 deg over 13 u; run radius 17.6 u (2.63 x half width); peak = 1.21 x run mean; s/R 0.19 |
| gen-carracing s99999 | smooth | 236 | LOCAL_KINK | 18.4 | 3.5 | 12.0 | 3.31 / 3.31 | 786 | concentrated turn (peak above run mean) | turn run of 3 vertices, total -41 deg over 13 u; run radius 18.6 u (2.80 x half width); peak = 1.35 x run mean; s/R 0.18 |
| gen-carracing s16777216 | smooth | 61 | LOCAL_KINK | 17.0 | 3.3 | 12.0 | 3.32 / 3.32 | 203 | even run, s/R <= 0.2 (guideline met for the run radius) | turn run of 3 vertices, total 42 deg over 13 u; run radius 18.1 u (2.71 x half width); peak = 1.21 x run mean; s/R 0.18 |
| gen-carracing s16777216 | smooth | 248 | LOCAL_KINK | 17.4 | 5.2 | 15.5 | 3.32 / 3.32 | 825 | concentrated turn (peak above run mean) | turn run of 4 vertices, total -51 deg over 17 u; run radius 18.6 u (2.79 x half width); peak = 1.36 x run mean; s/R 0.18 |
| gen-zzangupenn s1211967129 | smooth | 284 | LOCAL_KINK | 23.2 | 3.7 | 12.0 | 2.49 / 2.50 | 711 | concentrated turn (peak above run mean) | turn run of 3 vertices, total -45 deg over 10 u; run radius 12.8 u (2.55 x half width); peak = 1.55 x run mean; s/R 0.20 |
| gen-zzangupenn s1436848794 | smooth | 62 | LOCAL_KINK | 18.0 | 5.4 | 16.3 | 2.50 / 2.49 | 155 | concentrated turn (peak above run mean) | turn run of 5 vertices, total -47 deg over 15 u; run radius 18.1 u (3.62 x half width); peak = 1.90 x run mean; s/R 0.14 |
| gen-zzangupenn s1436848794 | smooth | 266 | LOCAL_KINK | 23.8 | 3.1 | 12.0 | 2.49 / 2.49 | 665 | concentrated turn (peak above run mean) | turn run of 3 vertices, total -40 deg over 10 u; run radius 14.5 u (2.89 x half width); peak = 1.80 x run mean; s/R 0.17 |
| gen-zzangupenn s464855833 | smooth | 304 | LOCAL_KINK | 33.3 | 10.3 | 30.9 | 2.50 / 2.38 | 759 | even run, s/R > 0.2 (guideline not met for the run radius) | turn run of 3 vertices, total -86 deg over 10 u; run radius 6.6 u (1.32 x half width); peak = 1.16 x run mean; s/R 0.37 |
| gen-zzangupenn s464855833 | smooth | 305 | LOCAL_KINK | 42.2 | 4.2 | 12.5 | 2.38 / 2.49 | 761 | even run, s/R > 0.2 (guideline not met for the run radius) | turn run of 2 vertices, total -75 deg over 7 u; run radius 5.6 u (1.12 x half width); peak = 1.12 x run mean; s/R 0.44 |
| gen-zzangupenn s1835407073 | smooth | 282 | LOCAL_KINK | 16.5 | 3.5 | 12.0 | 2.49 / 2.49 | 705 | even run, s/R <= 0.2 (guideline met for the run radius) | turn run of 2 vertices, total -26 deg over 7 u; run radius 16.6 u (3.32 x half width); peak = 1.28 x run mean; s/R 0.15 |
| gen-zzangupenn s466535511 | smooth | 84 | LOCAL_KINK | 14.7 | 2.2 | 12.0 | 2.50 / 2.50 | 210 | concentrated turn (peak above run mean) | turn run of 3 vertices, total -25 deg over 10 u; run radius 23.3 u (4.66 x half width); peak = 1.79 x run mean; s/R 0.11 |
| gen-zzangupenn s1994105342 | smooth | 8 | LOCAL_KINK | 33.9 | 4.2 | 12.7 | 2.48 / 2.48 | 20 | concentrated turn (peak above run mean) | turn run of 3 vertices, total 59 deg over 10 u; run radius 9.7 u (1.93 x half width); peak = 1.72 x run mean; s/R 0.26 |

### Raw versus smooth: do the flags sit in the same place?

The table matches each flag by cumulative distance along the track (tolerance 10 m or u). Distances are in m for real tracks and u for generators. Matches use track distance, not Euclidean distance, so an agreement within a few metres is approximate.

| circuit | raw flags (cum. dist) | smooth flags (cum. dist) | smooth flag matched to a raw flag | raw flag matched to a smooth flag |
|---|---|---|---|---|
| TUMFTM Budapest | 2428 | - | - | none |
| TUMFTM Melbourne | 1895, 4174 | - | - | none, none |
| TUMFTM MexicoCity | 985, 1080, 1125 | - | - | none, none, none |
| TUMFTM MoscowRaceway | 560, 1234, 1829, 2873 | - | - | none, none, none, none |
| TUMFTM Sakhir | 1584, 2248, 2253 | 2251 | 1.6 | none, 3.1, 1.6 |
| TUMFTM Sepang | 1604, 2674 | - | - | none, none |
| TUMFTM Shanghai | 1579, 5180 | 5178 | 1.6 | none, 1.6 |
| TUMFTM Sochi | 3234, 4728 | 3236 | 2.3 | 2.3, none |
| TUMFTM Spa | - (raw ok) | 405 | none (smooth only) | - |
| TUMFTM YasMarina | 1335, 2834, 4627 | - | - | none, none, none |
| bacinger az-2016 | 519, 3623, 3961, 3976 | 2625 | none (smooth only) | none, none, none, none |
| bacinger sg-2008 | 248, 359, 715, 2278, 3052, 3263, 3272 | - | - | none x 7 |

Reading: 18 of the 22 raw TUMFTM flags have no smooth flag within 10 m. The other 4 (at Sakhir, Shanghai and Sochi) are matched. Smoothing adds one flag at Spa, where the raw arm has none. None of the 11 raw bacinger flags has a smooth counterpart within 10 m, and the smooth arm adds one flag at az-2016 with no raw counterpart.

## Uncertain items (11 of 54)

Tagged `[uncertain]` in `out/flagged.csv` and in the per-vertex table, because a threshold is borderline (concentration 1.2 to 1.4, or s/R within 0.02 of 0.2):

- TUMFTM MexicoCity raw 216 (concentration 1.38)
- TUMFTM MoscowRaceway raw 366 (concentration 1.25)
- TUMFTM Sakhir smooth 698 (concentration 1.28)
- TUMFTM Sochi raw 647 (concentration 1.29, s/R 0.199)
- TUMFTM Sochi smooth 1078 (concentration 1.38)
- bacinger sg-2008 raw 18 (concentration 1.22)
- gen-carracing s12345 smooth 150 (concentration 1.21, s/R 0.189)
- gen-carracing s99999 smooth 236 (concentration 1.35)
- gen-carracing s16777216 smooth 61 (concentration 1.21, s/R 0.183)
- gen-carracing s16777216 smooth 248 (concentration 1.36)
- gen-zzangupenn s1835407073 smooth 282 (concentration 1.28)

Beyond the tags, three open questions apply to all 54:

- Whether an apex is a feature of the road or a product of the centreline's construction. The TUMFTM centrelines are OpenStreetMap-derived and were smoothed by their authors, and the bacinger points are coarse (mean adjacent spacing 8 to 119 m at the flagged vertices). The polylines alone do not settle this.
- The bacinger run radius and s/R depend on long adjacent segments, so their values are not comparable with TUMFTM or the generators.
- The 22 raw TUMFTM flags mostly disappear after smoothing (18 of 22), so their status depends on which representation of the road is correct. Neither arm is shown to be the right one.

## Caveats

- The thresholds (1.3, 0.25, 0.2, 0.6) and the category definitions are mine, and they were revised twice after viewing the output (see above). They are reported, not tuned to any E9 result.
- **Width.** The default `outlier` rule uses no width: the same points with width 2 and 30 give the same flags (checked in `flagged.mjs`). Raw-arm flags therefore do not depend on W. Smooth-arm flags do, because the smoothing spacing is 0.25 W. The assumed 12 m width of bacinger affects only its smooth arm.
- Only the 38 track-arms of the 25 selected tracks are described (28 with at least one flag). These are not population statistics.
- Geometry is planar (x/z); heights are ignored, as in E9. The validator's `closureTangentMode` is kink (default), as in E9.
- Plots: all 28 overviews and all 28 zoom sheets were rendered by `plot.py`. I checked 6 figures by eye (TUMFTM Budapest and Melbourne raw, Sakhir smooth overview, bacinger sg-2008 raw, zzangupenn s464855833 smooth, carracing s12345 smooth). The rest use the same code.
- The "road edges" in the panels are the library's offset edges at W/2 from the centreline normals. At sharp apexes these can bend or overlap; I describe the panels but do not measure edge folds here.

## Files and reproduction

- `flagged.mjs`: selection, validator rerun, per-vertex features, consistency checks, cross-check with `results/`. Writes `out/flagged.csv`, `out/flagged.json`, `out/tables.md` and plot inputs under `../build/diagnostics/` (gitignored).
- `plot.py`: overview and zoom PNGs into `out/` (`overview_<source>__<id>__<arm>.png`, `zoom_<source>__<id>__<arm>.png`).
- `out/`: total size about 2 MB (all PNGs committed).

Reproduce: `cd experiments/e9 && ./extract.sh` (or `fetch.sh` then the extraction steps), then `cd ../.. && npm run build:cli`, then `cd experiments/e9/diagnostics && node flagged.mjs && python3 -I plot.py`.

### Representative PNGs for review

- `out/zoom_real-tumftm__Melbourne__raw.png`: two concentrated apexes of V-shaped turns at about 4.5 to 4.9 m spacing (TUMFTM).
- `out/zoom_real-tumftm__Budapest__raw.png`: one flag; the run is 4 vertices; the flag does not survive smoothing (TUMFTM).
- `out/overview_real-tumftm__Sakhir__smooth.png`: the smooth-arm flag at track distance 2251 m, within 3.1 m of raw flags 2248 and 2253 (TUMFTM).
- `out/zoom_real-bacinger-f1__sg-2008__raw.png`: four largest of seven flags; turns of 41 to 54 deg at spacings of 7 to 19 m (bacinger).
- `out/zoom_gen-zzangupenn__s464855833__smooth.png`: the two apexes with run radius 1.1 to 1.3 times the half width (generator, smooth).
- `out/zoom_gen-carracing__s12345__smooth.png`: one concentrated apex and one within the sampling guideline (generator, smooth).
