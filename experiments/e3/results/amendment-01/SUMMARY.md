# E3 valid-only tables under the amended validator (AMENDMENT-01 addendum)

Plan and predictions: ../../../amendment-01/ADDENDUM-E3.md (committed alone, before this analysis). Code: ../../analyze_amendment01.py. Input: ../../../e2/results/amendment-01/validity.csv.gz. Outputs: tables.md, SUMMARY.json (this directory). No new generation.

## Primary analysis unchanged

The committed primary results are byte-identical before and after this re-run (and re-running the original analyze.py on its unchanged input leaves the working tree unchanged). SHA-256 recorded before the re-run:

```
ba75ea6f66974989ec8a3090529c78f4f04dc902c036a7bd2cf7431e129b9d01  experiments/e3/results/SUMMARY.json
7bacd178bc83098557cdb1e5b65376814150002f0fb5e78209c176d3b28138f8  experiments/e3/results/tables.md
15657a55dd7b83d28b92d286d1200b143ba26e60a2c51ba1b6b69ccf4dbdf32f  experiments/e3/results/figures/e3_pair1_straightLengthFraction_curvatureEntropyBits.png
546e0de5a63ec1b9c37f65923e8be4b2e40fa8623093a93ead966a22144941f0  experiments/e3/results/figures/e3_pair2_totalTurningDegrees_length.png
6acbe4cbc1de2822edf6b5dd01f8c6bc2312814f595da941880c7d173fdd12e2  experiments/e3/results/figures/e3_pair3_elevationRange_maxAbsSlope.png
```

## Predictions vs observed

1. Right-angle, hairpin, s-curve valid-only equals primary (n 12150, 12144, 12150; all six metrics' statistics identical): CONFIRMED (SUMMARY.json checks.patternModesStatsEqualPrimary: true for the three modes).
2. Auto valid-only n = 3792: CONFIRMED (3792).
3. About 95% of Auto valid-only tracks have straight = 0: CONFIRMED (95.3%). Median straightLengthFraction of Auto valid-only is exactly 0: REFUTED, it is 0.02552 (primary 0.3263). The prediction assumed that straight = 0 tracks have no straight fraction; some have a small positive measured fraction. The direction (far below the primary median) holds.
4. Protocol prediction 2 (pattern median straightLengthFraction <= Auto's) reversed in the valid-only population: PARTLY. Medians right-angle 0.1132 and hairpin 0.06161 exceed Auto 0.02552 (reversed); s-curve 0.003368 stays below it (not reversed). Auto pair-1 occupied bins fall from 263 (primary) to 160 (valid-only): CONFIRMED.
5. Auto valid-only median totalTurningDegrees 360: CONFIRMED (360).

## Reading

Under the amended rule the valid-only populations of the three pattern modes are the full primary populations; only Auto's valid-only population is a selected subset (3792 of 12,150, 95.3% of it with straight = 0). Original (S3b rule) valid-only n were Auto 2859, right-angle 9699, hairpin 10218, s-curve 10017 (comparison table in tables.md).
