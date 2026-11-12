# E1 addendum for v1.2.0 (pre-registration)

Status: committed alone, before any v1.2.0 harness code exists or runs. No file under experiments/e1/v1.2.0/ and no file under experiments/e1/results/v1.2.0/ exists at this commit. Later edits to this file are deviations and must be listed in a DEVIATIONS section of experiments/e1/results/v1.2.0/NOTES.md and SUMMARY.md, never made here. Existing files of experiments/e1 (PROTOCOL.md, ADDENDUM-v1.0.0.md, ADDENDUM-v1.1.0.md, v1.0.0/, v1.1.0/, results/) are not modified.

## Purpose

Release check at VERSION 1.2.0 (commit bff20ed, "Version 1.2.0"). Between 1.1.0 (commit 0d106a8) and 1.2.0 the changes are the rename to TrackSeed (format identifiers kept), scale-relative validator tolerances, polyline-path changes, packaging, documentation and tooling (see CHANGELOG.md, section 1.2.0). None of them is intended to change document generation or export. Question, as in PROTOCOL.md and ADDENDUM-v1.1.0.md: do identical inputs produce identical exported documents across JavaScript engines, and is the generation unchanged since 1.1.0 (and, for the legacy join, since 1.0.0)? Only document generation and export are exercised; the validator and the metrics are not part of the exported document and are not run here.

## Subjects

As in ADDENDUM-v1.1.0.md, both subjects built from the same tree (generation path src/core.ts, patterns.ts, coins.ts, detmath.ts, schema.ts, sha256.ts, version.ts), bundled once per subject.

- **S1: default join.** `generateTrack(params)` with the case parameters unchanged (`autoJoin` not passed; the default `'tangent'` applies where the join is not inert).
- **S2: legacy join.** `generateTrack({ ...params, autoJoin: 'legacy' })`.

State of the generation sources before any run (checked with `git diff --stat 0d106a8 HEAD -- <file>` only; no generation was run at 1.2.0): `src/core.ts`, `src/patterns.ts`, `src/coins.ts` and `src/sha256.ts` are byte-identical to 0d106a8; `src/detmath.ts` and `src/schema.ts` differ by one comment line each (the word "TrackLab" became "TrackSeed" in a comment); `src/version.ts` differs by the version string ('1.1.0' to '1.2.0'). The harness commit must leave this state unchanged, and the harness commit hash is recorded in the results.

## Cases

Identical to PROTOCOL.md, ADDENDUM-v1.0.0.md and ADDENDUM-v1.1.0.md: 200 seeds x 5 configurations = 1000 cases imported from experiments/e1/cases.mjs (unchanged since the v1.1.0 addendum; it asserts the seed-list SHA-256 5c5e64d6...a9f07 and pins `height: 80` where a configuration does not set it; `extreme` keeps 200). The default height 20 is therefore not exercised, as at 1.1.0.

## Measured quantities

As in ADDENDUM-v1.1.0.md. (1) `digest`: SHA-256 of the UTF-8 string `serializeTrack(generateTrack(params))`; it covers the generator stamp (now "1.2.0"). (2) `contentDigest`: SHA-256 of canonicalStringify(document without `integrity` and `generator`), recomputed by the harness with the engine's own execution of the bundled sha256 and compared with the embedded `integrity.contentDigest`. A thrown error gives the string `THROW:<error.name>`. One esbuild 0.25 ESM bundle per subject (unminified, es2020, platform neutral), byte-identical across engines; the browser page inlines both bundles.

## Engines

Reference = Node 22 (system `node`). Order: Node 22 (reference), Node 22 (repeat run), Node 20, Node 24, Deno, Bun (JavaScriptCore), Chrome headless (V8), Firefox (SpiderMonkey), WebKit (JavaScriptCore, Playwright build). Versions available before any run (checked with `--version` only): Node 22.23.4, Node 20.20.2, Node 24.22.2, Deno 2.9.6, Bun 1.4.4, Chrome 153.0.8010.12 (playwright-core 1.64.1, `/usr/bin/google-chrome`), Firefox (Playwright build `firefox-1555`, 157.0 at v1.1.0). WebKit: the Playwright build `webkit-2370` (27.2 at v1.1.0) is present in `/opt/pw-browsers` (from the v1.1.0 install), used with `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`; whether it runs the harness is determined by the run. If it were missing, `npx playwright install webkit` would be tried and the outcome recorded. If an engine fails, the failure is recorded and the engine is reported as not run; nothing is substituted.

## Agreement metric

Per subject and engine: share of the 1000 cases whose `digest` (and, separately, `contentDigest`) equals the Node 22 value of the same case id, with absolute mismatch counts and up to 10 first mismatching ids.

## Predictions (written before any run)

Comparison files: experiments/e1/results/v1.1.0/node22.s1.json and node22.s2.json (committed v1.1.0 results, S1 and S2) and experiments/e1/results/v1.0.0/node22.v100.json (committed v1.0.0 result), matched by case id.

- **P1.** For S1 and for S2, `digest` and `contentDigest` are identical across all engines that run (agreement 1000/1000 with Node 22, 0 mismatches), including the Node 22 repeat run.
- **P2.** S1 `contentDigest` equals the committed v1.1.0 S1 `contentDigest`, and S2 `contentDigest` equals the committed v1.1.0 S2 `contentDigest`, in 1000 of 1000 cases each, on every engine (generation unchanged since 1.1.0).
- **P3.** S2 `contentDigest` equals the committed v1.0.0 `contentDigest` of the same case id in 1000 of 1000 cases on every engine.
- **P4.** `digest` differs from the committed v1.1.0 value of the same subject and case id in 1000 of 1000 cases, for S1 and for S2, on every engine (the generator stamp is "1.2.0" against "1.1.0"). The S2 `digest` also differs from v1.0.0 in 1000 of 1000 cases.
- **P5.** In 1000 of 1000 cases of each subject on each engine, the recomputed `contentDigest` equals the embedded `integrity.contentDigest`; no case throws; the SHA-256 self-test passes on every engine; and the generator stamp read from the documents is "1.2.0".

Consequence, not a separate prediction: because P2 holds for both subjects, S1 and S2 `contentDigest` would differ in exactly the 400 cases of the v1.1.0 addendum (`auto` and `extreme`, 200 each) and be equal in the other 600; the summary reports this count.

## Scope and reporting rules

Numbers only. One Linux x86_64 VM, the engines and versions listed above, 1000 cases per subject, document generation only. Other operating systems are covered by the CI workflow (.github/workflows/ci.yml), which is not run here. A WebKit result is for the Playwright WebKit build on Linux and says nothing about Safari on macOS or iOS. Deviations from this addendum (an engine that fails, a changed harness command, an engine version that differs from the above) are listed in NOTES.md and SUMMARY.md.
