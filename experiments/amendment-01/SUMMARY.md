# AMENDMENT-01 results: validator v0.5.1 (CLOSURE_TANGENT as seam-continuity outlier test)

Plan and predictions: ../AMENDMENT-01.md (commit a667f4c, before any amended code or result). Original S3b results are untouched. Amended data: ../e2/results/amendment-01/ (validity.csv.gz, tables.md, SUMMARY.json, seam-examples.json, figures/), ../e4/results/amendment-01/ (baselines.csv.gz, tables.md, SUMMARY.json, sanity-gate.json, figures/), ../e1b/results/amendment-01/ (SUMMARY.json, table.md, records-node22.json.gz, old-vs-new-node22.json, e1-digest-effect.json). Runners are copies of the S3b runners with only the validator options changed (run-e2.mjs, run-e4.mjs, e1b/), analysis analyze.py (results-digests.json), figures via ../make-figures.py.

Validator code change (src/validate.ts, tests, README, version 0.5.1) is in the commit before this one. Tests: `npm test` 74 tests, 74 pass, 0 fail, in the working tree and in a clean `git clone` of the commit (node_modules symlinked from the working tree because no network install was done); S3b-state had 72 tests (2 added, 1 existing test reworked, see deviations). The golden-v05 generation tests (tests 49 and 50) pass unchanged.

## Reproduction and digest checks (all PASS)

- `closureTangentMode: 'absolute'` on the new code reproduces S3b byte-for-byte: E2 validity CSV equals the committed S3b file (SHA-256 812f416cc413dded87889c83652a42c47569b4118d5364b0a0571e47a8d65312); E4 baseline CSV equals the committed S3b file (SHA-256 14cdc254a3f038ebff0f9bd86b0929f5f972576e4ef684db8e0bf0724cbd4888).
- CSVs without the `ok` and `codes` columns: amended E2 equals S3b E2 (f2acea55...); amended E4 equals S3b E4 (4b05c503...). Hence generation and metrics are unchanged. E3's primary analysis (all generated tracks, metrics only) and the E2 generation timings need no re-run. Caveat: E3's SECONDARY valid-only tables select on `ok` and therefore change under the amended rule (not re-run, see deviations).

## Old vs new ok rate (among generated tracks, Wilson 95% CI)

| set | S3b (v0.5.0 rule) | amended (v0.5.1) | CLOSURE_TANGENT tracks S3b -> amended |
|---|---|---|---|
| E2 auto | 23.53% [22.79, 24.29] | 31.21% [30.39, 32.04] | 7506 (61.8%) -> 5751 (47.3%) |
| E2 right-angle | 79.83% [79.10, 80.53] | 100.00% [99.97, 100.00] | 2451 -> 0 |
| E2 hairpin | 84.14% [83.48, 84.78] | 100.00% [99.97, 100.00] | 1926 -> 0 |
| E2 s-curve | 82.44% [81.76, 83.11] | 100.00% [99.97, 100.00] | 2133 -> 0 |
| E4 B1 | 14.67% [13.61, 15.79] | 48.15% [46.61, 49.69] | 2925 (72.2%) -> 54 (1.3%) |
| E4 B2 | 9.04% [8.19, 9.96] | 17.11% [15.98, 18.30] | 1674 (41.3%) -> 360 (8.9%) |
| E4 TL-Auto0 (Auto, straight 0) | 66.22% [64.75, 67.66] | 89.26% [88.27, 90.18] | 1350 (33.3%) -> 0 |
| E4 TL-Auto (all straight) | 23.53% | 31.21% [30.39, 32.04] | 7506 -> 5751 |
| E4 TL-right-angle / hairpin / s-curve | 79.83% / 84.14% / 82.44% | 100% / 100% / 100% | 2451 / 1926 / 2133 -> 0 |

Generation failures are unchanged (hairpin 6). In every pattern-mode track the only error code had been CLOSURE_TANGENT, so no pattern-mode track is invalid any more. Amended ok rates equal the S3b exploratory column "ok ignoring CLOSURE_TANGENT" for B1, B2, TL-Auto0 and the pattern modes (the amended rule still flags 54 B1 and 360 B2 tracks, but those are invalid for other reasons anyway); TL-Auto is 31.21% against that column's 33.46%.

## Auto mode: remaining CLOSURE_TANGENT failures and examples

5751 of 12,150 Auto tracks (47.3%) still fail CLOSURE_TANGENT under the new rule (7506 before). Seam angle theta0 versus neighbourhood maximum (first three Auto failures in grid order, results/seam-examples.json in e2/results/amendment-01): seed 0 (curves 3, straight 0.3, width 20, size 1, height 0): 57.3 vs 6.3 degrees (ratio 9.1); seed 1: 65.3 vs 8.6 (7.6); seed 2: 62.1 vs 7.3 (8.5). Three pattern-mode tracks that failed under v0.5.0 and pass now (right-angle, curves 3, straight 0, width 20, size 1, height 0, seeds 0, 1, 2): theta0 5.1 vs neighbourhood 4.4 (ratio 1.16), 7.1 vs 6.0 (1.18), 5.8 vs 4.9 (1.17).

Other amended Auto results: invalidity of curves = 3 falls from 100.0% to 77.0%, of straight = 0 from 33.8% to 10.7%; invalidity spread by factor (S3b in brackets): straight 89.2 (66.2) points, width 14.8 (4.8), curves 12.4 (35.5), size 2.7 (1.5), height 0.0 (0.0). Auto is therefore driven by `straight` even more clearly than in S3b.

## E1b with the amended validator (legacy v0.4 tracks, 8 engine runs)

0 of 1000 cases with any discrete disagreement on every engine (as in S3b; the same case set, ok/codes now from the amended validator; secondary checkFailures also identical everywhere). Node 22 records, old -> new: ok auto 0 -> 0 of 200, extreme 0 -> 0 of 200, right-angle 199 -> 200, hairpin 199 -> 200, s-curve 196 -> 200 (pattern modes 594 -> 600 of 600); CLOSURE_TANGENT in legacy Auto 123 -> 123, extreme 88 -> 88, pattern modes 6 -> 0; no other field of any case changed.

## Figures (labelled "amended validator v0.5.1")

- e2/results/amendment-01/figures/e2_validity_by_mode_amended.png: ok rate per mode, S3b rule vs amended, Wilson CI.
- e2/results/amendment-01/figures/e2_auto_invalidity_by_level_amended.png: Auto invalid rate by level, S3b vs amended.
- e4/results/amendment-01/figures/e4_validity_amended.png: ok rate per set, S3b vs amended, Wilson CI.
Other S3b figures (E2 CDF, timing, E3, E4 expressive range and metric distributions) do not depend on the validator and are unchanged (their PNG hashes are identical before/after regeneration).

## Effect of the version bump on digests (stated, not hidden)

generator.version inside exported documents is now "0.5.1", so every exported document and its embedded SHA-256 differs from 0.5.0 documents. E1's recorded v0.5 digests (generatorVersion 0.5.0) no longer reproduce with the current tree: of the 1000 E1 cases, 0 digests equal the E1 record and 1000 differ (e1b/results/amendment-01/e1-digest-effect.json); they reproduce with the 0.5.0 commit. The geometry/golden hashes (tests/fixtures/golden-v05.json) do not include the version and still pass; no committed fixture depends on the version string (the only test that did, the version assertion in tests/schema.test.ts, was updated). The E1 cross-engine agreement result concerns generation determinism and was not re-run.

## Predictions vs observed (AMENDMENT-01.md)

1. Pattern-mode ok >= 98% and CLOSURE_TANGENT incidence < 2%: CONFIRMED (100% and 0.0% in all three modes).
2. Auto ok between 23.5% and 33.5%; Auto CLOSURE_TANGENT incidence falls by less than 25% relative (new >= 46%): CONFIRMED (31.21%; 47.3%, a relative fall of 23.4%, close to the limit).
3. B1 in [14.7%, 48.2%], B2 in [9.0%, 17.1%], TL-Auto0 in [66.2%, 89.3%]; CLOSURE_TANGENT B1 < 30%, B2 < 20%: CONFIRMED (B1 48.15%, B2 17.11%, TL-Auto0 89.26%, at the upper bounds; B1 1.3%, B2 8.9%).
4. E4 order TL-Auto0 > B1 > B2: CONFIRMED (89.3% > 48.2% > 17.1%).
5. E1b still 0 disagreements; legacy Auto and extreme 0/400 ok; legacy pattern modes >= 598 of 600: CONFIRMED (0; 0/400; 600/600).
6. Digest checks and golden-v05: CONFIRMED (all PASS, see above).

## DEVIATIONS

1. Files edited beyond the named ones, as a necessary part of the version bump: package-lock.json (two version lines) and tests/schema.test.ts (one assertion, '0.5.0' -> '0.5.1').
2. The existing validator test about the 90 degree seam corner was reworked: its original assertions now run in 'absolute' mode (they pass unchanged there) and a ratio-mode assertion was added (a square's seam turns like its neighbours, ratio 1, so it is not flagged). Two new tests were added (74 tests, from 72).
3. AMENDMENT-01.md said E3 is unaffected. That holds for E3's primary analysis (metrics of all generated tracks; verified by digest), but E3's secondary valid-only tables select on `ok`; they were not re-run and are stale with respect to the amended rule.
4. The CLI cannot select closureTangentMode (src/cli.ts out of scope and `--limit` takes numbers); `--limit seamRatio=...` works.
5. A single-vertex displacement at the seam is not a test case for the new rule: its neighbours turn almost as much, so the ratio test (by design) does not flag it as a seam defect (such a spike is caught by other checks). The kink-at-seam test uses a D-shaped loop whose corner is exactly at the seam with 1-degree-turning neighbours; the first version of that test used the spike and failed, and was replaced before commit.
6. Clean-clone `npm test` used a symlinked node_modules (no network install).
7. .gitignore gained ignore rules for experiments/amendment-01 build/out directories; E2 timing was not re-run (validation_ms of S3b was measured with the v0.5.0 validator; the new check adds a loop over at most 6 vertices, not measured).
8. No edit to AMENDMENT-01.md after any amended result existed.
