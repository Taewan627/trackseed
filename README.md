# TrackLab

TrackLab is a procedural racing-track generator written in TypeScript. From a small parameter set (number of Catmull-Rom spans, straight-span ratio, road width, scale, elevation amplitude, scenery, seed, and an optional corner pattern: 90-degree, hairpin or S-curve) it produces a closed, elevated track with road edges, scenery, obstacles and coins. The same parameters give the same document, which is serialised in a self-describing, hash-protected JSON exchange format. The package contains a browser front end (Three.js, with a kinematic driving preview), a headless validator and metric library, and a command-line interface for batch generation. It is intended for experiments on procedural level generation that need reproducible tracks, automatic validity checks and interpretable geometric metrics.

The web front end is in English by default, with a Korean toggle (or `?lang=ko` in the URL); the library, CLI and this document are English. The earlier Korean README (v0.4) is kept in [docs/history/README_v0.4_ko.md](docs/history/README_v0.4_ko.md), together with the historical development reports in [docs/history/](docs/history/).

## Features

- Seeded generation (`generateTrack`) with 12 parameters, ranges enforced; a corner-pattern mode that inserts 0 to 3 right-angle, hairpin or S-curve corners and verifies them geometrically (`MAX_PATTERN_ATTEMPTS` = 6 attempts at most; on failure the generator throws, it does not substitute a different track).
- Straight-join option `Params.autoJoin`: `'tangent'` (default since v1.1) or `'legacy'` (the v1.0.0 construction). A v1.0.0 document has no `autoJoin` key and means `'legacy'`; see [docs/generator-auto-join.md](docs/generator-auto-join.md).
- Deterministic mathematics: the generation path uses `src/detmath.ts` instead of `Math.sin/cos/atan2/hypot/exp`, so results do not depend on the engine's transcendental functions (see "Determinism").
- Exchange format v1 (`exportTrack`, `serializeTrack`, `parseTrackDocument`, `importTrack`) with canonical JSON and two SHA-256 digests; import can verify by regeneration.
- Validator (`validateTrack`): eight checks in the default mode (structure, finiteness, closure, local kink, planar self-intersection, ribbon fold, turning radius, slope), reported, never repaired; the rules and their evidence are in [docs/validator.md](docs/validator.md).
- Metrics (`computeMetrics`): length, curvature statistics, curvature entropy, turn count, elevation and slope statistics, total turning.
- CLI (`generate`, `batch`, `validate`, `metrics`, `validate-polyline`, `metrics-polyline`) with deterministic JSONL summaries; the polyline commands check a closed x/z polyline (JSON or CSV) that TrackLab did not generate.
- Web UI: 3D view, minimap, drive/overview cameras, coins, JSON export and import, validation panel, and a "Straight joins" selector that feeds `autoJoin` (English by default, Korean with the toggle).

## Install

Node.js 20.19 or newer (`engines` in `package.json`; CI runs Node 20, 22 and 24 on Ubuntu, Windows and macOS).

```bash
git clone <repository-url> tracklab && cd tracklab
npm ci
```

## Quick start

### Web UI

```bash
npm run dev        # Vite dev server, http://127.0.0.1:5173
npm run build      # type check (tsc --noEmit) and static bundle in dist/
npm run preview    # serve dist/ at http://127.0.0.1:4173
```

Slider, number and seed changes regenerate the track 150 ms after the last input. Click the 3D view to drive (arrow keys, Space brake, C camera, R new seed). Export JSON and Import JSON are in the panel; an import is accepted only if the document passes `importTrack(doc, { verify: 'regenerate' })` and the regenerated track has the same `contentDigest`. Otherwise the previous track is kept and the error is shown. The panel also shows the validator result after every generation; it only reports.

### CLI

```bash
npm run build:cli                      # tsc -p tsconfig.cli.json -> cli-dist/ (git-ignored)
node cli-dist/cli.js --help
node cli-dist/cli.js generate --seed 7 --set curves=8 --set cornerPattern=hairpin --out track.json
node cli-dist/cli.js validate track.json --verify regenerate
node cli-dist/cli.js metrics track.json
node cli-dist/cli.js batch --grid examples/grid-small.json --out out/ --jsonl out/summary.jsonl --no-timing
```

Real output of exactly these commands (trimmed; produced by `bash scripts/cli-example.sh`, full file [docs/cli-example-output.txt](docs/cli-example-output.txt)):

```text
$ tracklab validate track.json --verify regenerate
{
  "file": "track.json",
  "verify": "regenerate",
  "digest": "05a1389a3ad57baa5dac5dc9c552ae171e0b38cc3825f0dcf2b460710b2a6e91",
  "ok": true,
  "violations": [
    {
      "code": "MAX_SLOPE",
      "severity": "warning",
      "index": 0,
      "value": 0.6901827792120803,
      "limit": 0.3,
      "message": "slope 0.6901827792120803 of segment 0 exceeds 0.3"
    },
  ... (violations list trimmed)
checks (id: passed, failures): structure: true, 0 | finite: true, 0 | closure: true, 0 | local-kink: true, 0 | self-intersection: true, 0 | edge-fold: true, 0 | min-turn-radius: true, 0 | max-slope: false, 154

$ tracklab metrics track.json
{
  "sampleCount": 325,
  "length": 2747.0916760838677,
  "boundingBoxArea": 613608.2703178154,
  "straightLengthFraction": 0.051442653460416966,
  ...

$ tracklab batch --grid examples/grid-small.json --out out/ --jsonl out/summary.jsonl --no-timing
tracklab batch: 48 cases, 48 generated, 0 generation failures, 42 ok
```

CLI reference:

| Command | Behaviour | Exit codes |
| --- | --- | --- |
| `generate [--seed N] [--params file.json \| --set key=value ...] [--out file.json]` | Canonical `TrackDocumentV1` to `--out` or stdout. Unknown keys, values of the wrong type, out-of-range values, non-integer values for integer parameters and unknown `scene` or `cornerPattern` names are rejected, not clamped or rounded (`batch` grids are checked the same way). | 0 ok, 1 generator rejected the parameters, 2 usage error or invalid parameters |
| `batch --grid grid.json --out dir/ [--jsonl summary.jsonl] [--no-timing] [--closure-tangent-mode kink\|ratio\|absolute] [--seam-ratio N]` | One document per case plus one JSONL summary line per case. | 0 completed, 2 invalid grid or usage |
| `validate file.json [--verify digest\|regenerate] [--limit key=value ...] [--strict] [--closure-tangent-mode kink\|ratio\|absolute] [--seam-ratio N]` | Parses the document (schema, both digests, optional regeneration), runs the validator, prints the report as JSON. | 0 no error-severity violation, 1 at least one (`--strict`: warnings too), 2 invalid document or options |
| `metrics file.json [--samples]` | Metrics as JSON (`--samples` adds the per-sample curvature array). | 0, or 2 invalid document |
| `validate-polyline file.json\|file.csv --width W [--resample-spacing S] [--strict] [--limit key=value ...] [--closure-tangent-mode kink\|ratio\|absolute] [--seam-ratio N]` | Builds a track from a closed polyline that TrackLab did not generate (`.csv`: one `x,z` or `x,z,y` per line, optional header; otherwise JSON `{\"points\": [...]}` or a bare array) and runs the validator. The report has the form of `validate` plus the input summary. Nothing is repaired; `--resample-spacing` is off unless given. | 0 no error-severity violation, 1 at least one (`--strict`: warnings too), 2 unreadable or invalid input or options |
| `metrics-polyline file.json\|file.csv --width W [--resample-spacing S] [--samples]` | Metrics of such a polyline, with the definitions of `metrics`. `--width` is required for symmetry with `validate-polyline` and does not change the metrics. | 0, or 2 unreadable or invalid input |

`--limit key=value` overrides a numeric validator limit (see "Validator checks"); `--seam-ratio N` is the same as `--limit seamRatio=N` (giving both is an error) and applies only to `--closure-tangent-mode ratio`: without it, as with the default `kink`, the option is rejected with exit 2 instead of being ignored. `validate-polyline` takes the same validator options as `validate`. Grid file: `seeds` is `{ "from": a, "to": b }` (inclusive) or an array; array-valued entries of `params` are swept (Cartesian product, parameter names sorted alphabetically, first name slowest, seeds innermost), scalars are fixed. `examples/grid-small.json` expands to 48 cases. Case `k` is written to `case-<k, 4+ digits>-seed<seed>.json`. A case whose generation throws is recorded with `"generated": false` and the error message; the batch continues. Deterministic JSONL fields: `case`, `file`, `seed`, `params`, `generated`, `digest`, `ok`, `violationCodes`, `checkFailures`, `metrics` (without the per-sample array), `error`. Wall-clock data appears only under `timing.generation_ms`; `--no-timing` omits it so two runs give byte-identical JSONL.

## Library API

`npm run build:cli` compiles the modules reachable from the CLI to ES modules in `cli-dist/` (`core.js`, `validate.js`, `metrics.js`, `schema.js`, ...); TypeScript users can import `src/*.ts` directly. The package is not published to npm (`private: true`).

```js
import { generateTrack } from './cli-dist/core.js';
import { validateTrack } from './cli-dist/validate.js';
import { computeMetrics } from './cli-dist/metrics.js';
import { serializeTrack, parseTrackDocument, importTrack } from './cli-dist/schema.js';

const track = generateTrack({ seed: 7, cornerPattern: 'hairpin', curves: 8 });  // throws PatternGenerationError if a pattern cannot be fitted
const result = validateTrack(track, { closureTangentMode: 'ratio' });             // { ok, violations, checks }
const metrics = computeMetrics(track);
const json = serializeTrack(track);                                               // canonical JSON text
const doc = parseTrackDocument(json);                                             // structure + digest + contentDigest
const back = importTrack(doc, { verify: 'regenerate' });                          // + regenerated content must match
```

| Function | Purpose |
| --- | --- |
| `generateTrack(params?, { strict? })` | Sanitises the (partial) parameters and returns a `Track`: `params`, `points`, `normals`, `roadEdges` (two polylines), `straightSegments`, `length`, `bounds`, `props`, `obstacles`, `patternReport`. By default out-of-range values are clamped, fractions rounded and unknown keys ignored, silently. With `{ strict: true }` it throws `ParameterError` instead for an unknown key, a value of the wrong type, or any value that `sanitize()` would change; this is the same check (`strictParams` in `src/core.ts`) that the CLI applies. |
| `validateTrack(track, options?)` | Pure validator, works on a `Track` or an imported document. Options and defaults: `DEFAULT_VALIDATE_OPTIONS`. |
| `computeMetrics(track, options?)` | Geometric metrics of the centerline. |
| `exportTrack(track)` / `serializeTrack(track)` | `TrackDocumentV1` object / its canonical JSON string. |
| `parseTrackDocument(jsonOrValue)` | Validates structure and both digests; throws `TrackDocumentError` with a path such as `$.geometry.points[7].x`. |
| `importTrack(doc, { verify })` | `'digest'` (default) or `'regenerate'`; returns the track data. |

## Exchange format v1

`exportTrack` writes a `tracklab.track` document; `serializeTrack` writes it as canonical JSON (keys sorted, no whitespace, finite numbers only, `-0` written as `0`).

| Field | Content |
| --- | --- |
| `schema`, `schemaVersion` | `"tracklab.track"`, `1` (the format is unreleased before 1.0.0, so adding `contentDigest` kept version 1) |
| `generator` | `{ name: "tracklab", version }` (same string as `src/version.ts` and `package.json`) |
| `params` | sanitised `Params`; out-of-range or non-canonical values are rejected |
| `geometry` | `points`, `normals`, `roadEdges`, `straightSegments`, `length`, `bounds` |
| `props`, `obstacles`, `coins` | scenery, obstacles, 10 coins |
| `patternReport` | corner-pattern outcome and geometry audit |
| `integrity.digest` | SHA-256 of the canonical JSON of the whole document without `integrity` (so it covers `generator`) |
| `integrity.contentDigest` | SHA-256 of the canonical JSON of the document without `integrity` and without `generator` |

`digest` detects any change of the file, including the generator stamp. `contentDigest` identifies the content independently of the build that wrote it: the same parameters give the same `contentDigest` on builds with different version strings (experiment E1 at 1.0.0 compares 1.0.0 with 0.5.0 on this). The SHA-256 is a pure TypeScript implementation, identical in every engine. `parseTrackDocument` checks both. `importTrack(doc, { verify: 'regenerate' })` additionally runs `generateTrack(doc.params)` and requires the same `contentDigest`; this shows the parameters determine the stored content on the running build and also catches forgeries whose digests were recomputed. `'digest'` mode catches accidental damage and simple edits but not a forgery with recomputed digests.

JSON Schema. [schema/trackdocument-v1.schema.json](schema/trackdocument-v1.schema.json) (draft 2020-12) describes the structure of a v1 document so that other tools can check a file without this library: required and unknown keys, value types, the ranges and enums of `params` (the ranges equal `LIMITS`; `params.autoJoin`, when present, is `"tangent"` and is forbidden where a spliced corner pattern makes it inert), the road-edge pair, and the digest format. It cannot express what `importTrack` checks beyond structure: that the two SHA-256 digests match the content, that `params` is in canonical sanitised form, that `normals` and `roadEdges` have as many entries as `points` and `straightSegments` has `params.curves` entries, and (with `verify: 'regenerate'`) that the parameters reproduce the content. A document that passes the schema is therefore not necessarily importable. `tests/schema-json.test.ts` validates the CI golden documents, the committed v1.0.0 document and further generated documents with a small dependency-free validator, and checks that broken documents are rejected by both the schema and `importTrack`, and that the cases above are accepted by the schema and rejected by `importTrack`.

## Validator checks

`validateTrack(track, options?) => { ok, violations, checks }` is pure. `ok` is false iff a check of severity `error` failed or was skipped. Each entry of `checks` has `passed`, `skipped`, `checked`, `failures` (complete count) and `stats`; `violations` lists at most `maxViolationsPerCheck` (20) entries per code. The validator does not repair anything and also runs on Auto-mode tracks, which have no geometry audit at generation time.

| Check (`checks[].id`) | Codes | Severity | Definition and default |
| --- | --- | --- | --- |
| `structure` | `STRUCTURE` | error | at least 4 points; both `roadEdges` have one entry per point |
| `finite` | `NON_FINITE` | error | all coordinates and `params.width` finite; on failure later checks are `skipped` |
| `closure` | `CLOSURE_POSITION`, `CLOSURE_EDGE`, `CLOSURE_HEIGHT`, `CLOSURE_TANGENT` | error | last point equals first within `closureTolerance` = 1e-6 (3D; each edge too); height gap <= `heightTolerance` = 1e-6; `CLOSURE_TANGENT`: see below |
| `local-kink` | `LOCAL_KINK` | error | mode `kink` only (the default since validator v1.1; not run in the legacy modes). The heading change theta_i at each vertex of the closed loop fails iff theta_i > max(`kinkFloorDegrees` = 12, `kinkRatio` = 3 x the largest theta_j with j = i±2 .. i±3) (outlier rule, window 3, maximum); the immediate neighbours i±1 are not in the reference. The seam (vertex 0) is reported as `CLOSURE_TANGENT`, the other vertices as `LOCAL_KINK` |
| `self-intersection` | `SELF_INTERSECTION_CENTERLINE`, `SELF_INTERSECTION_EDGE`, `EDGE_EDGE_INTERSECTION` | error | planar (x/z) segment intersection (spatial hash) of the centerline, of each edge with itself and of the two edges with each other; segments sharing a vertex are skipped, touching counts. A grade-separated crossing is reported too |
| `edge-fold` | `EDGE_FOLD` | error | both ribbon triangles of every segment need x/z cross product > `foldEpsilon` = 1e-5 |
| `min-turn-radius` | `MIN_TURN_RADIUS` | warning | local radius 1/\|kappa\| < `minRadiusToHalfWidth` (1) x width/2 |
| `max-slope` | `MAX_SLOPE` | warning | \|dy\| / planar run of a segment > `maxSlope` = 0.3 (about 16.7 degrees). The default is a convention of this tool, not a standard |

`CLOSURE_TANGENT` (the seam) has three modes (`closureTangentMode`):

- `'kink'` (default, validator v1.1): the seam is tested with the local-kink rule of the table above, applied to vertex 0 with the same neighbourhood; a failure is reported as `CLOSURE_TANGENT`. The rule and its evidence are in [docs/validator.md](docs/validator.md).
- `'ratio'` (legacy, v0.5.1): let theta0 be the heading change in degrees (x/z) between the segment entering and the segment leaving the seam, and theta_i the per-vertex heading changes at the 3 vertices on each side of the seam. The check fails iff theta0 > max(`tangentToleranceDegrees` = 5, `seamRatio` = 2 x max theta_i). A seam is flagged when it turns markedly more than its own neighbourhood; this replaced an absolute limit that conflated sampling resolution on tight curves with a discontinuity (AMENDMENT-01, [experiments/AMENDMENT-01.md](experiments/AMENDMENT-01.md)). `stats` reports `tangentDegrees`, `neighbourhoodMaxDegrees` and `tangentRatio`.
- `'absolute'` (legacy, v0.5.0): the earlier rule, fail iff theta0 > `tangentToleranceDegrees`.

The legacy modes return the seven checks of v1.0.0 (no `local-kink`); the default returns eight.

On the CLI: `--closure-tangent-mode kink|ratio|absolute`; `--seam-ratio N` (only with `ratio`) or `--limit key=value` for the numeric options. `MIN_TURN_RADIUS` and `MAX_SLOPE` are warnings and do not affect `ok`; `--strict` turns them into exit code 1.

## Metric definitions

`computeMetrics` takes the closed centerline (last point repeats the first). Curvature kappa at sample `i` is the discrete Menger curvature of the x/z projection from neighbours `a`, `b`, `c`: `kappa = 2 cross(b - a, c - b) / (|b - a| |c - b| |c - a|)`; its sign is that of the x/z cross product. No metric rates fun or difficulty.

| Field | Definition |
| --- | --- |
| `sampleCount` | `points.length - 1` |
| `length` | closed 3D arc length |
| `boundingBoxArea` | (max x - min x)(max z - min z) of the centerline, without road margin |
| `straightLengthFraction` | 3D arc length of segments whose two end samples have \|kappa\| < `straightKappa` = 5e-4 (radius > 2000), divided by `length`. Unrelated to `params.straight`, which counts spline spans |
| `meanAbsCurvature`, `maxAbsCurvature`, `p95AbsCurvature` | mean, maximum, 95th percentile (nearest rank) of \|kappa\| |
| `curvatureEntropyBits` | Shannon entropy in bits of the samples over 8 fixed \|kappa\| bins with lower edges 0, 5e-4, 1e-3, 2e-3, 4e-3, 8e-3, 1.6e-2, 3.2e-2 (last open); `curvatureHistogram` holds the counts. Inspired by the curvature-entropy idea of Loiacono, Cardamone and Lanzi (IEEE TCIAIG 3(3), 2011); bins and the Menger estimate are this tool's choices, so values are not comparable with that paper |
| `turnCount` | maximal runs of consecutive samples with the same sign of kappa and \|kappa\| > `turnKappa` = 4e-3 (radius < 250), merged across the seam; an S-curve counts 2 |
| `elevationRange` | max y - min y |
| `maxAbsSlope`, `meanAbsSlope` | max over segments of \|dy\| / planar run; sum \|dy\| / sum planar run |
| `totalTurningDegrees` | sum over vertices of the absolute x/z heading change (360 for a simple loop) |
| `curvature` | signed kappa per sample (CLI: only with `--samples`) |

Parameters and ranges of `generateTrack`:

| Parameter | Range | Default |
| --- | --- | --- |
| `curves` (Catmull-Rom spans) | 3 to 10 | 6 |
| `straight` (share of spans that are straight, by count) | 0 to 0.6 | 0.25 |
| `width` (full road width) | 20 to 80 | 40 |
| `size` | 1 to 3 | 2 |
| `height` (elevation amplitude) | 0 to 200 | 20 (80 before 1.1; see the slope note under "Limitations") |
| `obstacles` | 0 to 8 | 3 |
| `density` (scenery placement attempts = 8 x density) | 0 to 20 | 10 |
| `scene` | nature, city, mixed | mixed |
| `seed` | integer 0 to 2147483647 | 42 |
| `cornerPattern` | auto, right-angle, hairpin, s-curve | auto |
| `cornerCount` | 0 to 3 | 1 |
| `cornerStrength` | 20 to 100 | 60 |

Ranges come from `LIMITS` in `src/core.ts`. Every numeric parameter except `straight` is rounded to the nearest integer by `sanitize()`, so `height` takes whole values only. `straight` is not rounded and takes any value from 0 to 0.6. The third element of each `LIMITS` entry is the increment of the browser UI sliders (0.05 for `straight`, 5 for `height`, 1 for the other sliders; `seed` has no slider). Only the browser's slider controls read it; `generateTrack()`, the CLI and the validator never snap a value to it. `generateTrack()` and the browser UI pass values through `sanitize()`, which clamps them to the range and rounds them silently. The CLI does not: it rejects a value that `sanitize()` would change (see the `generate` row in the CLI table), and so does `generateTrack(params, { strict: true })`, which uses the same function. Note that the "grid" the strict check enforces is the one `sanitize()` applies (whole numbers for every parameter except `straight`), not the slider increment in the third `LIMITS` element: `height` 82 is accepted, 20.5 is rejected.

## Determinism

Design. The files `core.ts`, `patterns.ts`, `coins.ts`, `detmath.ts`, `validate.ts`, `metrics.ts`, `schema.ts` and `sha256.ts` (the generation path, the validator, the metrics and the document hashing) use only `+ - * /`, the `%` operator and integer bitwise operators, the `Math` members that ECMAScript specifies exactly (`abs`, `min`, `max`, `floor`, `ceil`, `round`, `sign`, `trunc`, `fround`, `imul`, and the constant `PI`), and `Math.sqrt`. `src/detmath.ts` implements sin, cos, atan, atan2, hypot and exp from these operations. A grep over the code lines (comment lines excluded) finds no call to `Math.sin`, `cos`, `tan`, `atan`, `atan2`, `exp`, `log`, `pow`, `hypot` or `cbrt`, and no `**` operator. IEEE-754 basic operations are required by ECMAScript. Correctly rounded `Math.sqrt` is an assumption that the specification does not state. ECMAScript does not require the other transcendental `Math` functions to agree across engines, which is why they are avoided. The PRNG is an integer generator. Hashing uses a pure TypeScript SHA-256, not an engine facility. The sin, cos, atan and exp routines follow fdlibm / FreeBSD msun algorithms and coefficients; the notices are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

Evidence (experiment E1, protocol [experiments/e1/PROTOCOL.md](experiments/e1/PROTOCOL.md), v1.0.0 re-run [experiments/e1/ADDENDUM-v1.0.0.md](experiments/e1/ADDENDUM-v1.0.0.md), results [experiments/e1/results/v1.0.0/SUMMARY.md](experiments/e1/results/v1.0.0/SUMMARY.md)): 1000 fixed cases (200 seeds x 5 parameter configurations including corner patterns and an extreme configuration) were generated and hashed in 8 runs: Node 22 (reference), Node 22 again, Node 20, Node 24, Deno, Bun (JavaScriptCore), headless Chrome and Firefox (SpiderMonkey). At version 1.0.0 all 8 runs agree with the reference in 1000 of 1000 cases for both `digest` and `contentDigest`. A bundle of the 0.5.0 tree gives the same `contentDigest` as 1.0.0 in 1000 of 1000 cases on every run, while the whole-document `digest` differs in 1000 of 1000 (the generator stamp differs). As a control, a legacy v0.4 build that calls `Math.sin/cos/atan2/hypot` directly was compared in the original E1 ([experiments/e1/results/E1_SUMMARY.md](experiments/e1/results/E1_SUMMARY.md)): its document hashes differ from Node 22 in 513 cases on Node 24 and in 1000 cases on Deno, Bun, Chrome and Firefox, and agree on Node 20. Its discrete outcomes (point counts, pattern insertion, validity codes) did not differ in any of the 1000 cases on any engine ([experiments/e1b/results/SUMMARY.md](experiments/e1b/results/SUMMARY.md)); the differences were in the last bits of continuous values (largest relative difference of `track.length` between engines 2.34e-15).

Measured scope. Engines and versions: Node 20.20.2, 22.23.4, 24.22.2, Deno 2.9.6, Bun 1.4.4, Chrome 153.0.8010.12, Firefox 157.0. One Linux x86_64 machine (a KVM virtual machine, see [experiments/e2/results/environment.txt](experiments/e2/results/environment.txt)). Document generation only: the vehicle runtime in `src/vehicle.ts` still uses `Math.*` and is outside the guarantee. 1000 cases per subject sample the parameter space; they are not a proof. Other CPU architectures and engine versions were not tested. Operating systems other than this Linux machine were not part of E1; the CI `determinism` job (see Testing) compares four seeds with committed digests on Ubuntu, macOS and Windows, a smaller check than E1.

## Reproducing the experiments

All experiments are committed with a pre-registered protocol (written and committed before any result), harness, raw or compressed results and analysis. Common requirements: Linux, Node 22 as `node`, network access for `npx -y` (esbuild 0.25, `node@20`, `node@24`, `deno`, `bun@1`), Python 3 with numpy, pandas and matplotlib (used: numpy 2.5.3, pandas 3.0.5, matplotlib 3.11.2), `/usr/bin/google-chrome` and a Playwright Firefox (`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers` in our environment, `npx -y playwright@1.64.1 install firefox` otherwise) for the browser engines. Raw per-engine outputs and bundles go to git-ignored `out/` and `build/` directories. Runtimes below are wall-clock times measured on the 2-vCPU machine named above; where a time was not recorded it is marked so.

| Experiment | What it measures | Command (from the repository root) | Runtime |
| --- | --- | --- | --- |
| E1 at 1.0.0 | cross-engine agreement of `digest` and `contentDigest`, 0.5.0 vs 1.0.0 content comparison | `cd experiments/e1/v1.0.0 && PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers ./run-all.sh` (rewrites `experiments/e1/results/v1.0.0/`) | 6 min 34 s |
| E1 (original, v0.5.0 and legacy v0.4) | same, plus the legacy control | check out commit `145277e`, then `cd experiments/e1 && ./run-all.sh` (the harness bundles the current `src/`, so run it at that commit) | not recorded; same structure as the line above |
| E1b | do legacy float differences change discrete outcomes | `cd experiments/amendment-01/e1b && ./run-all.sh` (amended validator; the S3b form is `experiments/e1b/run-all.sh` at its commit) | not recorded |
| E2 validity (amended validator) | validity of 48,600 tracks (4 modes x 12,150) | `cd experiments/amendment-01 && ./build.sh && node build/run-e2.mjs validity /tmp/validity.csv.gz`, expected SHA-256 `66a6af63...` of `experiments/e2/results/amendment-01/validity.csv.gz` | 256 s (4 min 16 s) |
| E2 validity (original 0.5.0 rule) | reproduces the S3b CSV | same with `CLOSURE_TANGENT_MODE=absolute`, expected SHA-256 `812f416c...` of `experiments/e2/results/validity.csv.gz` | same as above |
| E2 timing | generation and validation time | `cd experiments/e2 && ./build.sh && node build/run.mjs timing /tmp/v.csv.gz /tmp/timing.csv.gz` (values are machine dependent) | 242.7 s |
| E3 | expressive range per corner-pattern mode | `python3 experiments/e3/analyze.py` (primary, reads `e2/results/validity.csv.gz`); `python3 experiments/e3/analyze_amendment01.py` (valid-only, amended) | under 1 s each |
| E4 | baselines B1, B2 under the same validator | `cd experiments/amendment-01 && ./build.sh && node build/run-e4.mjs baselines /tmp/baselines.csv.gz`; analysis `python3 experiments/amendment-01/analyze.py` | not recorded |
| Figures | all plots of E1b to E4 | `python3 -I experiments/make-figures.py` (regenerates committed PNGs byte-identically) | seconds |

The default validator rule is `'kink'` since validator v1.1; before that it was `'ratio'` (since 0.5.1), see [docs/validator.md](docs/validator.md). The committed S3b results of E2, E3 (secondary tables) and E4 were produced with the earlier absolute rule; running `experiments/e2/run-all.sh` at the current version would overwrite them with amended values, so use the commands above. Pre-registration documents: `experiments/*/PROTOCOL.md`, `experiments/AMENDMENT-01.md`, `experiments/amendment-01/ADDENDUM-E3.md`, `experiments/e1/ADDENDUM-v1.0.0.md`.

Results used by this README (see "Evidence"): in the E2 grid (4 modes x 12,150 tracks, all with `height` in {0, 80, 200}) 6 hairpin cases fail to generate (0.05%); under the amended validator the ok rate among generated tracks is 31.21% for Auto and 100.00% for right-angle, hairpin and S-curve; median generation time is 0.456 ms for Auto and 4.3 to 5.4 ms for the pattern modes, median validation time 0.42 to 0.51 ms.

## Testing

`npm test` builds the CLI, compiles the tests and runs 102 Node tests (generation and golden geometry hashes, patterns, deterministic math, schema round trip on 200 seeded random parameter sets and tamper cases, validator, metrics, CLI). `npm run build && PLAYWRIGHT_BROWSERS_PATH=... npx playwright test` runs 46 browser tests in Chromium (rendering, forms, keyboard input, resize, repeated generation, JSON export and import). The browser tests use software WebGL, so they say nothing about GPU frame rates or about Firefox and Safari. CI ([.github/workflows/ci.yml](.github/workflows/ci.yml)) runs its `test` job on Ubuntu, Windows and macOS with Node 20, 22 and 24 (nine combinations, `fail-fast` off): `npm ci`, `npm test`, `npm run build`, `npm run build:cli` and a CLI determinism smoke test (`generate --seed 42`, `validate --verify regenerate`, in bash on every OS). A separate `determinism` job runs on the same three operating systems: `node cli-dist/cli.js generate` for seeds 0, 1, 42 and 7 with cornerPattern `auto` and `hairpin`, whose `integrity.contentDigest` values must equal those committed in [tests/fixtures/ci-golden-digests.json](tests/fixtures/ci-golden-digests.json); and [scripts/ci-digests.mjs](scripts/ci-digests.mjs) run under Node 22, Deno 2.9.6 and Bun 1.4.4, checked against the same file. The browser suite is not part of CI. Counts and logs of the release run: [docs/test-run-1.0.0.txt](docs/test-run-1.0.0.txt).

## Limitations

- Intersection tests are planar (x/z). A bridge-like crossing at different heights is reported as an intersection. The validator checks the centerline and road edges only, not scenery, obstacles or coins, and `ok` is a geometric statement, not a statement about playability.
- The driving preview is kinematic: no physics engine, no tyre model, no banking; collisions use a planar circle approximation, and scenery has no collider. Its code (`src/vehicle.ts`) is not covered by the determinism evidence.
- Auto mode (no corner pattern) keeps the sharp straight/curve joins of the original algorithm. Under the amended validator 68.79% of the 12,150 Auto tracks of the E2 grid are invalid (self-intersection of an edge in 64.9%, ribbon fold in 66.4%, seam tangent in 47.3%); invalidity is driven by `straight` (95.70% at 0.3, 99.93% at 0.6, 10.74% at 0). Pattern modes smooth the joins and pass the validator in the whole grid.
- The slope warning limit `maxSlope` = 0.3 is a design choice, a configurable plausibility threshold of the validator (dy/ds, a warning that does not change `ok`); it is not taken from road-design standards, and no real-circuit gradient is cited for it. Adjust it with `--limit maxSlope=N`. The maximum slope is proportional to `height`, so with the former default `height` = 80 every default-configuration track exceeded 0.3 (reviewer comment M16; E2: median maximum slope 0.744, 95th percentile 1.253 at height 80, 3.13 at height 200, 100% above 0.3, protocol proposal 1.3). `DEFAULTS.height` is now 20 (elevation range about 48.6 units, versus a road width of 40). The value was chosen on exploratory seeds 10000..10199 (`experiments/e8/EXPLORATION.md`: 0.5% of default-configuration tracks warn at 20, 20% at 25) and evaluated once on held-out seeds under the pre-registered `experiments/e8/PROTOCOL.md` (results: `experiments/e8/results/heldout/SUMMARY.md`). Documents store their parameters, so a document written with `height` 80 regenerates unchanged; only `generateTrack({})` and the UI start value changed. Larger heights remain available on the slider and still trigger the warning. Experiment scripts that leave `height` unset (for example the four non-extreme configurations of `experiments/e1/cases.mjs`, which E1 and E5 use) now generate at 20, so they no longer reproduce results recorded at 80 unless `height: 80` is passed; the committed result files themselves are unchanged.
- The E2 and E4 grids are balanced factorials over fixed parameter levels, not a natural parameter distribution; rates and expressive ranges reflect that grid. Timing was measured on a shared 2-vCPU virtual machine and varies by run (coefficient of variation of the repeated medians 4.7% to 11.7% per series).
- Determinism is demonstrated for the engines, versions and operating system listed under "Determinism" only.
- The exchange format `schemaVersion` is 1 and `contentDigest` was added before the 1.0.0 freeze; documents written by earlier unreleased builds lack it and are rejected.

## Evidence

Every number in this README comes from a committed file, a source constant or a command named here.

| Number(s) | Source |
| --- | --- |
| 76 Node tests, 40 browser tests | [docs/test-run-1.0.0.txt](docs/test-run-1.0.0.txt); test files in `tests/` |
| CI matrix: Node 20, 22, 24 on Ubuntu, Windows, macOS; determinism digests | `.github/workflows/ci.yml`, `tests/fixtures/ci-golden-digests.json` |
| Node >= 20.19 | `package.json` (`engines`) |
| Parameter ranges and defaults, 150 ms debounce text | `src/core.ts` (`DEFAULTS`, `LIMITS`); `docs/history/README_v0.4_ko.md` |
| Validator defaults (1e-6, 1e-6, 5, 2, 3 vertices, 1e-5, 1, 0.3, 20), `closureTangentMode` `kink` with the local-kink values (window 3, maximum, ratio 3, floor 12 degrees) and 16.7 degrees | `src/validate.ts` (`DEFAULT_VALIDATE_OPTIONS`, `SEAM_WINDOW`) |
| Metric thresholds 5e-4, 4e-3, 8 bins and edges | `src/metrics.ts` |
| 48 cases of `grid-small.json`; CLI outputs (digest, 154 slope failures, 325 samples, length 2747.09, 42 of 48 ok) | `examples/grid-small.json`; `docs/cli-example-output.txt` (made by `scripts/cli-example.sh`) |
| E1 at 1.0.0: 8 runs, 1000 cases, 0 mismatches for `digest` and `contentDigest`; 1000 of 1000 `contentDigest` equal to 0.5.0, 0 of 1000 `digest` equal; engine versions; 6 min 34 s | `experiments/e1/results/v1.0.0/SUMMARY.md`, `SUMMARY.json`, `NOTES.md` |
| Legacy control: 513 mismatches on Node 24, 1000 on Deno, Bun, Chrome, Firefox, 0 on Node 20 | `experiments/e1/results/E1_SUMMARY.md` |
| 0 of 1000 discrete disagreements of legacy outcomes; largest relative length difference 2.34e-15 | `experiments/e1b/results/SUMMARY.md` |
| Machine description (KVM, 2 vCPU, Linux x86_64) | `experiments/e2/results/environment.txt` |
| 48,600 grid cases, 12,150 per mode, 6 hairpin generation failures (0.05%), timing medians 0.456 ms and 4.3 to 5.4 ms, validation 0.42 to 0.51 ms, 242.7 s, CV 4.7% to 11.7% | `experiments/e2/results/SUMMARY.md`, `tables.md`, `SUMMARY.json` |
| Slope: median 0.744, 95th percentile 1.253 (height 80), 3.13 (height 200), 100% above 0.3, proposal 1.3 | `experiments/e2/results/SUMMARY.md` (section 4 of `tables.md`) |
| Amended ok rates 31.21% (Auto) and 100.00% (pattern modes); Auto invalid 68.79%; invalidity 95.70%, 99.93%, 10.74% by `straight`; 5751 of 12,150 (47.3%) Auto seam failures; 64.9% and 66.4% | `experiments/amendment-01/SUMMARY.md`; `experiments/e2/results/amendment-01/tables.md`, `SUMMARY.json` |
| SHA-256 `66a6af63...` of the amended E2 CSV and `812f416c...` of the S3b CSV | `experiments/amendment-01/results-digests.json`, `experiments/amendment-01/SUMMARY.md` |
| Reproduction of the amended and the S3b E2 CSV at 1.0.0 (identical SHA-256), 256 s | [docs/test-run-1.0.0.txt](docs/test-run-1.0.0.txt) |
| numpy, pandas, matplotlib versions | output of `python3 -c "import numpy, pandas, matplotlib"` in the environment that produced the committed analysis files |
| E3 valid-only re-run | `experiments/e3/results/amendment-01/SUMMARY.md`, `tables.md`; prediction file `experiments/amendment-01/ADDENDUM-E3.md` |

## Citation

Cite the software with [CITATION.cff](CITATION.cff) (GitHub shows a "Cite this repository" entry). The file carries title, authors, ORCID iDs, licence and version 1.0.0; `date-released` is added at release.

## Licence

MIT, see [Licence.txt](Licence.txt) (identical text in `LICENSE`). Copyright (c) 2026 Taewan Kim. Third-party code and packages (the fdlibm notice that the sin, cos, atan and exp routines in `src/detmath.ts` derive from, three.js, and the development tools) are listed with their licences in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
