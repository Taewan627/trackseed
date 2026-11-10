# E1b protocol (pre-registration): does legacy float drift change discrete outcomes?

Status: committed before any E1b result exists and before any E1b harness code exists. Later edits to this file are deviations and must be listed in the DEVIATIONS section of results/SUMMARY.md, never made here.

## Question

E1 showed that legacy v0.4 (Math.sin/cos/atan2/hypot called directly) produces different coordinates on different engines (differences of order 1e-14 in the exported digests). Does that drift ever change a DISCRETE outcome of generation or validation, i.e. a count, a pattern-search outcome or a validator verdict?

## Cases

Exactly the 1000 E1 cases (experiments/e1/cases.mjs: 200 seeds x 5 configurations, imported unmodified; its SEEDS SHA-256 assertion stays in force). Case id `<configId>:<seed>`.

## Subject and measurement

Subject: legacy v0.4 at commit 6fea4d6 (git worktree /tmp/tlsx-legacy, the same source E1 bundled), `generateTrack(params)`. The track object is passed unchanged to `validateTrack` from the v0.5 tree (default options). The validator and its helpers (src/validate.ts, src/metrics.ts curvatureSamples, src/detmath.ts) contain no call to Math.sin/cos/atan2/hypot/exp/log/pow (grep output is recorded in the results); for identical input they are deterministic on every engine, so any disagreement in validator output is caused by the legacy track coordinates, not by the validator.

Generator and validator are bundled together into one esbuild 0.25 ESM bundle (es2020, platform neutral), byte-identical on all engines, as in E1.

Per case, one record with the PRIMARY discrete fields (each compared with `===` / string equality against the Node 22 record of the same case id):

| field | definition |
|---|---|
| throw | `error.name` if generateTrack threw, else null (a throwing case has no other fields) |
| nPoints | `track.points.length` |
| inserted, attempts, scale | `track.patternReport.inserted / .attempts / .scale` |
| straightSegments | `track.straightSegments` as a string of 0/1 |
| straightCount | number of true entries |
| propCount | `track.props.length` |
| propKinds | the `kind` of every prop in order, one letter each (tree=T, bench=B, lamp=L, building=U) |
| obstacleCount | `track.obstacles.length` |
| ok | `validateTrack(track).ok` |
| codes | sorted distinct `violation.code` values joined by `,` |

SECONDARY (exploratory, reported separately, not part of the primary disagreement count): `checkFailures` (string `id:failures` of every check of the validation result, in order), and `length` (`track.length`, to quantify the size of the continuous drift as max relative difference to Node 22).

A case "has a discrete disagreement" on an engine if at least one PRIMARY field differs from Node 22. Reported per engine: number of such cases out of 1000, per-field counts of differing cases, the first 10 case ids, and for each differing case the differing field values.

## Engines

Node 22 (system `node`, reference), Node 22 repeated (repeatability), Node 20, Node 24, Bun 1.x, Deno 2.x (via `npx -y`, as in E1), Chrome headless via playwright-core and /usr/bin/google-chrome, Firefox via playwright-core (if its browser binary can be installed; otherwise recorded as unavailable). Versions recorded at run time.

## Analysis

One table: engine x {cases with any discrete disagreement, count per field}. Plus the secondary table. Exact binomial 95% (Clopper-Pearson) upper bound for the disagreement rate when the count is 0. No hypothesis tests.

## Predictions (written before any run)

1. Discrete disagreements are rare: on every non-reference engine at most 1% of cases (<= 10 of 1000) show any primary-field disagreement; most likely 0 to 3.
2. Fields that depend only on integer/PRNG logic (nPoints when no pattern splice differs, straightSegments, obstacleCount, propCount for scenarios where no prop sits at the clearance threshold) agree in all cases; if any disagreement appears, it will be in `attempts`/`scale`/`nPoints` (pattern-search acceptance near a threshold), `propCount`/`propKinds` (clearance test) or `ok`/`codes` (a validator tolerance crossed near equality), not in `straightSegments` or `obstacleCount`.
3. Node 24 (V8, 48.7% E1 digest agreement) shows a disagreement count of the same order as Bun/Deno/Chrome/Firefox, not larger.
4. Node 22 repeat and Node 20 show 0 disagreements.
