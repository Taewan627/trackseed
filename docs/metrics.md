# Geometric track metrics (`src/metrics.ts`)

`computeMetrics(track)` (CLI: `tracklab metrics`, `tracklab metrics-polyline`) returns purely geometric
quantities of the closed centreline. Nothing here estimates "fun" or "difficulty". The module is
deterministic: it uses only `+ - * /`, `Math.sqrt`, exact operations and `src/detmath.ts`
(`dhypot`, `datan2`), plus a local deterministic `dlog2` for the entropies. Input is `{ points }` with the
closing point repeating the first (TrackLab convention); n = `points.length - 1` samples.

## 1. Definitions

### 1.1 Discrete curvature
At sample i with neighbours a = p[i-1], b = p[i], c = p[i+1] (indices wrap), in the x/z plane:

    kappa_i = 2 * cross(b - a, c - b) / (|b - a| |c - b| |c - a|)

This is the signed Menger curvature, 1/R of the circle through the three samples. Positive when the x/z cross
product is positive. Coincident triples give 0. Unit: 1/unit (1/world unit).

### 1.2 Legacy (scale-dependent) fields, unchanged since v1.0

| Field | Definition | Unit |
|---|---|---|
| `sampleCount` | n | - |
| `length` | closed 3D arc length, sum of Euclidean segment lengths (x, y, z); this is L | unit |
| `boundingBoxArea` | x/z bounding-box area of the centreline points | unit^2 |
| `straightLengthFraction` | arc length of segments whose two end samples both have abs(kappa) < `STRAIGHT_KAPPA` = 5e-4 (radius >= 2000), divided by `length` | 1 |
| `meanAbsCurvature`, `maxAbsCurvature` | mean / max of abs(kappa_i) | 1/unit |
| `p95AbsCurvature` | nearest-rank 95th percentile: the ceil(0.95 n)-th smallest abs(kappa_i) | 1/unit |
| `curvatureHistogram` | counts of abs(kappa_i) per bin, lower edges `CURVATURE_BIN_EDGES` = [0, 5e-4, 1e-3, 2e-3, 4e-3, 8e-3, 1.6e-2, 3.2e-2] (last bin open) | count |
| `curvatureEntropyBits` | Shannon entropy of that histogram, -sum p log2 p, p = count/n | bits |
| `turnCount` | maximal circular runs of consecutive same-sign samples with abs(kappa) > `TURN_KAPPA` = 4e-3 (radius <= 250) | count |
| `elevationRange` | max(y) - min(y) | unit |
| `maxAbsSlope`, `meanAbsSlope` | max of abs(dy)/planar run; sum abs(dy) / sum planar run (zero-run segments skipped) | 1 |
| `totalTurningDegrees` | sum over vertices of abs heading change in x/z | degrees |
| `curvature` | signed kappa_i per sample (omitted from CLI output unless `--samples`) | 1/unit |

Reviewer-visible limitation: every curvature field above, and its fixed bin edges and thresholds, is expressed in
1/unit. Uniformly scaling a track by s divides every kappa by s, so the same shape lands in different bins
and classes. Legacy fields are kept bit-identical (experiments E3/E4/E5 depend on them; guarded by a fixture
test) and must not be compared across tracks of different size.

### 1.3 Scale-normalised (dimensionless) fields, added with the scale-normalisation work package (WP3b)

Normalised curvature:

    kappaHat_i = kappa_i * L / (2 pi),      L = `length`

L / (2 pi) = R_eq is the radius of the circle with the same perimeter, so kappaHat = R_eq / R. A circle of any
radius has kappaHat = 1 (exactly in the continuum limit; a regular n-gon gives n sin(pi/n)/pi = 1 - O(1/n^2),
about 1 - 3.2e-6 at n = 720). kappaHat is invariant under uniform scaling of x, y and z together.
If L = 0 all kappaHat are 0.

| Field | Definition |
|---|---|
| `meanAbsCurvatureNorm`, `p95AbsCurvatureNorm`, `maxAbsCurvatureNorm` | mean / nearest-rank p95 / max of abs(kappaHat_i), same conventions as the legacy fields |
| `curvatureHistogramNorm` | counts of abs(kappaHat_i) per bin, lower edges `CURVATURE_NORM_BIN_EDGES` (below) |
| `curvatureEntropyBitsNorm` | Shannon entropy (bits) of that histogram, range 0..3 (8 bins) |
| `straightLengthFractionNorm` | arc length of segments whose two end samples both have abs(kappaHat) < `STRAIGHT_KAPPA_NORM` = 0.25, divided by `length` |
| `turnCountNorm` | maximal circular same-sign runs with abs(kappaHat) > `TURN_KAPPA_NORM` = 2 |

No per-sample normalised array is emitted (the CLI summary only strips `curvature`, so it would bloat every
output); it is `curvature[i] * length / (2 * Math.PI)`.

**Bin edges** (dimensionless): [0, sqrt2/4, sqrt2/2, sqrt2, 2 sqrt2, 4 sqrt2, 8 sqrt2, 16 sqrt2]
= [0, 0.354, 0.707, 1.414, 2.828, 5.657, 11.314, 22.627]; last bin open.

Rationale, derived from the definition and not tuned on results:

* The legacy histogram is factor-2 log-spaced with 8 bins; the normalised one keeps that structure.
* Edges are 2^(j - 1/2): the bin [0.707, 1.414) is geometrically centred on the circle value 1. A first
  attempt with edges at integer powers of two put an edge exactly at 1, where the discretisation bias of a
  polygon (kappaHat slightly below 1) sends every circle sample into the bin below; the half-octave
  offset removes this knife edge.
* Edges are sqrt(2) times powers of two, so they are exact in floating point (no transcendental function).
* Range: the lowest bin (kappaHat < 0.354, radius > 2.83 R_eq) holds near-straight samples. In units of R_eq the
  top bin starts at radius 0.044 R_eq, i.e. about 11..22 units for L about 1.6e3..3.2e3 (R_eq about 260..510),
  which is the tight end of what the generator produces; anything tighter, including single-sample kinks,
  falls in the open top bin.
  Informational check, not used for selection: over 800 generated tracks (200 seeds x 4 parameter sets) 0.7 % of
  samples were in the top bin.

**Thresholds** are the legacy absolute thresholds expressed at the reference length L_ref = 2 pi * 500 (a circle
of radius 500, i.e. R_eq = 500, typical for default tracks): 5e-4 * 500 = 0.25 (straight: radius > 4 R_eq) and
4e-3 * 500 = 2 (turn: radius < R_eq / 2). For tracks with L near L_ref the normalised classification therefore
coincides with the legacy one; for other sizes it follows the track instead of the absolute unit. Both can be
overridden with `MetricsOptions.straightKappaNorm` / `turnKappaNorm`.

### 1.4 Width-relative tightness (not implemented)
A width-relative tightness (minimum radius / half road width) was considered. `MetricsInput` carries only the
centreline `points`; road width is a generator/document parameter that `computeMetrics` does not receive, and
extending `MetricsInput` would require changes outside this module (CLI/schema). It is therefore skipped.
Callers who know the width can compute it as `1 / ((width / 2) * maxAbsCurvature)`.

## 2. Known limitations

* **Sampling density.** Menger curvature is computed on the given samples. Denser sampling of the same smooth
  curve changes abs(kappa) by O(h^2) for smooth arcs, but a corner or kink (a few samples with a large
  turning angle) yields a spike whose height scales like 1/h, so `max*`, `p95*` and the top histogram bin are
  sampling-dependent. kappaHat removes dependence on physical size, not on sample count. Compare tracks with
  similar sample counts (or resample first, see `--resample-spacing` in `metrics-polyline`).
* **Planar curvature, 3D length.** kappa uses the x/z projection; L is the 3D length. For hilly tracks the
  normalisation is slightly larger than the planar length would give. Uniform scaling of all three axes still
  leaves kappaHat invariant; scaling y alone does not.
* **Non-uniform scaling and shape.** kappaHat is a size normalisation only; it does not make different shapes
  comparable beyond that, and a circle has kappaHat = 1 only up to the polygon bias above.
* **Reference length.** The default straight/turn thresholds are tied to L_ref = 2 pi * 500 by construction.
