# E9 phase 1 report: sources, adapters, extraction (no validation or metrics were run)

Branch `e9` (worktree `/home/claude/wt-e9`, from master `ba39114`). Everything below was produced by `experiments/e9/extract.sh`
(fetch at pinned commits -> adapters -> `build/polylines/<source>/<id>.json`); the dry-run output is in `dryrun/` (`extract.log`, `summary.txt`,
`parse_check.log`, `THIRD_PARTY.txt`, `env.txt`). Two further full runs reproduced all 8,984 polyline files byte for byte (same machine).
Only a parse check was done (`adapters/parse_check.mjs`, uses `parsePolylineJson` from the built CLI): all 8,984 files parse, none has fewer than 3 points,
every width is positive and finite.

## 1. What is ready

Polyline file: `{"source","id","unit","width","closed":true,"points":[[x,z],...]}` (extra keys are ignored by the parser). The width must be passed to the CLI with `--width`;
the same value is in `build/polylines/<source>/manifest.tsv` (columns id, n_points, width, unit, length, median_spacing, closing_vertex_dropped, note). Source (x, y) is mapped to (x, z) unchanged.

| source dir | what | licence / pin | tracks (dry run = all) | failures | points per track min / median / max | median spacing (min / median / max over tracks) | unit | width |
|---|---|---|---|---|---|---|---|---|
| `real-tumftm` | 25 real circuits (TUMFTM racetrack-database) | LGPL-3.0, fetched at run time only; `e59595d` | 25 | 0 | 460 / 931 / 1401 | 5.0 m | m | per circuit = median of per-point (right+left) width: 9.0 / 11.65 / 16.3 m (per-point 7.4-27.6 m) |
| `real-bacinger-f1` | 40 real F1 circuits (bacinger/f1-circuits) | MIT, run time only; `8094e95` | 40 | 0 | 81 / 116 / 203 | 12.0 / 20.1 / 38.0 m | m (lon/lat projected locally) | **12 m ASSUMED** (not in the data) |
| `gen-juangallostra` | procedural-tracks (hull + displacement) | MIT; `8e22e36` | 998 of 1000 seeds | 2 (`ValueError: Error on input data` inside scipy spline fit) | 1000 / 1000 / 1000 | 2.0 / 2.24 / 4.12 px | px | 40 px (generator constant) |
| `gen-amz-voronoi` | AMZ random-track-generator (Voronoi, mode EXTEND) | MIT; `b9e42a7` | 921 of 1000 | 79 (generator's own exception "Unable to find suitable starting position") | 999 / 999 / 1000 | 0.14 / 0.32 / 0.47 m | m | 3 m (generator constant) |
| `gen-carracing` | Gymnasium CarRacing-v3 track | MIT; tag v1.4.0 `8ba8c3a` | 1000 of 1000 | 0 | 222 / 292 / 375 | 3.5 | env units | 13.33 (2 x TRACK_WIDTH) |
| `gen-zzangupenn` | track_gen (CarRacing variant, F1TENTH) | MIT; `e5ea23d` | 1000 of 1000 | 0 (some seeds needed several internal retries, as in the script's own loop) | 108 / 141 / 191 | 5.0 | script units (m) | 10 (2 x WIDTH) |
| `gen-driftschool-s0..s4` | drift-school TS generator, difficulty stages 0-4 | MIT; `f4c61cf` | 5 x 1000 of 1000 | 0 (fallback ovals would be excluded; none occurred) | s0 322/376/423 ... s4 562/613/666 | 0.1 | game units | stage width 2.2 / 1.5 / 1.0 / 0.8 / 0.75 |

Seeds: all generators use the 1000 seeds registered in E5 (`experiments/e5/adapter.mjs`, sha256 `6fc50bc3...`; the list includes 0). The E5 generator (YannThorimbert) is not re-extracted here.
Total in the dry run: 8,984 polylines (65 real circuits, 8,919 generated). Run time of the whole extraction: about 1 minute.

Adapters (`experiments/e9/adapters/`): `real_tumftm.py`, `real_bacinger.py`, `gen_juangallostra.py`, `gen_amz.py`, `gen_carracing.py`, `gen_zzangupenn.py`, `gen_driftschool.mjs`
(TypeScript transpiled 1:1 with the repository's `typescript`, no other change), `seeds.mjs`, `summarize.py`, `parse_check.mjs`. Each adapter's header states exactly how the generator is called and seeded.
No generator algorithm was modified. The three places where something other than the generator's own API is involved:
1. AMZ: the centre line is not returned by the class (it emits cones); a subclass overrides only the rendering hook `visualise_voronoi(..., x, y)`, which receives the final centre-line arrays.
2. track_gen: the script seeds after import, so one parameter drawn at import time (`TRACK_TURN_RATE`) is not reproducible with its `--seed`; the adapter seeds, reloads the module, then calls `create_track()` in the script's own retry loop.
3. juangallostra: seeding is the module's `random` (its own commented `rn.seed`); the adapter calls the functions in the order of its `main()` without the pygame drawing part.

Closure policy (the only edit an adapter makes to a point list, see `_common.py`): an exactly repeated first point at the end is kept; a last point within 1e-9 x bounding-box diagonal of the first but not bit-identical is dropped
(788 of the 921 AMZ tracks; the other 133 have an exact copy). Everything else is raw: juangallostra's integer-truncated coordinates (and its last point, which is equal to the first in 588 of 998 files and one pixel off in the others), CarRacing's and TUMFTM's open lists (implicit closure edge 3.5-7 units / 5 m).

## 2. Decisions on licences and vendoring
- TUMFTM is LGPL-3.0 (data) and OSM-derived (ODbL): fetched at run time, nothing committed. The licence file has no copyright line; credit goes to TUM FTM and OpenStreetMap contributors.
- bacinger is MIT, so derived polylines could be committed with attribution; I did not, because the README names a Google My Maps layer as the original data source (its terms are unknown to me) and F1 is a trademark. Fetch at run time instead.
- No third-party code and no polylines are committed. Committed: scripts, docs, dry-run logs (no third-party content), attribution in `ATTRIBUTION.md` and `THIRD_PARTY_NOTICES.md` section 4.
- Rejected for licence: no LICENSE file (statox/procedural-race, Random-Racing, Unicamp path_follower, AntoineRichard/TrackGen, ifoxp/ai_racing, SAN-MUYUN, JosePedroDias repos, ChickenKorma etc.), GPL (f1tenth_racetracks, l2r). Full table and reasons: `CANDIDATES.md`.

## 3. Open questions for phase 2 (these affect what the validator's results will mean)
1. **Units and scale.** Real circuits: metres, 2.3-7 km long, widths 7-28 m. Generators: pixels (juangallostra), metres (AMZ, 3 m wide, FS cone tracks), unitless game units (CarRacing about 1 km (0.78-1.32 km), track_gen about 0.7 km, drift-school 32-67 units long and 0.75-2.2 wide). Phase 2 must decide whether results are reported per source with its own unit, and whether the validator has any absolute (unit-bearing) thresholds that make cross-source comparison meaningless. Reading the angle- and ratio-based rules is not enough; this needs the final validator.
2. **Width.** (a) TUMFTM widths vary along a circuit (7-28 m) but the polyline path takes one width: the median is declared; a per-point-width or width-sensitivity run (e.g. min, median, max) may be needed, because width-dependent checks (edge overlap, narrow neck) will depend on it. (b) bacinger has none: 12 m is my assumption (from memory: the FIA minimum width for top-level circuits; **I did not verify this in the regulation text**). Suggest also reporting 10 and 15 m as sensitivity.
3. **Sampling density.** TUMFTM 5 m (smoothed by its authors); bacinger 12-38 m median, i.e. coarse polygons, about 1 vertex per 1-3 widths, with corners that are single vertices; AMZ 0.14-0.47 m with a 3 m road (about 10 samples per width); juangallostra 2-4 px spacing on an integer grid with a 40 px road (quantisation of up to +-0.5 px per coordinate, i.e. heading noise of the order of 10 degrees per step at 2 px spacing, arithmetic from the data format, not a validator result); drift-school 0.1 units. Local-angle (kink) rules and the optional `--resample-spacing` will behave very differently across these. Phase 2 should fix one resampling policy per source class in the protocol before looking at results (the validator is hardened in parallel, so I left the raw geometry untouched).
4. **Generator output that already passed the generator's own checks.** AMZ, CarRacing, track_gen and drift-school reject self-crossing or too-tight tracks internally; failures are listed in `failures.tsv`, not retried (AMZ: 7.9 % of seeds raise; juangallostra 0.2 %). Findings on these generators are therefore findings about accepted output. The failure counts themselves can be reported.
5. **Independence.** Four algorithm families; track_gen descends from CarRacing and drift-school is the same family as juangallostra (CANDIDATES.md). Count unrelated implementations as four (B1-B4) plus E5's; do not claim five. drift-school is a single-commit, one-author repository dated 2026-11-12, so its "third-party" status is formal; say so in the paper.
6. **Real-circuit overlap.** 21 venues appear in both TUMFTM and bacinger (matched by name only, geometry not compared; different source data, possibly different layout years); they are not independent samples of "circuits". Report as two sources, or restrict statistics to per-source summaries.
7. **Ground truth.** None of the real circuits was checked for defects by me; the data quality caveat of TUMFTM's README (GPS/satellite quality varies) applies. Any validator flag on a real circuit is a statement about the data file, not about the circuit.
8. **AMZ mode.** Only `Mode.EXTEND` (the setting of the repository's main.py/README) was extracted; `--mode 1|2|3` is supported by the adapter.
9. **Toolchain pins.** Python packages are pinned by version only (`requirements.txt`, the sandbox's versions: numpy 2.5.3, scipy 1.18.1, shapely 2.2.0, ...), not by hash. Generator output may depend on numpy/scipy/shapely versions; the re-run check was on the same machine only.

## 4. Proposed sample sizes (for the phase-2 protocol)
- Real circuits: all (25 TUMFTM + 40 bacinger). No sampling.
- Generators: the full 1000-seed E5 list per generator (already extracted: 998 / 921 / 1000 / 1000 usable); drift-school: stage 2 as the primary 1000 and stages 0, 4 as secondary, or all five stages if the analysis treats stage as a factor (extraction of all five is cheap). Fix the choice before running anything.
- If a smaller sample is wanted for the first evaluation, use the first 200 seeds of the list (E1's 200).

## 5. Not verified / limits
- The OSM Overpass API could not be reached, so no circuit was cross-checked against OSM; the OSM provenance of TUMFTM is as stated in its README.
- I did not diff forks (B7, B8) against their upstreams, and did not diff drift-school against juangallostra.
- Licence files were checked for the standard marker phrases and copyright lines, not compared character by character with SPDX texts. The bacinger `LICENSE.md` has no "MIT License" title line.
- PCG Benchmark: only the directory list of the problem folders was checked (no racing domain); its licence is stated in the README only.
- The bacinger projection (local equirectangular, R = 6371008.8 m) is my choice; projected lengths differ from the dataset's `length` property by about 0.2-0.7 % (not analysed further).
- Gymnasium was run from the v1.4.0 tag clone; the pip-installed gymnasium 1.4.0 is shadowed by that copy (asserted in the adapter). Box2D and pygame-ce are used from PyPI.
- No validation, metrics, or protocol work was done, by instruction.
