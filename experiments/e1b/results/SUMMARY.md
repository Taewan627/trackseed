# E1b results: does legacy float drift change discrete outcomes?

Protocol: PROTOCOL.md (committed in 6f819a5 before any harness code or result). Cases: the 1000 E1 cases. Subject: legacy v0.4 @6fea4d6 generateTrack + v0.5 validateTrack (default options). Reference engine: Node 22. Bundle SHA-256 (build/e1b.mjs, esbuild 0.25): 975f0820a6672fa54546a9e035f4101a36df18cb8985f97822b6c178d11813cf. Raw per-engine outputs are in the gitignored out/ directory; their SHA-256 are in SUMMARY.json (rawSha256). Committed: records-node22.json.gz (reference records), diffs.json (per-case differences, empty for every engine), SUMMARY.json, table.md.

## Validator determinism statement

The validator code is the same bytes on every engine (one bundle) and uses no transcendental Math function. Output of
`grep -nE "Math\.(sin|cos|tan|atan2?|hypot|exp|log2?|log10|pow)" src/validate.ts src/metrics.ts src/detmath.ts`:

```
src/metrics.ts:5:// "difficulty". Like the generator, this module avoids Math.sin/cos/atan2/hypot/
src/detmath.ts:3:// ECMAScript only requires Math.sin/cos/atan2/hypot/exp/pow/... to be
src/detmath.ts:15:// No call to Math.sin/cos/tan/atan/atan2/exp/log/pow/hypot/cbrt/... occurs
src/detmath.ts:116:/** atan2 with the exact special-value table of ECMAScript Math.atan2. */
```

(all four hits are comment lines, in src/metrics.ts and src/detmath.ts; there is no executable call). Hence for identical input the validator gives identical output on all engines; any validator disagreement would have been caused by the legacy track coordinates.

## Result

| Engine | cases with any discrete disagreement | throw | nPoints | inserted | attempts | scale | straightSegments | straightCount | propCount | propKinds | obstacleCount | ok | codes | CP 95% upper |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Node 22 (reference) | 0 / 1000 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0.37% |
| Node 22 (repeat run) | 0 / 1000 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0.37% |
| Node 20 | 0 / 1000 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0.37% |
| Node 24 | 0 / 1000 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0.37% |
| Deno | 0 / 1000 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0.37% |
| Bun (JavaScriptCore) | 0 / 1000 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0.37% |
| Chrome headless (V8) | 0 / 1000 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0.37% |
| Firefox (SpiderMonkey) | 0 / 1000 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0.37% |

| Engine | cases with different checkFailures string | cases with different track.length | max relative length difference |
|---|---|---|---|
| Node 22 (reference) | 0 | 0 | 0.00e+0 |
| Node 22 (repeat run) | 0 | 0 | 0.00e+0 |
| Node 20 | 0 | 0 | 0.00e+0 |
| Node 24 | 0 | 317 | 9.99e-16 |
| Deno | 0 | 657 | 2.11e-15 |
| Bun (JavaScriptCore) | 0 | 691 | 2.34e-15 |
| Chrome headless (V8) | 0 | 657 | 2.11e-15 |
| Firefox (SpiderMonkey) | 0 | 599 | 2.29e-15 |

Engine versions:
- Node 22 (reference): node v22.23.4 V8 12.4.254.21-node.57
- Node 22 (repeat run): node v22.23.4 V8 12.4.254.21-node.57
- Node 20: node v20.20.2 V8 11.3.244.8-node.38
- Node 24: node v24.22.2 V8 13.6.233.17-node.63
- Deno: deno 2.9.6 V8 15.0.245.2-rusty
- Bun (JavaScriptCore): bun 1.4.4
- Chrome headless (V8): browser Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/153.0.0.0 Safari/537.36 (chrome 153.0.8010.12 via playwright-core)
- Firefox (SpiderMonkey): browser Mozilla/5.0 (X11; Linux x86_64; rv:157.0) Gecko/20100101 Firefox/157.0 (firefox 157.0 via playwright-core)

First differing case ids (up to 10):

Reading: no engine, including Node 24, Deno, Bun, Chrome and Firefox, disagrees with Node 22 on any primary discrete field in any of the 1000 cases, although the continuous drift is real: the secondary table shows `track.length` differing bitwise from Node 22 in 317 (Node 24) to 691 (Bun) cases, with maximum relative differences of about 1e-15 to 2e-15. With 0 disagreements in 1000 cases the exact (Clopper-Pearson) 95% upper bound on the per-case disagreement rate on this case set is 0.37%.

## Sensitivity of the measurement (how informative are these 1000 cases?)

Node 22 reference records: Auto and extreme cases (400) are invalid in all 400 cases with an almost constant code set (EDGE_FOLD, MAX_SLOPE, MIN_TURN_RADIUS and SELF_INTERSECTION_EDGE nearly everywhere), so the `ok` and `codes` fields are saturated there and could only reveal a flip of CLOSURE_TANGENT (present in 123 of 200 Auto and 88 of 200 extreme cases) or of SELF_INTERSECTION_EDGE (absent in 2 Auto cases). The pattern modes (600 cases) are valid in 594; `attempts` > 1 in 9 hairpin and 8 s-curve cases; propCount takes values 78 to 80 (non-extreme) and 155 to 160 (extreme). The secondary field checkFailures (per-check failure counts, a finer measure than the code set) is also identical on every engine in every case. The result therefore holds for this case set and these thresholds; it does not show that no input can flip a discrete outcome.

## Predictions vs observed

1. "At most 1% of cases (<= 10) with any disagreement per engine": confirmed; observed 0 on every engine.
2. "Disagreements, if any, only in attempts/scale/nPoints, propCount/propKinds or ok/codes, never straightSegments/obstacleCount": vacuously true (no disagreements).
3. "Node 24 same order as the other non-V8-12 engines, not larger": confirmed (0 each).
4. "Node 22 repeat and Node 20 show 0": confirmed.
Prediction 1 said "most likely 0 to 3": observed 0.

## DEVIATIONS

None. The protocol was executed as written (all eight engine runs succeeded; Firefox binary was present under /opt/pw-browsers).
