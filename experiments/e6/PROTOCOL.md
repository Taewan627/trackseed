# E6 PROTOCOL: local-kink detection (response to red-team finding RT1)

Status: pre-registration. This file is committed ALONE, before any E6 evaluation (DEV or HELD-OUT) has been run.
Code that exists at this commit: `src/validate.ts` with the candidate detectors (commit 76eacdc, default behaviour unchanged).
Nothing in `experiments/e6/` other than this file exists yet; the runners are written after this commit and must implement
exactly what is written here. Any later change to this protocol is recorded in an addendum committed before the run it affects.

## 0. Why

The amended CLOSURE_TANGENT rule of v0.5.1 / v1.0.0 (fail iff theta0 > max(5 deg, 2 x max turn of the 3 vertices on each side))
was shown by an external red team to miss gross seam kinks: displacing the seam vertex laterally by d = 2..16 units on valid tracks
gives seam turns of 28..150 deg while the neighbourhood maximum is 14..78 deg (the displacement also bends the immediate
neighbours), so the ratio never fires (20/20 missed; the absolute rule caught all). A single interior vertex displaced by 30 units on a
40-wide road passes with only warnings: there is no interior kink check. Probe scripts: `redteam/probes/kink.mjs`, `kink2.mjs`
(reproduced by the auditor, and again by us on the candidate machinery: see 8).

## 1. Pre-protocol exploration (disclosed)

Before writing this protocol we ran two things, both on clean generated tracks only, no defect was injected and no detector candidate
was scored on defects: (i) the red-team probes against the candidate machinery (to check that the code runs); (ii) a one-off summary of
the clean tracks' per-vertex heading change and curvature x half-width for DEV seeds 50..59 (below) with curves {3,6,10}, width {20,40,80},
size 2, height 80, straight {0, 0.3, 0.6} (90 tracks per cell):

| set | spacing (units) | max per-vertex turn: median / 95th pct / max (deg) | max (turn per unit length) x (w/2): max |
|---|---|---|---|
| pattern modes, straight 0 | 8.0 | 5.6-6.5 / 7.6-8.8 / 7.9-8.9 | 0.51 |
| pattern modes, straight 0.3 / 0.6 | 7.9-8.0 | 5.6-6.6 / 10.1-12.0 / 12.6-13.6 | 0.56 |
| Auto, straight 0 | 2.5-18.2 | 3.2 / 10.7 / 11.3 | 1.71 |
| Auto, straight 0.3 / 0.6 | 2.5-18.2 | 51.9, 80.1 / 75.1, 125.5 / 75.3, 134.1 | 11.4, 14.9 |

Consequences used below: pattern modes round every straight/curve join (Gaussian smoothing, resampling at spacing 8), so ALL pattern-mode
tracks are smooth and are clean negatives, whatever `straight` is. Auto with `straight` > 0 joins linear and Catmull-Rom pieces without
smoothing; the join is a genuine heading discontinuity (up to 134 deg), so Auto with straight > 0 contains real kinks of the original
algorithm and is NOT a negative set (section 3.3). Auto with straight = 0 is a smooth closed Catmull-Rom curve and is a negative set.
The must-detect threshold of section 4 (30 deg) was chosen knowing that the clean maximum is 13.6 deg; this is a design choice informed
by clean data, not by any detection result.

## 2. Seeds and splits

SEEDS = the 200-seed list of `experiments/e1/cases.mjs` (SHA-256 of `JSON.stringify(SEEDS)` = 5c5e64d680cecf26dacdad15c0766f498c9c85a997c0df1531b49e5a327a9f07).
- DEV seeds: SEEDS[50..69] (20 seeds). Used to choose the detector and thresholds. Seeds 50..59 were used in the exploration of section 1.
- HELD-OUT seeds: SEEDS[100..139] (40 seeds). Evaluated once, after the freeze commit, with the frozen rule.
- E2 recheck (section 9) uses SEEDS[0..49] (the E2 seeds) and is a report of an effect, not a held-out test; it plays no role in selection.
The three seed ranges are disjoint. Every runner is deterministic (no wall-clock or Math.random data in the result files).

## 3. Test sets

All generated tracks use `generateTrack` of the commit being tested; a generation exception (hairpin occasionally throws) excludes the case from
every denominator and is counted and reported. Pattern modes (as E2): right-angle {cornerCount 2, cornerStrength 60}, hairpin {1, 80}, s-curve {3, 40}.

### 3.1 Clean negatives
- N1 (pattern modes): modes x curves {3,6,10} x straight {0,0.3,0.6} x width {20,40,80} x size {1,2,3} x height {0,200}: 486 cases per seed.
- N2 (Auto, straight 0): curves {3,6,10} x width {20,40,80} x size {1,2,3} x height {0,200}: 54 cases per seed.
  (DEV: 10,800 cases before generation failures; HELD-OUT: 21,600.) A negative is FLAGGED if the rule flags any vertex of the closed loop
  (LOCAL_KINK anywhere, or CLOSURE_TANGENT at the seam). FPR = flagged / generated, per track.
- N3 (synthetic smooth stress set, seed-free, 60 tracks): analytic closed centrelines (y = 0), edges built as in `core.ts` (neighbour-difference normals,
  offset width/2, Math.fround). Purpose: reject detectors that depend on the generator's sampling density. Vertices are generated with
  detmath dcos/dsin.
  - circle: R in {100, 400} x n in {12, 24, 48, 96, 192, 384} x width {20,40,80}: 36 tracks, points (R cos(2 pi i/n), R sin(2 pi i/n)). (n = 12 has a uniform turn of 30 deg
    per vertex; the v0.5.1 test suite already requires such a track to be ok.)
  - ellipse: semi-axes 600 and 300, n in {24, 48, 96, 192, 384} x width {20,40,80}: 15 tracks, points (600 cos t, 300 sin t), t = 2 pi i/n.
  - stadium: two straights of length 400 joined by two semicircles of radius 150 (centres (+-200, 0)), arc step delta in {5, 10, 15} deg
    (a = 180/delta points per semicircle, m = round(400/(150 x delta_rad)) points per straight, evenly spaced, in the order: lower straight left to right, right semicircle
    from -90 to +90 deg, upper straight right to left, left semicircle from 90 to 270 deg, each piece without its end point), width {20,40,80}: 9 tracks.
  N3 FPR is a count of 60 (one false positive is 1.7%), so "N3 FPR <= 1%" means zero false positives.

### 3.2 Defect bases and defect instances
Bases (clean, y included): per seed, size 2, height 80, mode x curves {3,6,10} x width {20,40,80}, with straight 0 for all four modes and, in addition, straight 0.3
for the three pattern modes: 9 (Auto) + 54 (pattern) = 63 bases per seed (DEV 1260, HELD-OUT 2520 before generation failures). The centreline has n = points.length - 1
distinct vertices; vertex indices are closed-loop indices 0..n-1 (0 is the seam; `points[n]` is a copy of `points[0]`). Edges of every defective track are RECOMPUTED
from the modified centreline with the generator's formula (`core.ts`: normal i = left normal of (p[i+1 mod n] - p[i-1 mod n]), unit length; edge side s = p + s x normal x width/2;
edge x, y, z through Math.fround), so a defect is a defective centreline of a track built by the normal pipeline. All displacement signs and indices are drawn from
mulberry32(u32) where u32 = first 4 bytes (big-endian) of SHA-256 of the string `seed|mode|curves|straight|width|operator|level` (operator in {seamSpike, interiorSpike, corner, tangent, heightStep}).
The draws are in this order: sign s = (r() < 0.5 ? -1 : +1); interior index i = 8 + floor(r() x (n - 16)) (so 8 <= i <= n - 9).

Operators and levels (22 instances per base):
1. seamSpike(d), d in {1, 2, 4, 8, 16}: points[0] and points[n] displaced by s x d x u0, where u0 is the unit left normal of (p[1] - p[n-1]) (a lateral displacement of the seam vertex of d units; closure is preserved).
2. interiorSpike(d), d in {1, 2, 4, 8, 16}: point i displaced by s x d x u_i (same normal definition). Window W = {i-1, i, i+1}.
3. corner(alpha), alpha in {20, 30, 45, 60, 90} deg, k = 4: A = p[i-4], B = p[i+4], L = |B - A|, M = midpoint, v = unit left normal of B - A. Apex P = M + s x h x v with h = (L/2) tan(alpha/2) (dsin/dcos).
   Points i-4+j (j = 1..3) are placed at A + (j/4)(P - A); point i at P; points i+j (j = 1..3) at P + (j/4)(B - P). Heights unchanged. The turn at the apex equals alpha (the polyline A-P-B is a symmetric
   triangle apex; the joints at A and B turn alpha/2). Window W = {i-4, ..., i+4}.
4. tangent(phi), phi in {10, 20, 45} deg, m = 8: points 1..m rotated by s x phi about points[0] in the x/z plane (y unchanged); points[0] and points[n] stay. The heading entering the seam is unchanged and the heading
   leaving it changes by phi: a tangent mismatch phi at the seam, with the unavoidable compensating corner of phi at vertex m. Window W = {n-1, 0, 1} union {m-1, m, m+1}.
5. heightStep(dy), dy in {1, 2, 5, 10}: y of points[i] (and the y of both edge points at i) increased by dy. No planar change.

### 3.3 Auto with straight > 0 (descriptive set, HELD-OUT seeds only, no tuning)
Auto, straight in {0.3, 0.6}, curves {3,6,10} x width {20,40,80}, size 2, height 80: 18 cases per seed. Oracle (independent of any detector, from the generator's own construction): at waypoint k the join
deflection is the angle between the end tangent of segment k-1 and the start tangent of segment k, where a straight segment b->c has tangent c - b at both ends and a Catmull-Rom segment (a,b,c,d) has start tangent (c - a)/2 and end tangent (d - b)/2.
A track is "genuine-kink" if its largest join deflection >= 30 deg and "smooth-join" if all join deflections < 10 deg. Reported: fraction of each group flagged by each rule.

## 4. Defect size, must-detect, below-threshold

For a defective track the SIZE of an instance of operators 1-4 is S = the largest heading change (degrees, unsigned, x/z plane, computed independently of src/validate.ts with datan2 at the closed-loop vertices) over the window W of the instance.
For a spike, S = about 2 atan(d / spacing) at the spiked vertex, so equal nominal d gives different S at different sampling densities: the nominal level is reported for orientation, S decides the class.
- MUST-DETECT: S >= 30 deg. Justification: the clean maxima are 13.6 deg (pattern modes) and 11.3 deg (Auto straight 0), so 30 deg is more than twice anything natural; a 30 deg change in one step at the generator's pattern spacing 8 is a local radius of about 15 units, below the half width of a 40-wide road
  (and this implies the road ribbon is pinched on the inside); it is also exactly the turn of the reference polygon of N3 (n = 12), which is NOT a defect (uniform curvature), which is why the rule must judge a vertex against its surroundings or against scale, not by a bare angle (see 5). The claim to be tested is: a validator should reject every instance with S >= 30 deg.
- GREY ZONE: 15 deg <= S < 30 deg. Reported, not scored (not claimed detected, not claimed missed).
- BELOW THRESHOLD: S < 15 deg. Reported, not scored; within natural variation, a validator may not flag it.
Height steps (operator 5) are outside the scope of a planar kink rule and have no must-detect class; they are reported as flagged-or-not by MAX_SLOPE (a warning: its failure count is higher than on the clean base), nothing is claimed.
A lateral-size cross-check (d / (w/2) for operators 1-2) is recorded per instance but does not enter any decision.
Detection of an instance (operators 1-4) by a rule = the rule reports CLOSURE_TANGENT or LOCAL_KINK at a vertex in the window W (so a flag elsewhere on the track, for instance a false positive of the base, does not count).
A second, secondary measure is validator-level: the base is ok and the defective track is not ok.

## 5. Candidate detectors

Implemented in `src/validate.ts` (`kinkProfile`, `kinkFlags`; options `kinkRule` and the parameters below); evaluated for the DEV selection from the SAME code, so the selected rule is the validator's rule. Notation: theta_i = heading change at vertex i (degrees, closed indexing), s_i = mean length of the two adjacent
segments, hw = width / 2, dev_i = distance of vertex i from the chord of its two neighbours.
- A1 `turn`: flag iff theta_i > T. Grid T in {10,12,14,16,18,20,22,24,26,28,30,35,40} (13).
- A2 `curvature`: flag iff (theta_i in radians / s_i) x hw > c (c = 1 means local radius = half width). Grid c in {0.25,0.5,0.75,1,1.5,2,3,4,6,8} (10).
- B `outlier`: ref_i = the q-quantile (lower empirical quantile: element ceil(q m) of m sorted values) of theta_j over the distinct vertices j in {i +- 2, ..., i +- K} (i +- 1 are excluded because a single-vertex spike bends them too);
  flag iff theta_i > max(F, r x ref_i). Grid K in {3,5} x q in {0.5 (median), 1 (maximum)} x r in {2,3,4} x F in {8,10,12,15,20,25,30} (84).
- C `spike`: flag iff dev_i / s_i > ts AND dev_i > tw x hw. Grid ts in {0.1,0.2,0.3,0.5} x tw in {0.05,0.1,0.25,0.5} (16).
- B+A2 (vertex flagged by both): every B configuration x c in {0.5, 1, 2} (252).
- B+C (vertex flagged by both): every B configuration x (ts, tw) in {(0.2,0.1), (0.2,0.25), (0.5,0.1), (0.5,0.25)} (336).
Total 711 configurations. Parameters are enumerated in the order listed, the last-listed parameter varying fastest. The seam is treated as any other vertex; in the validator it is reported as CLOSURE_TANGENT, the other vertices as LOCAL_KINK.

## 6. Pre-specified selection criterion (DEV only)

For every configuration compute on the DEV sets: FP(N1+N2) and FP(N3) counts, and the recall on must-detect instances of each of operators 1-4 (instances with S >= 30 deg, pooled over modes and levels), and their mean (macro recall).
1. Admissible: FPR on N1+N2 <= 1% AND zero false positives on N3.
2. Among admissible configurations, maximise macro recall.
3. Ties (macro recall within 0.005 of the best): fewest false positives over N1+N2+N3.
4. Remaining ties: lowest family complexity in the order A1 (1 parameter) < A2 (1) < C (2) < B (4) < B+A2 (5) < B+C (6).
5. Remaining ties within one family: the configuration at position floor((m-1)/2), 0-based, of the m tied configurations in enumeration order (for the one-parameter families this is the centre of the plateau).
If NO configuration is admissible, or the best admissible macro recall is < 0.90, the criterion is declared NOT MET, no default is changed to a new rule, and this is the reported result.
Auto: N2 flags count as false positives (Auto straight 0 is smooth by construction). Flags on Auto with straight > 0 are NOT false positives (section 3.3); they are reported separately and never enter the selection.
The chosen detector and thresholds are written to `results/dev/FROZEN.json` and committed together with the DEV results BEFORE any HELD-OUT run.

## 7. HELD-OUT evaluation (once)

Run once with the frozen rule, through `validateTrack` (options `closureTangentMode: 'kink'` plus the frozen parameters, `maxViolationsPerCheck` large), and with the legacy modes 'absolute' and 'ratio' (tangentToleranceDegrees 5, seamRatio 2, i.e. the v1.0.0 defaults) on the same cases. Reported: per operator and nominal level
the number of instances, number must-detect, recall on must-detect with Wilson 95% CI, detection over all instances; per mode; FPR (Wilson 95% CI) on N1, N2, N3 for each rule; validator-level detection; heightStep MAX_SLOPE rates; section 3.3. For transparency the best DEV configuration of each family (same criterion restricted to the family) is also evaluated on
HELD-OUT through the same code path; the chosen rule is the frozen one regardless of how the others fare. A figure (`results/heldout/figures/`) shows detection rate vs nominal level per operator per rule and the false-positive rates with Wilson CIs. A determinism check runs the HELD-OUT script twice and compares the SHA-256 of the result JSON.

Predictions fixed here (observation of them is reported as confirmed / not confirmed):
- P1: legacy ratio detects <= 10% of must-detect seamSpike instances (red team: 0/20) and ~0% of interior operators (it has no interior check).
- P2: legacy absolute (5 deg) detects >= 95% of must-detect seam operators (seamSpike, tangent), ~0% of interior operators, and has FPR >= 10% on N1 (E2 amendment: 16-20% of pattern-mode tracks fail it).
- P3: the frozen rule: recall >= 95% on must-detect instances of each of operators 1-4, FPR <= 1% on N1 and on N2, zero flags on N3. If either bound is missed on HELD-OUT it is reported as missed; the rule is not re-tuned.
- P4: A1 `turn` is inadmissible unless T >= 35 (a bare threshold below 30 flags the n = 12 circle of N3 at 30 deg), so the selection will use a scale- or context-aware family.

## 8. Implementation checks (not results)
`kink.mjs` and `kink2.mjs` of the red team, run on the candidate machinery with placeholder parameters, confirm that the code path flags the seam spike (d >= 2) and the interior spike (d = 8..30) for every family (output not retained, no scoring).

## 9. E2 recheck (post-RT1 validator v1.1)
After the freeze and the HELD-OUT run: the 48,600 E2 cases (`experiments/e2/grid.mjs`, same parameters and seeds SEEDS[0..49]) are regenerated at this commit and validated with (a) 'ratio' (must reproduce `experiments/e2/results/amendment-01/validity.csv.gz` on `ok`, a consistency check of the regeneration) and (b) the new default. Reported per mode with Wilson 95% CIs: ok rate under each, and the number of tracks whose ok status changes in each direction. Output only to `experiments/e6/results/e2-recheck/` (no old result file is touched).
Predictions: pattern modes change ok status in <= 1% of tracks; Auto's ok rate falls by >= 3 percentage points (interior join kinks of Auto with straight > 0 are now flagged), and some Auto tracks that failed CLOSURE_TANGENT under 'ratio' may pass under 'kink' (if the frozen rule's limit exceeds their seam turn); both directions are reported.

## 10. Out of scope / known limitations stated in advance
- Vertical (y) discontinuities are not a planar kink and are not addressed by LOCAL_KINK.
- The generator's sampling is spacing 8 (pattern modes) and 2.5-18 (Auto); behaviour on tracks sampled far more finely or coarsely than this is covered only by the analytic N3 set.
- Defects are synthetic operators; they show what is detected, not how often real-world defects occur.
