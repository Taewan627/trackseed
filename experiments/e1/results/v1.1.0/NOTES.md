# E1 at v1.1.0: predictions versus observed, deviations

Pre-registration (committed before any harness code, commit e52b9bc): ../../ADDENDUM-v1.1.0.md. Numbers: SUMMARY.md / SUMMARY.json (this directory). Harness: ../../v1.1.0/. Harness commit before the run: 96346bf. Generation sources of the run: `git diff 0d106a8 HEAD -- src` is empty (tree of "Version 1.1.0"). One `run-all.sh` run took 9 min 57 s of wall time on the machine used (the v1.0.0 run took 6 min 34 s with two engines fewer to build and a smaller browser set; the time was not analysed further).

## Predictions versus observed

- **P1** (S1 and S2: digest and contentDigest identical on all engines, 1000/1000): HELD. 9 engine runs (Node 22, Node 22 repeat, Node 20, Node 24, Deno, Bun, Chrome, Firefox, WebKit), 0 mismatches for both digests and both subjects.
- **P2** (S2 contentDigest equals committed v1.0.0 contentDigest 1000/1000; S2 digest equals v1.0.0 digest 0/1000): HELD on every engine (1000/1000 and 0/1000).
- **P3** (S1 and S2 contentDigest differ in exactly 400 cases, `auto` 200 and `extreme` 200, equal in 600): HELD on every engine (400 differ, auto 200, extreme 200; the differing ids equal the pre-computed id set).
- **P4** (S1 digest equals S2 digest in exactly the 600 content-equal cases): HELD on every engine (600 equal; digest-equal iff content-equal in 1000/1000).
- **P5** (recomputed contentDigest equals embedded; no THROW): HELD (0 embedded mismatches, 0 THROW cases, SHA-256 self-test pass, on every engine and both subjects).

## Engines and versions

Node 22.23.4, Node 20.20.2, Node 24.22.2, Deno 2.9.6, Bun 1.4.4, Chrome 153.0.8010.12, Firefox 157.0 (playwright-core 1.64.1), and WebKit 27.2 (Playwright build v2370, installed with `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers npx playwright install webkit`). All versions except WebKit equal those of the v1.0.0 run. WebKit ran: the install succeeded, the binary launched and produced results for both subjects. Its user-agent string reports "Macintosh; Intel Mac OS X 10_15_7" (a Playwright default string); the binary is the Linux x86_64 build, so the result says nothing about Safari on macOS or iOS.

## Deviations

1. **compare.mjs failed at the end of the first `run-all.sh` run.** The committed compare.mjs (96346bf) imported `sanitize` directly from `src/core.ts`, which plain Node cannot resolve (`./detmath.js`). All engine runs had completed and their JSON files were already written; the script stopped with ERR_MODULE_NOT_FOUND before writing SUMMARY.*. The fix is in the same commit as these results: `entry-sanitize.mjs` (a one-line re-export), a build step for it in `build.sh` (bundle `build/sanitize.mjs`, not tracked), and the import in compare.mjs. Only compare.mjs was then re-run (`node compare.mjs`); the engines were not re-run, and the engine results are the files of the first run. The expected-count logic in compare.mjs (the id set that P3 predicts) is the same computation as the pre-run script of the addendum.
2. The first run used the `build.sh` without the sanitize bundle; the s1/s2 bundle hashes in SUMMARY.md are from that build and the sanitize bundle does not enter any digest.
3. The pre-run script that produced the expected counts in the addendum was run from /tmp (not committed); its logic is reproduced in compare.mjs.

## Scope

Document generation and export only (core, patterns, coins, schema, sha256); one Linux x86_64 VM; these engines and versions; 1000 cases per subject, with `height` pinned to 80 by cases.mjs (so the new default height 20 is not exercised here). Other operating systems are covered by the CI workflow, which was not run here.
