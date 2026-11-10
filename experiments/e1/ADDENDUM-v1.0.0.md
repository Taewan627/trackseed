# E1 addendum for v1.0.0 (pre-registration)

Status: committed alone, before any v1.0.0 harness code exists or runs. No file under experiments/e1/v1.0.0/ exists at this commit. Later edits to this file are deviations and must be listed in a DEVIATIONS section of experiments/e1/results/v1.0.0/SUMMARY.md, never made here. Existing files of experiments/e1 (PROTOCOL.md, harness, results) are not modified.

## Question

Same as PROTOCOL.md: do identical TrackLab inputs produce identical exported documents across JavaScript engines/runtimes? Asked now of the frozen release (VERSION 1.0.0, branch s5b), whose document carries two digests (`integrity.digest` and the new `integrity.contentDigest`, see README "Exchange format"). The legacy v0.4 control of PROTOCOL.md is not re-run.

## Subjects

- **v1.0.0**: the tree of the commit that bumps the version to 1.0.0 on branch s5b (the commit "Version 1.0.0"), generation path src/core.ts, patterns.ts, coins.ts, detmath.ts, schema.ts, sha256.ts.
- **v0.5.0 (content comparison)**: the tree of commit 145277e (VERSION 0.5.0; the commit that holds the original E1 results), built in a detached git worktree. Its generation sources (core.ts, patterns.ts, coins.ts, detmath.ts, sha256.ts) are byte-identical to the 1.0.0 tree (`git diff 145277e HEAD -- those files` is empty; commit a1a8e05 differs from 145277e only by src/cli.ts, metrics.ts, validate.ts additions). v0.5.0 documents have no `contentDigest`, so for this subject the harness computes the content-equivalent with the same definition applied to the v0.5.0 document: SHA-256 of canonicalStringify of the document without `integrity` and without `generator`, using the v0.5.0 tree's own canonicalStringify and sha256.

## Cases

Identical to PROTOCOL.md: 200 seeds x 5 configurations = 1000 cases, imported from experiments/e1/cases.mjs (which asserts the seed-list SHA-256 5c5e64d6...a9f07).

## Measured quantities (per case, per engine, per subject)

1. `digest`: lower-case hex SHA-256 of the UTF-8 string `serializeTrack(generateTrack(params))` (as in PROTOCOL.md; for v1.0.0 it covers the generator stamp, so it differs from v0.5.0 by construction).
2. `contentDigest`: SHA-256 of canonicalStringify(document without `integrity` and `generator`), recomputed by the harness from the parsed serialized document with the engine's own execution of the bundled sha256 (never node:crypto). For v1.0.0 the harness also checks it equals the embedded `integrity.contentDigest` (count of cases where it does not).
Thrown errors give the string `THROW:<error.name>` for both (compared like any other value).

Generator code is one esbuild 0.25 ESM bundle per subject (unminified, es2020, platform neutral), byte-identical across engines; the browser page inlines both bundles.

## Agreement metric and engines

Reference = Node 22 (system `node`). Agreement of an engine = share of the 1000 cases whose value equals the Node 22 value of the same case id, reported separately for `digest` and `contentDigest`, for each subject, with absolute mismatch counts and up to 10 first mismatching ids. Engines as in PROTOCOL.md, versions recorded at run time: Node 22, Node 22 repeat run, Node 20, Node 24, Deno 2.x, Bun 1.x, Chrome headless, Firefox (Playwright build). An engine that cannot run is reported with its error.

Cross-version comparison (Node 22 and, as a further check, every engine): per case, v1.0.0 `contentDigest` equals the v0.5.0 content-equivalent; and v1.0.0 `digest` versus v0.5.0 `digest`. As a bundle sanity check, the v0.5.0 subject's `digest` is compared with the digests recorded in the original E1 run (experiments/e1/results/node22.v05.json).

## Predictions (written before any run)

1. v1.0.0: 100% agreement (0 mismatches) with Node 22 on every engine that runs, for both `digest` and `contentDigest`.
2. v1.0.0 `contentDigest` equals the v0.5.0 content-equivalent in 1000 of 1000 cases on Node 22 (and on every engine), because the generation sources are byte-identical.
3. v1.0.0 `digest` differs from the v0.5.0 `digest` in 1000 of 1000 cases (the `generator.version` field differs); the harness-recomputed `contentDigest` equals the embedded one in 1000 of 1000 cases.
4. The v0.5.0 bundle built by this harness reproduces the digests recorded in the original E1 run in 1000 of 1000 cases on Node 22.
5. No case throws in either subject.

## Reporting rules

As PROTOCOL.md: numbers only; claims limited to these engines, these versions, these 1000 cases per subject, one Linux machine, document generation only (the vehicle runtime is not part of the exported document and is not exercised).
