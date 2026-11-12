# E7 summary: heading-continuous Auto join

Protocol: [PROTOCOL.md](PROTOCOL.md) (commit bd3a642, before any evaluation). Freeze: [FREEZE.md](FREEZE.md) (commit 3f867fc). Results: `results/dev`, `results/repro`, `results/heldout` (per case CSV, SUMMARY.json/md, DETERMINISM.txt with the SHA-256 of two separate runs; all nine file pairs are byte-identical). HELD-OUT was run once. Validator v1.1 defaults. Claims are limited to these seeds, this grid, this validator and one machine (Node 22).

## Predictions

| id | prediction | DEV (20 seeds) | HELD-OUT (30 seeds) | verdict |
|---|---|---|---|---|
| P1 | default parameters, tangent: >= 99% ok | 20/20 (Wilson 83.9-100%) | 30/30 (Wilson 88.6-100%) | held (point rate; with n = 30 the interval cannot exclude 89%) |
| P2 | legacy, straight > 0: <= 2% ok | 0/3240 | 0/4860 (upper 95% bound 0.08%) | held |
| P3 | tangent, straight > 0: >= 75% overall; curves 6 >= 95%, 10 >= 75%, 3 >= 55% | 80.6%; 97.8 / 80.0 / 64.2% | 80.1% (3891/4860); curves 6 96.9%, 10 77.2%, 3 66.1% | held |
| P4 | no tangent track with LOCAL_KINK or CLOSURE_TANGENT | 0/4860 | 0/7290 | held |
| P5 | tangent failures carry only SELF_INTERSECTION_EDGE / EDGE_FOLD | 0 exceptions | 0 exceptions | held |
| P6 | straight = 0: bit-identical points, same ok and codes | 1620/1620 | 2430/2430 | held |
| P7 | no case ok under legacy and not ok under tangent | 0 | 0 | held |
| P8 | median abs length change <= 10%; median straight-fraction ratio >= 0.5; median max vertex turn (tangent) <= 15 deg | 3.7%; 0.615; 6.8 deg | 3.5%; 0.617; 6.5 deg | held |
| P9 | legacy join reproduces the E2 recheck v1.1 ok and code columns | (REPRO, SEEDS[0..49]) 12,150 cases, 0 mismatches | | held |
| P10 | no generation failure; two runs byte-identical | 0 failures; identical | 0 failures; identical | held |

No prediction failed. Nothing was edited after results.

## Numbers (HELD-OUT, tangent vs legacy)

- Auto, whole grid: 82.92% [82.04, 83.77] vs 29.55% [28.51, 30.61].
- Auto, straight = 0: 88.64% for both (identical tracks).
- Auto, straight > 0: 80.06% [78.91, 81.16] vs 0.00% [0.00, 0.08]. By width: 20 -> 100%, 40 -> 94.6%, 80 -> 45.6%.
- Paired: legacy ok and tangent ok 2154; legacy ok, tangent not ok 0; legacy not ok, tangent ok 3891; both not ok 1245.
- Error-code counts (tracks): legacy EDGE_FOLD 4887, SELF_INTERSECTION_EDGE 4770, CLOSURE_TANGENT 3645, LOCAL_KINK 4860; tangent EDGE_FOLD 1245, SELF_INTERSECTION_EDGE 1209.
- Geometry at straight > 0 (medians): max per-vertex turn 69.3 deg (legacy) -> 6.5 deg (tangent); vertices over 12 deg 3 -> 0; track length +3.5% (range +0.3% to +7.9%); realised straight fraction 0.452 (legacy) -> 0.302 (tangent), ratio 0.617 (min 0.43, max 1.00), against the requested `straight` of median 0.45 and the quantised round(straight x curves) / curves of median 0.467.
- Default parameters (curves 6, straight 0.25): 30/30 ok.

## Reading the results

1. The defect was the join: no tangent-join track has a kink code, and every track that is ok under legacy stays ok.
2. The remaining 20% failures at straight > 0 are road-edge fold / self-intersection, not kinks. They concentrate where the road is wide relative to the circuit (width 80: 45.6% ok; curves 3). The straight = 0 baseline is 88.6% over the same grid, so the join costs about 8.6 points relative to that ceiling (80.1% at straight > 0 vs 88.6% at straight = 0; the cause of the extra failures was not investigated beyond the error codes). The E2 grid contains extreme combinations that the default does not.
3. The tangent join gives up straight length: where a straight is adjacent to another straight, 35% of the samples at each shared end become a blend. The realised straight fraction is about 62% of the legacy one (median); requested-vs-realised is reported above, not claimed to equal the request. The default (straight 0.25, curves 6) keeps two straight segments.
4. Total absolute turning of the default tracks rises from 360 to a median of 372 degrees (max 433, [results/exploratory.txt](results/exploratory.txt)): the Hermite construction occasionally adds a shallow S-bend next to a straight.

## DEVIATIONS and disclosures

- The constants JOIN_BLEND and JOIN_GAIN were chosen before the protocol commit on exploratory seeds outside SEEDS[150..199] (stated in PROTOCOL.md section 2; the harness records an empty overlap list). They were not tuned on DEV or HELD-OUT.
- PROTOCOL.md section 5 words the realised straight fraction as "share of centerline length in vertices whose heading change on both sides is below 0.01 degrees"; the harness measures planar edge length of edges whose two end vertices both turn less than 0.01 degrees. Same intent, stated precisely here.
- `results/exploratory.txt` (default parameters on seeds 0..199, join-vertex turns at curves 8 / straight 0.3 on seeds 0..299, total turning) is exploratory and was produced after the HELD-OUT run; it is not a prediction. Seeds 0..199 do not intersect SEEDS[150..199].
- Existing `experiments/e6` and `experiments/e2` scripts call `generateTrack` without `autoJoin`; re-running them now exercises the new default join and no longer reproduces their committed (legacy) results. Their committed outputs are untouched; `experiments/e7/results/repro` shows that the legacy join still reproduces the E2 recheck exactly.
