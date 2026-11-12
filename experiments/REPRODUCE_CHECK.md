# Reproduction check log

Verification of the committed experiment outputs against the HEAD code, run after the autoJoin pinning commit (`dede2b9`). Summary table and commands: [../REPRODUCE.md](../REPRODUCE.md). Helper: [../scripts/reproduce-check.sh](../scripts/reproduce-check.sh).

Scope of this log: what was run in this session, and what each comparison found. Nothing here is a claim beyond these runs. All re-runs wrote only to a scratch directory under /tmp; no committed file was changed.

## Environment

- Node v22.23.4 (V8 12.4.254.21-node.57), Linux x86_64, Intel Xeon 2.30 GHz, 2 vCPUs (same Node version as `experiments/e2/results/environment.txt` and E7).
- esbuild 0.25.12 through `npx -y esbuild@0.25`; TypeScript 5.9.3 from `package.json` for `npm run build:cli`.
- Not used: Deno (not installed), Bun, Firefox. Chrome was not used because no browser run was repeated.
- Another agent's test run shared the two CPUs during part of the session; this affects timings only.

## Comparison method

- Raw: SHA-256 of the committed file bytes against the re-run file bytes.
- Content: for `.csv.gz`, SHA-256 of the decompressed text. For E5 `node22.json`, the fields `meta`, `cases` and `mathCalls` were compared as canonical JSON, and `env` was compared as well.
- Column-level comparison (E2 validity files only): every column of every row.

## Results

| Experiment / file | Re-run | Raw sha256 | Content | Notes |
|---|---|---|---|---|
| E1 `results/node22.legacy.json` (control, legacy alias 6fea4d6) | full, 1000 cases, Node 22 | match | match | Not affected by autoJoin: the code is bound to 6fea4d6. Also shows the harness reproduces the committed bytes. |
| E1 `results/node22.v05.json` (`entry-v05.mjs`, current src) | full, 1000 cases, Node 22 | differ | differ (1000/1000 digests) | Not reproduced at HEAD (run with the pin; the unpinned subject was not run). The subject imports current `src/`, whose `VERSION` is `1.0.0`; the committed record has generator `0.5.0`. The cause was not isolated further. The v0.5.0 digests are reproduced by the v0.5.0 subject below. |
| E1 v1.0.0 `results/v1.0.0/node22.v100.json` (pinned) | full, 1000 cases, Node 22 | match | match (1000/1000) | |
| E1 v1.0.0 `results/v1.0.0/node22.v050.json` (alias 145277e) | full, 1000 cases, Node 22 | match | match (1000/1000) | |
| E2 `results/validity.csv.gz` (`e2/run.mjs validity`, 48,600 cases) | full validity run | differ | differ | 48,600 rows, 27 columns. `generated`, `error`, `inserted`, `attempts` and all 13 metric columns are identical in every row. `ok` differs in 7,620 rows (committed 32,793 ok, re-run 40,059 ok). `codes` differs in 15,960 rows. Attributed to the validator defaults at HEAD (v1.1), not to the generator. Not separately tested against the old validator options. |
| E2 timing run (`timing`) | started, stopped by hand after the validity run | not compared | not compared | The timing run repeats the validity computation and only adds timings. It was stopped to save time. Its determinism check (det CSV equal to the validity CSV) was not re-run. |
| E2 repetitions (`rep`, 5 x 500 cases), E2 `analyze.py` | not run | | | |
| AMENDMENT-01 E2 `e2/results/amendment-01/validity.csv.gz` (ratio mode) | full validity run | match | match | 48,600 rows; all 27 columns identical in every row. `SUMMARY.json`, `tables.md`, `seam-examples.json` not regenerated. |
| E5 `results/node22.json` (third-party generator, pinned commit 3a359db) | Node 22 only | | match (`env`, `meta`, `cases`, `mathCalls`) | Other engines (Node 20/24, Deno, Bun, Chrome, Firefox), `analyze.mjs`, `addendum-01` and `make-figure.py` not re-run. |
| E6 DEV `results/dev/candidates.csv`, `FROZEN.json`, `DEV_SUMMARY.md` | full DEV run and `select.mjs` | match | match | |
| E6 DEV `results/dev/candidates.json` | full DEV run | differ | differ | 117 fields differ, all `candidates[*].opts.kinkWindow`, `kinkQuantile` and `kinkFloorDegrees` (39 candidates). These are validator default values recorded when the file was written; the candidate ids, labels and all results files agree. |
| E6 HELD-OUT `heldout.json`, `instances.csv.gz`, `auto-straight.json` | full HELD-OUT run (reads the committed DEV inputs) | match | match | `SUMMARY.md` is written by `summarize.mjs`, not re-run. |
| E6 E2 recheck `validity-v1.1.csv.gz`, `SUMMARY.json`, `SUMMARY.md` | full run | match | match | |
| E7 `results/repro/cases.csv.gz`, `SUMMARY.json`, `SUMMARY.md` | full run | match | match | One run; the committed `DETERMINISM.txt` (two runs) was not regenerated. |
| E7 `results/dev/...` | full run | match | match | Same as above. |
| E7 `results/heldout/...` | full run | match | match | Same as above. |

## Not run and not compared

- E1: engines other than Node 22 (Node 20, Node 24, Deno, Bun, Chrome, Firefox). The tracked `experiments/e1/page.html` was not rebuilt. It embeds the bundle as it was built before the autoJoin pin.
- E1b and AMENDMENT-01 E1b (`@legacy` alias to 6fea4d6 plus the current validator): not re-run.
- E2 amendment in `absolute` closure mode: not re-run.
- E3 analysis scripts (Python, over E2 outputs): not re-run.
- E4 (baselines and the amendment validity run): not re-run. E4 does not call `generateTrack`, so autoJoin does not affect it.
- E5: engines other than Node 22, analysis and figure.
- E6 `summarize.mjs` (writes `results/heldout/SUMMARY.md`), and HELD-OUT run with a DEV input regenerated at HEAD.

## Changes made in this session

- Commit `dede2b9`: the autoJoin pins and the optional scratch-directory variable for E5 (see that commit message).
- This commit: `scripts/reproduce-check.sh`, `REPRODUCE.md` and this log. No result file was changed.
