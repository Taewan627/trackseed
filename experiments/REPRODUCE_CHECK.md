# Reproduction check log

Verification of committed experiment outputs against the HEAD code on branch `wp3f`. Summary table and commands: [../REPRODUCE.md](../REPRODUCE.md). Helper: [../scripts/reproduce-check.sh](../scripts/reproduce-check.sh). The latest check (`ce51cbe`, the height pin) is first; the earlier check (`dede2b9` on branch `wp3d`, the autoJoin and validator pins) follows it.

## Latest check: ce51cbe (height pin)

Code commit `ce51cbe`, on top of `073fba5` (where `DEFAULTS.height` became 20). It adds `experiments/_v100-params.mjs` (`V100_PIN`) and uses it in `e1/cases.mjs`, `e5/analyze.mjs`, `e7/run.mjs` and `e7/exploratory.mjs`; `scripts/reproduce-check.sh` also checks `e7/results/exploratory.txt`. This log was committed after `ce51cbe`.

Commands: `scripts/reproduce-check.sh /tmp/wp3f-after e1 e2 amend e6 e7 e5` (one run, 22:00:14 to 22:25:00, about 25 minutes). Group times: e1 1 min 42 s, e2 4 min 34 s, amend 4 min 26 s, e6 11 min 44 s, e7 1 min 4 s, e5 1 min 16 s. The E7 group was then run again after a whitespace-only fix in `e7/run.mjs` (`/tmp/wp3f-after2`, 22:32:54 to 22:34:01): the same results. `npm test`: 113 of 113 pass (153.6 s).

Environment: as in the earlier check below (Node v22.23.4, V8 12.4.254.21-node.57, Intel Xeon 2.30 GHz, 2 vCPUs, esbuild 0.25.12, TypeScript 5.9.3).

Before the pin (at `073fba5`, only the E1 group was run): `v100` matched the committed file in 200 of 1000 digests (the `extreme` configuration, which sets height), `legacy` and `v050` matched in full, and `v05` matched in 0 of 1000. The other groups were not run before the pin, so their "earlier" column refers to the `dede2b9` check.

### Results (ce51cbe)

| Experiment / file | Result at ce51cbe | Earlier check (`dede2b9`) | Notes |
|---|---|---|---|
| E1 legacy `results/node22.legacy.json` (alias 6fea4d6) | raw match, content match (1000/1000) | match | The pin does not change its output: 1000/1000 digests equal before and after the pin. |
| E1 v1.0.0 `results/v1.0.0/node22.v100.json` | raw match, content match (1000/1000) | match | Before the pin: 200/1000 digests matched (the `extreme` configuration only). Now the whole file is byte-identical. |
| E1 v1.0.0 `results/v1.0.0/node22.v050.json` (alias 145277e) | raw match, content match (1000/1000) | match | Unchanged by the pin. |
| E1 v0.5 `results/node22.v05.json` (`e1/entry-v05.mjs`) | differ (0/1000 digests equal the record) | differ | Historical, not reproducible at HEAD by design. The pin changes its output for 800 cases (height 80 instead of 20); the 200 `extreme` cases are unchanged. |
| E2 base `results/validity.csv.gz` | raw match, content match | match | Unchanged. |
| AMENDMENT-01 E2 `experiments/e2/results/amendment-01/validity.csv.gz` (ratio) | raw match, content match | match | Unchanged. |
| E5 `results/node22.json` (third-party generator) | raw match | match | Byte-identical. The helper compares the `cases` field of the JSON. |
| E5 analysis `results/validity.jsonl` | raw match | match | Unchanged. |
| E5 analysis `results/SUMMARY.json` | differ in 8 leaves: `engines[4..7].secondary` (deno, bun, chrome, firefox) and `predictions[7].observed[0..3]` (Q1e) | same secondary-block difference | The TrackLab rows now match (they were the pin's target). The differences are the polyline-based blocks, which need the gitignored `out/*.polylines.json`. |
| E5 analysis `results/SUMMARY.md` | differ only in the deno, bun, chrome and firefox secondary rows and the Q1e row | same | As above. |
| E6 DEV `results/dev/candidates.csv`, `FROZEN.json`, `DEV_SUMMARY.md` | raw match | match | Unchanged. |
| E6 DEV `results/dev/candidates.json` | differ, metadata only: 39 candidates (A1 13, A2 10, C 16), keys `kinkWindow`, `kinkQuantile`, `kinkFloorDegrees`; no other field differs | same | Unchanged from the earlier check; the E6 runners do not use DEFAULTS (every generated set sets `height`). |
| E6 HELD-OUT `heldout.json`, `instances.csv.gz`, `auto-straight.json` | raw match | match | Unchanged. |
| E6 E2 recheck `validity-v1.1.csv.gz`, `SUMMARY.json`, `SUMMARY.md` | raw match | match | Unchanged. |
| E7 `results/{repro,dev,heldout}/cases.csv.gz`, `SUMMARY.json`, `SUMMARY.md` | raw match, all nine files (run at `ce51cbe`, and again after the whitespace-only fix) | match | `SUMMARY.json` includes the default-parameter block, which is now pinned to height 80. |
| E7 `results/exploratory.txt` | raw match | not checked | Now part of the helper. |

### Not run (ce51cbe)

- E1b and AMENDMENT-01 E1b: not re-run. They use the E1 case set (now with height 80 explicit, the 6fea4d6 default), so their output should not change.
- E8 (`run.mjs`, `exploratory.mjs`): not re-run. It uses `DEFAULTS` on purpose; its exploratory calls set `height` explicitly.
- Browsers, Deno and Bun, E1 `page.html`, E3, E2 timing and repetitions, E5 engines other than Node 22: unchanged from the earlier check and not re-run.
- `experiments/amendment-01/e1-digest-effect.mjs` (not in the helper): run once through a bundle in `/tmp`; it gives 0 of 1000 digests equal to the E1 record and 1000 differ, the same counts as `experiments/e1b/results/amendment-01/e1-digest-effect.json`.

### Changes (ce51cbe)

- `experiments/_v100-params.mjs` (new): `V100_PIN = { autoJoin: 'legacy', height: 80 }`.
- `experiments/e1/cases.mjs`: `height: V100_PIN.height` before the configuration values, so an explicit height (`extreme`, 200) wins. `autoJoin` is not taken from the pin here.
- `experiments/e5/analyze.mjs`: TrackLab configurations use `{ ...V100_PIN, ...over, seed }`. `autoJoin` is unchanged (it was already `'legacy'`).
- `experiments/e7/run.mjs`: default-parameter runs use `{ height: V100_PIN.height, seed }`; `autoJoin` stays at the default (tangent).
- `experiments/e7/exploratory.mjs`: height 80 where unset; `autoJoin` unchanged.
- `scripts/reproduce-check.sh`: checks `e7/results/exploratory.txt`.
- Docs commit: `REPRODUCE.md` and this log.

## Earlier check: dede2b9 (autoJoin pin and validator pin)

Scope: what was run in these sessions and what each comparison found. Nothing here is a claim beyond these runs. All re-runs wrote only to scratch directories under /tmp; no committed result file was changed.

### Environment (dede2b9 check)

- Node v22.23.4 (V8 12.4.254.21-node.57), Linux x86_64, Intel Xeon 2.30 GHz, 2 vCPUs (same Node version as `experiments/e2/results/environment.txt` and E7).
- esbuild 0.25.12 through `npx -y esbuild@0.25`; TypeScript 5.9.3 from `package.json` for `npm run build:cli`.
- Not used: Deno, Bun, Chrome, Firefox (no browser or Deno/Bun run was repeated in this check).
- Another agent's test run shared the two CPUs during part of the session; this affects timings only.

### Comparison method (dede2b9 check)

- Raw: SHA-256 of the committed file bytes against the re-run file bytes.
- Content: for `.csv.gz`, SHA-256 of the decompressed text. For E5 `node22.json`, the fields `meta`, `cases` and `mathCalls` were compared as canonical JSON, and `env` as well.
- Column-level comparison: every column of every row of the E2 validity files.

### Results (dede2b9 check)

| Experiment / file | Re-run | Raw sha256 | Content | Notes |
|---|---|---|---|---|
| E1 legacy `results/node22.legacy.json` (control, alias 6fea4d6) | full, 1000 cases, Node 22 | match | match | Not affected by autoJoin. |
| E1 v1.0.0 `results/v1.0.0/node22.v100.json` (pinned) | full, 1000 cases, Node 22 | match | match (1000/1000) | |
| E1 v1.0.0 `results/v1.0.0/node22.v050.json` (alias 145277e) | full, 1000 cases, Node 22 | match | match (1000/1000; `digest` and `contentDigest`) | This is the reproduction path for the v0.5.0 numbers. |
| E1 v0.5 `results/node22.v05.json` (`e1/entry-v05.mjs`) | full, 1000 cases, Node 22 | differ | differ (1000/1000 digests) | Historical. The entry bundles current `src/` (generator stamp 1.0.0; the record has 0.5.0). Not reproducible at HEAD by design. The pin was reverted in this check. |
| E2 base `results/validity.csv.gz` (`e2/run.mjs validity`, 48,600 cases, `closureTangentMode: 'absolute'` pinned) | full validity run | match | match | Byte-identical. Run at commit with the pin; 5 min 30 s with a concurrent analysis. |
| E2 base, before the validator pin (for the record) | full validity run | differ | differ | Previous run with the v1.1 validator default: `generated`, `error` and all metric columns identical in every row; `ok` differed in 7,620 rows, `codes` in 15,960 rows. Superseded by the row above. |
| E2 timing run (`timing`) | started, stopped by hand after the validity run (first session) | not compared | not compared | The timing run only adds timings. Its determinism check was not re-run. |
| E2 repetitions (`rep`, 5 x 500 cases), E2 `analyze.py` | not run | | | |
| AMENDMENT-01 E2 `experiments/e2/results/amendment-01/validity.csv.gz` (ratio, `CLOSURE_TANGENT_MODE` default) | full validity run | match | match | Byte-identical, 48,600 rows. `SUMMARY.json`, `tables.md`, `seam-examples.json` not regenerated. |
| E5 `results/node22.json` (third-party generator, pinned commit 3a359db) | Node 22 only | | match (`env`, `meta`, `cases`, `mathCalls`) | |
| E5 analysis `results/validity.jsonl` | `analyze.mjs` with `E5_SCRATCH`; inputs: committed engine JSONs, fresh Node 22 JSON and polylines | match | match | Identical. The analysis calls the validator with its default options; no pin added. |
| E5 analysis `results/SUMMARY.json` | same | differ | differ only in secondary blocks | Identical after removing `engines[*].secondary` and the Q1e `observed` list. The secondary blocks need each engine's polylines in `out/`, which are gitignored; they exist only for Node 22 here. The four affected engines are deno, bun, chrome and firefox (`mismatchingCases` 995, 1000, 995 and 992 in the committed file, `sameShare` 1 in all four). |
| E5 analysis `results/SUMMARY.md` | same | differ | differ only in rows | The rows of the secondary table for deno, bun, chrome and firefox, and the Q1e row. Every other row, including the Q2 validity rows, is identical. |
| E6 DEV `results/dev/candidates.csv`, `FROZEN.json`, `DEV_SUMMARY.md` | full DEV run and `select.mjs` | match | match | |
| E6 DEV `results/dev/candidates.json` | full DEV run | differ | differ, metadata only | 39 candidates (A1 13, A2 10, C 16), three keys in `opts`. Committed value -> HEAD value: `kinkWindow` 5 -> 3, `kinkQuantile` 0.5 -> 1, `kinkFloorDegrees` 20 -> 12. These record the validator defaults at the time of the DEV run; the frozen rule became the default later (commit 8fedd7a). All other fields are identical. |
| E6 HELD-OUT `heldout.json`, `instances.csv.gz`, `auto-straight.json` | full HELD-OUT run (reads committed DEV inputs) | match | match | |
| E6 E2 recheck `validity-v1.1.csv.gz`, `SUMMARY.json`, `SUMMARY.md` | full run | match | match | |
| E7 `results/repro/...`, `results/dev/...`, `results/heldout/...` (`cases.csv.gz`, `SUMMARY.json`, `SUMMARY.md`) | full run, one run per set | match | match | `DETERMINISM.txt` (two runs) not regenerated. |

### Not run and not compared (dede2b9 check)

- E1: engines other than Node 22, including the Deno and Bun runs and the browser runs (Chrome, Firefox). The tracked `experiments/e1/page.html` was not rebuilt. E1 will be re-run in full, across all engines, at release v1.1.0.
- E1b and AMENDMENT-01 E1b (`@legacy` alias to 6fea4d6 plus the current validator): not re-run.
- E2 amendment in `absolute` closure mode; E2 timing run and repetitions; E2 `analyze.py`.
- E3 analysis scripts (Python, over E2 outputs).
- E4 (baselines and the amendment validity run). E4 does not call `generateTrack`, so autoJoin does not affect it.
- E5: engines other than Node 22; `make-figure.py`; regenerating the polylines of deno, bun, chrome and firefox (the secondary blocks above).
- E6 `summarize.mjs` (writes `results/heldout/SUMMARY.md`); a HELD-OUT run with DEV inputs regenerated at HEAD.

### Changes made (dede2b9 check)

- `dede2b9`: autoJoin pins and the optional scratch-directory variable for E5.
- Validator pin commit: `experiments/e2/run.mjs` passes `{ closureTangentMode: 'absolute' }`; the E1 `v05` entry was reverted to its 9190a48 form (historical).
- Docs commit: `REPRODUCE.md`, this log and `scripts/reproduce-check.sh` (which now covers the E5 analysis).
