# E1 at v1.2.0: predictions versus observed, deviations

Pre-registration (commit 8fecf83, committed alone before any harness code): ../../ADDENDUM-v1.2.0.md. Numbers: SUMMARY.md / SUMMARY.json (this directory). Harness: ../../v1.2.0/. Harness commit before the run: 037da14. Version commit: bff20ed. Generation sources of the run: `git diff --stat 0d106a8 HEAD -- src/core.ts src/patterns.ts src/coins.ts src/sha256.ts` is empty; `src/detmath.ts` and `src/schema.ts` differ from 0d106a8 by one comment line each; `src/version.ts` differs by the version string. One `run-all.sh` run (started 2026-11-13 03:14 JST, last result file written 03:23:24 JST) took a little under 9 minutes after the build; the time was not analysed further.

## Predictions versus observed

- **P1** (S1 and S2: digest and contentDigest identical on all engines, 1000/1000, 0 mismatches): HELD. 9 engine runs (Node 22, Node 22 repeat, Node 20, Node 24, Deno, Bun, Chrome, Firefox, WebKit), 0 mismatches for both digests and both subjects.
- **P2** (S1 and S2 contentDigest equal the committed v1.1.0 values of the same subject, 1000/1000): HELD on every engine (1000/1000 for S1 and for S2).
- **P3** (S2 contentDigest equals the committed v1.0.0 contentDigest, 1000/1000): HELD on every engine.
- **P4** (digest differs from the committed v1.1.0 value in 1000/1000 for S1 and for S2; S2 digest also differs from v1.0.0 in 1000/1000): HELD on every engine (0 of 1000 equal in all three comparisons).
- **P5** (recomputed contentDigest equals embedded; no THROW; self-test passes; stamp 1.2.0): HELD (0 embedded mismatches, 0 THROW cases, SHA-256 self-test pass, generator stamps read from the documents are ["1.2.0"] for both subjects, on every engine).
- Consequence of P2 (not a separate prediction): S1 and S2 contentDigest differ in 400 cases (`auto` 200, `extreme` 200; the differing ids equal the ids computed from `sanitize`) and are equal in 600, on every engine.

## Engines and versions

Node 22.23.4, Node 20.20.2, Node 24.22.2, Deno 2.9.6, Bun 1.4.4, Chrome 153.0.8010.12, Firefox 157.0 (playwright-core 1.64.1), WebKit 27.2 (Playwright build `webkit-2370`, already present in `/opt/pw-browsers`; no install was needed). All versions equal those listed in the addendum and those of the v1.1.0 run. WebKit ran: the binary launched and produced results for both subjects. Its user-agent string reports "Macintosh; Intel Mac OS X 10_15_7" (a Playwright default string); the binary is the Linux x86_64 build, so the result says nothing about Safari on macOS or iOS.

## Deviations

None. No engine failed, no harness file was changed after the harness commit, and the addendum was not edited. Only the pre-registered harness changes against v1.1.0 apply: result paths and labels, comparison targets in compare.mjs, and `measure.mjs` additionally records the generator stamps read from the documents (needed for the P5 stamp check as written in the addendum). The `compare.mjs` of the v1.1.0 run needed a fix after its first run; this copy already contains the sanitize bundle step and ran without error.

## Scope

Document generation and export only (core, patterns, coins, schema, sha256); one Linux x86_64 VM; these engines and versions; 1000 cases per subject, with `height` pinned to 80 by cases.mjs (so the default height 20 is not exercised here). Other operating systems are covered by the CI workflow, which was not run here.
