# Changelog

## Unreleased

### Repository

- **Commit messages edited once (2026-11-14).** The e-mail address was removed from every `Co-Authored-By: Claude <model> <version>` trailer; model names, file contents, author and committer names, e-mails and dates are unchanged, and the SSH signatures of the original commits could not be kept. All commit hashes changed and tag v1.2.0 was moved to the rewritten release commit (same files; Zenodo archive 10.5281/zenodo.24203510). [docs/commit-map.txt](docs/commit-map.txt) maps old to new hashes; hashes inside files committed before the edit (protocols, notes, results, labels such as `0.4-legacy@6fea4d6`) are left as they were.
- **README corrected (docs only).** Release status (1.2.0 released 2026-11-14, tag `v1.2.0`, Zenodo DOI), the CI result of the release commit (Actions run 43536617035, 13 of 13 jobs), the clone URL, and the `--resample-smooth` sentence, which said that a spike remains a kink; as the CLI help and [docs/validator.md](docs/validator.md) state, smoothing can hide a spike of up to about one road width. The README at tag `v1.2.0` still has the pre-release wording.
- **CITATION.cff:** the author list is now Taewan Kim only (maintainer's decision, 2026-11-22). The CITATION.cff inside tag `v1.2.0` and its Zenodo archive is unchanged.
- **Web demo:** the web interface of v1.2.0 (tag `v1.2.0`, `npm ci && npm run build`, unmodified `dist/`) runs as a static Hugging Face Space at https://huggingface.co/spaces/devmeta/trackseed; the README links it and the archived release DOI.
- The detached worktrees of the E1, E1b and amendment-01 build scripts and of `scripts/reproduce-check.sh` now use `75dced7` (was `6fea4d6`) and `ac70ce7` (was `145277e`); the paper scripts default to `23b6bb9` (was `0441abe`).

## 1.2.0 (2026-11-14, tag v1.2.0)

Changes since the commit that set the version to 1.1.0 (`0d106a8`). No source file of the generation path (`core`, `patterns`, `coins`, `sha256`) changed since 1.1.0; `detmath.ts` and `schema.ts` changed in comments only. The document `digest` covers the `generator` stamp and therefore differs from 1.1.0 for identical content; `contentDigest` excludes the stamp (see "Compatibility").

### Renamed

- **The project is now called TrackSeed** (it was TrackLab, and TrackLab Lite in the web UI). Package name `trackseed`; CLI command `trackseed` (`cli-dist/cli.js`), usage and error text, web UI title, header, `<title>` and the English and Korean strings, README, documentation and CITATION.cff title were renamed. The command `tracklab` stays as a deprecated second `bin` entry for one release; `trackseed --help` says so.
- **Document format identifiers keep the former name.** The schema name `tracklab.track` and the generator name `tracklab` in exported documents are unchanged on purpose: both are inside the digests, so renaming them would change every `digest` and `contentDigest` and break the reproduction of the committed results. `schemaVersion` stays 1.
- Smaller user-visible changes: the exported file name is `trackseed-<seed>-<digest8>.json` (was `tracklab-...`), the language preference is stored under the `trackseed-lang` key (a stored `tracklab-lang` value is ignored, so a returning browser starts in English), the development diagnostic object is `window.__trackseed` (was `__tracklab`; absent from production builds as before).
- No change to generated geometry, validator results, metrics or document bytes: the committed determinism goldens (`tests/fixtures/ci-golden-digests.json`, `ci-golden-digests-v1.1.json`) pass unchanged.

Validator and polyline-path robustness (WP7a), from the second red team's findings on scale, large inputs, duplicate vertices and sampling ([docs/validator.md](docs/validator.md)). No change to the generator, the exchange format or any result inside TrackSeed's own scale; the reproduce check of E2, AMENDMENT-01, E6, E7 and E5 is in [docs/test-run-wp7a.txt](docs/test-run-wp7a.txt).

### Repository and documentation

- `docs/history/` (the v0.4 Korean README and the historical development and deployment reports) is removed from the tree; the files remain in the git history. Links to them were fixed.
- README: new "Provenance" section and new "Development process and AI use" section (maintainer responsibility, the models named in the commit trailers, commit counts, the tooling identity used up to 2026-11-12 UTC).

- **Installable package.** `private` is removed. `package.json` gains `main`, `types`, `exports` (`trackseed`, `trackseed/core`, `/validate`, `/metrics`, `/schema`, `/polyline`, `/detmath`, `trackseed/schema.json`), `bin` (`trackseed`, deprecated alias `tracklab`), `files` (built `cli-dist/` with `.d.ts` declarations, `schema/`, README, `LICENSE`, `Licence.txt`, CHANGELOG, THIRD_PARTY_NOTICES) and a `prepack` script that builds. New `src/index.ts` is the library entry point; `tsconfig.cli.json` also emits declarations. The `repository` field is omitted until the repository URL is final. Checked with `npm pack` and an install into an empty project: ESM import, `npx trackseed generate`, type-check against the declarations.

- **Public demo.** `vercel.json` no longer sends `X-Robots-Tag: noindex, nofollow, noarchive`; `X-Content-Type-Options: nosniff` stays. `scripts/prepare-vercel-preview.mjs`, `scripts/verify-vercel-production.mjs` and `.vercelignore` are removed: they implemented a private, access-protected prebuilt deployment (robots exclusion, a content audit with a pattern list naming the maintainer's employer and products, a protection-bypass check) that does not apply to a public demo. A normal Vercel deployment of the repository builds with `npm run build` (`vercel.json`).

- **`scripts/release-check.mjs`** (`npm run release-check`) fails while any tracked file outside `experiments/` still contains a PI token (an open decision for the maintainer), while `package.json`, `src/version.ts` and `CITATION.cff` disagree on the version, or while `npm pack --dry-run` lists a file outside the package whitelist (node_modules, test-results, `.env*`, tmp, sources, ...).

### Changed (behaviour only outside TrackSeed's scale, or for inputs that crashed or were misreported)

- **Scale-relative default tolerances.** `closureTolerance` and `heightTolerance` (1e-6) are multiplied by f and `foldEpsilon` (1e-5) by f^2, with f = D/10 for a bounding-box diagonal D < 10, D/100000 for D > 100000 and 1 in between. A valid track scaled with its width by 1e-4 no longer fails with `EDGE_FOLD`; tracks of TrackSeed's size (D about 600 to 1600) are judged exactly as before. Values passed explicitly are literal; `absoluteTolerances: true` / `--absolute-tolerances` restores the absolute defaults. When f is not 1 the `closure` and `edge-fold` checks report `stats.toleranceScale`.
- **Segment intersection test** uses the product of signs instead of the product of cross products (same result, no underflow at small scale). The spatial-hash cell floor scales with f, and above 50,000 vertices the cell is also capped at 4 mean segment lengths (200,000 vertices: about 1 s instead of 15 s; the set of reported pairs is the same).
- **Polyline path removes consecutive duplicate vertices** (distance <= 1e-9 x bounding-box diagonal, last against first too) and reports `duplicatePointsRemoved` (CLI: `input.duplicatePointsRemoved`). A duplicated vertex used to give `SELF_INTERSECTION_CENTERLINE`, `SELF_INTERSECTION_EDGE` and `EDGE_FOLD` on a clean circle. Fewer than 3 distinct vertices is a `RangeError` (CLI exit 2). Generated tracks have no duplicates and do not use this path.

### Fixed

- `trackFromPolyline` threw `RangeError: Maximum call stack size exceeded` at 200,000 vertices or more (`Math.min(...array)` in the bounds). Resampling that would produce more than 5,000,000 points is now a `RangeError` (CLI exit 2) instead of an allocation failure.

### Added

- **`--resample-smooth S`** (library `resampleSmooth: { spacing }`) for `validate-polyline` and `metrics-polyline`: centripetal Catmull-Rom spline through the input points, then arc-length resampling; off by default, exclusive with `--resample-spacing` (linear, unchanged).
- **Sampling requirement** for imported polylines, with derivation, in [docs/validator.md](docs/validator.md), the README and `validate-polyline --help`.
- `tests/robust.test.ts` (16 tests): scale invariance 1e-4 to 1e5, 200,000-vertex inputs through the library and the CLI, duplicates, sampling requirement, smooth resampling.

### Evidence and tooling added since 1.1.0

- **E9, external evaluation** of the polyline input path on tracks the authors did not create (real circuits from two public databases and procedural generators from five public repositories, fetched at pinned commits; no third-party code or data is committed). Protocol committed before any harness code or run: [experiments/e9/PROTOCOL.md](experiments/e9/PROTOCOL.md); results, notes and figure in `experiments/e9/results/` ([SUMMARY.md](experiments/e9/results/SUMMARY.md), [NOTES.md](experiments/e9/results/NOTES.md)); attribution in [experiments/e9/ATTRIBUTION.md](experiments/e9/ATTRIBUTION.md). Row in [REPRODUCE.md](REPRODUCE.md) and group `e9` in `scripts/reproduce-check.sh`.
- **E1 release check at 1.2.0** (nine engine runs on one Linux x86_64 VM, 1000 cases, default and legacy join): protocol (committed before the results in the local git history) [experiments/e1/ADDENDUM-v1.2.0.md](experiments/e1/ADDENDUM-v1.2.0.md), results [experiments/e1/results/v1.2.0/SUMMARY.md](experiments/e1/results/v1.2.0/SUMMARY.md), notes [NOTES.md](experiments/e1/results/v1.2.0/NOTES.md). All five predictions held: 0 mismatches of `digest` and `contentDigest` across engines for both subjects (WebKit 27.2 Playwright build included); `contentDigest` equal to the committed v1.1.0 results in 1000 of 1000 cases for both subjects and, for the legacy join, to the v1.0.0 results in 1000 of 1000; `digest` equal to v1.1.0 in 0 of 1000 (the stamp). Row in [REPRODUCE.md](REPRODUCE.md) and E1 v1.2.0 subjects in `scripts/reproduce-check.sh`.
- **E9 post-hoc diagnostic (exploratory)** of the `LOCAL_KINK` flags on flagged real and generated tracks: [experiments/e9/diagnostics/README.md](experiments/e9/diagnostics/README.md). It is not one of the E9 predictions of the protocol and changes no E9 result.

- **E11, generator parameters as difficulty handles** for a scripted driver (pure pursuit converted to key taps; ideal, delayed and delayed-cautious profiles) on the web interface's own vehicle model (`src/vehicle.ts`, unchanged), 60 seeds x 21 one-factor conditions x 3 drivers: protocol committed alone before the harness and the results in the local git history ([experiments/e11/PROTOCOL.md](experiments/e11/PROTOCOL.md)), results and deviations in [experiments/e11/results/](experiments/e11/results/SUMMARY.md). Road width and hairpin count are strong handles for the delayed drivers; a larger straight share makes tracks harder, not easier, for them, because it tightens the remaining corners (prediction P3 failed); elevation has no effect for them. Same-machine determinism only (the vehicle model uses native `Math`).

### Fixed in tooling

- **Windows paths in experiment runners:** `experiments/e6` (`e2-recheck`, `run-dev`, `run-heldout`, `select`, `summarize`), `e7/run-twice.mjs` and `e8/run-twice.mjs` used `new URL(...).pathname` ("/D:/...", ENOENT on Windows), and `e6/select.mjs` compared `import.meta.url` with `"file://" + argv[1]` (never equal on Windows, so it wrote nothing). They use `fileURLToPath` / `pathToFileURL` now; POSIX paths and all results are unchanged (E6 DEV and HELD-OUT re-checked byte-identical on Windows). `scripts/reproduce-check.sh` gains the group `e11`.
- **`scripts/reproduce-check.sh`** compares the E1 v1.0.0 `contentDigest` per case (the `digest` differs by design since 1.1.0 because the generator stamp is part of the serialized document); REPRODUCE.md states this. The "TrackLab configurations" wording was changed to "TrackSeed (formerly TrackLab)".
- **CLI:** `trackseed generate ... | head -c 10` no longer prints an unhandled `EPIPE` stack trace. A closed stdout ends the process with the status the command had reached (0 unless a check failed); other stdout errors are rethrown. Output bytes are unchanged; a Node test closes the reader before the document is written.
- **`scripts/release-check.mjs`** also fails while the schema `$id`, the CITATION.cff `repository-code` or `package.json` `repository` / `homepage` (when present) contain a placeholder or the former repository name.

### Validator v1.3 and release hygiene (WP13), from the third red team (RT3)

- **Absolute per-vertex rule `SHARP_VERTEX`** (error, check id `sharp-vertex`): any vertex whose heading change exceeds `sharpVertexDegrees` (default 30 degrees) is flagged whatever its neighbours do. The relative local-kink rule accepted coarse regular polygons (4-, 5-, 6-, 8-gons), a uniform sawtooth and paired spikes 2 to 4 vertices apart (RT3 R2-1); all of them are now rejected. Before and after table for every probe class: [docs/validator.md](docs/validator.md); tests: `tests/sharp-vertex.test.ts`.
- **Sampling diagnostic `UNDERSAMPLED`** (warning, check id `undersampled`): more than `undersampledShare` (10 %) of the vertices turn by more than `undersampledTurnDegrees` (12 degrees), the documented sampling requirement in observable form (RT3 R2-2). The report carries the share, the count, the largest turn, the median and maximum spacing and the width. `metrics-polyline` prints the same warning on stderr; its JSON is unchanged.
- **Defaults.** Both checks are ON by default in mode `kink`, in the library and in the CLI, and are not run in the legacy modes. They are selectable: `sharpVertexDegrees: Infinity` / `--no-sharp-vertex` (or `--limit sharpVertexDegrees=N`), `undersampledCheck: false` / `--no-undersampled-check` (or `--limit undersampledTurnDegrees=N`, `--limit undersampledShare=N`); a disabled check is not listed in `checks`, so with both off the report is the v1.2.0 report. The values were chosen by an exploration on clean generated TrackSeed tracks, labelled exploratory ([docs/validator-v1.3-exploration.md](docs/validator-v1.3-exploration.md)).
- **Behaviour change.** The default report has ten checks instead of eight, and a polyline can now be `ok: false` through `SHARP_VERTEX` where v1.2.0 said `ok: true`. No clean generated track changed: none of 60,290 clean TrackSeed tracks of the exploration is flagged by either check. Generation, the exchange format and every digest are unchanged (`generate --seed 42` and both CI goldens as before).
- **Experiment pins.** The experiment runners whose committed results predate v1.3 pass `experiments/_v12-validator.mjs` (`sharpVertexDegrees: Infinity`, `undersampledCheck: false`) to every `validateTrack` call (E1b, E4, E5, E6, E7, E8, E9 and AMENDMENT-01 scripts); committed results are unchanged: the reproduce check is in [docs/test-run-wp13.txt](docs/test-run-wp13.txt).
- **Packaging (RT3 R1-2).** `three` moved from `dependencies` to `devDependencies`: the npm package has no runtime dependency and no entry point imports `three` (only the web interface does, and the web build still bundles it). `npm install` of the packed tarball in an empty project installs `trackseed` alone.
- **Browser tests (RT3 R1-4).** `playwright.config.mjs` no longer reuses a server already listening on 5173 or 5174 (it could belong to another checkout); set `TRACKSEED_REUSE_SERVER=1` to reuse deliberately.
- **Reproduction scripts (RT3 phase B).** The `run-all.sh` scripts of E1 (all versions), E5 and E9 no longer `rm -rf` the committed results directories (they remove untracked leftovers only), so `NOTES.md` and other committed files survive a re-run. The tools fetched with `npx` are pinned to the versions recorded in the committed results: esbuild 0.25.12, node 20.20.2 and 24.22.2, deno 2.9.6, bun 1.4.4 (also in `scripts/reproduce-check.sh`).
- **CI.** A `browser` job (Chromium through Playwright, `npm run test:browser`) was added to `.github/workflows/ci.yml`, and the determinism smoke test now requires exit code 0 for seed 42 (it accepted 1). README describes CI as configured and not yet run publicly.
- **Wording.** "Pre-registration" and "pre-registered" were removed from README and docs in favour of "protocol committed before the results in the local git history" (the dates are self-asserted; no external registry was used); [docs/GLOSSARY.md](docs/GLOSSARY.md) explains that the historical files under `experiments/` use the older term.
- **CLI example output.** `docs/cli-example-output.txt` was regenerated at 1.2.0 with `scripts/cli-example.sh`; it now prints `contentDigest` next to `digest` (RT3 R1-1: the earlier file held the v1.1.0 digest).

### Compatibility

- The `generator` stamp is now "1.2.0", so `integrity.digest` of every document differs from the one written by 1.1.0 for the same parameters; `integrity.contentDigest` is computed without `generator` and `integrity`. The CI goldens (`tests/fixtures/ci-golden-digests.json`, `ci-golden-digests-v1.1.json`) hash `contentDigest` and pass unchanged.
- The exchange format `schemaVersion` is unchanged (1); the schema name `tracklab.track` and the generator name `tracklab` are kept (see "Renamed").
- The `tracklab` command remains as a deprecated alias of `trackseed` for this release.

## v1.1.0 (never released: no tag and no release date; these changes shipped in 1.2.0)

Changes since the commit that set the version to 1.0.0 (`eb8598f`). Every item points to the document or experiment that describes and evidences it. The document `digest` covers the `generator` stamp, so documents written by 1.1.0 have a different `digest` than 1.0.0 documents with identical content; `contentDigest` excludes the generator and is unchanged for identical content (see "Compatibility").

### Changed defaults (behaviour changes)

- **Validator v1.1: local-kink rule.** `validateTrack` runs an eighth check, `local-kink` (error severity), and the seam check `CLOSURE_TANGENT` uses the same rule (`closureTangentMode: 'kink'`, now the default; `'ratio'` and `'absolute'` remain selectable and return the seven checks of v1.0.0). Rule: [docs/validator.md](docs/validator.md); evaluation E6 (protocol committed before the results in the local git history): [experiments/e6/PROTOCOL.md](experiments/e6/PROTOCOL.md), results in `experiments/e6/results/`. CLI: `--closure-tangent-mode kink|ratio|absolute`.
- **Auto generator join: `autoJoin` option, tangent default.** New `Params.autoJoin`: `'tangent'` (default) or `'legacy'` (the v1.0.0 construction). A document without an `autoJoin` key means `'legacy'`, so v1.0.0 documents keep regenerating with the same `contentDigest`. Description and limits: [docs/generator-auto-join.md](docs/generator-auto-join.md); evaluation E7 (protocol committed before the results in the local git history): [experiments/e7/PROTOCOL.md](experiments/e7/PROTOCOL.md), [experiments/e7/SUMMARY.md](experiments/e7/SUMMARY.md). The web UI exposes it as "Straight joins".
- **Default `height` 80 to 20.** Rationale and evaluation E8 (protocol committed before the results in the local git history): [experiments/e8/PROTOCOL.md](experiments/e8/PROTOCOL.md), [experiments/e8/SUMMARY.md](experiments/e8/SUMMARY.md). Experiment runners whose committed results predate this change pin the v1.0.0 values through `experiments/_v100-params.mjs` ([REPRODUCE.md](REPRODUCE.md)).

### Added

- **Scale-normalised curvature metrics** (`kappaHat = kappa * L / 2 pi`) next to the unchanged scale-dependent fields: [docs/metrics.md](docs/metrics.md).
- **Polyline input path.** `src/polyline.ts` builds a track from a closed polyline that TrackLab did not generate, with the CLI commands `validate-polyline` and `metrics-polyline`: [docs/external-generators.md](docs/external-generators.md). Study E5 applies the validator and metrics to a third-party generator: [experiments/e5/PROTOCOL.md](experiments/e5/PROTOCOL.md), [experiments/e5/ADDENDUM-01.md](experiments/e5/ADDENDUM-01.md) (Q2 re-run under validator v1.1), results in `experiments/e5/results/`.
- **JSON Schema** (draft 2020-12) for the exchange format: [schema/trackdocument-v1.schema.json](schema/trackdocument-v1.schema.json), checked by `tests/schema-json.test.ts`.
- **Strict mode.** `generateTrack(params, { strict: true })` throws `ParameterError` for an unknown key, a wrongly typed value or any value that `sanitize()` would change; the CLI applies the same check (see the README, "Library API" and "Limitations").
- **English web UI with a Korean toggle** (`?lang=ko`, persisted in `localStorage`); the build version is shown in the UI instead of a hard-coded string.
- **Reproduction guide:** [REPRODUCE.md](REPRODUCE.md), with the reproduce-check helper and its verification log ([experiments/REPRODUCE_CHECK.md](experiments/REPRODUCE_CHECK.md)).
- **Third-party notices:** [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md), including the fdlibm / FreeBSD msun notice.
- **CI:** an operating-system matrix (Ubuntu, Windows, macOS with Node 20, 22, 24) and a `determinism` job that checks the `contentDigest` goldens ([.github/workflows/ci.yml](.github/workflows/ci.yml), [tests/fixtures/ci-golden-digests.json](tests/fixtures/ci-golden-digests.json), [tests/fixtures/ci-golden-digests-v1.1.json](tests/fixtures/ci-golden-digests-v1.1.json)).

### Documentation and library text

- Library error and audit-reason texts (coins, vehicle, patterns) are in English.
- README rewritten for reviewers; the earlier Korean README and historical reports were kept in `docs/history/` at that time (removed from the tree after 1.1.0; they remain in the git history). The wording on digests states that they give integrity checking, not authentication or provenance.

### Compatibility

- Parameters with `autoJoin: 'legacy'` and `height: 80` set explicitly (the case set of E1) reproduce the v1.0.0 `contentDigest` (tested in `tests/autojoin.test.ts` against `experiments/e1/results/v1.0.0/node22.v100.json`). Calls that rely on the defaults produce different tracks than in 1.0.0, because the join default and the default height changed.
- The exchange format `schemaVersion` is unchanged (1).
- Release check of cross-engine agreement at this version (nine engine runs on one Linux x86_64 VM, 1000 cases, default and legacy join): protocol (committed before the results in the local git history) [experiments/e1/ADDENDUM-v1.1.0.md](experiments/e1/ADDENDUM-v1.1.0.md), results [experiments/e1/results/v1.1.0/SUMMARY.md](experiments/e1/results/v1.1.0/SUMMARY.md), deviations in [NOTES.md](experiments/e1/results/v1.1.0/NOTES.md).

## v1.0.0

Version set in commit `eb8598f`; evidence in [experiments/e1/ADDENDUM-v1.0.0.md](experiments/e1/ADDENDUM-v1.0.0.md) and [docs/test-run-1.0.0.txt](docs/test-run-1.0.0.txt).
