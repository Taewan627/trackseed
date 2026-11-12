# E7 heldout

Seeds: 30 (heldout); grid: 7290 parameter-set x seed cells per join; validator v1.1 defaults.

| quantity | legacy | tangent |
|---|---|---|
| ok, all cases | 29.55% [28.51, 30.61] (2154/7290) | 82.92% [82.04, 83.77] (6045/7290) |
| ok, straight = 0 | 88.64% [87.32, 89.84] (2154/2430) | 88.64% [87.32, 89.84] (2154/2430) |
| ok, straight > 0 | 0.00% [0.00, 0.08] (0/4860) | 80.06% [78.91, 81.16] (3891/4860) |
| ok, straight > 0, curves 3 | 0.00% [0.00, 0.24] (0/1620) | 66.11% [63.77, 68.38] (1071/1620) |
| ok, straight > 0, curves 6 | 0.00% [0.00, 0.24] (0/1620) | 96.85% [95.88, 97.60] (1569/1620) |
| ok, straight > 0, curves 10 | 0.00% [0.00, 0.24] (0/1620) | 77.22% [75.12, 79.20] (1251/1620) |
| ok, straight > 0, width 20 | 0.00% [0.00, 0.24] (0/1620) | 100.00% [99.76, 100.00] (1620/1620) |
| ok, straight > 0, width 40 | 0.00% [0.00, 0.24] (0/1620) | 94.63% [93.42, 95.63] (1533/1620) |
| ok, straight > 0, width 80 | 0.00% [0.00, 0.24] (0/1620) | 45.56% [43.14, 47.99] (738/1620) |

Default parameters (autoJoin tangent): 100.00% [88.65, 100.00] (30/30)

Error-code counts (tracks with the code):

- legacy: {"EDGE_FOLD":4887,"SELF_INTERSECTION_EDGE":4770,"CLOSURE_TANGENT":3645,"LOCAL_KINK":4860}
- tangent: {"EDGE_FOLD":1245,"SELF_INTERSECTION_EDGE":1209}

Paired: {"legacyOk_tangentOk":2154,"legacyOk_tangentNotOk":0,"legacyNotOk_tangentOk":3891,"legacyNotOk_tangentNotOk":1245}

Geometry at straight > 0: {"cases":4860,"absRelativeLengthChange":{"n":4860,"median":0.035369,"min":0.003009,"max":0.07866},"realisedStraightFractionRatioTangentOverLegacy":{"n":4860,"median":0.617288,"min":0.426498,"max":0.995975},"requestedStraightParameter":{"n":4860,"median":0.45,"min":0.3,"max":0.6},"quantisedStraightFraction":{"n":4860,"median":0.466667,"min":0.3,"max":0.666667},"realisedStraightFractionLegacy":{"n":4860,"median":0.452455,"min":0.255492,"max":0.687394},"realisedStraightFractionTangent":{"n":4860,"median":0.301541,"min":0.131938,"max":0.416927},"maxVertexTurnDegreesLegacy":{"n":4860,"median":69.287018,"min":26.904613,"max":136.205993},"maxVertexTurnDegreesTangent":{"n":4860,"median":6.533064,"min":2.457032,"max":15.986621},"verticesOver12DegreesLegacy":{"n":4860,"median":3,"min":2,"max":7},"verticesOver12DegreesTangent":{"n":4860,"median":0,"min":0,"max":8}}

## Predictions

- P1 HELD: default parameters, tangent join: >= 99% ok; observed {"k":30,"n":30,"p":1,"lo":0.886487,"hi":1}
- P2 HELD: legacy join at straight > 0: ok rate <= 2%; observed {"k":0,"n":4860,"p":0,"lo":0,"hi":0.00079}
- P3 HELD: tangent join at straight > 0: ok >= 75% overall; curves 6 >= 95%, curves 10 >= 75%, curves 3 >= 55%; observed {"overall":{"k":3891,"n":4860,"p":0.800617,"lo":0.789149,"hi":0.811611},"curves3":{"k":1071,"n":1620,"p":0.661111,"lo":0.637705,"hi":0.683755},"curves6":{"k":1569,"n":1620,"p":0.968519,"lo":0.958845,"hi":0.975975},"curves10":{"k":1251,"n":1620,"p":0.772222,"lo":0.751169,"hi":0.791987}}
- P4 HELD: no tangent-join track carries LOCAL_KINK or CLOSURE_TANGENT; observed {"tracks":0,"of":7290}
- P5 HELD: every failing tangent-join track fails only with SELF_INTERSECTION_EDGE and/or EDGE_FOLD; observed {"failingTracksWithOtherErrorCodes":0}
- P6 HELD: straight = 0: bit-identical points, identical ok and codes in 100% of cases; observed {"cases":2430,"pointsBitIdentical":2430,"okSame":2430,"codesSame":2430}
- P7 HELD: no case ok under legacy and not ok under tangent; observed {"cases":0}
- P8 HELD: median |relative length change| <= 10%; median straight-fraction ratio >= 0.5; median max per-vertex turn (tangent) <= 15 degrees; observed {"medianAbsRelativeLengthChange":0.035369,"medianStraightFractionRatio":0.617288,"medianMaxTurnTangent":6.533064,"medianMaxTurnLegacy":69.287018}
- P10 HELD: no Auto generation throws under either join (byte-identity of two runs is checked by run-twice.mjs); observed {"grid":{"legacy":0,"tangent":0},"defaults":0}
