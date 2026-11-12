# E7 dev

Seeds: 20 (dev); grid: 4860 parameter-set x seed cells per join; validator v1.1 defaults.

| quantity | legacy | tangent |
|---|---|---|
| ok, all cases | 29.69% [28.42, 30.99] (1443/4860) | 83.46% [82.39, 84.47] (4056/4860) |
| ok, straight = 0 | 89.07% [87.46, 90.50] (1443/1620) | 89.07% [87.46, 90.50] (1443/1620) |
| ok, straight > 0 | 0.00% [0.00, 0.12] (0/3240) | 80.65% [79.25, 81.97] (2613/3240) |
| ok, straight > 0, curves 3 | 0.00% [0.00, 0.35] (0/1080) | 64.17% [61.26, 66.97] (693/1080) |
| ok, straight > 0, curves 6 | 0.00% [0.00, 0.35] (0/1080) | 97.78% [96.71, 98.50] (1056/1080) |
| ok, straight > 0, curves 10 | 0.00% [0.00, 0.35] (0/1080) | 80.00% [77.51, 82.28] (864/1080) |
| ok, straight > 0, width 20 | 0.00% [0.00, 0.35] (0/1080) | 100.00% [99.65, 100.00] (1080/1080) |
| ok, straight > 0, width 40 | 0.00% [0.00, 0.35] (0/1080) | 95.00% [93.53, 96.15] (1026/1080) |
| ok, straight > 0, width 80 | 0.00% [0.00, 0.35] (0/1080) | 46.94% [43.98, 49.93] (507/1080) |

Default parameters (autoJoin tangent): 100.00% [83.89, 100.00] (20/20)

Error-code counts (tracks with the code):

- legacy: {"EDGE_FOLD":3243,"SELF_INTERSECTION_EDGE":3180,"LOCAL_KINK":3240,"CLOSURE_TANGENT":2052}
- tangent: {"EDGE_FOLD":804,"SELF_INTERSECTION_EDGE":792}

Paired: {"legacyOk_tangentOk":1443,"legacyOk_tangentNotOk":0,"legacyNotOk_tangentOk":2613,"legacyNotOk_tangentNotOk":804}

Geometry at straight > 0: {"cases":3240,"absRelativeLengthChange":{"n":3240,"median":0.03694,"min":0.004546,"max":0.080835},"realisedStraightFractionRatioTangentOverLegacy":{"n":3240,"median":0.615276,"min":0.395073,"max":0.982351},"requestedStraightParameter":{"n":3240,"median":0.45,"min":0.3,"max":0.6},"quantisedStraightFraction":{"n":3240,"median":0.466667,"min":0.3,"max":0.666667},"realisedStraightFractionLegacy":{"n":3240,"median":0.455043,"min":0.250177,"max":0.680961},"realisedStraightFractionTangent":{"n":3240,"median":0.2992,"min":0.141192,"max":0.422177},"maxVertexTurnDegreesLegacy":{"n":3240,"median":68.295981,"min":26.113677,"max":131.715198},"maxVertexTurnDegreesTangent":{"n":3240,"median":6.798542,"min":2.752508,"max":18.206114},"verticesOver12DegreesLegacy":{"n":3240,"median":4,"min":2,"max":8},"verticesOver12DegreesTangent":{"n":3240,"median":0,"min":0,"max":8}}

## Predictions

- P1 HELD: default parameters, tangent join: >= 99% ok; observed {"k":20,"n":20,"p":1,"lo":0.838875,"hi":1}
- P2 HELD: legacy join at straight > 0: ok rate <= 2%; observed {"k":0,"n":3240,"p":0,"lo":0,"hi":0.001184}
- P3 HELD: tangent join at straight > 0: ok >= 75% overall; curves 6 >= 95%, curves 10 >= 75%, curves 3 >= 55%; observed {"overall":{"k":2613,"n":3240,"p":0.806481,"lo":0.792519,"hi":0.819718},"curves3":{"k":693,"n":1080,"p":0.641667,"lo":0.612613,"hi":0.669716},"curves6":{"k":1056,"n":1080,"p":0.977778,"lo":0.967147,"hi":0.985022},"curves10":{"k":864,"n":1080,"p":0.8,"lo":0.775099,"hi":0.822774}}
- P4 HELD: no tangent-join track carries LOCAL_KINK or CLOSURE_TANGENT; observed {"tracks":0,"of":4860}
- P5 HELD: every failing tangent-join track fails only with SELF_INTERSECTION_EDGE and/or EDGE_FOLD; observed {"failingTracksWithOtherErrorCodes":0}
- P6 HELD: straight = 0: bit-identical points, identical ok and codes in 100% of cases; observed {"cases":1620,"pointsBitIdentical":1620,"okSame":1620,"codesSame":1620}
- P7 HELD: no case ok under legacy and not ok under tangent; observed {"cases":0}
- P8 HELD: median |relative length change| <= 10%; median straight-fraction ratio >= 0.5; median max per-vertex turn (tangent) <= 15 degrees; observed {"medianAbsRelativeLengthChange":0.03694,"medianStraightFractionRatio":0.615276,"medianMaxTurnTangent":6.798542,"medianMaxTurnLegacy":68.295981}
- P10 HELD: no Auto generation throws under either join (byte-identity of two runs is checked by run-twice.mjs); observed {"grid":{"legacy":0,"tangent":0},"defaults":0}
