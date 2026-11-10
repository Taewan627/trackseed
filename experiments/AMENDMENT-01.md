# AMENDMENT-01: recalibration of the validator check CLOSURE_TANGENT (S3c)

Status: committed before any amended code or amended result exists. Later edits to this file are deviations and must be listed in the DEVIATIONS section of the amended results summary, never made here. The S3b results (experiments/e1b, e2, e3, e4 as merged at aa4fdfc) stay exactly as recorded; nothing in them is overwritten or edited.

## Reason

The auditor found that the S2 check `CLOSURE_TANGENT` (v0.5.0: heading change of the segment entering versus leaving the seam > `tangentToleranceDegrees` = 5 degrees) is miscalibrated. Auditor probe (curves = 3, width = 20, cornerCount = 2, 60 seeds per pattern mode): among pattern-mode tracks failing CLOSURE_TANGENT, the seam heading change has median 8.7 degrees while the track's interior maximum per-vertex heading change has median 9.8 degrees; 100% of the failing tracks have interior per-vertex turns above 5 degrees, and in about 60% the seam turn is not even the track maximum. The check therefore flags ordinary discretisation turning that happens to sit at the seam, not a seam discontinuity. Auto-mode seam turns (median 57 degrees) are genuine sharp joins. The miscalibration contaminates the validator ok rates reported in E2 (pattern modes: all their errors were CLOSURE_TANGENT) and E4 (pattern modes, B1, B2), and possibly E1b's `ok`/`codes` fields.

## New rule (validator v0.5.1)

Seam-continuity outlier test. Let theta0 be the absolute heading change (x/z plane, degrees) at the seam vertex (between the segment entering point 0, i.e. n-1 to n, and the segment leaving it, 0 to 1), and theta_i the absolute heading change of the per-vertex turns at the w = 3 vertices on each side of the seam (closed indexing over the n distinct vertices: vertices n-3, n-2, n-1 and 1, 2, 3, duplicates removed when n is small). CLOSURE_TANGENT fails iff

  theta0 > max(tangentToleranceDegrees, seamRatio x max_i theta_i),

defaults `tangentToleranceDegrees` = 5, `seamRatio` = 2 (both options). Rationale: a closure defect is a seam that turns markedly more than its own neighbourhood; an absolute 5 degree limit alone conflated the sampling resolution (turning per vertex on a tight curve) with a discontinuity. Reported in the check's `stats`: `tangentDegrees` (theta0, unchanged name), `neighbourhoodMaxDegrees`, and `tangentRatio` (theta0 / neighbourhood maximum; omitted when the neighbourhood maximum is 0). The old rule stays available as option `closureTangentMode: 'absolute'` (default `'ratio'`), so the S3b numbers remain reproducible. The CLI `--limit` accepts numbers only and therefore cannot select the mode (src/cli.ts is outside this amendment's scope); the library option can.

Version 0.5.1 (package.json and src/version.ts). Generation output is unchanged (golden-v05 hashes must still pass); `generator.version` inside exported documents changes from 0.5.0 to 0.5.1 and therefore so does every document digest (SHA-256 of the canonical document); this is stated, not hidden, in the amended summary together with a check whether any committed fixture depends on it.

## Analyses re-run (results in results/amendment-01/ subfolders; originals untouched)

- E1b: all 8 engine runs, with the v0.5.1 validator (default mode), `ok` and `codes` (and the secondary checkFailures) compared across engines as in the E1b protocol. The generator side of E1b is unchanged.
- E2: the validity run (same 48,600-case grid and order, same CSV schema) with the v0.5.1 validator: generation-failure and ok-rate tables with Wilson CIs, code incidence, Auto drivers table, and the validity figures. The run is also executed once with `closureTangentMode: 'absolute'`; its CSV must be byte-identical to the committed S3b `validity.csv.gz` (reproduction check of the old behaviour on the new code).
- E4: the baseline run (same cells and spacings) with the v0.5.1 validator, the E4 validity and code-incidence tables and the validity figure, against the amended E2 TrackLab sets; also the 'absolute'-mode reproduction check (byte-identical to the committed `baselines.csv.gz`).
- NOT re-run, verified by digest instead: E3 and the E2 timing/generation. They depend on generation and metrics only, which are unchanged. Verification: the SHA-256 of the amended E2 validity CSV with its `ok` and `codes` columns removed must equal that of the committed S3b CSV with the same columns removed (and the same for the E4 baseline CSV); E3 therefore needs no re-run. If a digest differs the claim is false and is reported as such.

## Predictions (written before any amended run)

1. Pattern modes (E2): ok rate among generated tracks rises to at least 98% in each of right-angle, hairpin and s-curve (the level of the exploratory "ignoring CLOSURE_TANGENT" column, 100%); CLOSURE_TANGENT incidence falls from 15.9% to 20.2% to below 2%.
2. Auto (E2): ok rate barely changes: new rate between 23.5% (old) and 33.5% (the exploratory upper bound). CLOSURE_TANGENT incidence in Auto falls by less than 25% relative to 61.8% (new value at least 46%), because Auto seams are genuine sharp joins.
3. Baselines (E4): the new ok rate stays between the old rate and the exploratory upper bound: B1 in [14.7%, 48.2%], B2 in [9.0%, 17.1%]; CLOSURE_TANGENT incidence falls for both (B1 from 72.2% to below 30%, B2 from 41.3% to below 20%). TL-Auto0 in [66.2%, 89.3%].
4. The ordering of ok rates in E4 among {TL-Auto0, B1, B2} stays TL-Auto0 > B1 > B2.
5. E1b: still 0 discrete disagreements on every engine; legacy Auto and extreme cases stay 0/400 ok; the legacy pattern-mode cases are at least 598 of 600 ok (v0.5.0: 594).
6. Digest checks pass: E2 and E4 CSVs without the `ok`/`codes` columns are byte-identical to the S3b ones; the 'absolute'-mode runs reproduce the S3b CSVs byte-for-byte; the golden-v05 test passes unchanged.
