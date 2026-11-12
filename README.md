# TrackSeed

TrackSeed is a procedural racing-track generator written in TypeScript. From a small parameter set (number of Catmull-Rom spans, straight-span ratio, road width, scale, elevation amplitude, scenery, seed, and an optional corner pattern: 90-degree, hairpin or S-curve) it produces a closed, elevated track with road edges, scenery, obstacles and coins. The same parameters give the same document, which is serialised in a self-describing, integrity-checked JSON exchange format. The package contains a browser front end (Three.js, with a kinematic driving preview), a headless validator and metric library, and a command-line interface for batch generation. It is intended for experiments on procedural level generation that need reproducible tracks, automatic validity checks and interpretable geometric metrics.

The web front end is in English by default, with a Korean toggle (or `?lang=ko` in the URL); the library, CLI and this document are English.

## Features

- Seeded generation (`generateTrack`) with 13 parameters (the 12 range-checked parameters and `autoJoin`), ranges enforced; a corner-pattern mode that inserts 0 to 3 right-angle, hairpin or S-curve corners and verifies them geometrically (`MAX_PATTERN_ATTEMPTS` = 6 attempts at most; on failure the generator throws, it does not substitute a different track).
- Straight-join option `Params.autoJoin`: `'tangent'` (default since v1.1) or `'legacy'` (the v1.0.0 construction). A v1.0.0 document has no `autoJoin` key and means `'legacy'`; see [docs/generator-auto-join.md](docs/generator-auto-join.md).
- Deterministic mathematics: the generation path uses `src/detmath.ts` instead of `Math.sin/cos/atan2/hypot/exp`, so results do not depend on the engine's transcendental functions (see "Determinism").
- Exchange format v1 (`exportTrack`, `serializeTrack`, `parseTrackDocument`, `importTrack`) with canonical JSON and two SHA-256 digests; import can verify by regeneration.
- Validator (`validateTrack`): eight checks in the default mode (structure, finiteness, closure, local kink, planar self-intersection, ribbon fold, turning radius, slope), reported, never repaired; the rules and their evidence are in [docs/validator.md](docs/validator.md).
- Metrics (`computeMetrics`): length, curvature statistics, curvature entropy, turn count, elevation and slope statistics, total turning.
- CLI (`generate`, `batch`, `validate`, `metrics`, `validate-polyline`, `metrics-polyline`) with deterministic JSONL summaries; the polyline commands check a closed x/z polyline (JSON or CSV) that TrackSeed did not generate.
- Web UI: 3D view, minimap, drive/overview cameras, coins, JSON export and import, validation panel, and a "Straight joins" selector that feeds `autoJoin` (English by default, Korean with the toggle).

## Install

Node.js 20.19 or newer (`engines` in `package.json`; CI runs Node 20, 22 and 24 on Ubuntu, Windows and macOS).

```bash
git clone <repository-url> trackseed && cd trackseed
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
$ trackseed validate track.json --verify regenerate
{
  "file": "track.json",
  "verify": "regenerate",
  "digest": "2062329927bd5b0a2c35c4dfbb8bab3774ae518237b689130382e7bc4c4a98f3",
  "ok": true,
  "violations": [],
  "checks": [
    {
      "id": "structure",
      "severity": "error",
      "checked": 1,
      "failures": 0,
      "stats": {},
      "skipped": false,
  ... (violations list trimmed)
checks (id: passed, failures): structure: true, 0 | finite: true, 0 | closure: true, 0 | local-kink: true, 0 | self-intersection: true, 0 | edge-fold: true, 0 | min-turn-radius: true, 0 | max-slope: true, 0

$ trackseed metrics track.json
{
  "sampleCount": 325,
  "length": 2606.746448590328,
  "boundingBoxArea": 613608.2703178154,
  "straightLengthFraction": 0.05224851801553694,
  ...

$ trackseed batch --grid examples/grid-small.json --out out/ --jsonl out/summary.jsonl --no-timing
trackseed batch: 48 cases, 48 generated, 0 generation failures, 48 ok
```

CLI reference:

| Command | Behaviour | Exit codes |
| --- | --- | --- |
| `generate [--seed N] [--params file.json \| --set key=value ...] [--out file.json]` | Canonical `TrackDocumentV1` to `--out` or stdout. Unknown keys, values of the wrong type, out-of-range values, non-integer values for integer parameters and unknown `scene` or `cornerPattern` names are rejected, not clamped or rounded (`batch` grids are checked the same way). | 0 ok, 1 generator rejected the parameters, 2 usage error or invalid parameters |
| `batch --grid grid.json --out dir/ [--jsonl summary.jsonl] [--no-timing] [--closure-tangent-mode kink\|ratio\|absolute] [--seam-ratio N]` | One document per case plus one JSONL summary line per case. | 0 completed, 2 invalid grid or usage |
| `validate file.json [--verify digest\|regenerate] [--limit key=value ...] [--strict] [--closure-tangent-mode kink\|ratio\|absolute] [--seam-ratio N]` | Parses the document (schema, both digests, optional regeneration), runs the validator, prints the report as JSON. | 0 no error-severity violation, 1 at least one (`--strict`: warnings too), 2 invalid document or options |
| `metrics file.json [--samples]` | Metrics as JSON (`--samples` adds the per-sample curvature array). | 0, or 2 invalid document |
| `validate-polyline file.json\|file.csv --width W [--resample-spacing S \| --resample-smooth S] [--strict] [--limit key=value ...] [--closure-tangent-mode kink\|ratio\|absolute] [--seam-ratio N] [--absolute-tolerances]` | Builds a track from a closed polyline that TrackSeed did not generate (`.csv`: one `x,z` or `x,z,y` per line, optional header; otherwise JSON `{\"points\": [...]}` or a bare array) and runs the validator. The report has the form of `validate` plus the input summary. Nothing is repaired, except that consecutive duplicate points are removed and counted (`input.duplicatePointsRemoved`); `--resample-spacing` (linear) and `--resample-smooth` (spline, exclusive with it) are off unless given. | 0 no error-severity violation, 1 at least one (`--strict`: warnings too), 2 unreadable or invalid input or options |
| `metrics-polyline file.json\|file.csv --width W [--resample-spacing S \| --resample-smooth S] [--samples]` | Metrics of such a polyline, with the definitions of `metrics`. `--width` is required for symmetry with `validate-polyline` and does not change the metrics. | 0, or 2 unreadable or invalid input |

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
| `validateTrack(track, options?)` | Pure validator, works on a `Track` or an imported document. Options and defaults: `DEFAULT_VALIDATE_OPTIONS` (plus `absoluteTolerances`, default false). |
| `trackFromPolyline(input, options?)` | Builds a validator input from a closed polyline of another generator (`src/polyline.ts`): removes consecutive duplicates (`duplicatePointsRemoved`), optional `resample: { spacing }` (linear) or `resampleSmooth: { spacing }` (spline). |
| `computeMetrics(track, options?)` | Geometric metrics of the centerline. |
| `exportTrack(track)` / `serializeTrack(track)` | `TrackDocumentV1` object / its canonical JSON string. |
| `parseTrackDocument(jsonOrValue)` | Validates structure and both digests; throws `TrackDocumentError` with a path such as `$.geometry.points[7].x`. |
| `importTrack(doc, { verify })` | `'digest'` (default) or `'regenerate'`; returns the track data. |

## Exchange format v1

`exportTrack` writes a `tracklab.track` document; `serializeTrack` writes it as canonical JSON (keys sorted, no whitespace, finite numbers only, `-0` written as `0`).

The format identifiers keep the project's former name (TrackLab) for document and digest continuity: the schema name `tracklab.track` and the generator name `tracklab` are part of every document and of its digests, so renaming them would change every digest and break the reproduction of the committed results. They are format identifiers, not the product name.

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

`digest` detects any change of the file, including the generator stamp. `contentDigest` identifies the content independently of the build that wrote it: the same parameters give the same `contentDigest` on builds with different version strings (experiment E1 at 1.0.0 compares 1.0.0 with 0.5.0 on this). The SHA-256 is a pure TypeScript implementation, identical in every engine. `parseTrackDocument` checks both. `importTrack(doc, { verify: 'regenerate' })` additionally runs `generateTrack(doc.params)` and requires the same `contentDigest`; this shows the parameters determine the stored content on the running build and also catches edited documents whose digests were recomputed to match. `'digest'` mode catches accidental damage and simple edits but not an edit followed by recomputing the digests. The digests are unkeyed SHA-256 values: they give integrity checking, not authentication, and they do not authenticate provenance (the `generator` stamp is plain data, so a spoofed generator stamp is not detected; only `'regenerate'` shows that the parameters reproduce the content on the running build).

JSON Schema. [schema/trackdocument-v1.schema.json](schema/trackdocument-v1.schema.json) (draft 2020-12) describes the structure of a v1 document so that other tools can check a file without this library: required and unknown keys, value types, the ranges and enums of `params` (the ranges equal `LIMITS`; `params.autoJoin`, when present, is `"tangent"` and is forbidden where a spliced corner pattern makes it inert), the road-edge pair, and the digest format. It cannot express what `importTrack` checks beyond structure: that the two SHA-256 digests match the content, that `params` is in canonical sanitised form, that `normals` and `roadEdges` have as many entries as `points` and `straightSegments` has `params.curves` entries, and (with `verify: 'regenerate'`) that the parameters reproduce the content. A document that passes the schema is therefore not necessarily importable. `tests/schema-json.test.ts` validates the CI golden documents, the committed v1.0.0 document and further generated documents with a small dependency-free validator, and checks that broken documents are rejected by both the schema and `importTrack`, and that the cases above are accepted by the schema and rejected by `importTrack`.

## Validator checks

`validateTrack(track, options?) => { ok, violations, checks }` is pure. `ok` is false iff a check of severity `error` failed or was skipped. Each entry of `checks` has `passed`, `skipped`, `checked`, `failures` (complete count) and `stats`; `violations` lists at most `maxViolationsPerCheck` (20) entries per code. The validator does not repair anything and also runs on Auto-mode tracks, which have no geometry audit at generation time.

| Check (`checks[].id`) | Codes | Severity | Definition and default |
| --- | --- | --- | --- |
| `structure` | `STRUCTURE` | error | at least 4 points; both `roadEdges` have one entry per point |
| `finite` | `NON_FINITE` | error | all coordinates and `params.width` finite; on failure later checks are `skipped` |
| `closure` | `CLOSURE_POSITION`, `CLOSURE_EDGE`, `CLOSURE_HEIGHT`, `CLOSURE_TANGENT` | error | last point equals first within `closureTolerance` = 1e-6 (3D; each edge too); height gap <= `heightTolerance` = 1e-6 (both multiplied by the scale factor f, which is 1 for every track of TrackSeed's size; see "Scale-relative tolerances" below); `CLOSURE_TANGENT`: see below |
| `local-kink` | `LOCAL_KINK` | error | mode `kink` only (the default since validator v1.1; not run in the legacy modes). The heading change theta_i at each vertex of the closed loop fails iff theta_i > max(`kinkFloorDegrees` = 12, `kinkRatio` = 3 x the largest theta_j with j = i±2 .. i±3) (outlier rule, window 3, maximum); the immediate neighbours i±1 are not in the reference. The seam (vertex 0) is reported as `CLOSURE_TANGENT`, the other vertices as `LOCAL_KINK` |
| `self-intersection` | `SELF_INTERSECTION_CENTERLINE`, `SELF_INTERSECTION_EDGE`, `EDGE_EDGE_INTERSECTION` | error | planar (x/z) segment intersection (spatial hash) of the centerline, of each edge with itself and of the two edges with each other; segments sharing a vertex are skipped, touching counts. A grade-separated crossing is reported too |
| `edge-fold` | `EDGE_FOLD` | error | both ribbon triangles of every segment need x/z cross product > `foldEpsilon` = 1e-5 (times f^2, see below) |
| `min-turn-radius` | `MIN_TURN_RADIUS` | warning | local radius 1/\|kappa\| < `minRadiusToHalfWidth` (1) x width/2 |
| `max-slope` | `MAX_SLOPE` | warning | \|dy\| / planar run of a segment > `maxSlope` = 0.3 (about 16.7 degrees). The default is a convention of this tool, not a standard |

`CLOSURE_TANGENT` (the seam) has three modes (`closureTangentMode`):

- `'kink'` (default, validator v1.1): the seam is tested with the local-kink rule of the table above, applied to vertex 0 with the same neighbourhood; a failure is reported as `CLOSURE_TANGENT`. The rule and its evidence are in [docs/validator.md](docs/validator.md).
- `'ratio'` (legacy, v0.5.1): let theta0 be the heading change in degrees (x/z) between the segment entering and the segment leaving the seam, and theta_i the per-vertex heading changes at the 3 vertices on each side of the seam. The check fails iff theta0 > max(`tangentToleranceDegrees` = 5, `seamRatio` = 2 x max theta_i). A seam is flagged when it turns markedly more than its own neighbourhood; this replaced an absolute limit that conflated sampling resolution on tight curves with a discontinuity (AMENDMENT-01, [experiments/AMENDMENT-01.md](experiments/AMENDMENT-01.md)). `stats` reports `tangentDegrees`, `neighbourhoodMaxDegrees` and `tangentRatio`.
- `'absolute'` (legacy, v0.5.0): the earlier rule, fail iff theta0 > `tangentToleranceDegrees`.

The legacy modes return the seven checks of v1.0.0 (no `local-kink`); the default returns eight.

**Scale-relative tolerances.** `closureTolerance`, `heightTolerance` and `foldEpsilon` were absolute, so a valid track scaled together with its width by 1e-4 failed with `EDGE_FOLD`. The defaults are now multiplied by f (f^2 for `foldEpsilon`), where f = D / 10 if the bounding-box diagonal D of the centreline is below 10, f = D / 100000 if it is above 100000, and f = 1 otherwise. TrackSeed's own tracks (D about 600 to 1600) are inside the band, so every result at that scale, including all committed experiment results, is unchanged (checked by the reproduce check, `docs/test-run-wp7a.txt`). Values given with `--limit` or in `options` are used literally; `--absolute-tolerances` / `absoluteTolerances: true` restores the absolute defaults. Formula, evidence and the list of what was not changed: [docs/validator.md](docs/validator.md).

On the CLI: `--closure-tangent-mode kink|ratio|absolute`; `--seam-ratio N` (only with `ratio`) or `--limit key=value` for the numeric options. `MIN_TURN_RADIUS` and `MAX_SLOPE` are warnings and do not affect `ok`; `--strict` turns them into exit code 1.

### Imported polylines: sampling requirement

The validator judges a polyline as given: a corner of radius 30 sampled every 20 units is a polygon with sharp vertices, and the same rounded rectangle is ok at spacing 15 and fails `LOCAL_KINK` at 20. With s the vertex spacing, R_min the smallest turn radius to be represented and h_min the smallest lateral defect to be found (half the road width is a natural choice), sample at **s <= min(0.2 R_min, 9 h_min)** (no false `LOCAL_KINK` on arcs; a defect of size h_min is flagged), or **s <= min(0.07 R_min, 9 h_min)** if defects must also be found inside the tightest curve. Derivation: [docs/validator.md](docs/validator.md), "Sampling requirement". A coarser polyline can be passed through `--resample-smooth S` (centripetal Catmull-Rom through the given points, then arc-length resampling at S; the spline passes through every input vertex, so a real spike remains a kink). Consecutive duplicate points (distance <= 1e-9 of the bounding-box diagonal) are removed before validation and counted in `input.duplicatePointsRemoved`. Inputs of 200,000 vertices and more are handled (the intersection check is a spatial hash, linear in practice; resampling is limited to 5,000,000 points). The validator does not smooth noisy data: jitter of 0.2 units on a 2000-vertex circle of radius 1000 already makes 45 of 50 tracks invalid.

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

The fields above that depend on curvature thresholds or bins (`straightLengthFraction`, `curvatureEntropyBits`, `turnCount`, the curvature statistics) are not scale-free: scaling a track by 1000 turns its entropy into 0 and its straight fraction into 1. Their scale-normalised counterparts `meanAbsCurvatureNorm`, `p95AbsCurvatureNorm`, `maxAbsCurvatureNorm`, `curvatureEntropyBitsNorm`, `curvatureHistogramNorm`, `straightLengthFractionNorm` and `turnCountNorm` (kappaHat = kappa x length / 2 pi, [docs/metrics.md](docs/metrics.md)) are invariant under uniform scaling and are the ones to use for tracks of unknown scale.

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
| `autoJoin` | `tangent`, `legacy` | `tangent` (since 1.1; a document without the key is a v1.0.0 document and means `legacy`; see [docs/generator-auto-join.md](docs/generator-auto-join.md)) |

Ranges come from `LIMITS` in `src/core.ts`. Every numeric parameter except `straight` is rounded to the nearest integer by `sanitize()`, so `height` takes whole values only. `straight` is not rounded and takes any value from 0 to 0.6. The third element of each `LIMITS` entry is the increment of the browser UI sliders (0.05 for `straight`, 5 for `height`, 1 for the other sliders; `seed` has no slider). Only the browser's slider controls read it; `generateTrack()`, the CLI and the validator never snap a value to it. `generateTrack()` and the browser UI pass values through `sanitize()`, which clamps them to the range and rounds them silently. The CLI does not: it rejects a value that `sanitize()` would change (see the `generate` row in the CLI table), and so does `generateTrack(params, { strict: true })`, which uses the same function. Note that the "grid" the strict check enforces is the one `sanitize()` applies (whole numbers for every parameter except `straight`), not the slider increment in the third `LIMITS` element: `height` 82 is accepted, 20.5 is rejected.

## Determinism

Design. The files `core.ts`, `patterns.ts`, `coins.ts`, `detmath.ts`, `validate.ts`, `metrics.ts`, `schema.ts` and `sha256.ts` (the generation path, the validator, the metrics and the document hashing) use only `+ - * /`, the `%` operator and integer bitwise operators, the `Math` members that ECMAScript specifies exactly (`abs`, `min`, `max`, `floor`, `ceil`, `round`, `sign`, `trunc`, `fround`, `imul`, and the constant `PI`), and `Math.sqrt`. `src/detmath.ts` implements sin, cos, atan, atan2, hypot and exp from these operations. A grep over the code lines (comment lines excluded) finds no call to `Math.sin`, `cos`, `tan`, `atan`, `atan2`, `exp`, `log`, `pow`, `hypot` or `cbrt`, and no `**` operator. IEEE-754 basic operations are required by ECMAScript. Correctly rounded `Math.sqrt` is an assumption that the specification does not state. ECMAScript does not require the other transcendental `Math` functions to agree across engines, which is why they are avoided. The PRNG is an integer generator. Hashing uses a pure TypeScript SHA-256, not an engine facility. The sin, cos, atan and exp routines follow fdlibm / FreeBSD msun algorithms and coefficients; the notices are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

Evidence (experiment E1, protocol [experiments/e1/PROTOCOL.md](experiments/e1/PROTOCOL.md), v1.0.0 re-run [experiments/e1/ADDENDUM-v1.0.0.md](experiments/e1/ADDENDUM-v1.0.0.md), results [experiments/e1/results/v1.0.0/SUMMARY.md](experiments/e1/results/v1.0.0/SUMMARY.md)): 1000 fixed cases (200 seeds x 5 parameter configurations including corner patterns and an extreme configuration) were generated and hashed in 8 runs: Node 22 (reference), Node 22 again, Node 20, Node 24, Deno, Bun (JavaScriptCore), headless Chrome and Firefox (SpiderMonkey). At version 1.0.0 all 8 runs agree with the reference in 1000 of 1000 cases for both `digest` and `contentDigest`. A bundle of the 0.5.0 tree gives the same `contentDigest` as 1.0.0 in 1000 of 1000 cases on every run, while the whole-document `digest` differs in 1000 of 1000 (the generator stamp differs). As a control, a legacy v0.4 build that calls `Math.sin/cos/atan2/hypot` directly was compared in the original E1 ([experiments/e1/results/E1_SUMMARY.md](experiments/e1/results/E1_SUMMARY.md)): its document hashes differ from Node 22 in 513 cases on Node 24 and in 1000 cases on Deno, Bun, Chrome and Firefox, and agree on Node 20. Its discrete outcomes (point counts, pattern insertion, validity codes) did not differ in any of the 1000 cases on any engine ([experiments/e1b/results/SUMMARY.md](experiments/e1b/results/SUMMARY.md)); the differences were in the last bits of continuous values (largest relative difference of `track.length` between engines 2.34e-15).

Measured scope. Engines and versions: Node 20.20.2, 22.23.4, 24.22.2, Deno 2.9.6, Bun 1.4.4, Chrome 153.0.8010.12, Firefox 157.0. One Linux x86_64 machine (a KVM virtual machine, see [experiments/e2/results/environment.txt](experiments/e2/results/environment.txt)). Document generation only: the vehicle runtime in `src/vehicle.ts` still uses `Math.*` and is outside the guarantee. 1000 cases per subject sample the parameter space; they are not a proof. Other CPU architectures and engine versions were not tested. Operating systems other than this Linux machine were not part of E1; the CI `determinism` job (see Testing) compares four seeds with committed digests on Ubuntu, macOS and Windows, a smaller check than E1. At version 1.1.0 the cross-engine check was repeated with WebKit added and with both joins; see [Release and versioning](#release-and-versioning).

## Reproducing the experiments

All experiments are committed with a pre-registered protocol (written and committed before any result), harness, raw or compressed results and analysis. Stage labels and process terms used in those files (S-labels, DEV and HELD-OUT, FREEZE, ADDENDUM, AMENDMENT, auditor) are defined in [docs/GLOSSARY.md](docs/GLOSSARY.md). Common requirements: Linux, Node 22 as `node`, network access for `npx -y` (esbuild 0.25, `node@20`, `node@24`, `deno`, `bun@1`), Python 3 with numpy, pandas and matplotlib (used: numpy 2.5.3, pandas 3.0.5, matplotlib 3.11.2), `/usr/bin/google-chrome` and a Playwright Firefox (`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers` in our environment, `npx -y playwright@1.64.1 install firefox` otherwise) for the browser engines. Raw per-engine outputs and bundles go to git-ignored `out/` and `build/` directories. Runtimes below are wall-clock times measured on the 2-vCPU machine named above; where a time was not recorded it is marked so.

| Experiment | What it measures | Command (from the repository root) | Runtime |
| --- | --- | --- | --- |
| E1 at 1.0.0 | cross-engine agreement of `digest` and `contentDigest`, 0.5.0 vs 1.0.0 content comparison | `cd experiments/e1/v1.0.0 && PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers ./run-all.sh` (rewrites `experiments/e1/results/v1.0.0/`) | 6 min 34 s |
| E1 (original, v0.5.0 and legacy v0.4) | same, plus the legacy control | check out commit `145277e`, then `cd experiments/e1 && ./run-all.sh` (the harness bundles the current `src/`, so run it at that commit) | not recorded; same structure as the line above |
| E1b | do legacy float differences change discrete outcomes | `cd experiments/amendment-01/e1b && ./run-all.sh` (amended validator; the form that ran with the original version 0.5.0 validator is `experiments/e1b/run-all.sh` at commit 6779f9b) | not recorded |
| E2 validity (amended validator) | validity of 48,600 tracks (4 modes x 12,150) | `cd experiments/amendment-01 && ./build.sh && node build/run-e2.mjs validity /tmp/validity.csv.gz`, expected SHA-256 `66a6af63...` of `experiments/e2/results/amendment-01/validity.csv.gz` | 256 s (4 min 16 s) |
| E2 validity (original 0.5.0 rule) | reproduces the original 0.5.0-era E2 CSV (commit 7f1c872) | same with `CLOSURE_TANGENT_MODE=absolute`, expected SHA-256 `812f416c...` of `experiments/e2/results/validity.csv.gz` | same as above |
| E2 timing | generation and validation time | `cd experiments/e2 && ./build.sh && node build/run.mjs timing /tmp/v.csv.gz /tmp/timing.csv.gz` (values are machine dependent) | 242.7 s |
| E3 | expressive range per corner-pattern mode | `python3 experiments/e3/analyze.py` (primary, reads `e2/results/validity.csv.gz`); `python3 experiments/e3/analyze_amendment01.py` (valid-only, amended) | under 1 s each |
| E4 | baselines B1, B2 under the same validator | `cd experiments/amendment-01 && ./build.sh && node build/run-e4.mjs baselines /tmp/baselines.csv.gz`; analysis `python3 experiments/amendment-01/analyze.py` | not recorded |
| Figures | all plots of E1b to E4 | `python3 -I experiments/make-figures.py` (regenerates committed PNGs byte-identically) | seconds |

The default validator rule is `'kink'` since validator v1.1; before that it was `'ratio'` (since 0.5.1), see [docs/validator.md](docs/validator.md). The committed results of E2 (commit 7f1c872, version 0.5.0), the secondary tables of E3 and the results of E4 were produced with the earlier absolute rule; running `experiments/e2/run-all.sh` at the current version would overwrite them with amended values, so use the commands above. Pre-registration documents: `experiments/*/PROTOCOL.md`, `experiments/AMENDMENT-01.md`, `experiments/amendment-01/ADDENDUM-E3.md`, `experiments/e1/ADDENDUM-v1.0.0.md`.

Results used by this README (see "Evidence"), measured with the v1.0.0 generator (legacy join) and the amended validator: in the E2 grid (4 modes x 12,150 tracks, all with `height` in {0, 80, 200}) 6 hairpin cases fail to generate (0.05%); under the amended validator the ok rate among generated tracks is 31.21% for Auto and 100.00% for right-angle, hairpin and S-curve; median generation time is 0.456 ms for Auto and 4.3 to 5.4 ms for the pattern modes, median validation time 0.42 to 0.51 ms.

## Testing

`npm test` builds the CLI, compiles the tests and runs 129 Node tests (generation and golden geometry hashes, patterns, deterministic math, schema round trip on 200 seeded random parameter sets and modified-document cases, validator, metrics, CLI). `npm run build && PLAYWRIGHT_BROWSERS_PATH=... npx playwright test` runs 46 browser tests in Chromium (rendering, forms, keyboard input, resize, repeated generation, JSON export and import). At version 1.1.0 all 46 pass ([docs/test-run-1.1.0.txt](docs/test-run-1.1.0.txt)). The browser tests use software WebGL, so they say nothing about GPU frame rates or about Firefox and Safari. CI ([.github/workflows/ci.yml](.github/workflows/ci.yml)) runs its `test` job on Ubuntu, Windows and macOS with Node 20, 22 and 24 (nine combinations, `fail-fast` off): `npm ci`, `npm test`, `npm run build`, `npm run build:cli` and a CLI determinism smoke test (`generate --seed 42`, `validate --verify regenerate`, in bash on every OS). A separate `determinism` job runs on the same three operating systems: `node cli-dist/cli.js generate` for seeds 0, 1, 42 and 7 with cornerPattern `auto` and `hairpin`, whose `integrity.contentDigest` values must equal those committed in [tests/fixtures/ci-golden-digests.json](tests/fixtures/ci-golden-digests.json) (legacy join, `--set autoJoin=legacy --set height=80`) and in [tests/fixtures/ci-golden-digests-v1.1.json](tests/fixtures/ci-golden-digests-v1.1.json) (default tangent join, `--set height=80`); and [scripts/ci-digests.mjs](scripts/ci-digests.mjs) run under Node 22, Deno 2.9.6 and Bun 1.4.4, checked against both files. The browser suite is not part of CI. Counts and logs: [docs/test-run-1.0.0.txt](docs/test-run-1.0.0.txt) (release 1.0.0) and [docs/test-run-1.1.0.txt](docs/test-run-1.1.0.txt) (version 1.1.0).

## Limitations

- **Polyline input depends on sampling.** The validator judges the vertices it is given; see "Imported polylines: sampling requirement". A coarse polyline can fail `LOCAL_KINK` although the intended curve is smooth, and a small defect can pass if the vertex spacing is large. `--resample-smooth` reduces the first problem and cannot reconstruct what the input does not contain.
- Intersection tests are planar (x/z). A bridge-like crossing at different heights is reported as an intersection. The validator checks the centerline and road edges only, not scenery, obstacles or coins, and `ok` is a geometric statement, not a statement about playability.
- The driving preview is kinematic: no physics engine, no tyre model, no banking; collisions use a planar circle approximation, and scenery has no collider. Its code (`src/vehicle.ts`) is not covered by the determinism evidence.
- **Auto join.** Since version 1.1.0 Auto mode (no corner pattern) uses the tangent join by default. It removes the heading jumps that the v1.0.0 construction left at every waypoint next to a straight. On the 30 held-out seeds of experiment E7 over the Auto grid, the ok rate rose from 29.55% with the legacy join to 82.92% with the tangent join. Tracks with `straight` = 0 are identical under both joins (88.64% ok); with `straight` > 0 the rate rose from 0.00% to 80.06%. The remaining failures are road-edge folds and self-intersections, and they concentrate where the road is wide: at width 80, 45.6% of the `straight` > 0 tracks are ok. The join costs straight length: the realised straight fraction has a median of 0.302, against 0.452 with the legacy join (ratio 0.617), while the median track length rises by 3.5%. ([experiments/e7/SUMMARY.md](experiments/e7/SUMMARY.md); [docs/generator-auto-join.md](docs/generator-auto-join.md))
- **Legacy join.** A document without an `autoJoin` key is a v1.0.0 document and regenerates with the legacy join, which is kept for that purpose. Its Auto tracks with `straight` > 0 were never ok on the E7 held-out grid (0 of 4860). Use `autoJoin: 'legacy'` to reproduce v1.0.0 results, not to generate tracks. ([docs/generator-auto-join.md](docs/generator-auto-join.md))
- **Default height and the slope warning.** The default `height` is 20 (it was 80 in v1.0.0), which gives an elevation range of about 48.6 units against a road width of 40. At height 80 all 100 control tracks of the E8 held-out seeds exceed the `maxSlope` warning limit of 0.3. At 20 none of the 100 does, but the largest maximum slope is 0.289 (median 0.207, 95th percentile 0.252), so the margin to the limit is thin. The limit is a plausibility threshold of this validator, not a road-design standard, and a warning does not change `ok`; adjust it with `--limit maxSlope=N`. The value 20 was chosen on exploratory seeds 10000..10199 and evaluated once on held-out seeds under a pre-registered protocol. Documents store their parameters, so a document written with `height` 80 regenerates unchanged; the defaults of `generateTrack({})`, the UI start value and the CLI changed. Larger heights remain available and still trigger the warning. Experiment runners whose committed results predate version 1.1 pin the v1.0.0 values through `experiments/_v100-params.mjs` ([REPRODUCE.md](REPRODUCE.md)). ([experiments/e8/results/heldout/SUMMARY.md](experiments/e8/results/heldout/SUMMARY.md); [experiments/e8/EXPLORATION.md](experiments/e8/EXPLORATION.md))
- **Height steps are not errors.** An elevation step of 1 to 10 units (the "height step" defect of experiment E6) does not produce an error-severity violation: none of the 2,481 held-out base tracks changed from ok to not ok. `MAX_SLOPE`, a warning, rises on 23.21% to 55.83% of the 2,520 step instances, depending on the step size. The planar kink rule is not designed for height changes, and the experiment makes no claim about them. ([experiments/e6/results/heldout/SUMMARY.md](experiments/e6/results/heldout/SUMMARY.md))
- **Validator thresholds are design choices.** The tolerances, the edge-fold epsilon, the warning limits and the local-kink rule (window 3, ratio 3, 12-degree floor) are choices of this tool, not standards. The kink rule was selected on 20 development seeds and evaluated once on 40 held-out seeds. Its 12-degree floor sits just below the largest clean per-vertex turn seen in development (13.6 degrees), so there the ratio term does the work. Its defects are synthetic operators. ([docs/validator.md](docs/validator.md); [experiments/e6/results/heldout/SUMMARY.md](experiments/e6/results/heldout/SUMMARY.md))
- The E2 and E4 grids are balanced factorials over fixed parameter levels, not a natural parameter distribution; rates and expressive ranges reflect that grid. Timing was measured on a shared 2-vCPU virtual machine and varies by run (coefficient of variation of the repeated medians 4.7% to 11.7% per series).
- Determinism is demonstrated for the engines, versions and operating system listed under "Determinism" only.
- The exchange format `schemaVersion` is 1 and `contentDigest` was added before the 1.0.0 freeze; documents written by earlier unreleased builds lack it and are rejected.

## Release and versioning

- **Version.** The current version is 1.1.0 (`src/version.ts`, `package.json`, [CITATION.cff](CITATION.cff)). It is not released yet: [CHANGELOG.md](CHANGELOG.md) records it as "unreleased; no release date and no tag yet". The changelog lists every change since 1.0.0 with the document or experiment that describes and evidences it.
- **Version in documents.** Each document carries a `generator` object (`name`, `version`), the same string as `src/version.ts`. `integrity.digest` covers that object, so the same content written by two versions has two different `digest` values. `integrity.contentDigest` leaves it out, so it does not change with the version for unchanged content.
- **Digests across versions.** In the 1.1.0 cross-engine check the legacy-join setting reproduced the committed v1.0.0 documents: `contentDigest` equal in 1000 of 1000 cases and `digest` equal in 0 of 1000, on every engine ([experiments/e1/results/v1.1.0/SUMMARY.md](experiments/e1/results/v1.1.0/SUMMARY.md), prediction P2).
- **Cross-engine check at 1.1.0.** Nine engine runs on one Linux x86_64 virtual machine: Node 22 (twice), Node 20, Node 24, Deno 2.9.6, Bun 1.4.4, headless Chrome 153, Firefox 157 and WebKit 27.2. Each run covered 1000 cases for each of the two join settings, and every run gave 0 mismatches for `digest` and `contentDigest`. The WebKit binary is the Playwright build for Linux, so it says nothing about Safari on macOS or iOS. The harness pins `height` to 80, so the default height is not part of this check. ([experiments/e1/results/v1.1.0/SUMMARY.md](experiments/e1/results/v1.1.0/SUMMARY.md); [NOTES.md](experiments/e1/results/v1.1.0/NOTES.md) for the WebKit binary, scope and deviations)
- **CI.** The operating-system matrix (Ubuntu, Windows and macOS with Node 20, 22 and 24) and the `determinism` job are configured in [.github/workflows/ci.yml](.github/workflows/ci.yml). No CI run for the 1.1.0 tree is committed, and the cross-engine check above was not run on the CI machines.

## Evidence

Every number in this README comes from a committed file, a source constant or a command named here.

| Number(s) | Source |
| --- | --- |
| 129 Node tests (113 at 1.1.0 plus 16 in `tests/robust.test.ts`); 46 browser tests, all passing at 1.1.0 | [docs/test-run-1.1.0.txt](docs/test-run-1.1.0.txt), [docs/test-run-wp7a.txt](docs/test-run-wp7a.txt); test files in `tests/` |
| 76 Node tests, 40 browser tests at 1.0.0 | [docs/test-run-1.0.0.txt](docs/test-run-1.0.0.txt) |
| CI matrix: Node 20, 22, 24 on Ubuntu, Windows, macOS; determinism digests | `.github/workflows/ci.yml`, `tests/fixtures/ci-golden-digests.json`, `tests/fixtures/ci-golden-digests-v1.1.json` |
| Node >= 20.19 | `package.json` (`engines`) |
| Parameter ranges and defaults, 150 ms debounce | `src/core.ts` (`DEFAULTS`, `LIMITS`); `src/main.ts` (regeneration timer) |
| Validator defaults (1e-6, 1e-6, 5, 2, 3 vertices, 1e-5, 1, 0.3, 20), `closureTangentMode` `kink` with the local-kink values (window 3, maximum, ratio 3, floor 12 degrees) and 16.7 degrees | `src/validate.ts` (`DEFAULT_VALIDATE_OPTIONS`, `SEAM_WINDOW`) |
| Metric thresholds 5e-4, 4e-3, 8 bins and edges | `src/metrics.ts` |
| 48 cases of `grid-small.json`; CLI outputs at version 1.1.0 (digest, 0 MAX_SLOPE failures at the default height 20, 325 samples, length 2606.75, 48 of 48 ok) | `examples/grid-small.json`; `docs/cli-example-output.txt` (made by `scripts/cli-example.sh`) |
| E1 at 1.0.0: 8 runs, 1000 cases, 0 mismatches for `digest` and `contentDigest`; 1000 of 1000 `contentDigest` equal to 0.5.0, 0 of 1000 `digest` equal; engine versions; 6 min 34 s | `experiments/e1/results/v1.0.0/SUMMARY.md`, `SUMMARY.json`, `NOTES.md` |
| Legacy control: 513 mismatches on Node 24, 1000 on Deno, Bun, Chrome, Firefox, 0 on Node 20 | `experiments/e1/results/E1_SUMMARY.md` |
| 0 of 1000 discrete disagreements of legacy outcomes; largest relative length difference 2.34e-15 | `experiments/e1b/results/SUMMARY.md` |
| Machine description (KVM, 2 vCPU, Linux x86_64) | `experiments/e2/results/environment.txt` |
| v1.0.0 generator (legacy join): 48,600 grid cases, 12,150 per mode, 6 hairpin generation failures (0.05%), timing medians 0.456 ms and 4.3 to 5.4 ms, validation 0.42 to 0.51 ms, 242.7 s, CV 4.7% to 11.7% | `experiments/e2/results/SUMMARY.md`, `tables.md`, `SUMMARY.json` |
| v1.0.0 generator: slope median 0.744, 95th percentile 1.253 (height 80), 3.13 (height 200), 100% above 0.3, proposal 1.3 | `experiments/e2/results/SUMMARY.md` (section 4 of `tables.md`) |
| v1.0.0 generator (legacy join), amended validator: ok rates 31.21% (Auto) and 100.00% (pattern modes); Auto invalid 68.79%; invalidity 95.70%, 99.93%, 10.74% by `straight`; 5751 of 12,150 (47.3%) Auto seam failures; 64.9% and 66.4% | `experiments/amendment-01/SUMMARY.md`; `experiments/e2/results/amendment-01/tables.md`, `SUMMARY.json` |
| SHA-256 `66a6af63...` of the amended E2 CSV and `812f416c...` of the original 0.5.0-era E2 CSV (commit 7f1c872) | `experiments/amendment-01/results-digests.json`, `experiments/amendment-01/SUMMARY.md` |
| Reproduction of the amended and the original 0.5.0-era E2 CSV at 1.0.0 (identical SHA-256), 256 s | [docs/test-run-1.0.0.txt](docs/test-run-1.0.0.txt) |
| numpy, pandas, matplotlib versions | output of `python3 -c "import numpy, pandas, matplotlib"` in the environment that produced the committed analysis files |
| E1 at 1.1.0: 9 engine runs, 1000 cases per join setting, 0 mismatches for `digest` and `contentDigest`; S2 (legacy) equal to v1.0.0 in 1000 of 1000 `contentDigest` and 0 of 1000 `digest` | `experiments/e1/results/v1.1.0/SUMMARY.md`, `NOTES.md` |
| E6 held-out: 40 seeds; dev 20 seeds; kink floor 12 degrees below the largest clean per-vertex turn of 13.6 degrees; height steps 1 to 10 units, 2,481 base tracks, 0 ok-to-not-ok changes, `MAX_SLOPE` rise 23.21% to 55.83% of 2,520 instances | `experiments/e6/results/heldout/SUMMARY.md`; `docs/validator.md` (dev and the 13.6 degree figure) |
| E7 held-out (30 seeds): Auto ok 29.55% (legacy) and 82.92% (tangent); straight = 0 88.64%; straight > 0 0.00% and 80.06%; width 80 45.6%; realised straight fraction 0.452 and 0.302 (ratio 0.617); length +3.5%; 0 of 4860 legacy ok | `experiments/e7/SUMMARY.md`; `docs/generator-auto-join.md` |
| E8 held-out (100 seeds): `MAX_SLOPE` 0 of 100 at height 20 and 100 of 100 at 80; at 20 max slope median 0.207, 95th percentile 0.252, maximum 0.289; elevation range median 48.58 | `experiments/e8/results/heldout/SUMMARY.md` |
| E3 valid-only re-run | `experiments/e3/results/amendment-01/SUMMARY.md`, `tables.md`; prediction file `experiments/amendment-01/ADDENDUM-E3.md` |

## Provenance

TrackSeed began as a web port (v0.4) of a Processing course project by the first author, Taewan Kim, made in his graduate studies; the port was then developed into the research tool described here. Course name and year: [PI: PROVENANCE]

## Citation

Cite the software with [CITATION.cff](CITATION.cff) (GitHub shows a "Cite this repository" entry). The file carries title, authors, ORCID iDs, licence and version 1.1.0; `date-released` is added at release.

## Licence

MIT, see [Licence.txt](Licence.txt) (identical text in `LICENSE`). Copyright (c) 2026 Taewan Kim. Third-party code and packages (the fdlibm notice that the sin, cos, atan and exp routines in `src/detmath.ts` derive from, three.js, and the development tools) are listed with their licences in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
