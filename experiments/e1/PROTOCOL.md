# E1 protocol (pre-registration)

Status: committed before any E1 result exists. No E1 harness code has been executed at the time of this commit. Any later change to this file is a deviation and must be listed in the results report.

## Research question

Do identical TrackLab inputs produce identical exported documents across JavaScript engines/runtimes, and does the deterministic-math rewrite (src/detmath.ts, v0.5) matter?

## Subjects

- **v0.5** : this repository at master 00dfad1 (VERSION 0.5.0). Generation path uses src/detmath.ts instead of Math.sin/cos/atan2/hypot/exp.
- **legacy control (v0.4)** : commit 6fea4d6 (src/core.ts, patterns.ts, coins.ts, vehicle.ts), which calls Math.sin/cos/atan2/hypot directly (implementation-approximated by the engine).

## Fixed case set (1000 cases per subject)

1000 cases = 200 seeds x 5 parameter configurations. Every case is a full `Partial<Params>` passed to `generateTrack` (which sanitizes it).

### Seeds (200, in this order)

The first 16 are hand-picked boundary/round values; the remaining 184 are distinct draws `Math.floor(r() * 2147483648)` from the mulberry32 stream defined by `random(20261111)` in src/core.ts (draws equal to an earlier seed are skipped until 200 distinct seeds exist).

```
[
  0, 1, 2, 3, 7, 42, 100, 1234, 12345, 65535,
  65536, 99999, 1000000, 16777216, 2147483646, 2147483647, 1211967129, 1976064911, 1436848794, 1437529530,
  115781524, 791051882, 464855833, 1193808300, 1469734568, 1850946891, 1835407073, 832037625, 466535511, 837779550,
  168280811, 523612261, 1489841039, 2072563558, 1684588142, 1994105342, 982219031, 623836359, 1457514757, 1630879510,
  2001195855, 1656671393, 1074080347, 809006680, 1661750365, 45205163, 1007771946, 2087327001, 840556756, 1495767810,
  1985035141, 1329840483, 525529781, 77343338, 1344827609, 2104689142, 1705817413, 1111752253, 450305188, 1531272594,
  1544622695, 955951566, 342276008, 162268811, 488921844, 1769384679, 413333401, 1872597466, 565740990, 2006122340,
  230113972, 207550937, 165076803, 2105333285, 397444099, 1697953486, 863238950, 1992953763, 1549514625, 1005551892,
  2029024731, 1785066446, 52622258, 8164758, 1172228620, 1349453955, 656805105, 375389255, 1244970891, 1807421380,
  1537986117, 1021314749, 947536075, 648321581, 1528329093, 480417197, 261446822, 573091736, 1876440806, 465432937,
  60372460, 1186280696, 1368263082, 1214751660, 2022462718, 2013998174, 342338342, 505239045, 511612808, 1707249499,
  19114181, 968321288, 1199064927, 1054908531, 295206268, 237944993, 1335338277, 384081075, 1729712718, 544254616,
  1916756177, 2030499880, 884553040, 15799196, 964765431, 1336359068, 799626099, 1883073125, 1510223498, 731504404,
  1154150480, 1910373296, 1939272449, 1295803730, 1877415990, 1566366764, 29689692, 1856810357, 971822152, 456939580,
  1953096007, 1080537212, 434860226, 387035239, 242962905, 802916031, 190150443, 1294065704, 406497557, 114834514,
  1626918237, 592432025, 1145611723, 1663827229, 144792869, 46027217, 510183774, 1771770287, 858674795, 1039756394,
  1761574689, 661805818, 32561668, 566458712, 1506273959, 981618145, 189361622, 1643738806, 392270510, 1479275609,
  438835560, 2054264428, 333021743, 951576119, 287572515, 690494076, 1549049408, 1397418250, 227428068, 366092692,
  688307598, 1911172621, 48816507, 387607256, 414653610, 1460960218, 694384949, 3905786, 1112078407, 1055762397,
  448574196, 561555305, 1033520724, 2135600002, 469327237, 431402250, 682038160, 1527999748, 1033575238, 146639221,
]
```

SHA-256 of `JSON.stringify(seeds)` (no whitespace, as one JSON array): `5c5e64d680cecf26dacdad15c0766f498c9c85a997c0df1531b49e5a327a9f07`. The harness asserts this value before running.

### Parameter configurations (5); unspecified fields take the DEFAULTS in src/core.ts

| id | overrides (in addition to `seed`) |
|----|-----------------------------------|
| auto | `{}` (cornerPattern auto, defaults) |
| right-angle | `{cornerPattern:'right-angle', cornerCount:2, cornerStrength:60}` |
| hairpin | `{cornerPattern:'hairpin', cornerCount:1, cornerStrength:80}` |
| s-curve | `{cornerPattern:'s-curve', cornerCount:3, cornerStrength:40, curves:8}` |
| extreme | `{curves:10, size:3, width:80, height:200, obstacles:8, density:20}` (cornerPattern auto) |

Case id: `<configId>:<seed>`. Case order: configurations in the table order, seeds in list order within each.

If `generateTrack` or export throws for a case, the case digest is the string `THROW:<error.name>` and it is compared like any other digest (no case is dropped or retried).

## Measured quantity

- **v0.5**: lower-case hex SHA-256 of the UTF-8 string `serializeTrack(generateTrack(params))` = canonical sorted-key JSON of the TrackDocumentV1 (includes coins, patternReport and the embedded integrity digest).
- **legacy v0.4** (no schema): lower-case hex SHA-256 of `JSON.stringify({points, normals, roadEdges, props, obstacles})` of `generateTrack(params)` (key order exactly as written). This is a subset of the nine fields hashed by the S1 golden fixtures (the spec for this experiment names these five fields).
- Hashing is the engine-portable pure-JS SHA-256 from src/sha256.ts in every engine (never node:crypto). A self-test on the string `abc` is emitted with each run.
- Generator code is one esbuild ESM bundle per subject, byte-identical across engines.

## Agreement metric

- Reference = Node 22 (the system `node`).
- For each engine and subject: agreement = (number of cases whose digest equals the Node 22 digest for the same case id) / 1000, reported as a percentage, together with the absolute number of mismatching cases and the ids of up to the first 10 mismatches.
- Also reported: that Node 22 run against itself twice is identical (repeatability check, run twice in the same invocation of run-all).

## Engines

Recorded with exact version strings at run time (engine `process.version`/`Deno.version`/`Bun.version`/`navigator.userAgent` plus the CLI `--version` output):

1. Node 22 (system `node`) - V8, reference
2. Node 20 (`npx -y -p node@20 node`) - V8
3. Node 24 (`npx -y -p node@24 node`) - V8
4. Deno 2.x (`npx -y deno`) - V8
5. Bun 1.x (`npx -y bun@1`) - JavaScriptCore
6. Google Chrome headless (`/usr/bin/google-chrome`, HTML page, `--dump-dom`) - V8/Blink
7. Firefox (SpiderMonkey) via `npx -y playwright@1.64.1 install firefox`, attempted once; if unavailable the failure is recorded and the engine is reported as not run.

An engine that cannot run is reported with its error; it is never silently dropped.

## Predictions (recorded before any run)

- **v0.5: 100% agreement (0 mismatches) expected on every engine that runs**, including JavaScriptCore.
- **legacy v0.4: mismatches are possible on JavaScriptCore (Bun) but not guaranteed**; 100% agreement on the V8-based engines (Node 20/22/24, Deno, Chrome) is expected because they share V8's math library family (possible small differences across V8 major versions are not excluded). If legacy shows 100% agreement everywhere, that is reported plainly: the deterministic rewrite is then a portability guarantee rather than a fix for a divergence observed on these engines.

## Reporting rules

- Numbers only; no interpretation beyond what the counts show. Claims are limited to these engines, these versions, these 1000 cases per subject.
- Any deviation from this protocol (engine unavailable, changed case, bundle command change) is listed in the final report.
