# Auto generator: the straight-to-arc join (`autoJoin`)

Scope: the defect of the v1.0.0 Auto generator at straight segments, the `autoJoin` option that fixes it, the compatibility guarantees, the pre-registered evaluation E7 and the limits. Evidence: `experiments/e7/` ([PROTOCOL.md](../experiments/e7/PROTOCOL.md), [SUMMARY.md](../experiments/e7/SUMMARY.md)), `tests/autojoin.test.ts`, `experiments/e6/results/e2-recheck/`.

## The defect

Auto builds a closed circuit from `curves` waypoints on a perturbed circle. Segment i runs from waypoint i to i + 1 with 60 samples (`STEPS`). `round(straight x curves)` randomly chosen segments are straight (linear interpolation of the two waypoints); the others are uniform Catmull-Rom curves. The Catmull-Rom tangent at a waypoint is `(next - previous) / 2`, which is not the direction of the neighbouring chord, so at every waypoint next to a straight the heading jumps. Validator v1.1 reports this as `LOCAL_KINK` / `CLOSURE_TANGENT`. Measured (curves 8, straight 0.3, seeds 0..299, [results/exploratory.txt](../experiments/e7/results/exploratory.txt)): the largest turn at a join vertex of a track has median 38.0 degrees (min 23.1, max 90.4). With the v1.0.0 construction 0 of 200 default-parameter seeds (0..199) pass the validator, and the E2 recheck had Auto at 29.75% ok overall and about 0% for straight > 0.

## The construction (`autoJoin: 'tangent'`)

Waypoints, RNG stream, straight selection, 60 samples per segment and the elevation profile are unchanged (`src/core.ts`: `joinTangents`, `tangentSegment`). Every segment is a cubic Hermite curve; only the tangents change.

- A waypoint with no adjacent straight keeps the Catmull-Rom tangent. A curve between two such waypoints is evaluated with the original `catmull()`, so with `straight = 0` both joins produce bit-identical points.
- A waypoint next to exactly one straight takes that straight's chord direction. The straight is then tangent to the arc: it stays an exact straight line over its whole length and the heading is continuous.
- A waypoint between two straights takes the bisector of the two chords. Each of the two straights then spends `JOIN_BLEND = 0.35` of its samples (21 of 60) at that end on a Hermite blend from the chord direction to the bisector, and the rest remains straight.
- Every re-aimed tangent has `JOIN_GAIN = 1.75` times the Catmull-Rom magnitude (a larger value gives a gentler bend near the join). `JOIN_BLEND` and `JOIN_GAIN` were chosen on exploratory seeds before the pre-registration (see the protocol) and are not parameters of the document.

Why this construction: it is the least invasive one that is correct everywhere. Making only the straight tangent to the arcs is impossible when two straights are adjacent (their chords differ), and re-aiming the arcs alone leaves that case with a corner; the bisector blend handles it. No sample is added or removed, so vertex indices, `straightSegments`, coin/prop/obstacle indexing and the document layout keep their meaning.

### Straight length: requested vs realised

`straightSegments` (and the number of straight segments) is identical for both joins. The realised straight fraction (planar centreline length of edges whose end vertices both turn less than 0.01 degrees, divided by the length) is lower under the tangent join, because a straight next to another straight loses part of its length to the blend. HELD-OUT, straight > 0 (E7): requested `straight` median 0.45, quantised `round(straight x curves) / curves` median 0.467, realised legacy 0.452, realised tangent 0.302, ratio tangent/legacy median 0.617 (min 0.43, max 1.00). Track length changes by +3.5% (median; range +0.3% to +7.9%). At the default (curves 6, straight 0.25, two straight segments) the straights are tangent to their arcs; the ratio is below 1 only when the two straights are adjacent. Total absolute turning rises from 360 to a median of 372 degrees (max 433) on the default tracks: shallow S-bends next to a straight.

## Option, defaults and compatibility

| item | behaviour |
|---|---|
| `Params.autoJoin` | `'legacy' | 'tangent'`; `DEFAULTS.autoJoin = 'tangent'`, so `generateTrack({})`, the UI and the CLI produce the valid track |
| `sanitize` | an unknown value falls back to the default; when a corner pattern is spliced (`cornerPattern != 'auto'` and `cornerCount > 0`) the option is inert and canonicalised to `'legacy'` (pattern mode re-smooths the base circuit), so pattern-mode output and documents are v1.0.0-identical under any default |
| document | `schema` stays `tracklab.track`, `schemaVersion` stays 1. `params.autoJoin` is optional. Absent means legacy; only `"tangent"` is ever stored. A stored `"legacy"`, any other value, or `"tangent"` where it is inert is rejected with a path-style error, so each track has one canonical document. A legacy track is exported without the key: its canonical JSON, digest and contentDigest are byte-identical to v1.0.0 |
| `importTrack` | `verify: 'regenerate'` regenerates an absent-key document with the legacy join (not the default) and returns `params.autoJoin = 'legacy'` explicitly |
| older readers | a v1.0.0 reader rejects a tangent document (`unknown field`) instead of misreading it; no schemaVersion bump was needed because the change is additive and fails loudly |
| `generator.version` | not changed (`VERSION` stays 1.0.0; release versioning is outside this change) |

A raw parameter object passed to `generateTrack` is merged with `DEFAULTS` like before, so an object without `autoJoin` now means `'tangent'`. A v1.0.0 *document* means legacy. Anyone who regenerates v1.0.0 results from parameters (for example the scripts of experiments e2 and e6, which call `generateTrack` without `autoJoin`) must pass `autoJoin: 'legacy'` (CLI: `--set autoJoin=legacy`).

### Evidence

- `tests/autojoin.test.ts` reads the committed E1 v1.0.0 run (`experiments/e1/results/v1.0.0/node22.v100.json`, 1000 cases = 200 seeds x 5 configurations, pinned by the E1 seed-list SHA-256). For each case the legacy export has the stored `contentDigest` and no `autoJoin` key, and `importTrack(doc, { verify: 'regenerate' })` accepts it: 1000 of 1000. The 600 pattern cases also match through the default path (inert option).
- The 8 CI goldens: `tests/fixtures/ci-golden-digests.json` is unchanged and passes with `node scripts/ci-digests.mjs --check tests/fixtures/ci-golden-digests.json` (the script's default is now explicitly the legacy join); the default join has its own `tests/fixtures/ci-golden-digests-v1.1.json` (`--auto-join tangent`; the four hairpin digests equal the legacy ones, the four Auto digests differ). The CI workflow checks both through the CLI (`--set autoJoin=legacy` for the first) and through the modules under Node, Deno and Bun.
- `experiments/e7/results/repro`: the legacy join reproduces the ok and error-code columns of the committed E2 recheck (v1.1) for all 12,150 Auto cases of SEEDS[0..49], 0 mismatches.
- Existing tests that relied on the legacy default (v0.5 golden hashes, a CLI test that needed an invalid default track, the validator test that shows the defect) now set `autoJoin: 'legacy'`, and the validator test also asserts that the tangent join is ok; the CLI turning test asserts `>= 360` instead of `~ 360`.

## E7 results

Pre-registered (protocol committed alone), DEV then freeze then one HELD-OUT run, every evaluation executed twice with identical SHA-256. Grid: Auto part of E2 (243 parameter sets) x 30 HELD-OUT seeds, validator v1.1 defaults.

| | legacy | tangent |
|---|---|---|
| ok, whole grid | 29.55% | 82.92% |
| ok, straight = 0 | 88.64% | 88.64% (identical tracks) |
| ok, straight > 0 | 0.00% (0/4860) | 80.06% [78.91, 81.16] |
| default parameters | not run | 30/30 |

All ten predictions held on DEV and HELD-OUT (see SUMMARY.md for each number). On the auditor's measurement (default parameters, seeds 0..199, exploratory) the tangent join gives 200/200 ok against 0/200.

## Limitations

- About 20% of the straight > 0 cells of the E2 grid still fail, by road-edge fold or self-intersection, not by kinks: width 80 gives 45.6% ok and curves 3 gives 66.1%. The straight = 0 baseline is also 88.6% over the grid. The default parameters are well inside the valid region; extreme width relative to the circuit is not repaired by this change.
- Straights adjacent to another straight lose length to the blend (realised straight fraction about 62% of the legacy one, median); the request is met in segment count, not in length fraction.
- The default result has 30 seeds: 30/30 has a Wilson lower bound of 88.6%. The 200-seed result (0..199) is exploratory.
- The browser UI carries `autoJoin`: the "Straight joins" control feeds it into generation, and importing a document sets it from the document (an absent key means legacy). `tests/browser/io.spec.mjs` imports `tests/fixtures/v1.0.0-auto-seed42.json` and checks that re-exporting keeps the digest and writes no `autoJoin` key. `importTrack` and the CLI were already correct.
- One machine, Node 22 for E7; cross-engine agreement of the new join is covered by the CI golden file, not by an E1-style multi-engine run.
- `JOIN_BLEND` and `JOIN_GAIN` were tuned on exploratory seeds (not on DEV or HELD-OUT); other values may do better.
