# Reproducing the experiment results

This file says how to regenerate the committed experiment outputs under `experiments/`, and what was checked at HEAD. The verification log is [experiments/REPRODUCE_CHECK.md](experiments/REPRODUCE_CHECK.md). The helper that re-runs the checks is [scripts/reproduce-check.sh](scripts/reproduce-check.sh).

Since v1.1, `generateTrack` defaults to the tangent join (`autoJoin: 'tangent'`). The runners below that produce v1.0.0 results pass `autoJoin: 'legacy'` explicitly (see [docs/generator-auto-join.md](docs/generator-auto-join.md)). In the table, "no" means either that the re-run differs from the committed file or that it was not re-run; the reason is given in each row.

## Environment

- Node.js 22 (the version used for all checks: v22.23.4, V8 12.4.254.21-node.57). `package.json` requires `>=20.19.0`.
- npm, with dependencies installed by `npm ci`.
- esbuild 0.25 through `npx -y esbuild@0.25` (needs network on first use).
- Deno, Bun and browsers are needed only for the cross-engine runs listed in each experiment's `run-all.sh`. They were not used for the checks in this file.

## Build

```
npm ci
npm run build:cli      # writes cli-dist/ (gitignored); used by E5 analysis, E6 and E7
```

Each experiment bundles its own code with its `build.sh` into a gitignored `build/` directory. The E1 build scripts create detached git worktrees at `/tmp/tlsx-legacy` (commit 6fea4d6) and `/tmp/tlsx-v050` (commit 145277e) when they are missing. `experiments/e1/build.sh` also rewrites the tracked `experiments/e1/page.html`; the helper script does not call it.

## Quick check

```
scripts/reproduce-check.sh /tmp/repro e1 e2 amend e6 e7     # default groups; about 25 minutes on the verification machine
scripts/reproduce-check.sh /tmp/repro e1                    # about 2 minutes
```

The helper writes only to the scratch directory and to gitignored build folders. It prints a table with raw and content comparisons for each committed file.

## Experiments

"Original commit" is the last commit that changed the committed output file. "Verified at HEAD" uses these values: **yes** (byte-identical or identical content, as stated), **subset** (only the named engine or part was re-run), **no** (re-run differs, or not re-run), with the reason in the last column. Checks were made at commit `dede2b9`.

| Experiment | Protocol / notes | Runner command | Committed outputs | Original commit | Verified at HEAD | sha256 match |
|---|---|---|---|---|---|---|
| E1, v0.5.0 subject (`experiments/e1`) | `e1/PROTOCOL.md`, `e1/ADDENDUM-v1.0.0.md` | `cd experiments/e1 && ./run-all.sh` (per engine: `node run.mjs v05 \| legacy`) | `results/node22.v05.json`, `results/node22.legacy.json`, other engines, `E1_SUMMARY.*` | 145277e | subset (Node 22) | v05: **no**, all 1000 digests differ; the subject imports current `src/` (generator stamp 1.0.0 vs 0.5.0 in the record). legacy: **yes**, control (alias 6fea4d6) |
| E1 v1.0.0 (`experiments/e1/v1.0.0`) | `e1/ADDENDUM-v1.0.0.md` | `cd experiments/e1/v1.0.0 && ./run-all.sh` | `results/v1.0.0/node22.{v100,v050}.json`, other engines, `SUMMARY.*` | 06d9efb | subset (Node 22) | **yes**, 1000/1000 cases in each subject (v050 via alias 145277e) |
| E1b (`experiments/e1b`) | `e1b/PROTOCOL.md` | `cd experiments/e1b && ./run-all.sh` | `results/*` | 6779f9b | **no**, not re-run | not compared |
| AMENDMENT-01 E1b (`experiments/amendment-01/e1b`) | `AMENDMENT-01.md` | `cd experiments/amendment-01/e1b && ./run-all.sh` (writes to `experiments/e1b/results/amendment-01/`) | `experiments/e1b/results/amendment-01/*` | 4983dab | **no**, not re-run | not compared |
| E2 (`experiments/e2`) | `e2/PROTOCOL.md` | `cd experiments/e2 && ./run-all.sh` (validity: `node build/run.mjs validity <out>`; timing; `rep`; `analyze.py`) | `results/validity.csv.gz`, `timing.csv.gz`, `SUMMARY.*`, `tables.md`, figures | 7f1c872 | subset: validity (48,600 cases, full); timing and reps not re-run | **no** for `validity.csv.gz`: generated, error and all 13 metric columns identical in every row; `ok` differs in 7,620 rows and `codes` in 15,960 rows (validator verdicts; attributed to the v1.1 validator defaults, not separately tested) |
| AMENDMENT-01 E2 (`experiments/amendment-01`) | `AMENDMENT-01.md` | `cd experiments/amendment-01 && ./build.sh && CLOSURE_TANGENT_MODE=ratio node build/run-e2.mjs validity <out>` | `experiments/e2/results/amendment-01/validity.csv.gz`, `SUMMARY.json`, `tables.md`, `seam-examples.json` | 4983dab | subset: validity file (full run); summaries not regenerated | **yes**, byte-identical (48,600 rows) |
| E3 analysis (`experiments/e3`) | `e3/PROTOCOL.md` | `python3 experiments/e3/analyze.py` (and `analyze_amendment01.py`) over E2 outputs | `experiments/e3/results/*` | f09106f (amendment: 7c10cd6) | **no**, not re-run | not compared |
| E4 (`experiments/e4`, `experiments/amendment-01/run-e4.mjs`) | `e4/PROTOCOL.md` | `cd experiments/e4 && ./build.sh && node build/run.mjs sanity\|baselines <out>` | `experiments/e4/results/*`, `amendment-01/*` | 7a934fa (amendment: 4983dab) | **no**, not re-run. Does not call `generateTrack`, so autoJoin does not apply | not compared |
| E5 (`experiments/e5`) | `e5/PROTOCOL.md`, `e5/ADDENDUM-01.md` | `cd experiments/e5 && ./run-all.sh` (per engine: `node run.mjs <label>`; `node analyze.mjs`; `python3 make-figure.py`). `E5_SCRATCH=<dir>` redirects `results/` and `out/` | `results/<engine>.json`, `SUMMARY.*`, `validity.jsonl`, figure | b93b744 (addendum: ec0c5ec) | subset: Node 22 run only; analysis not re-run | **yes** for `results/node22.json` (`env`, `meta`, `cases`, `mathCalls` equal) |
| E6 DEV (`experiments/e6`) | `e6/PROTOCOL.md` | `npm run build:cli && node experiments/e6/run-dev.mjs <dir>/candidates.json && node experiments/e6/select.mjs <dir>` | `results/dev/*` | bf1ab67 | full run | `candidates.csv`, `FROZEN.json`, `DEV_SUMMARY.md`: **yes**. `candidates.json`: **no**, 117 recorded validator defaults in `opts` (`kinkWindow`, `kinkQuantile`, `kinkFloorDegrees`) differ |
| E6 HELD-OUT | `e6/PROTOCOL.md` | `node experiments/e6/run-heldout.mjs <dir>` (reads the committed DEV inputs) | `results/heldout/heldout.json`, `instances.csv.gz`, `auto-straight.json`, `SUMMARY.md` (from `summarize.mjs`), figures | 3d5022d | full run for the three data files; `summarize.mjs` not re-run | **yes** for the three data files |
| E6 E2 recheck | `e6/PROTOCOL.md` | `node experiments/e6/e2-recheck.mjs <dir>` | `results/e2-recheck/validity-v1.1.csv.gz`, `SUMMARY.*` | 8fedd7a | full run | **yes** for all three files |
| E7 (`experiments/e7`) | `e7/PROTOCOL.md`, `e7/FREEZE.md` | `npm run build:cli && node experiments/e7/run.mjs dev\|heldout\|repro <dir>` | `results/{dev,heldout,repro}/cases.csv.gz`, `SUMMARY.json`, `SUMMARY.md`, `DETERMINISM.txt` | 3f867fc (dev, repro); 669a027 (heldout) | full run, one run per set; `DETERMINISM.txt` (two runs) not regenerated | **yes** for all three sets |

Notes on the table:

- The E1 `v05` subject (`experiments/e1/entry-v05.mjs`) is not aliased. It bundles current `src/`, so it does not reproduce the 0.5.0 records. The records are reproduced by the `v050` subject, which is bound to 145277e (`experiments/e1/v1.0.0`).
- Experiments whose code is bound to an old commit through an alias are reproduced from that commit by their documented build script: E1 `legacy` (6fea4d6), E1 `v050` in `experiments/e1/v1.0.0` (145277e), and E1b (6fea4d6, `@legacy` alias).
- The autoJoin pin (`autoJoin: 'legacy'`) is applied in: `experiments/e1/entry-v05.mjs`, `experiments/e1/v1.0.0/entry-v100.mjs`, `experiments/e2/grid.mjs` (which feeds `e2/run.mjs`, `amendment-01/run-e2.mjs` and `amendment-01/examples.mjs`), `experiments/amendment-01/e1-digest-effect.mjs`, `experiments/e6/lib.mjs` and `experiments/e5/analyze.mjs`. E7 already passes `autoJoin` explicitly; its default-parameter run intentionally uses the tangent default.
- E6 HELD-OUT reads the committed DEV files (`candidates.json`, `FROZEN.json`) as inputs, so it is checked against those files, not against a DEV run at HEAD.
- `experiments/e1/page.html` (tracked) was not rebuilt. It embeds the bundle built before the autoJoin pin.
- Validator defaults changed in v1.1 (the frozen local-kink rule). This changes the `ok` and `codes` columns of E2 validity, and the recorded `opts` of E6 DEV candidates. It does not change the generated tracks or metrics in any checked row.
