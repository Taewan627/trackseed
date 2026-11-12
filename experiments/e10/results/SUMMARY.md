# E10 results: adversarial classes for the validator (HELD-OUT)

Protocol: `experiments/e10/PROTOCOL.md` (committed alone before the harness). Evaluation seeds: 40 (E6 HELD-OUT SEEDS[100..139]); 257124 instance rows; generated {"N1":[19436,4],"N2":[2160,0],"N4":[4320,0],"BASE":[2520,0]} [generated, failed].
Intervals: seed-clustered percentile bootstrap (B=2000, mulberry32(20261114), 95%); degenerate cells show the seed-level Clopper-Pearson bound instead. Polygons and N3 are seed-free design grids (Wilson). Percentages; cell = rate [interval].

Rules: R1 = v1.3 default; R2 = v1.3, SHARP off; R3 = v1.3, UNDERSAMPLED off; R4 = v1.2 (both off); R5 = legacy ratio. M1 = error detection among instances whose base is ok under the same rule; M2 = kink-family flag (LOCAL_KINK, CLOSURE_TANGENT, SHARP_VERTEX) inside the defect window; under = UNDERSAMPLED present; warnedOnly = ok with a new warning; silent = ok with no new warning.

**Disclosure repeated:** the 30 degrees of SHARP_VERTEX were chosen after the RT3 probes were seen, on TrackSeed's own tracks; E10 is not an independent confirmation of the threshold (PROTOCOL section 0).

## Predictions

Tally: 11 held, 4 failed of 15; construction-labelled checks: 3 of 3 held; the other predictions: 8 of 12 held.

| id | kind | verdict | part | observed |
|---|---|---|---|---|
| P1 ok(R1)=ok(R3), ok(R2)=ok(R4); (d) equals E6 columns; R1 kinkWin = R4 kinkWin for S<30 | construction | **held** (ok) | ok(R1) != ok(R3): 0 | 0 of 257124 rows (clean sets with different not-ok counts R1/R3 or R2/R4: 0) |
|  |  |  (ok) | ok(R2) != ok(R4): 0 | 0 of 257124 rows |
|  |  |  (ok) | class (d), R4/R5 kinkWin equal E6 frozen/ratio on all 45,360 instances | {"e6Rows":45360,"dRows":45360,"matched":45360,"notFoundInE6":0,"mismatches":0} |
|  |  |  (ok) | kinkWin(R1) = kinkWin(R4) on every instance with S<30 (grey, sub) | 0 differences in 44152 instances |
| P2 R1 detects 100% of must instances (a), (b), (d), polygons n<=11 | construction | **held** (ok) | 100% | 205597 of 205597 |
| P3 paired spikes, R4, M2, must: masking for gaps 2-4 | informed | **held** (ok) | gap 2 <= 5% | 0.0% |
|  |  |  (ok) | gap 3 <= 5% | 0.0% |
|  |  |  (ok) | gap 4 <= 5% | 0.8% |
|  |  |  (ok) | gap 5 >= 95% | 100.0% |
|  |  |  (ok) | gap 6 >= 95% | 100.0% |
| P4 zigzag patches, R4, M2, must pooled <= 2% | informed | **held** (ok) | <= 2% | 0.0% |
| P5 class (d): R4 100% on must, R5 equals E6 | informed | **held** (ok) | R4 seamSpike must = 100% | 100.0% |
|  |  |  (ok) | R4 interiorSpike must = 100% | 100.0% |
|  |  |  (ok) | R4 corner must = 100% | 100.0% |
|  |  |  (ok) | R4 tangent must = 100% | 100.0% |
|  |  |  (ok) | R5 seamSpike must = 54.2% (E6) | 54.2% |
|  |  |  (ok) | R5 interiorSpike must = 0.0% (E6) | 0.0% |
|  |  |  (ok) | R5 corner must = 0.0% (E6) | 0.0% |
|  |  |  (ok) | R5 tangent must = 93.7% (E6) | 93.7% |
| P6 R1 M1 paired spikes by c | blind | **failed** (FAILED) | R1 M1 c 0.1: 55.0%..85.0% | 86.1% |
|  |  |  (ok) | R1 M1 c 0.25: 93.0%..100.0% | 100.0% |
|  |  |  (ok) | R1 M1 c 0.5: 98.0%..100.0% | 100.0% |
|  |  |  (ok) | R1 M1 c 1: 98.0%..100.0% | 100.0% |
| P7 R1 M1 zigzag by period and c | blind | **failed** (ok) | R1 M1 period 2, c 0.02: 25.0%..60.0% | 36.0% |
|  |  |  (ok) | R1 M1 period 2, c 0.05: 60.0%..90.0% | 89.2% |
|  |  |  (ok) | R1 M1 period 2, c 0.1: 95.0%..100.0% | 99.9% |
|  |  |  (ok) | R1 M1 period 2, c 0.25: 95.0%..100.0% | 100.0% |
|  |  |  (ok) | R1 M1 period 2, c 0.5: 95.0%..100.0% | 100.0% |
|  |  |  (FAILED) | R1 M1 period 4, c 0.02: 0.0%..20.0% | 33.9% |
|  |  |  (ok) | R1 M1 period 4, c 0.05: 30.0%..65.0% | 57.2% |
|  |  |  (ok) | R1 M1 period 4, c 0.1: 60.0%..90.0% | 89.0% |
|  |  |  (ok) | R1 M1 period 4, c 0.25: 95.0%..100.0% | 100.0% |
|  |  |  (ok) | R1 M1 period 4, c 0.5: 95.0%..100.0% | 100.0% |
| P8 M1 by size class, pooled (a)+(b) | blind | **failed** (ok) | R1 M1 must: 100.0%..100.0% | 100.0% |
|  |  |  (FAILED) | R4 M1 must: 35.0%..75.0% | 79.3% |
|  |  |  (FAILED) | R1 M1 grey: 25.0%..60.0% | 25.0% |
|  |  |  (ok) | R4 M1 grey: 0.0%..25.0% | 25.0% |
|  |  |  (ok) | R1 M1 sub: 0.0%..15.0% | 1.3% |
|  |  |  (ok) | R4 M1 sub: 0.0%..5.0% | 1.3% |
| P9 the M1 gain of v1.3 over v1.2 comes from SHARP_VERTEX only | construction/informed | **held** (ok) | R3 = R1 and R2 = R4 on `ok` | 0 and 0 differences; instances where only SHARP_VERTEX makes R1 fail but R2 ok: 37538 |
| P10 UNDERSAMPLED rate on zigzag, paired spikes, class (d) | blind | **held** (ok) | UNDERSAMPLED period 2, L 8, c>=0.05: 0.0%..1.0% | 0.0% |
|  |  |  (ok) | UNDERSAMPLED period 2, L 16, c>=0.05: 0.0%..3.0% | 0.1% |
|  |  |  (ok) | UNDERSAMPLED period 2, L 32, c>=0.05: 35.0%..70.0% | 63.7% |
|  |  |  (ok) | UNDERSAMPLED period 2, L 64, c>=0.05: 90.0%..100.0% | 100.0% |
|  |  |  (ok) | UNDERSAMPLED period 4, L 8, c>=0.05: 0.0%..3.0% | 0.0% |
|  |  |  (ok) | UNDERSAMPLED period 4, L 16, c>=0.05: 0.0%..3.0% | 0.0% |
|  |  |  (ok) | UNDERSAMPLED period 4, L 32, c>=0.05: 0.0%..3.0% | 1.1% |
|  |  |  (ok) | UNDERSAMPLED period 4, L 64, c>=0.05: 35.0%..70.0% | 60.5% |
|  |  |  (ok) | paired spikes pooled <= 2% | 0.0% |
|  |  |  (ok) | class (d) pooled <= 2% | 0.0% |
| P11 regular polygons | informed | **held** (ok) | R1 error 100% for n=3..11 | 100.0% 100.0% 100.0% 100.0% 100.0% 100.0% 100.0% 100.0% 100.0% |
|  |  |  (ok) | R1 error 0% for n=13..16 | 0.0% 0.0% 0.0% 0.0% |
|  |  |  (ok) | n=12 reported (excluded) | R1 error 100.0% |
|  |  |  (ok) | UNDERSAMPLED in all 84 under R1 and R2 | R1 100.0%, R2 100.0% |
|  |  |  (ok) | R4 error <= 10% for n>=4 | 0.0% 0.0% 0.0% 0.0% 0.0% 0.0% 0.0% 0.0% 0.0% 0.0% 0.0% 0.0% 0.0% |
|  |  |  (ok) | R4 error 100% for n=3 | 100.0% |
|  |  |  (ok) | R5 error <= 10% for n>=4 | 0.0% 0.0% 0.0% 0.0% 0.0% 0.0% 0.0% 0.0% 0.0% 0.0% 0.0% 0.0% 0.0% |
| P12 down-sampled clean bases | blind | **failed** (ok) | k=2 SHARP_VERTEX (max turn > 30) share: 0.0%..3.0% | 0.0% (of 2520); R1 M1 any error 0.0% |
|  |  |  (ok) | k=2 UNDERSAMPLED: 10.0%..55.0% | 30.1% |
|  |  |  (ok) | k=2 R4 kinkWin <= 15% | 0.0% |
|  |  |  (ok) | k=4 SHARP_VERTEX (max turn > 30) share: 20.0%..50.0% | 25.5% (of 2520); R1 M1 any error 30.4% |
|  |  |  (FAILED) | k=4 UNDERSAMPLED: 85.0%..100.0% | 83.7% |
|  |  |  (FAILED) | k=4 R4 kinkWin <= 15% | 26.7% |
|  |  |  (FAILED) | k=8 SHARP_VERTEX (max turn > 30) share: 90.0%..100.0% | 81.2% (of 2520); R1 M1 any error 81.6% |
|  |  |  (FAILED) | k=8 UNDERSAMPLED: 98.0%..100.0% | 97.4% |
|  |  |  (FAILED) | k=8 R4 kinkWin <= 15% | 59.9% |
|  |  |  (FAILED) | k=16 SHARP_VERTEX (max turn > 30) share: 98.0%..100.0% | 96.6% (of 2520); R1 M1 any error 96.7% |
|  |  |  (ok) | k=16 UNDERSAMPLED: 98.0%..100.0% | 100.0% |
|  |  |  (FAILED) | k=16 R4 kinkWin <= 15% | 25.8% |
| P13 clean negatives: kink-family FP and UNDERSAMPLED | informed | **held** (ok) | R1 kink-family FP N1 = 0 | 0/19436 |
|  |  |  (ok) | R1 kink-family FP N2 = 0 | 0/2160 |
|  |  |  (ok) | R1 kink-family FP N4 = 0 | 0/4320 |
|  |  |  (ok) | R1 kink-family FP BASE = 0 | 0/2520 |
|  |  |  (ok) | R1 UNDERSAMPLED N1 = 0 | 0/19436 |
|  |  |  (ok) | R1 UNDERSAMPLED N2 = 0 | 0/2160 |
|  |  |  (ok) | R1 UNDERSAMPLED N4 = 0 | 0/4320 |
|  |  |  (ok) | R4 kink FP N1 = 0 | 0/19436 |
|  |  |  (ok) | R5 kink FP N1 = 0 | 0/19436 |
|  |  |  (ok) | R4 kink FP N2 = 0 | 0/2160 |
|  |  |  (ok) | R5 kink FP N2 = 0 | 0/2160 |
|  |  |  (ok) | R4 kink FP N4 = 0 | 0/4320 |
|  |  |  (ok) | R5 kink FP N4 <= 2% | 0/4320 = 0.0% |
| P14 N3 synthetic | informed | **held** (ok) | R1 kink flags <= 6 of 60 (expected 6) | 6 |
|  |  |  (ok) | R4 kink flags = 0 | 0 |
|  |  |  (ok) | UNDERSAMPLED 12..21 of 60 | 21 |
| P15 N4 any-error rate (context) | informed | **held** (ok) | R1 N4 any-error 15..25% | 17.7% |
|  |  |  (ok) | R2 N4 any-error 15..25% | 17.7% |
|  |  |  (ok) | R3 N4 any-error 15..25% | 17.7% |
|  |  |  (ok) | R4 N4 any-error 15..25% | 17.7% |
|  |  |  (ok) | N4 error codes only EDGE_FOLD, SELF_INTERSECTION_EDGE (R1) | EDGE_FOLD,SELF_INTERSECTION_EDGE |

## Clean negatives (kink-family flag anywhere = primary FP; any-error and warnings for context)

| set | rule | n | kink-family FP | any error | any warning | UNDERSAMPLED | error codes (tracks) |
|---|---|---|---|---|---|---|---|
| N1 | R1 | 19436 | 0.0 [seeds: CP 0.0-8.8] (0/19436) | 0.0 [seeds: CP 0.0-8.8] (0/19436) | 50.0 [50.0, 50.0] (9718/19436) | 0.0 [seeds: CP 0.0-8.8] (0/19436) | {} |
| N1 | R2 | 19436 | 0.0 [seeds: CP 0.0-8.8] (0/19436) | 0.0 [seeds: CP 0.0-8.8] (0/19436) | 50.0 [50.0, 50.0] (9718/19436) | 0.0 [seeds: CP 0.0-8.8] (0/19436) | {} |
| N1 | R3 | 19436 | 0.0 [seeds: CP 0.0-8.8] (0/19436) | 0.0 [seeds: CP 0.0-8.8] (0/19436) | 50.0 [50.0, 50.0] (9718/19436) | 0.0 [seeds: CP 0.0-8.8] (0/19436) | {} |
| N1 | R4 | 19436 | 0.0 [seeds: CP 0.0-8.8] (0/19436) | 0.0 [seeds: CP 0.0-8.8] (0/19436) | 50.0 [50.0, 50.0] (9718/19436) | 0.0 [seeds: CP 0.0-8.8] (0/19436) | {} |
| N1 | R5 | 19436 | 0.0 [seeds: CP 0.0-8.8] (0/19436) | 0.0 [seeds: CP 0.0-8.8] (0/19436) | 50.0 [50.0, 50.0] (9718/19436) | 0.0 [seeds: CP 0.0-8.8] (0/19436) | {} |
| N2 | R1 | 2160 | 0.0 [seeds: CP 0.0-8.8] (0/2160) | 10.2 [9.0, 11.5] (220/2160) | 55.3 [54.8, 55.9] (1195/2160) | 0.0 [seeds: CP 0.0-8.8] (0/2160) | {"SELF_INTERSECTION_EDGE":218,"EDGE_FOLD":220} |
| N2 | R2 | 2160 | 0.0 [seeds: CP 0.0-8.8] (0/2160) | 10.2 [9.0, 11.5] (220/2160) | 55.3 [54.8, 55.9] (1195/2160) | 0.0 [seeds: CP 0.0-8.8] (0/2160) | {"SELF_INTERSECTION_EDGE":218,"EDGE_FOLD":220} |
| N2 | R3 | 2160 | 0.0 [seeds: CP 0.0-8.8] (0/2160) | 10.2 [9.0, 11.5] (220/2160) | 55.3 [54.8, 55.9] (1195/2160) | 0.0 [seeds: CP 0.0-8.8] (0/2160) | {"SELF_INTERSECTION_EDGE":218,"EDGE_FOLD":220} |
| N2 | R4 | 2160 | 0.0 [seeds: CP 0.0-8.8] (0/2160) | 10.2 [9.0, 11.5] (220/2160) | 55.3 [54.8, 55.9] (1195/2160) | 0.0 [seeds: CP 0.0-8.8] (0/2160) | {"SELF_INTERSECTION_EDGE":218,"EDGE_FOLD":220} |
| N2 | R5 | 2160 | 0.0 [seeds: CP 0.0-8.8] (0/2160) | 10.2 [9.0, 11.5] (220/2160) | 55.3 [54.8, 55.9] (1195/2160) | 0.0 [seeds: CP 0.0-8.8] (0/2160) | {"SELF_INTERSECTION_EDGE":218,"EDGE_FOLD":220} |
| N4 | R1 | 4320 | 0.0 [seeds: CP 0.0-8.8] (0/4320) | 17.7 [15.8, 19.8] (766/4320) | 58.6 [57.7, 59.6] (2532/4320) | 0.0 [seeds: CP 0.0-8.8] (0/4320) | {"SELF_INTERSECTION_EDGE":744,"EDGE_FOLD":766} |
| N4 | R2 | 4320 | 0.0 [seeds: CP 0.0-8.8] (0/4320) | 17.7 [15.8, 19.8] (766/4320) | 58.6 [57.7, 59.6] (2532/4320) | 0.0 [seeds: CP 0.0-8.8] (0/4320) | {"SELF_INTERSECTION_EDGE":744,"EDGE_FOLD":766} |
| N4 | R3 | 4320 | 0.0 [seeds: CP 0.0-8.8] (0/4320) | 17.7 [15.8, 19.8] (766/4320) | 58.6 [57.7, 59.6] (2532/4320) | 0.0 [seeds: CP 0.0-8.8] (0/4320) | {"SELF_INTERSECTION_EDGE":744,"EDGE_FOLD":766} |
| N4 | R4 | 4320 | 0.0 [seeds: CP 0.0-8.8] (0/4320) | 17.7 [15.8, 19.8] (766/4320) | 58.6 [57.7, 59.6] (2532/4320) | 0.0 [seeds: CP 0.0-8.8] (0/4320) | {"SELF_INTERSECTION_EDGE":744,"EDGE_FOLD":766} |
| N4 | R5 | 4320 | 0.0 [seeds: CP 0.0-8.8] (0/4320) | 17.7 [15.8, 19.8] (766/4320) | 58.6 [57.7, 59.6] (2532/4320) | 0.0 [seeds: CP 0.0-8.8] (0/4320) | {"SELF_INTERSECTION_EDGE":744,"EDGE_FOLD":766} |
| BASE | R1 | 2520 | 0.0 [seeds: CP 0.0-8.8] (0/2520) | 1.5 [1.3, 1.7] (39/2520) | 100.0 [seeds: CP 91.2-100.0] (2520/2520) | 0.0 [seeds: CP 0.0-8.8] (0/2520) | {"SELF_INTERSECTION_EDGE":39,"EDGE_FOLD":39} |
| BASE | R2 | 2520 | 0.0 [seeds: CP 0.0-8.8] (0/2520) | 1.5 [1.3, 1.7] (39/2520) | 100.0 [seeds: CP 91.2-100.0] (2520/2520) | 0.0 [seeds: CP 0.0-8.8] (0/2520) | {"SELF_INTERSECTION_EDGE":39,"EDGE_FOLD":39} |
| BASE | R3 | 2520 | 0.0 [seeds: CP 0.0-8.8] (0/2520) | 1.5 [1.3, 1.7] (39/2520) | 100.0 [seeds: CP 91.2-100.0] (2520/2520) | 0.0 [seeds: CP 0.0-8.8] (0/2520) | {"SELF_INTERSECTION_EDGE":39,"EDGE_FOLD":39} |
| BASE | R4 | 2520 | 0.0 [seeds: CP 0.0-8.8] (0/2520) | 1.5 [1.3, 1.7] (39/2520) | 100.0 [seeds: CP 91.2-100.0] (2520/2520) | 0.0 [seeds: CP 0.0-8.8] (0/2520) | {"SELF_INTERSECTION_EDGE":39,"EDGE_FOLD":39} |
| BASE | R5 | 2520 | 0.0 [seeds: CP 0.0-8.8] (0/2520) | 1.5 [1.3, 1.7] (39/2520) | 100.0 [seeds: CP 91.2-100.0] (2520/2520) | 0.0 [seeds: CP 0.0-8.8] (0/2520) | {"SELF_INTERSECTION_EDGE":39,"EDGE_FOLD":39} |
| N3 | R1 | 60 | 6/60 [Wilson 4.7, 20.1] | 6/60 [Wilson 4.7, 20.1] | 21/60 [Wilson 24.2, 47.6] | 21/60 [Wilson 24.2, 47.6] | {"SHARP_VERTEX":6} |
| N3 | R2 | 60 | 0/60 [Wilson 0.0, 6.0] | 0/60 [Wilson 0.0, 6.0] | 21/60 [Wilson 24.2, 47.6] | 21/60 [Wilson 24.2, 47.6] | {} |
| N3 | R3 | 60 | 6/60 [Wilson 4.7, 20.1] | 6/60 [Wilson 4.7, 20.1] | 0/60 [Wilson 0.0, 6.0] | 0/60 [Wilson 0.0, 6.0] | {"SHARP_VERTEX":6} |
| N3 | R4 | 60 | 0/60 [Wilson 0.0, 6.0] | 0/60 [Wilson 0.0, 6.0] | 0/60 [Wilson 0.0, 6.0] | 0/60 [Wilson 0.0, 6.0] | {} |
| N3 | R5 | 60 | 0/60 [Wilson 0.0, 6.0] | 0/60 [Wilson 0.0, 6.0] | 0/60 [Wilson 0.0, 6.0] | 0/60 [Wilson 0.0, 6.0] | {} |

## Class (a) paired spikes

### M1 error detection by c (pooled over gaps, patterns, widths, modes)


| key | rows | R1 v1.3 default | R2 v1.3, SHARP off | R3 v1.3, UNDERSAMPLED off | R4 v1.2 (both off) | R5 legacy ratio |
|---|---|---|---|---|---|---|
| c 0.1 | 25200 | 86.1 [85.8, 86.4] | 67.1 [66.9, 67.3] | 86.1 [85.8, 86.4] | 67.1 [66.9, 67.3] | 40.9 [40.7, 41.0] |
| c 0.5 | 25200 | 100.0 [seeds: CP 91.2-100.0] | 85.8 [85.7, 86.0] | 100.0 [seeds: CP 91.2-100.0] | 85.8 [85.7, 86.0] | 74.7 [74.4, 74.9] |
| c 0.25 | 25200 | 100.0 [seeds: CP 91.2-100.0] | 80.3 [80.2, 80.4] | 100.0 [seeds: CP 91.2-100.0] | 80.3 [80.2, 80.4] | 67.0 [66.8, 67.1] |
| c 1 | 25200 | 100.0 [seeds: CP 91.2-100.0] | 98.8 [98.7, 98.9] | 100.0 [seeds: CP 91.2-100.0] | 98.8 [98.7, 98.9] | 98.4 [98.3, 98.5] |

### M2 kink-family flag in window by c


| key | rows | R1 v1.3 default | R2 v1.3, SHARP off | R3 v1.3, UNDERSAMPLED off | R4 v1.2 (both off) | R5 legacy ratio |
|---|---|---|---|---|---|---|
| c 0.1 | 25200 | 86.3 [86.0, 86.6] | 40.3 [40.2, 40.4] | 86.3 [86.0, 86.6] | 40.3 [40.2, 40.4] | 0.0 [seeds: CP 0.0-8.8] |
| c 0.5 | 25200 | 100.0 [seeds: CP 91.2-100.0] | 40.0 [40.0, 40.0] | 100.0 [seeds: CP 91.2-100.0] | 40.0 [40.0, 40.0] | 0.0 [seeds: CP 0.0-8.8] |
| c 0.25 | 25200 | 100.0 [seeds: CP 91.2-100.0] | 40.1 [40.0, 40.1] | 100.0 [seeds: CP 91.2-100.0] | 40.1 [40.0, 40.1] | 0.0 [seeds: CP 0.0-8.8] |
| c 1 | 25200 | 100.0 [seeds: CP 91.2-100.0] | 40.0 [40.0, 40.0] | 100.0 [seeds: CP 91.2-100.0] | 40.0 [40.0, 40.0] | 0.0 [seeds: CP 0.0-8.8] |

### M1 by gap and c (pooled over patterns)


| key | rows | R1 v1.3 default | R4 v1.2 (both off) | R5 legacy ratio |
|---|---|---|---|---|
| gap 2, c 0.1 | 5040 | 78.7 [77.7, 79.6] | 50.1 [49.9, 50.4] | 50.1 [49.9, 50.4] |
| gap 2, c 0.5 | 5040 | 100.0 [seeds: CP 91.2-100.0] | 72.3 [71.7, 72.9] | 72.3 [71.7, 72.9] |
| gap 2, c 0.25 | 5040 | 100.0 [seeds: CP 91.2-100.0] | 67.0 [66.7, 67.2] | 67.0 [66.7, 67.2] |
| gap 2, c 1 | 5040 | 100.0 [seeds: CP 91.2-100.0] | 98.8 [98.7, 99.0] | 98.8 [98.7, 99.0] |
| gap 3, c 0.1 | 5040 | 76.3 [75.6, 77.1] | 48.9 [48.6, 49.2] | 48.9 [48.6, 49.2] |
| gap 3, c 0.5 | 5040 | 100.0 [seeds: CP 91.2-100.0] | 84.6 [84.3, 85.0] | 84.6 [84.3, 85.0] |
| gap 3, c 0.25 | 5040 | 100.0 [seeds: CP 91.2-100.0] | 67.5 [67.3, 67.8] | 67.5 [67.3, 67.8] |
| gap 3, c 1 | 5040 | 100.0 [seeds: CP 91.2-100.0] | 96.4 [96.0, 96.8] | 96.4 [96.0, 96.8] |
| gap 4, c 0.1 | 5040 | 76.6 [75.8, 77.4] | 37.6 [37.2, 38.0] | 35.0 [34.8, 35.3] |
| gap 4, c 0.5 | 5040 | 100.0 [seeds: CP 91.2-100.0] | 72.3 [71.8, 72.8] | 72.3 [71.8, 72.8] |
| gap 4, c 0.25 | 5040 | 100.0 [seeds: CP 91.2-100.0] | 67.0 [66.6, 67.3] | 66.6 [66.3, 66.9] |
| gap 4, c 1 | 5040 | 100.0 [seeds: CP 91.2-100.0] | 98.9 [98.7, 99.0] | 98.9 [98.7, 99.0] |
| gap 5, c 0.1 | 5040 | 99.3 [99.1, 99.5] | 99.3 [99.1, 99.5] | 35.0 [34.7, 35.3] |
| gap 5, c 0.5 | 5040 | 100.0 [seeds: CP 91.2-100.0] | 100.0 [seeds: CP 91.2-100.0] | 72.1 [71.4, 72.7] |
| gap 5, c 0.25 | 5040 | 100.0 [seeds: CP 91.2-100.0] | 100.0 [seeds: CP 91.2-100.0] | 66.9 [66.7, 67.1] |
| gap 5, c 1 | 5040 | 100.0 [seeds: CP 91.2-100.0] | 100.0 [seeds: CP 91.2-100.0] | 98.8 [98.7, 99.0] |
| gap 6, c 0.1 | 5040 | 99.6 [99.4, 99.7] | 99.6 [99.4, 99.7] | 35.3 [35.0, 35.5] |
| gap 6, c 0.5 | 5040 | 100.0 [seeds: CP 91.2-100.0] | 100.0 [seeds: CP 91.2-100.0] | 72.1 [71.6, 72.6] |
| gap 6, c 0.25 | 5040 | 100.0 [seeds: CP 91.2-100.0] | 100.0 [seeds: CP 91.2-100.0] | 66.8 [66.6, 67.1] |
| gap 6, c 1 | 5040 | 100.0 [seeds: CP 91.2-100.0] | 100.0 [seeds: CP 91.2-100.0] | 99.2 [99.1, 99.4] |

### M2 by gap and c (pooled over patterns)


| key | rows | R1 v1.3 default | R4 v1.2 (both off) | R5 legacy ratio |
|---|---|---|---|---|
| gap 2, c 0.1 | 5040 | 79.0 [78.0, 79.9] | 0.0 [seeds: CP 0.0-8.8] | 0.0 [seeds: CP 0.0-8.8] |
| gap 2, c 0.5 | 5040 | 100.0 [seeds: CP 91.2-100.0] | 0.0 [seeds: CP 0.0-8.8] | 0.0 [seeds: CP 0.0-8.8] |
| gap 2, c 0.25 | 5040 | 100.0 [seeds: CP 91.2-100.0] | 0.0 [seeds: CP 0.0-8.8] | 0.0 [seeds: CP 0.0-8.8] |
| gap 2, c 1 | 5040 | 100.0 [seeds: CP 91.2-100.0] | 0.0 [seeds: CP 0.0-8.8] | 0.0 [seeds: CP 0.0-8.8] |
| gap 3, c 0.1 | 5040 | 76.7 [75.9, 77.5] | 0.0 [seeds: CP 0.0-8.8] | 0.0 [seeds: CP 0.0-8.8] |
| gap 3, c 0.5 | 5040 | 100.0 [seeds: CP 91.2-100.0] | 0.0 [seeds: CP 0.0-8.8] | 0.0 [seeds: CP 0.0-8.8] |
| gap 3, c 0.25 | 5040 | 100.0 [seeds: CP 91.2-100.0] | 0.0 [seeds: CP 0.0-8.8] | 0.0 [seeds: CP 0.0-8.8] |
| gap 3, c 1 | 5040 | 100.0 [seeds: CP 91.2-100.0] | 0.0 [seeds: CP 0.0-8.8] | 0.0 [seeds: CP 0.0-8.8] |
| gap 4, c 0.1 | 5040 | 76.9 [76.1, 77.7] | 2.5 [2.2, 2.9] | 0.0 [seeds: CP 0.0-8.8] |
| gap 4, c 0.5 | 5040 | 100.0 [seeds: CP 91.2-100.0] | 0.0 [seeds: CP 0.0-8.8] | 0.0 [seeds: CP 0.0-8.8] |
| gap 4, c 0.25 | 5040 | 100.0 [seeds: CP 91.2-100.0] | 0.4 [0.2, 0.6] | 0.0 [seeds: CP 0.0-8.8] |
| gap 4, c 1 | 5040 | 100.0 [seeds: CP 91.2-100.0] | 0.0 [seeds: CP 0.0-8.8] | 0.0 [seeds: CP 0.0-8.8] |
| gap 5, c 0.1 | 5040 | 99.3 [99.1, 99.5] | 99.3 [99.1, 99.5] | 0.0 [seeds: CP 0.0-8.8] |
| gap 5, c 0.5 | 5040 | 100.0 [seeds: CP 91.2-100.0] | 100.0 [seeds: CP 91.2-100.0] | 0.0 [seeds: CP 0.0-8.8] |
| gap 5, c 0.25 | 5040 | 100.0 [seeds: CP 91.2-100.0] | 100.0 [seeds: CP 91.2-100.0] | 0.0 [seeds: CP 0.0-8.8] |
| gap 5, c 1 | 5040 | 100.0 [seeds: CP 91.2-100.0] | 100.0 [seeds: CP 91.2-100.0] | 0.0 [seeds: CP 0.0-8.8] |
| gap 6, c 0.1 | 5040 | 99.6 [99.4, 99.7] | 99.6 [99.4, 99.7] | 0.0 [seeds: CP 0.0-8.8] |
| gap 6, c 0.5 | 5040 | 100.0 [seeds: CP 91.2-100.0] | 100.0 [seeds: CP 91.2-100.0] | 0.0 [seeds: CP 0.0-8.8] |
| gap 6, c 0.25 | 5040 | 100.0 [seeds: CP 91.2-100.0] | 100.0 [seeds: CP 91.2-100.0] | 0.0 [seeds: CP 0.0-8.8] |
| gap 6, c 1 | 5040 | 100.0 [seeds: CP 91.2-100.0] | 100.0 [seeds: CP 91.2-100.0] | 0.0 [seeds: CP 0.0-8.8] |

### M2 by gap, must instances only (the masking claim)


| key | rows | R1 v1.3 default | R4 v1.2 (both off) | R5 legacy ratio |
|---|---|---|---|---|
| 2|must | 19101 | 100.0 [seeds: CP 91.2-100.0] | 0.0 [seeds: CP 0.0-8.8] | 0.0 [seeds: CP 0.0-8.8] |
| 3|must | 18985 | 100.0 [seeds: CP 91.2-100.0] | 0.0 [seeds: CP 0.0-8.8] | 0.0 [seeds: CP 0.0-8.8] |
| 4|must | 18996 | 100.0 [seeds: CP 91.2-100.0] | 0.8 [0.7, 0.9] | 0.0 [seeds: CP 0.0-8.8] |
| 5|must | 19000 | 100.0 [seeds: CP 91.2-100.0] | 100.0 [seeds: CP 91.2-100.0] | 0.0 [seeds: CP 0.0-8.8] |
| 6|must | 18982 | 100.0 [seeds: CP 91.2-100.0] | 100.0 [100.0, 100.0] | 0.0 [seeds: CP 0.0-8.8] |

### Outcome mix by c (R1 v1.3): warned-only and silent accepts

silent accept = ok and no new warning (the dangerous cell).

| key | rows | R1 v1.3 default | R4 v1.2 (both off) |
|---|---|---|---|
| c 0.1 | 25200 | 13.9 [13.6, 14.3] | 19.2 [19.1, 19.4] |
| c 0.5 | 25200 | 0.0 [seeds: CP 0.0-8.8] | 0.6 [0.6, 0.7] |
| c 0.25 | 25200 | 0.0 [seeds: CP 0.0-8.8] | 0.8 [0.7, 0.8] |
| c 1 | 25200 | 0.0 [seeds: CP 0.0-8.8] | 1.2 [1.1, 1.3] |


## Class (b) zigzag patches

### M1 by period and c (pooled over L, widths, modes)


| key | rows | R1 v1.3 default | R2 v1.3, SHARP off | R3 v1.3, UNDERSAMPLED off | R4 v1.2 (both off) | R5 legacy ratio |
|---|---|---|---|---|---|---|
| period 2, c 0.1 | 10080 | 99.9 [99.9, 100.0] | 66.0 [65.8, 66.2] | 99.9 [99.9, 100.0] | 66.0 [65.8, 66.2] | 66.0 [65.8, 66.2] |
| period 2, c 0.02 | 10080 | 36.0 [35.8, 36.2] | 28.5 [28.1, 28.9] | 36.0 [35.8, 36.2] | 28.5 [28.1, 28.9] | 28.5 [28.1, 28.9] |
| period 2, c 0.05 | 10080 | 89.2 [88.3, 90.0] | 35.2 [35.0, 35.4] | 89.2 [88.3, 90.0] | 35.2 [35.0, 35.4] | 35.2 [35.0, 35.4] |
| period 2, c 0.5 | 10080 | 100.0 [seeds: CP 91.2-100.0] | 85.9 [85.4, 86.4] | 100.0 [seeds: CP 91.2-100.0] | 85.9 [85.4, 86.4] | 85.9 [85.4, 86.4] |
| period 2, c 0.25 | 10080 | 100.0 [seeds: CP 91.2-100.0] | 72.2 [71.8, 72.7] | 100.0 [seeds: CP 91.2-100.0] | 72.2 [71.8, 72.7] | 72.2 [71.8, 72.7] |
| period 4, c 0.1 | 10080 | 89.0 [88.3, 89.6] | 66.9 [66.8, 67.1] | 89.0 [88.3, 89.6] | 66.9 [66.8, 67.1] | 66.9 [66.8, 67.1] |
| period 4, c 0.02 | 10080 | 33.9 [33.7, 34.2] | 33.9 [33.7, 34.2] | 33.9 [33.7, 34.2] | 33.9 [33.7, 34.2] | 33.1 [32.8, 33.3] |
| period 4, c 0.05 | 10080 | 57.2 [56.7, 57.8] | 36.3 [36.1, 36.6] | 57.2 [56.7, 57.8] | 36.3 [36.1, 36.6] | 36.1 [35.9, 36.3] |
| period 4, c 0.5 | 10080 | 100.0 [seeds: CP 91.2-100.0] | 90.6 [90.1, 91.2] | 100.0 [seeds: CP 91.2-100.0] | 90.6 [90.1, 91.2] | 90.6 [90.1, 91.2] |
| period 4, c 0.25 | 10080 | 100.0 [seeds: CP 91.2-100.0] | 69.3 [69.1, 69.5] | 100.0 [seeds: CP 91.2-100.0] | 69.3 [69.1, 69.5] | 69.3 [69.1, 69.5] |

### M2 by period and c


| key | rows | R1 v1.3 default | R2 v1.3, SHARP off | R3 v1.3, UNDERSAMPLED off | R4 v1.2 (both off) | R5 legacy ratio |
|---|---|---|---|---|---|---|
| period 2, c 0.1 | 10080 | 100.0 [99.9, 100.0] | 0.0 [seeds: CP 0.0-8.8] | 100.0 [99.9, 100.0] | 0.0 [seeds: CP 0.0-8.8] | 0.0 [seeds: CP 0.0-8.8] |
| period 2, c 0.02 | 10080 | 36.7 [36.5, 37.0] | 0.0 [seeds: CP 0.0-8.8] | 36.7 [36.5, 37.0] | 0.0 [seeds: CP 0.0-8.8] | 0.0 [seeds: CP 0.0-8.8] |
| period 2, c 0.05 | 10080 | 89.3 [88.5, 90.1] | 0.0 [seeds: CP 0.0-8.8] | 89.3 [88.5, 90.1] | 0.0 [seeds: CP 0.0-8.8] | 0.0 [seeds: CP 0.0-8.8] |
| period 2, c 0.5 | 10080 | 100.0 [seeds: CP 91.2-100.0] | 0.0 [seeds: CP 0.0-8.8] | 100.0 [seeds: CP 91.2-100.0] | 0.0 [seeds: CP 0.0-8.8] | 0.0 [seeds: CP 0.0-8.8] |
| period 2, c 0.25 | 10080 | 100.0 [seeds: CP 91.2-100.0] | 0.0 [seeds: CP 0.0-8.8] | 100.0 [seeds: CP 91.2-100.0] | 0.0 [seeds: CP 0.0-8.8] | 0.0 [seeds: CP 0.0-8.8] |
| period 4, c 0.1 | 10080 | 89.1 [88.5, 89.8] | 0.0 [seeds: CP 0.0-8.8] | 89.1 [88.5, 89.8] | 0.0 [seeds: CP 0.0-8.8] | 0.0 [seeds: CP 0.0-8.8] |
| period 4, c 0.02 | 10080 | 4.4 [4.2, 4.6] | 0.9 [0.7, 1.1] | 4.4 [4.2, 4.6] | 0.9 [0.7, 1.1] | 0.0 [seeds: CP 0.0-8.8] |
| period 4, c 0.05 | 10080 | 57.8 [57.3, 58.3] | 0.3 [0.2, 0.4] | 57.8 [57.3, 58.3] | 0.3 [0.2, 0.4] | 0.0 [seeds: CP 0.0-8.8] |
| period 4, c 0.5 | 10080 | 100.0 [seeds: CP 91.2-100.0] | 0.0 [seeds: CP 0.0-8.8] | 100.0 [seeds: CP 91.2-100.0] | 0.0 [seeds: CP 0.0-8.8] | 0.0 [seeds: CP 0.0-8.8] |
| period 4, c 0.25 | 10080 | 100.0 [seeds: CP 91.2-100.0] | 0.0 [seeds: CP 0.0-8.8] | 100.0 [seeds: CP 91.2-100.0] | 0.0 [seeds: CP 0.0-8.8] | 0.0 [seeds: CP 0.0-8.8] |

### M1 by period and L (pooled over c)


| key | rows | R1 v1.3 default | R4 v1.2 (both off) | R5 legacy ratio |
|---|---|---|---|---|
| period 2, L 8 | 12600 | 83.1 [82.8, 83.4] | 57.5 [57.2, 57.8] | 57.5 [57.2, 57.8] |
| period 2, L 16 | 12600 | 84.1 [83.8, 84.3] | 57.4 [57.0, 57.8] | 57.4 [57.0, 57.8] |
| period 2, L 32 | 12600 | 85.8 [85.5, 86.0] | 57.9 [57.6, 58.2] | 57.9 [57.6, 58.2] |
| period 2, L 64 | 12600 | 87.2 [87.0, 87.3] | 57.5 [57.2, 57.8] | 57.5 [57.2, 57.8] |
| period 4, L 8 | 12600 | 72.6 [72.2, 72.9] | 56.7 [56.4, 57.1] | 56.7 [56.3, 57.0] |
| period 4, L 16 | 12600 | 74.6 [74.3, 74.9] | 58.1 [57.8, 58.5] | 58.0 [57.6, 58.3] |
| period 4, L 32 | 12600 | 77.1 [76.7, 77.4] | 60.4 [60.1, 60.7] | 60.2 [59.9, 60.4] |
| period 4, L 64 | 12600 | 79.9 [79.6, 80.1] | 62.5 [62.3, 62.6] | 62.0 [61.9, 62.1] |

### UNDERSAMPLED by period and L (c >= 0.05)


| key | rows | R1 v1.3 default | R2 v1.3, SHARP off |
|---|---|---|---|
| 2|8 | 10080 | 0.0 [seeds: CP 0.0-8.8] | 0.0 [seeds: CP 0.0-8.8] |
| 2|16 | 10080 | 0.1 [0.0, 0.3] | 0.1 [0.0, 0.3] |
| 2|32 | 10080 | 63.7 [61.8, 65.2] | 63.7 [61.8, 65.2] |
| 2|64 | 10080 | 100.0 [seeds: CP 91.2-100.0] | 100.0 [seeds: CP 91.2-100.0] |
| 4|8 | 10080 | 0.0 [seeds: CP 0.0-8.8] | 0.0 [seeds: CP 0.0-8.8] |
| 4|16 | 10080 | 0.0 [seeds: CP 0.0-8.8] | 0.0 [seeds: CP 0.0-8.8] |
| 4|32 | 10080 | 1.1 [0.9, 1.4] | 1.1 [0.9, 1.4] |
| 4|64 | 10080 | 60.5 [58.9, 61.8] | 60.5 [58.9, 61.8] |

### M1 by period, c and width (R1 vs R4)


| key | rows | R1 v1.3 default | R4 v1.2 (both off) |
|---|---|---|---|
| period 2, c 0.1, width 20 | 3360 | 99.9 [99.7, 100.0] | 3.8 [3.4, 4.1] |
| period 2, c 0.1, width 40 | 3360 | 100.0 [seeds: CP 91.2-100.0] | 95.8 [95.4, 96.2] |
| period 2, c 0.1, width 80 | 3360 | 100.0 [seeds: CP 91.2-100.0] | 100.0 [seeds: CP 91.2-100.0] |
| period 2, c 0.02, width 20 | 3360 | 0.6 [0.3, 0.9] | 0.0 [seeds: CP 0.0-8.8] |
| period 2, c 0.02, width 40 | 3360 | 10.5 [10.0, 11.0] | 2.8 [2.4, 3.2] |
| period 2, c 0.02, width 80 | 3360 | 99.9 [99.8, 100.0] | 85.3 [84.2, 86.3] |
| period 2, c 0.05, width 20 | 3360 | 68.2 [65.9, 70.5] | 0.4 [0.2, 0.7] |
| period 2, c 0.5, width 20 | 3360 | 100.0 [seeds: CP 91.2-100.0] | 58.5 [57.1, 60.0] |
| period 2, c 0.05, width 40 | 3360 | 99.7 [99.6, 99.9] | 8.3 [7.7, 8.8] |
| period 2, c 0.5, width 40 | 3360 | 100.0 [seeds: CP 91.2-100.0] | 99.8 [99.6, 99.9] |
| period 2, c 0.05, width 80 | 3360 | 100.0 [seeds: CP 91.2-100.0] | 99.9 [99.8, 100.0] |
| period 2, c 0.5, width 80 | 3360 | 100.0 [seeds: CP 91.2-100.0] | 100.0 [seeds: CP 91.2-100.0] |
| period 2, c 0.25, width 20 | 3360 | 100.0 [seeds: CP 91.2-100.0] | 18.8 [17.5, 19.9] |
| period 2, c 0.25, width 40 | 3360 | 100.0 [seeds: CP 91.2-100.0] | 99.3 [99.0, 99.5] |
| period 2, c 0.25, width 80 | 3360 | 100.0 [seeds: CP 91.2-100.0] | 100.0 [seeds: CP 91.2-100.0] |
| period 4, c 0.1, width 20 | 3360 | 67.7 [65.9, 69.6] | 4.3 [3.9, 4.7] |
| period 4, c 0.1, width 40 | 3360 | 99.7 [99.5, 99.9] | 98.1 [97.8, 98.4] |
| period 4, c 0.1, width 80 | 3360 | 100.0 [seeds: CP 91.2-100.0] | 100.0 [seeds: CP 91.2-100.0] |
| period 4, c 0.02, width 20 | 3360 | 2.3 [1.9, 2.7] | 2.3 [1.9, 2.7] |
| period 4, c 0.02, width 40 | 3360 | 4.3 [3.8, 4.9] | 4.3 [3.8, 4.9] |
| period 4, c 0.02, width 80 | 3360 | 98.1 [97.5, 98.7] | 98.1 [97.5, 98.7] |
| period 4, c 0.05, width 20 | 3360 | 3.6 [3.0, 4.2] | 1.4 [1.0, 1.8] |
| period 4, c 0.5, width 20 | 3360 | 100.0 [seeds: CP 91.2-100.0] | 72.4 [70.8, 74.2] |
| period 4, c 0.05, width 40 | 3360 | 70.1 [68.6, 71.4] | 10.6 [10.1, 11.0] |
| period 4, c 0.5, width 40 | 3360 | 100.0 [seeds: CP 91.2-100.0] | 99.9 [99.9, 100.0] |
| period 4, c 0.05, width 80 | 3360 | 100.0 [seeds: CP 91.2-100.0] | 99.9 [99.8, 100.0] |
| period 4, c 0.5, width 80 | 3360 | 100.0 [seeds: CP 91.2-100.0] | 100.0 [seeds: CP 91.2-100.0] |
| period 4, c 0.25, width 20 | 3360 | 100.0 [seeds: CP 91.2-100.0] | 10.5 [10.1, 10.9] |
| period 4, c 0.25, width 40 | 3360 | 100.0 [seeds: CP 91.2-100.0] | 98.9 [98.6, 99.2] |
| period 4, c 0.25, width 80 | 3360 | 100.0 [seeds: CP 91.2-100.0] | 100.0 [seeds: CP 91.2-100.0] |


## Pooled (a)+(b) and class (d)

### M1 by size class, pooled (a)+(b)


| key | rows | R1 v1.3 default | R2 v1.3, SHARP off | R3 v1.3, UNDERSAMPLED off | R4 v1.2 (both off) | R5 legacy ratio |
|---|---|---|---|---|---|---|
| grey | 21373 | 25.0 [24.8, 25.2] | 25.0 [24.8, 25.2] | 25.0 [24.8, 25.2] | 25.0 [24.8, 25.2] | 14.1 [14.0, 14.3] |
| must | 173307 | 100.0 [seeds: CP 91.2-100.0] | 79.3 [79.2, 79.4] | 100.0 [seeds: CP 91.2-100.0] | 79.3 [79.2, 79.4] | 73.2 [73.1, 73.3] |
| sub | 6920 | 1.3 [1.1, 1.6] | 1.3 [1.1, 1.6] | 1.3 [1.1, 1.6] | 1.3 [1.1, 1.6] | 0.0 [seeds: CP 0.0-8.8] |

### M2 by size class, pooled (a)+(b)


| key | rows | R1 v1.3 default | R2 v1.3, SHARP off | R3 v1.3, UNDERSAMPLED off | R4 v1.2 (both off) | R5 legacy ratio |
|---|---|---|---|---|---|---|
| grey | 21373 | 10.8 [10.6, 11.0] | 10.8 [10.6, 11.0] | 10.8 [10.6, 11.0] | 10.8 [10.6, 11.0] | 0.0 [seeds: CP 0.0-8.8] |
| must | 173307 | 100.0 [seeds: CP 91.2-100.0] | 22.0 [22.0, 22.0] | 100.0 [seeds: CP 91.2-100.0] | 22.0 [22.0, 22.0] | 0.0 [seeds: CP 0.0-8.8] |
| sub | 6920 | 1.3 [1.1, 1.6] | 1.3 [1.1, 1.6] | 1.3 [1.1, 1.6] | 1.3 [1.1, 1.6] | 0.0 [seeds: CP 0.0-8.8] |

### M1 by class, c and mode type


| key | rows | R1 v1.3 default | R4 v1.2 (both off) |
|---|---|---|---|
| pairedSpike, c 0.1, auto | 3600 | 91.9 [91.1, 92.7] | 70.3 [69.5, 71.1] |
| pairedSpike, c 0.1, pattern | 21600 | 85.2 [84.9, 85.6] | 66.6 [66.5, 66.7] |
| pairedSpike, c 0.5, auto | 3600 | 100.0 [seeds: CP 91.2-100.0] | 90.4 [89.6, 91.2] |
| pairedSpike, c 0.5, pattern | 21600 | 100.0 [seeds: CP 91.2-100.0] | 85.2 [85.0, 85.3] |
| pairedSpike, c 0.25, auto | 3600 | 100.0 [seeds: CP 91.2-100.0] | 81.7 [81.0, 82.5] |
| pairedSpike, c 0.25, pattern | 21600 | 100.0 [seeds: CP 91.2-100.0] | 80.1 [80.0, 80.1] |
| pairedSpike, c 1, auto | 3600 | 100.0 [seeds: CP 91.2-100.0] | 95.2 [94.8, 95.6] |
| pairedSpike, c 1, pattern | 21600 | 100.0 [seeds: CP 91.2-100.0] | 99.4 [99.3, 99.5] |
| zigzag, c 0.1, auto | 2880 | 96.2 [95.6, 96.8] | 66.2 [65.1, 67.4] |
| zigzag, c 0.1, pattern | 17280 | 94.2 [93.9, 94.5] | 66.5 [66.4, 66.6] |
| zigzag, c 0.02, auto | 2880 | 43.7 [42.6, 44.7] | 33.5 [32.3, 34.7] |
| zigzag, c 0.02, pattern | 17280 | 33.7 [33.6, 33.8] | 30.9 [30.7, 31.1] |
| zigzag, c 0.05, auto | 2880 | 78.8 [78.0, 79.6] | 51.1 [49.9, 52.3] |
| zigzag, c 0.5, auto | 2880 | 100.0 [seeds: CP 91.2-100.0] | 92.6 [91.9, 93.2] |
| zigzag, c 0.05, pattern | 17280 | 72.4 [71.7, 73.0] | 33.5 [33.4, 33.6] |
| zigzag, c 0.5, pattern | 17280 | 100.0 [seeds: CP 91.2-100.0] | 87.6 [87.2, 88.1] |
| zigzag, c 0.25, auto | 2880 | 100.0 [seeds: CP 91.2-100.0] | 85.6 [84.5, 86.7] |
| zigzag, c 0.25, pattern | 17280 | 100.0 [seeds: CP 91.2-100.0] | 68.6 [68.4, 68.8] |

### Class (d) M2 by operator and size class (compare E6 HELD-OUT)


| key | rows | R1 v1.3 default | R2 v1.3, SHARP off | R3 v1.3, UNDERSAMPLED off | R4 v1.2 (both off) | R5 legacy ratio |
|---|---|---|---|---|---|---|
| corner|edge | 2245 | 100.0 [seeds: CP 91.2-100.0] | 100.0 [seeds: CP 91.2-100.0] | 100.0 [seeds: CP 91.2-100.0] | 100.0 [seeds: CP 91.2-100.0] | 0.0 [seeds: CP 0.0-8.8] |
| corner|grey | 2385 | 100.0 [seeds: CP 91.2-100.0] | 100.0 [seeds: CP 91.2-100.0] | 100.0 [seeds: CP 91.2-100.0] | 100.0 [seeds: CP 91.2-100.0] | 0.0 [seeds: CP 0.0-8.8] |
| corner|must | 7970 | 100.0 [seeds: CP 91.2-100.0] | 100.0 [seeds: CP 91.2-100.0] | 100.0 [seeds: CP 91.2-100.0] | 100.0 [seeds: CP 91.2-100.0] | 0.0 [seeds: CP 0.0-8.8] |
| interiorSpike|grey | 2917 | 94.5 [93.9, 95.1] | 94.5 [93.9, 95.1] | 94.5 [93.9, 95.1] | 94.5 [93.9, 95.1] | 0.0 [seeds: CP 0.0-8.8] |
| interiorSpike|must | 8153 | 100.0 [seeds: CP 91.2-100.0] | 100.0 [seeds: CP 91.2-100.0] | 100.0 [seeds: CP 91.2-100.0] | 100.0 [seeds: CP 91.2-100.0] | 0.0 [seeds: CP 0.0-8.8] |
| interiorSpike|sub | 1530 | 72.0 [70.0, 73.9] | 72.0 [70.0, 73.9] | 72.0 [70.0, 73.9] | 72.0 [70.0, 73.9] | 0.0 [seeds: CP 0.0-8.8] |
| seamSpike|grey | 2837 | 92.8 [91.0, 94.6] | 92.8 [91.0, 94.6] | 92.8 [91.0, 94.6] | 92.8 [91.0, 94.6] | 56.3 [54.4, 58.3] |
| seamSpike|must | 8553 | 100.0 [seeds: CP 91.2-100.0] | 100.0 [seeds: CP 91.2-100.0] | 100.0 [seeds: CP 91.2-100.0] | 100.0 [seeds: CP 91.2-100.0] | 54.2 [53.2, 55.2] |
| seamSpike|sub | 1210 | 58.3 [50.6, 65.6] | 58.3 [50.6, 65.6] | 58.3 [50.6, 65.6] | 58.3 [50.6, 65.6] | 10.1 [5.4, 14.7] |
| tangent|must | 7560 | 100.0 [seeds: CP 91.2-100.0] | 100.0 [seeds: CP 91.2-100.0] | 100.0 [seeds: CP 91.2-100.0] | 100.0 [seeds: CP 91.2-100.0] | 93.7 [92.9, 94.5] |

### Class (d) M1 by operator and level


| key | rows | R1 v1.3 default | R4 v1.2 (both off) | R5 legacy ratio |
|---|---|---|---|---|
| corner 20 | 2520 | 100.0 [seeds: CP 91.2-100.0] | 100.0 [seeds: CP 91.2-100.0] | 7.5 [6.8, 8.3] |
| corner 30 | 2520 | 100.0 [seeds: CP 91.2-100.0] | 100.0 [seeds: CP 91.2-100.0] | 35.8 [35.3, 36.3] |
| corner 45 | 2520 | 100.0 [seeds: CP 91.2-100.0] | 100.0 [seeds: CP 91.2-100.0] | 39.4 [38.6, 40.3] |
| corner 60 | 2520 | 100.0 [seeds: CP 91.2-100.0] | 100.0 [seeds: CP 91.2-100.0] | 67.0 [66.7, 67.4] |
| corner 90 | 2520 | 100.0 [seeds: CP 91.2-100.0] | 100.0 [seeds: CP 91.2-100.0] | 71.3 [70.4, 72.1] |
| interiorSpike 1 | 2520 | 79.9 [78.5, 81.2] | 79.9 [78.5, 81.2] | 1.3 [1.1, 1.6] |
| interiorSpike 2 | 2520 | 97.5 [96.9, 98.0] | 97.5 [96.9, 98.0] | 4.8 [4.3, 5.4] |
| interiorSpike 4 | 2520 | 100.0 [seeds: CP 91.2-100.0] | 100.0 [seeds: CP 91.2-100.0] | 36.0 [35.6, 36.3] |
| interiorSpike 8 | 2520 | 100.0 [seeds: CP 91.2-100.0] | 100.0 [seeds: CP 91.2-100.0] | 67.4 [66.9, 67.9] |
| interiorSpike 16 | 2520 | 100.0 [seeds: CP 91.2-100.0] | 100.0 [seeds: CP 91.2-100.0] | 95.8 [95.1, 96.4] |
| seamSpike 1 | 2520 | 75.2 [71.9, 78.5] | 75.2 [71.9, 78.5] | 50.5 [48.6, 52.4] |
| seamSpike 2 | 2520 | 97.3 [96.2, 98.2] | 97.3 [96.2, 98.2] | 54.6 [52.8, 56.5] |
| seamSpike 4 | 2520 | 100.0 [seeds: CP 91.2-100.0] | 100.0 [seeds: CP 91.2-100.0] | 70.5 [68.9, 72.1] |
| seamSpike 8 | 2520 | 100.0 [seeds: CP 91.2-100.0] | 100.0 [seeds: CP 91.2-100.0] | 85.7 [84.6, 86.7] |
| seamSpike 16 | 2520 | 100.0 [seeds: CP 91.2-100.0] | 100.0 [seeds: CP 91.2-100.0] | 100.0 [seeds: CP 91.2-100.0] |
| tangent 10 | 2520 | 100.0 [seeds: CP 91.2-100.0] | 100.0 [seeds: CP 91.2-100.0] | 93.3 [92.5, 94.2] |
| tangent 20 | 2520 | 100.0 [seeds: CP 91.2-100.0] | 100.0 [seeds: CP 91.2-100.0] | 100.0 [seeds: CP 91.2-100.0] |
| tangent 45 | 2520 | 100.0 [seeds: CP 91.2-100.0] | 100.0 [seeds: CP 91.2-100.0] | 100.0 [seeds: CP 91.2-100.0] |


## Class (c) coarse polygons

### (c1) regular n-gons: M1 error rate (seed-free design grid, 6 tracks per n: counts with Wilson 95%, descriptive of the grid)


| key | rows | R1 v1.3 default | R2 v1.3, SHARP off | R3 v1.3, UNDERSAMPLED off | R4 v1.2 (both off) | R5 legacy ratio |
|---|---|---|---|---|---|---|
| n=3 | 6 | 100.0 [Wilson 61.0, 100.0] (6/6) | 100.0 [Wilson 61.0, 100.0] (6/6) | 100.0 [Wilson 61.0, 100.0] (6/6) | 100.0 [Wilson 61.0, 100.0] (6/6) | 0.0 [Wilson 0.0, 39.0] (0/6) |
| n=4 | 6 | 100.0 [Wilson 61.0, 100.0] (6/6) | 0.0 [Wilson 0.0, 39.0] (0/6) | 100.0 [Wilson 61.0, 100.0] (6/6) | 0.0 [Wilson 0.0, 39.0] (0/6) | 0.0 [Wilson 0.0, 39.0] (0/6) |
| n=5 | 6 | 100.0 [Wilson 61.0, 100.0] (6/6) | 0.0 [Wilson 0.0, 39.0] (0/6) | 100.0 [Wilson 61.0, 100.0] (6/6) | 0.0 [Wilson 0.0, 39.0] (0/6) | 0.0 [Wilson 0.0, 39.0] (0/6) |
| n=6 | 6 | 100.0 [Wilson 61.0, 100.0] (6/6) | 0.0 [Wilson 0.0, 39.0] (0/6) | 100.0 [Wilson 61.0, 100.0] (6/6) | 0.0 [Wilson 0.0, 39.0] (0/6) | 0.0 [Wilson 0.0, 39.0] (0/6) |
| n=7 | 6 | 100.0 [Wilson 61.0, 100.0] (6/6) | 0.0 [Wilson 0.0, 39.0] (0/6) | 100.0 [Wilson 61.0, 100.0] (6/6) | 0.0 [Wilson 0.0, 39.0] (0/6) | 0.0 [Wilson 0.0, 39.0] (0/6) |
| n=8 | 6 | 100.0 [Wilson 61.0, 100.0] (6/6) | 0.0 [Wilson 0.0, 39.0] (0/6) | 100.0 [Wilson 61.0, 100.0] (6/6) | 0.0 [Wilson 0.0, 39.0] (0/6) | 0.0 [Wilson 0.0, 39.0] (0/6) |
| n=9 | 6 | 100.0 [Wilson 61.0, 100.0] (6/6) | 0.0 [Wilson 0.0, 39.0] (0/6) | 100.0 [Wilson 61.0, 100.0] (6/6) | 0.0 [Wilson 0.0, 39.0] (0/6) | 0.0 [Wilson 0.0, 39.0] (0/6) |
| n=10 | 6 | 100.0 [Wilson 61.0, 100.0] (6/6) | 0.0 [Wilson 0.0, 39.0] (0/6) | 100.0 [Wilson 61.0, 100.0] (6/6) | 0.0 [Wilson 0.0, 39.0] (0/6) | 0.0 [Wilson 0.0, 39.0] (0/6) |
| n=11 | 6 | 100.0 [Wilson 61.0, 100.0] (6/6) | 0.0 [Wilson 0.0, 39.0] (0/6) | 100.0 [Wilson 61.0, 100.0] (6/6) | 0.0 [Wilson 0.0, 39.0] (0/6) | 0.0 [Wilson 0.0, 39.0] (0/6) |
| n=12 | 6 | 100.0 [Wilson 61.0, 100.0] (6/6) | 0.0 [Wilson 0.0, 39.0] (0/6) | 100.0 [Wilson 61.0, 100.0] (6/6) | 0.0 [Wilson 0.0, 39.0] (0/6) | 0.0 [Wilson 0.0, 39.0] (0/6) |
| n=13 | 6 | 0.0 [Wilson 0.0, 39.0] (0/6) | 0.0 [Wilson 0.0, 39.0] (0/6) | 0.0 [Wilson 0.0, 39.0] (0/6) | 0.0 [Wilson 0.0, 39.0] (0/6) | 0.0 [Wilson 0.0, 39.0] (0/6) |
| n=14 | 6 | 0.0 [Wilson 0.0, 39.0] (0/6) | 0.0 [Wilson 0.0, 39.0] (0/6) | 0.0 [Wilson 0.0, 39.0] (0/6) | 0.0 [Wilson 0.0, 39.0] (0/6) | 0.0 [Wilson 0.0, 39.0] (0/6) |
| n=15 | 6 | 0.0 [Wilson 0.0, 39.0] (0/6) | 0.0 [Wilson 0.0, 39.0] (0/6) | 0.0 [Wilson 0.0, 39.0] (0/6) | 0.0 [Wilson 0.0, 39.0] (0/6) | 0.0 [Wilson 0.0, 39.0] (0/6) |
| n=16 | 6 | 0.0 [Wilson 0.0, 39.0] (0/6) | 0.0 [Wilson 0.0, 39.0] (0/6) | 0.0 [Wilson 0.0, 39.0] (0/6) | 0.0 [Wilson 0.0, 39.0] (0/6) | 0.0 [Wilson 0.0, 39.0] (0/6) |

Polygon rows (seed-free): n=3: R1 6/6, R2 6/6, R3 6/6, R4 6/6, R5 0/6; n=4: R1 6/6, R2 0/6, R3 6/6, R4 0/6, R5 0/6; n=8: R1 6/6, R2 0/6, R3 6/6, R4 0/6, R5 0/6; n=11: R1 6/6, R2 0/6, R3 6/6, R4 0/6, R5 0/6; n=12: R1 6/6, R2 0/6, R3 6/6, R4 0/6, R5 0/6; n=13: R1 0/6, R2 0/6, R3 0/6, R4 0/6, R5 0/6; n=16: R1 0/6, R2 0/6, R3 0/6, R4 0/6, R5 0/6

### (c2) down-sampled clean bases: M1 (any error) by k


| key | rows | R1 v1.3 default | R2 v1.3, SHARP off | R3 v1.3, UNDERSAMPLED off | R4 v1.2 (both off) | R5 legacy ratio |
|---|---|---|---|---|---|---|
| k=2 | 2520 | 0.0 [0.0, 0.1] | 0.0 [0.0, 0.1] | 0.0 [0.0, 0.1] | 0.0 [0.0, 0.1] | 0.0 [0.0, 0.1] |
| k=4 | 2520 | 30.4 [29.3, 31.6] | 27.5 [26.5, 28.6] | 30.4 [29.3, 31.6] | 27.5 [26.5, 28.6] | 1.1 [0.6, 1.6] |
| k=8 | 2520 | 81.6 [81.1, 82.1] | 60.3 [58.6, 62.1] | 81.6 [81.1, 82.1] | 60.3 [58.6, 62.1] | 4.4 [3.4, 5.5] |
| k=16 | 2520 | 96.7 [95.1, 98.0] | 31.7 [29.4, 34.1] | 96.7 [95.1, 98.0] | 31.7 [29.4, 34.1] | 9.1 [7.6, 10.7] |

### (c2) kink-family flag (all vertices) by k


| key | rows | R1 v1.3 default | R2 v1.3, SHARP off | R3 v1.3, UNDERSAMPLED off | R4 v1.2 (both off) | R5 legacy ratio |
|---|---|---|---|---|---|---|
| k=2 | 2520 | 0.0 [seeds: CP 0.0-8.8] | 0.0 [seeds: CP 0.0-8.8] | 0.0 [seeds: CP 0.0-8.8] | 0.0 [seeds: CP 0.0-8.8] | 0.0 [seeds: CP 0.0-8.8] |
| k=4 | 2520 | 30.2 [29.2, 31.3] | 26.7 [25.7, 27.8] | 30.2 [29.2, 31.3] | 26.7 [25.7, 27.8] | 0.0 [seeds: CP 0.0-8.8] |
| k=8 | 2520 | 81.3 [80.8, 81.7] | 59.9 [58.3, 61.5] | 81.3 [80.8, 81.7] | 59.9 [58.3, 61.5] | 0.4 [0.1, 0.6] |
| k=16 | 2520 | 96.7 [95.1, 98.0] | 25.8 [23.5, 28.3] | 96.7 [95.1, 98.0] | 25.8 [23.5, 28.3] | 2.9 [2.1, 3.7] |

### (c2) UNDERSAMPLED by k


| key | rows | R1 v1.3 default | R2 v1.3, SHARP off |
|---|---|---|---|
| k=2 | 2520 | 30.1 [29.9, 30.3] | 30.1 [29.9, 30.3] |
| k=4 | 2520 | 83.7 [82.3, 85.0] | 83.7 [82.3, 85.0] |
| k=8 | 2520 | 97.4 [96.4, 98.3] | 97.4 [96.4, 98.3] |
| k=16 | 2520 | 100.0 [seeds: CP 91.2-100.0] | 100.0 [seeds: CP 91.2-100.0] |

### (c2) M2 by k and mode type


| key | rows | R1 v1.3 default | R4 v1.2 (both off) |
|---|---|---|---|
| k=2, auto | 360 | 0.0 [seeds: CP 0.0-8.8] | 0.0 [seeds: CP 0.0-8.8] |
| k=2, pattern | 2160 | 0.0 [seeds: CP 0.0-8.8] | 0.0 [seeds: CP 0.0-8.8] |
| k=4, auto | 360 | 28.3 [24.2, 31.7] | 14.2 [9.2, 19.2] |
| k=4, pattern | 2160 | 30.6 [29.6, 31.5] | 28.8 [28.0, 29.7] |
| k=8, auto | 360 | 35.0 [33.3, 37.5] | 33.3 [33.3, 33.3] |
| k=8, pattern | 2160 | 89.0 [88.7, 89.3] | 64.3 [62.4, 66.2] |
| k=16, auto | 360 | 85.8 [77.5, 92.5] | 35.0 [26.7, 42.5] |
| k=16, pattern | 2160 | 98.5 [97.8, 99.2] | 24.3 [22.0, 26.8] |


## Per-level tables

The full per-level tables (all classes, levels, rules, measures, with intervals and iid Wilson) are in `SUMMARY.json` under `tables`.

