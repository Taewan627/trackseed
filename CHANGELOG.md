# Changelog

## v1.1.0 (unreleased; no release date and no tag yet)

Changes since the commit that set the version to 1.0.0 (`eb8598f`). Every item points to the document or experiment that describes and evidences it. The document `digest` covers the `generator` stamp, so documents written by 1.1.0 have a different `digest` than 1.0.0 documents with identical content; `contentDigest` excludes the generator and is unchanged for identical content (see "Compatibility").

### Changed defaults (behaviour changes)

- **Validator v1.1: local-kink rule.** `validateTrack` runs an eighth check, `local-kink` (error severity), and the seam check `CLOSURE_TANGENT` uses the same rule (`closureTangentMode: 'kink'`, now the default; `'ratio'` and `'absolute'` remain selectable and return the seven checks of v1.0.0). Rule: [docs/validator.md](docs/validator.md); pre-registered evaluation E6: [experiments/e6/PROTOCOL.md](experiments/e6/PROTOCOL.md), results in `experiments/e6/results/`. CLI: `--closure-tangent-mode kink|ratio|absolute`.
- **Auto generator join: `autoJoin` option, tangent default.** New `Params.autoJoin`: `'tangent'` (default) or `'legacy'` (the v1.0.0 construction). A document without an `autoJoin` key means `'legacy'`, so v1.0.0 documents keep regenerating with the same `contentDigest`. Description and limits: [docs/generator-auto-join.md](docs/generator-auto-join.md); pre-registered evaluation E7: [experiments/e7/PROTOCOL.md](experiments/e7/PROTOCOL.md), [experiments/e7/SUMMARY.md](experiments/e7/SUMMARY.md). The web UI exposes it as "Straight joins".
- **Default `height` 80 to 20.** Rationale and pre-registered evaluation E8: [experiments/e8/PROTOCOL.md](experiments/e8/PROTOCOL.md), [experiments/e8/SUMMARY.md](experiments/e8/SUMMARY.md). Experiment runners whose committed results predate this change pin the v1.0.0 values through `experiments/_v100-params.mjs` ([REPRODUCE.md](REPRODUCE.md)).

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
- README rewritten for reviewers; the earlier Korean README and historical reports are in [docs/history/](docs/history/). The wording on digests states that they give integrity checking, not authentication or provenance.

### Compatibility

- Parameters with `autoJoin: 'legacy'` and `height: 80` set explicitly (the case set of E1) reproduce the v1.0.0 `contentDigest` (tested in `tests/autojoin.test.ts` against `experiments/e1/results/v1.0.0/node22.v100.json`). Calls that rely on the defaults produce different tracks than in 1.0.0, because the join default and the default height changed.
- The exchange format `schemaVersion` is unchanged (1).
- A release check of cross-engine agreement at this version is pre-registered in [experiments/e1/ADDENDUM-v1.1.0.md](experiments/e1/ADDENDUM-v1.1.0.md).

## v1.0.0

Version set in commit `eb8598f`; evidence in [experiments/e1/ADDENDUM-v1.0.0.md](experiments/e1/ADDENDUM-v1.0.0.md) and [docs/test-run-1.0.0.txt](docs/test-run-1.0.0.txt).
