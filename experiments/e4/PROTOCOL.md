# E4 protocol (pre-registration): baseline track generators under the same validator and metrics

Status: committed before any E2 or E4 result exists and before any baseline code exists. Later edits to this file are deviations and must be listed in the DEVIATIONS section of results/SUMMARY.md, never made here.

## Question

How do two minimal, commonly used procedural track generators compare with TrackLab under the identical validator (`validateTrack`, default options) and identical metrics (`computeMetrics`)? Only per-metric observations are made; no overall "better" claim is made or sought.

## Baselines (experiments/e4/baselines/, TypeScript, using src/detmath.ts and `random(seed)` from src/core.ts; no Math.sin/cos/atan2/hypot/exp/log/pow)

Common to all baselines: output object with `params` ({width} plus the grid parameters), `points` (closed, last point = copy of first, arc-length resampled), `normals` and `roadEdges` computed exactly as in src/core.ts generateTrack (normal = (-dz, dx)/|.| from neighbours i-1, i+1; edges = point -/+ normal * width / 2 stored through `Math.fround`), `straightSegments` (all false; length = number of control vertices), `length`, `bounds` (same formula, margin width/2 + 2.5 + 17), `props` = [], `obstacles` = []. Vertical profile: y = `elevation(k/N, p)` of src/core.ts with p = sanitize({height, seed}), k = point index, N = number of distinct points (baselines are flat when height = 0). Travel direction is counter-clockwise in the x/z plane (increasing angle, the TrackLab convention, which the fold test depends on). Resampling: the spline is evaluated at 100 parameter samples per segment, the dense polyline is cumulative-arc-length parameterised, and N = max(8, round(L / 8)) points are placed at equal arc-length spacing (target spacing 8 units; nominal, the actual spacing is L/N). Sensitivity variants use target spacing 4 and 12.

- B1 "convex hull + Catmull-Rom": N0 = 4 x curves random points uniform in the square [-R, R]^2; convex hull (Andrew monotone chain, counter-clockwise); one pass of midpoint displacement: after every hull edge insert its midpoint displaced along the edge's perpendicular by (2u - 1) x 0.25 x edge length (u uniform draw); centripetal Catmull-Rom (alpha = 0.5, Barry-Goldman form, closed loop) through the resulting vertices. PRNG stream `random(seed ^ 0x0b1ca001)`; draws in order: x0, z0, x1, z1, ... then one per hull edge for displacement. If the hull has fewer than 3 vertices the case is a generation failure (no retry).
- B2 "random radial waypoints + Catmull-Rom": K = curves waypoints; angles = K independent uniform draws on [0, 2 pi) sorted ascending (not evenly spaced); radius = R x (0.7 + 0.4 u); x = r cos(a), z = r sin(a) (detmath); uniform Catmull-Rom (the textbook form, same basis as `catmull` in src/core.ts) through the waypoints as a closed loop, no straight segments (pure spline). PRNG stream `random(seed ^ 0x0b2ca002)`; draws: K angles, then K radii.
- (B3 Voronoi is not implemented; stated as out of scope.)

Choices documented: B1 uses centripetal parameterisation (the common remedy against cusps and loops) while B2 uses uniform (the minimal textbook version, which is also the basis TrackLab itself uses); both are therefore different from each other on purpose.

## Scale matching

R = 300 + 60 x size (the radius of src/core.ts generateTrack). B2 draws radii from the same band as TrackLab's waypoints (0.7 R to 1.1 R) and the same number of control points (curves); B1 draws its points in [-R, R]^2 (half-extent R, comparable to the waypoint ring); width and height are the TrackLab parameters verbatim. After the run the matching is checked and REPORTED (median length and boundingBoxArea of each generator) but never adjusted.

Known mismatch, stated up front: TrackLab uses 60 samples per spline segment (spacing about length / (60 x curves), from about 4 to 12 units depending on curves), the baselines use about 8 units. Curvature-derived metrics depend on sampling; the sensitivity variants (spacing 4 and 12) quantify this for the baselines.

## Cases

Baseline grid: seeds = the same 50 seeds as E2 (E1 list, first 50) x curves {3, 6, 10} x width {20, 40, 80} x size {1, 2, 3} x height {0, 80, 200} = 4,050 cases per baseline per spacing. Primary spacing 8 (B1, B2: 8,100 cases); sensitivity spacings 4 and 12 (16,200 more cases). `straight` and corner patterns do not exist for the baselines.

TrackLab comparison sets (taken from experiments/e2/results/validity.csv.gz, identical (seed, curves, width, size, height) cells):
- TL-Auto: Auto mode, all three `straight` levels (12,150 cases, balanced);
- TL-Auto0: Auto mode, straight = 0 (4,050 cases; the closest analogue of a pure spline);
- TL-right-angle, TL-hairpin, TL-s-curve (12,150 cases each, all `straight` levels).

## Measures

1. Generation-failure rate and validator ok rate (among generated tracks), Wilson 95% CI, per generator and set; end-to-end rate (generated and ok) / cases; violation-code incidence per generator.
2. Per metric (the 13 TrackMetrics scalars of experiments/e2/PROTOCOL.md): median and IQR per generator/set over generated tracks (primary) and over valid tracks only (secondary).
3. Per-metric effect size of each baseline versus TL-Auto0 and versus TL-Auto: Cliff's delta (probability that a baseline value exceeds a TrackLab value minus the reverse, via average ranks), labelled by |delta| < 0.147 negligible, < 0.33 small, < 0.474 medium, else large. Unpaired; the cells are matched but tracks are not paired.
4. Expressive range, same three metric pairs, same 30 x 30 grid rule and shared bins as experiments/e3/PROTOCOL.md but with the bin range taken over the pooled union of all generators of the comparison; per generator occupied bins and 2D histogram entropy; figure: histogram per generator (B1, B2, TL-Auto, TL-Auto0, TL-right-angle, TL-hairpin, TL-s-curve) for pair 1 and pair 2 (pair 3 is dominated by the shared elevation profile and is shown for completeness in the same figure family).
5. Sanity gate before running the grid (reported, not a result): a perfect circle of radius 300 sampled with 8-unit spacing, run through the baseline common code, must validate ok at width 20, 40 and 80 (this verifies orientation and edge conventions of the common code); the baseline code is deterministic (the whole baseline run is executed twice and the CSV SHA-256s must match).

## Predictions (written before any run)

1. Validity among generated tracks (ok rate), highest to lowest: B1 > TL-Auto0 > B2; every one of B1, B2, TL-Auto0 is below 100% (width 80 on tight corners folds the road edges of any pure spline).
2. B1 has the highest median straightLengthFraction of {B1, B2, TL-Auto0} (hull edges are long and nearly straight under centripetal interpolation).
3. B2 has the highest p95AbsCurvature / maxAbsCurvature of the three (sorted uniform angles make clustered waypoints and tight turns).
4. TL pattern modes have higher median totalTurningDegrees than both baselines.
5. No generator has a larger occupied-bin count than all others in all three pairs (no uniformly dominant generator in expressive range).
