# E1 addendum for v1.1.0 (pre-registration)

Status: committed alone, before any v1.1.0 harness code exists or runs. No file under experiments/e1/v1.1.0/ and no file under experiments/e1/results/v1.1.0/ exists at this commit. Later edits to this file are deviations and must be listed in a DEVIATIONS section of experiments/e1/results/v1.1.0/NOTES.md and SUMMARY.md, never made here. Existing files of experiments/e1 (PROTOCOL.md, ADDENDUM-v1.0.0.md, v1.0.0/, results/) are not modified.

## Purpose

Release check at VERSION 1.1.0 (commit 0d106a8, "Version 1.1.0") after the changes since 1.0.0 that touch generation and validation: the `autoJoin` option with the tangent default, the default `height` 80 to 20, the validator v1.1 local-kink rule and the scale-normalised metrics (see CHANGELOG.md). Question, as in PROTOCOL.md: do identical TrackLab inputs produce identical exported documents across JavaScript engines, and does the legacy join still reproduce the v1.0.0 content? Only document generation and export are exercised (the validator and metrics are not part of the exported document and are not run here).

## Subjects

Both subjects are the same tree (generation path src/core.ts, patterns.ts, coins.ts, detmath.ts, schema.ts, sha256.ts, version.ts), bundled once per subject; the harness commit must leave `git diff 0d106a8 HEAD -- src` empty, and the commit hash is recorded in the results.

- **S1: v1.1.0 default join.** `generateTrack(params)` with the case parameters unchanged: `autoJoin` is not passed, so the default `'tangent'` applies where the join is not inert.
- **S2: v1.1.0 legacy join.** `generateTrack({ ...params, autoJoin: 'legacy' })`, the v1.0.0 construction.

## Cases

Identical to PROTOCOL.md and ADDENDUM-v1.0.0.md: 200 seeds x 5 configurations = 1000 cases, imported from experiments/e1/cases.mjs (which asserts the seed-list SHA-256 5c5e64d6...a9f07). As in the v1.0.0 re-run, cases.mjs pins `height: 80` where a configuration does not set it (the v1.0.0 default; `extreme` keeps 200). The cases therefore do not exercise the new default height 20; this is intended, because P2 needs the v1.0.0 parameters, and the default height change is evidenced by E8.

## Measured quantities (per case, per engine, per subject)

As in ADDENDUM-v1.0.0.md. (1) `digest`: SHA-256 of the UTF-8 string `serializeTrack(generateTrack(params))`; it covers the generator stamp (now "1.1.0"). (2) `contentDigest`: SHA-256 of canonicalStringify(document without `integrity` and `generator`), recomputed by the harness with the engine's own execution of the bundled sha256, and compared with the embedded `integrity.contentDigest` (count of cases where it differs). Thrown errors give the string `THROW:<error.name>`. Generator code is one esbuild 0.25 ESM bundle per subject (unminified, es2020, platform neutral), byte-identical across engines; the browser page inlines both bundles.

## Engines

Reference = Node 22 (system `node`). Engines, in this order: Node 22 (reference), Node 22 (repeat run), Node 20, Node 24, Deno, Bun (JavaScriptCore), Chrome headless (V8), Firefox (SpiderMonkey), WebKit (JavaScriptCore, Playwright build). Versions are recorded at run time. The versions available in this sandbox before any run (checked with `--version` only, no harness code run) are those recorded for v1.0.0 in results/v1.0.0/SUMMARY.md, so the pins are the same: Node 22.23.4, Node 20.20.2, Node 24.22.2, Deno 2.9.6, Bun 1.4.4, Chrome 153.0.8010.12 (playwright-core 1.64.1, `/usr/bin/google-chrome`), Firefox 157.0 (Playwright build). WebKit: `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers npx playwright install webkit` succeeded before this commit (WebKit 27.2, Playwright build v2370) and a launch of the binary succeeded; whether it runs the harness is determined by the run. If an engine fails, the failure is recorded and the engine is reported as not run; nothing is substituted.

## Agreement metric

Per subject and engine: agreement = share of the 1000 cases whose `digest` (and, separately, `contentDigest`) equals the Node 22 value of the same case id, with absolute mismatch counts and up to 10 first mismatching ids.

## Predictions (written before any run)

Expected counts below were computed before any run by a script that only reads experiments/e1/cases.mjs and `sanitize` from src/core.ts (no generation, no digest): for each case, `sanitize(params).autoJoin` is compared with `sanitize({ ...params, autoJoin: 'legacy' }).autoJoin`, and `round(straight x curves)` is computed. Result: 400 cases (`auto` 200, `extreme` 200) keep `'tangent'` under S1; 600 cases (`right-angle`, `hairpin`, `s-curve`, 200 each) are canonicalised to `'legacy'` because `cornerPattern` is not `auto` and `cornerCount` > 0. For every case `round(straight x curves)` is 2 (curves 6 or 8) or 3 (`extreme`, curves 10), so every case has at least one straight segment.

- **P1.** For S1 and for S2, `digest` and `contentDigest` are identical across all engines that run (agreement 1000/1000 with Node 22, 0 mismatches), including the Node 22 repeat run.
- **P2.** S2 `contentDigest` equals the committed v1.0.0 `contentDigest` of the same case id (experiments/e1/results/v1.0.0/node22.v100.json) in 1000 of 1000 cases. S2 `digest` equals the v1.0.0 `digest` in 0 of 1000 cases (the generator stamp differs, "1.1.0" against "1.0.0").
- **P3.** S1 `contentDigest` differs from S2 `contentDigest` in exactly 400 of 1000 cases (the `auto` and `extreme` configurations, 200 each) and is equal in the other 600 (`right-angle`, `hairpin`, `s-curve`). Note on the mechanism: in the 400 cases the document of S1 differs from that of S2 in the stored `params.autoJoin` key (present as "tangent" in S1, absent in S2) and, because each of these cases has at least one straight segment, in the geometry; the count of 400 is therefore also the count that the condition "straight segments > 0" gives. A case with no straight segment would still differ through the stored key. No such case exists in this set.
- **P4.** S1 `digest` equals S2 `digest` in exactly the 600 cases where the `contentDigest` values are equal (same content, same generator stamp), and differs in the other 400.
- **P5.** In 1000 of 1000 cases of each subject on each engine, the recomputed `contentDigest` equals the embedded `integrity.contentDigest`, and no case throws.

## Scope and reporting rules

Numbers only. One Linux x86_64 VM, the engines and versions listed above, 1000 cases per subject, document generation only. Other operating systems are covered by the CI workflow (.github/workflows/ci.yml), which is not run here. A WebKit result, if obtained, is for the Playwright WebKit build on Linux and says nothing about Safari on macOS or iOS. Deviations from this addendum (an engine that fails, a changed harness command) are listed in NOTES.md and SUMMARY.md.
