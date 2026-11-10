# E1 at v1.0.0: predictions versus observed, deviations

Addendum with the predictions (committed before any harness code): ../../ADDENDUM-v1.0.0.md. Numbers: SUMMARY.md / SUMMARY.json (this directory). Harness: ../../v1.0.0/ (build.sh, run-all.sh, run.mjs, run-browser.mjs, compare.mjs). Whole run (`./run-all.sh`, including the esbuild builds and the browsers): about 6.5 minutes on the machine used.

## Predictions versus observed

1. v1.0.0, 100% agreement with Node 22 on every engine for digest and contentDigest: CONFIRMED (8 engine runs: Node 22 repeat, Node 20, Node 24, Deno, Bun, Chrome headless, Firefox; 0 mismatches in 1000 cases for both digests).
2. v1.0.0 contentDigest equals the v0.5.0 content-equivalent in 1000 of 1000 cases on Node 22 and on every engine: CONFIRMED (1000 / 1000 on all 8 runs).
3. v1.0.0 digest differs from v0.5.0 digest in 1000 of 1000 cases; recomputed contentDigest equals the embedded one in 1000 of 1000 cases: CONFIRMED (0 / 1000 equal digests on every engine; 0 embedded mismatches).
4. The v0.5.0 bundle reproduces the original E1 digests in 1000 of 1000 cases on Node 22: CONFIRMED.
5. No case throws: CONFIRMED (0 THROW cases in both subjects on every engine).

## Deviations

1. experiments/e1/v1.0.0/run-browser.mjs is a copy of experiments/e1/run-browser.mjs with the output directory changed and the page-load timeout raised from the Playwright default (30 s) to 300 s. The first Firefox attempt with the 30 s default failed with a page.goto timeout (the page executes both subjects inside its load event); no result was produced by that attempt. The final results of all engines come from one complete `run-all.sh` run with the committed scripts.
2. Engine versions equal those of the original E1 run (same machine image): Node 22.23.4, Node 20.20.2, Node 24.22.2, Deno 2.9.6, Bun 1.4.4, Chrome 153.0.8010.12, Firefox 157.0 (SUMMARY.md lists them).

## Scope

Document generation only (core, patterns, coins, schema, sha256); one Linux machine; these engines and versions; 1000 cases per subject. The vehicle runtime is not part of the exported document and is not exercised. The legacy v0.4 control of the original E1 is not re-run.
