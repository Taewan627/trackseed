# E9 addendum-02: what validator v1.3 reports about each source at its own sampling and at a common sampling rule

Protocol: `experiments/e9/ADDENDUM-02.md` (committed alone before the harness). **Question: what the validator reports about each source's sampling and geometry under one rule set. This is not a quality ranking and not a validity verdict.** Validator: v1.3 library defaults (`SHARP_VERTEX` 30 degrees, `UNDERSAMPLED` 12 degrees / 10 %), calibrated on TrackSeed's own tracks (home advantage: see the protocol, section 1). Arms: raw = as emitted; cs25 = smooth resampling at spacing 0.25 x road width for every source (the common rule); cs10 = 0.10 x width (sensitivity). Wilson 95 % intervals; one track per seed; the original E9 results are untouched.

Polyline set sha256 (E9 sources): 44a1b4353f8176d71f0a97c33a8d1c525e067c63372a9fbae890d0e83fe0d1d1; TrackSeed polylines: 9c2646842e4418cb721c1382b2e6e7d5f1b45608329ef0d34fe768d722b2b019. Node v22.23.4.

## Predictions

Tally: 7 held, 4 failed of 11 (A12 (determinism) is evaluated by addendum-02.sh and recorded in DETERMINISM.txt).

| id | verdict | part | observed |
|---|---|---|---|
| A1 v1.2-pinned outcomes equal the committed E9 table; polyline hash equal (construction) | **held** (ok) | 0 mismatches, hash equal | {"compared":20018,"mismatches":0,"notInE9":0,"e9PolylinesSha256":"44a1b4353f8176d71f0a97c33a8d1c525e067c63372a9fbae890d0e83fe0d1d1","thisRun":"44a1b4353f8176d71f0a97c33a8d1c525e067c63372a9fbae890d0e83fe0d1d1"} |
| A2 ok(v1.3) implies ok(v1.2) (construction) | **held** (ok) | 0 tracks with v1.2 fail and v1.3 ok | 0 |
| A3 TrackSeed raw (informed) | **held** (ok) | ok >= 95% | 100.0% |
|  |  (ok) | UNDERSAMPLED <= 1% | 0.0% |
|  |  (ok) | SHARP <= 0.5% | 0.0% |
| A4 TrackSeed cs25 (informed) | **held** (ok) | ok >= 95% | 100.0% |
|  |  (ok) | |raw - cs25| <= 3 pp | 0.00 pp |
|  |  (ok) | UNDERSAMPLED <= 1% | 0.0% |
| A5 raw UNDERSAMPLED rates (informed) | **failed** (ok) | AMZ <= 2% | 0.0% |
|  |  (ok) | drift-school s0 <= 1% | 0.0% |
|  |  (ok) | drift-school s1 <= 1% | 0.0% |
|  |  (ok) | drift-school s2 <= 1% | 0.0% |
|  |  (ok) | drift-school s3 <= 1% | 0.0% |
|  |  (ok) | drift-school s4 <= 1% | 0.0% |
|  |  (ok) | E5 <= 25% | 0.0% |
|  |  (FAILED) | CarRacing >= 80% | 55.3% |
|  |  (ok) | track_gen >= 80% | 80.9% |
|  |  (ok) | juangallostra >= 90% | 100.0% |
|  |  (ok) | bacinger >= 40% | 100.0% |
|  |  (ok) | TUMFTM 0..3 of 25 | 0 of 25 |
| A6 raw SHARP_VERTEX rates (informed) | **failed** (ok) | AMZ 0% | 0.0% |
|  |  (ok) | drift-school s0 0% | 0.0% |
|  |  (ok) | drift-school s1 0% | 0.0% |
|  |  (ok) | drift-school s2 0% | 0.0% |
|  |  (ok) | drift-school s3 0% | 0.0% |
|  |  (ok) | drift-school s4 0% | 0.0% |
|  |  (ok) | CarRacing <= 5% | 0.1% |
|  |  (ok) | E5 <= 2% | 0.0% |
|  |  (ok) | track_gen 30..70% | 52.5% |
|  |  (ok) | bacinger >= 40% | 90.0% |
|  |  (FAILED) | TUMFTM <= 4 of 25 | 6 of 25 |
| A7 cs25: v1.3 vs v1.2 ok (informed) | **held** (ok) | gen-e5-thorimbert |v1.3 - v1.2| <= 2 pp | 0.00 pp |
|  |  (ok) | gen-amz-voronoi |v1.3 - v1.2| <= 2 pp | 0.00 pp |
|  |  (ok) | gen-carracing |v1.3 - v1.2| <= 2 pp | 0.00 pp |
|  |  (ok) | gen-driftschool-s0 |v1.3 - v1.2| <= 2 pp | 0.00 pp |
|  |  (ok) | gen-driftschool-s1 |v1.3 - v1.2| <= 2 pp | 0.00 pp |
|  |  (ok) | gen-driftschool-s2 |v1.3 - v1.2| <= 2 pp | 0.00 pp |
|  |  (ok) | gen-driftschool-s3 |v1.3 - v1.2| <= 2 pp | 0.00 pp |
|  |  (ok) | gen-driftschool-s4 |v1.3 - v1.2| <= 2 pp | 0.00 pp |
|  |  (ok) | gen-trackseed |v1.3 - v1.2| <= 2 pp | 0.00 pp |
|  |  (ok) | TUMFTM <= 2 circuits | 0 |
| A8 cs25 UNDERSAMPLED rates (informed) | **failed** (ok) | gen-e5-thorimbert <= 5% | 0.0% |
|  |  (ok) | gen-amz-voronoi <= 5% | 0.0% |
|  |  (ok) | gen-trackseed <= 5% | 0.0% |
|  |  (ok) | gen-driftschool-s0 <= 5% | 3.7% |
|  |  (ok) | gen-driftschool-s1 <= 5% | 0.0% |
|  |  (ok) | gen-driftschool-s2 <= 5% | 0.0% |
|  |  (ok) | gen-driftschool-s3 <= 5% | 0.0% |
|  |  (ok) | gen-driftschool-s4 <= 5% | 0.0% |
|  |  (FAILED) | CarRacing >= 60% | 41.4% |
|  |  (FAILED) | track_gen >= 50% | 0.4% |
|  |  (ok) | TUMFTM <= 3 of 25 | 0 of 25 |
| A9 TUMFTM width runs (informed) | **held** (ok) | cs25 ok(min) - ok(median) >= 2 circuits | 24 vs 20 |
|  |  (ok) | raw ok differs by <= 1 circuit | 13 vs 13 |
| A10 juangallostra (informed) | **held** (ok) | raw ok <= 0.5% | 0.0% |
|  |  (ok) | cs25 ok <= 12.83% | 10.6% |
|  |  (ok) | all-integer tracks >= 99% | 998/998 |
|  |  (ok) | q >= 15 degrees | 25.2088 |
| A11 the sampling diagnostic does not explain real-circuit failures (informed) | **failed** (ok) | TUMFTM: failing raw circuits with UNDERSAMPLED <= 30% | 0/12 |
|  |  (FAILED) | CarRacing >= 90% | 314/608 |
|  |  (FAILED) | track_gen >= 90% | 646/738 |

## ok rates with both denominators (validator v1.3, main width)

| source | produced / attempted | self-filtering | raw ok of produced | raw ok of attempted | cs25 ok of produced | cs25 ok of attempted | cs10 ok of produced | raw ok under v1.2 (E9) | cs25 ok under v1.2 (E9) |
|---|---|---|---|---|---|---|---|---|---|
| gen-trackseed | 1000 / 1000 | no (never calls its validator) | 100.0% (1000/1000) [99.6, 100.0] | 100.0% (1000/1000) [99.6, 100.0] | 100.0% (1000/1000) [99.6, 100.0] | 100.0% (1000/1000) [99.6, 100.0] | 100.0% (1000/1000) [99.6, 100.0] | 100.0% (1000/1000) [99.6, 100.0] | 100.0% (1000/1000) [99.6, 100.0] |
| real-tumftm | 25 / 25 | n/a (real) | 52.0% (13/25) [33.5, 70.0] | 52.0% (13/25) [33.5, 70.0] | 80.0% (20/25) [60.9, 91.1] | 80.0% (20/25) [60.9, 91.1] | 84.0% (21/25) [65.3, 93.6] | 60.0% (15/25) [40.7, 76.6] | 80.0% (20/25) [60.9, 91.1] |
| gen-e5-thorimbert | 1000 / 1000 | yes: rejects crossing candidates | 98.7% (987/1000) [97.8, 99.2] | 98.7% (987/1000) [97.8, 99.2] | 98.7% (987/1000) [97.8, 99.2] | 98.7% (987/1000) [97.8, 99.2] | 98.7% (987/1000) [97.8, 99.2] | 98.7% (987/1000) [97.8, 99.2] | 98.7% (987/1000) [97.8, 99.2] |
| gen-juangallostra | 998 / 1000 | yes: minimum point distance, angle limit | 0.0% (0/998) [0.0, 0.4] | 0.0% (0/1000) [0.0, 0.4] | 10.6% (106/998) [8.9, 12.7] | 10.6% (106/1000) [8.8, 12.7] | 0.0% (0/998) [0.0, 0.4] | 0.0% (0/998) [0.0, 0.4] | 12.8% (128/998) [10.9, 15.0] |
| gen-amz-voronoi | 921 / 1000 | yes: curvature limit and self-crossing rejection (79 of 1000 produce nothing) | 99.2% (914/921) [98.4, 99.6] | 91.4% (914/1000) [89.5, 93.0] | 99.2% (914/921) [98.4, 99.6] | 91.4% (914/1000) [89.5, 93.0] | 99.2% (914/921) [98.4, 99.6] | 99.2% (914/921) [98.4, 99.6] | 99.2% (914/921) [98.4, 99.6] |
| gen-carracing | 1000 / 1000 | by construction: turn-rate limit, loop closure | 39.2% (392/1000) [36.2, 42.3] | 39.2% (392/1000) [36.2, 42.3] | 52.8% (528/1000) [49.7, 55.9] | 52.8% (528/1000) [49.7, 55.9] | 99.9% (999/1000) [99.4, 100.0] | 39.2% (392/1000) [36.2, 42.3] | 52.8% (528/1000) [49.7, 55.9] |
| gen-zzangupenn | 1000 / 1000 | by construction: turn-rate limit, loop closure | 26.2% (262/1000) [23.6, 29.0] | 26.2% (262/1000) [23.6, 29.0] | 67.3% (673/1000) [64.3, 70.1] | 67.3% (673/1000) [64.3, 70.1] | 77.7% (777/1000) [75.0, 80.2] | 37.5% (375/1000) [34.6, 40.5] | 70.2% (702/1000) [67.3, 73.0] |
| real-bacinger-f1 | 40 / 40 | n/a (real) | 7.5% (3/40) [2.6, 19.9] | 7.5% (3/40) [2.6, 19.9] | 80.0% (32/40) [65.2, 89.5] | 80.0% (32/40) [65.2, 89.5] | 75.0% (30/40) [59.8, 85.8] | 50.0% (20/40) [35.2, 64.8] | 80.0% (32/40) [65.2, 89.5] |
| gen-driftschool-s0 | 1000 / 1000 | yes: validates its own tracks | 100.0% (1000/1000) [99.6, 100.0] | 100.0% (1000/1000) [99.6, 100.0] | 99.3% (993/1000) [98.6, 99.7] | 99.3% (993/1000) [98.6, 99.7] | 100.0% (1000/1000) [99.6, 100.0] | 100.0% (1000/1000) [99.6, 100.0] | 99.3% (993/1000) [98.6, 99.7] |
| gen-driftschool-s1 | 1000 / 1000 | yes: validates its own tracks | 100.0% (1000/1000) [99.6, 100.0] | 100.0% (1000/1000) [99.6, 100.0] | 99.2% (992/1000) [98.4, 99.6] | 99.2% (992/1000) [98.4, 99.6] | 100.0% (1000/1000) [99.6, 100.0] | 100.0% (1000/1000) [99.6, 100.0] | 99.2% (992/1000) [98.4, 99.6] |
| gen-driftschool-s2 | 1000 / 1000 | yes: validates its own tracks | 100.0% (1000/1000) [99.6, 100.0] | 100.0% (1000/1000) [99.6, 100.0] | 99.7% (997/1000) [99.1, 99.9] | 99.7% (997/1000) [99.1, 99.9] | 100.0% (1000/1000) [99.6, 100.0] | 100.0% (1000/1000) [99.6, 100.0] | 99.7% (997/1000) [99.1, 99.9] |
| gen-driftschool-s3 | 1000 / 1000 | yes: validates its own tracks | 100.0% (1000/1000) [99.6, 100.0] | 100.0% (1000/1000) [99.6, 100.0] | 100.0% (1000/1000) [99.6, 100.0] | 100.0% (1000/1000) [99.6, 100.0] | 100.0% (1000/1000) [99.6, 100.0] | 100.0% (1000/1000) [99.6, 100.0] | 100.0% (1000/1000) [99.6, 100.0] |
| gen-driftschool-s4 | 1000 / 1000 | yes: validates its own tracks | 100.0% (1000/1000) [99.6, 100.0] | 100.0% (1000/1000) [99.6, 100.0] | 100.0% (1000/1000) [99.6, 100.0] | 100.0% (1000/1000) [99.6, 100.0] | 100.0% (1000/1000) [99.6, 100.0] | 100.0% (1000/1000) [99.6, 100.0] | 100.0% (1000/1000) [99.6, 100.0] |

## Sampling diagnostic and error mix (validator v1.3)

| source | arm | UNDERSAMPLED (tracks) | SHARP_VERTEX (tracks) | LOCAL_KINK (tracks) | fails carrying UNDERSAMPLED | median share of vertices > 12 deg | median largest turn (deg) | median spacing / W (raw) | error codes (tracks) |
|---|---|---|---|---|---|---|---|---|---|
| gen-trackseed | raw | 0.0% (0/1000) [0.0, 0.4] | 0.0% (0/1000) [0.0, 0.4] | 0.0% (0/1000) [0.0, 0.4] | 0/0 | 0.00% | 4.53804 | 0.166872 | {} |
| gen-trackseed | cs25 | 0.0% (0/1000) [0.0, 0.4] | 0.0% (0/1000) [0.0, 0.4] | 0.0% (0/1000) [0.0, 0.4] | 0/0 | 0.00% | 7.4803 |  | {} |
| gen-trackseed | cs10 | 0.0% (0/1000) [0.0, 0.4] | 0.0% (0/1000) [0.0, 0.4] | 0.0% (0/1000) [0.0, 0.4] | 0/0 | 0.00% | 3.04247 |  | {} |
| real-tumftm | raw | 0.0% (0/25) [0.0, 13.3] | 24.0% (6/25) [11.5, 43.4] | 36.0% (9/25) [20.2, 55.5] | 0/12 | 1.62% | 25.5574 | 0.429566 | {"LOCAL_KINK":9,"SHARP_VERTEX":6,"EDGE_EDGE_INTERSECTION":1,"SELF_INTERSECTION_CENTERLINE":1,"SELF_INTERSECTION_EDGE":1} |
| real-tumftm | cs25 | 0.0% (0/25) [0.0, 13.3] | 0.0% (0/25) [0.0, 13.3] | 16.0% (4/25) [6.4, 34.7] | 0/5 | 0.23% | 16.1909 |  | {"LOCAL_KINK":4,"EDGE_EDGE_INTERSECTION":1,"SELF_INTERSECTION_CENTERLINE":1,"SELF_INTERSECTION_EDGE":1} |
| real-tumftm | cs10 | 0.0% (0/25) [0.0, 13.3] | 0.0% (0/25) [0.0, 13.3] | 0.0% (0/25) [0.0, 13.3] | 0/4 | 0.00% | 7.34224 |  | {"EDGE_FOLD":3,"SELF_INTERSECTION_EDGE":4,"EDGE_EDGE_INTERSECTION":1,"SELF_INTERSECTION_CENTERLINE":1} |
| gen-e5-thorimbert | raw | 0.0% (0/1000) [0.0, 0.4] | 0.0% (0/1000) [0.0, 0.4] | 0.0% (0/1000) [0.0, 0.4] | 0/13 | 0.00% | 10.0096 | 0.5 | {"SELF_INTERSECTION_EDGE":13,"EDGE_EDGE_INTERSECTION":3,"SELF_INTERSECTION_CENTERLINE":3} |
| gen-e5-thorimbert | cs25 | 0.0% (0/1000) [0.0, 0.4] | 0.0% (0/1000) [0.0, 0.4] | 0.0% (0/1000) [0.0, 0.4] | 0/13 | 0.00% | 5.89142 |  | {"SELF_INTERSECTION_EDGE":13,"EDGE_EDGE_INTERSECTION":3,"SELF_INTERSECTION_CENTERLINE":3} |
| gen-e5-thorimbert | cs10 | 0.0% (0/1000) [0.0, 0.4] | 0.0% (0/1000) [0.0, 0.4] | 0.0% (0/1000) [0.0, 0.4] | 0/13 | 0.00% | 2.74613 |  | {"SELF_INTERSECTION_EDGE":13,"EDGE_EDGE_INTERSECTION":3,"SELF_INTERSECTION_CENTERLINE":3} |
| gen-juangallostra | raw | 100.0% (998/998) [99.6, 100.0] | 100.0% (998/998) [99.6, 100.0] | 100.0% (998/998) [99.6, 100.0] | 998/998 | 53.88% | 71.5651 | 0.0559017 | {"EDGE_FOLD":998,"LOCAL_KINK":998,"SELF_INTERSECTION_EDGE":998,"SHARP_VERTEX":998,"CLOSURE_TANGENT":297,"EDGE_EDGE_INTERSECTION":176,"SELF_INTERSECTION_CENTERLINE":223} |
| gen-juangallostra | cs25 | 54.4% (543/998) [51.3, 57.5] | 86.5% (863/998) [84.2, 88.5] | 70.2% (701/998) [67.3, 73.0] | 528/892 | 10.45% | 44.0737 |  | {"EDGE_FOLD":846,"LOCAL_KINK":701,"SELF_INTERSECTION_EDGE":845,"SHARP_VERTEX":863,"EDGE_EDGE_INTERSECTION":161,"SELF_INTERSECTION_CENTERLINE":155,"CLOSURE_TANGENT":22} |
| gen-juangallostra | cs10 | 100.0% (998/998) [99.6, 100.0] | 75.3% (751/998) [72.5, 77.8] | 99.9% (997/998) [99.4, 100.0] | 998/998 | 26.97% | 33.37 |  | {"EDGE_FOLD":997,"LOCAL_KINK":997,"SELF_INTERSECTION_EDGE":992,"SHARP_VERTEX":751,"EDGE_EDGE_INTERSECTION":165,"SELF_INTERSECTION_CENTERLINE":156,"CLOSURE_TANGENT":65} |
| gen-amz-voronoi | raw | 0.0% (0/921) [0.0, 0.4] | 0.0% (0/921) [0.0, 0.4] | 0.0% (0/921) [0.0, 0.4] | 0/7 | 0.00% | 3.64326 | 0.106513 | {"EDGE_FOLD":7,"SELF_INTERSECTION_EDGE":7} |
| gen-amz-voronoi | cs25 | 0.0% (0/921) [0.0, 0.4] | 0.8% (7/921) [0.4, 1.6] | 0.0% (0/921) [0.0, 0.4] | 0/7 | 0.00% | 10.2344 |  | {"CLOSURE_TANGENT":7,"EDGE_FOLD":7,"SELF_INTERSECTION_EDGE":7,"SHARP_VERTEX":7} |
| gen-amz-voronoi | cs10 | 0.0% (0/921) [0.0, 0.4] | 0.2% (2/921) [0.1, 0.8] | 0.0% (0/921) [0.0, 0.4] | 0/7 | 0.00% | 4.19295 |  | {"EDGE_FOLD":7,"SELF_INTERSECTION_EDGE":7,"SHARP_VERTEX":2} |
| gen-carracing | raw | 55.3% (553/1000) [52.2, 58.4] | 0.1% (1/1000) [0.0, 0.6] | 60.7% (607/1000) [57.6, 63.7] | 314/608 | 10.35% | 17.7617 | 0.2625 | {"LOCAL_KINK":607,"CLOSURE_TANGENT":10,"SHARP_VERTEX":1} |
| gen-carracing | cs25 | 41.4% (414/1000) [38.4, 44.5] | 0.1% (1/1000) [0.0, 0.6] | 47.2% (472/1000) [44.1, 50.3] | 173/472 | 9.49% | 18.1733 |  | {"LOCAL_KINK":472,"CLOSURE_TANGENT":1,"SHARP_VERTEX":1} |
| gen-carracing | cs10 | 0.0% (0/1000) [0.0, 0.4] | 0.1% (1/1000) [0.0, 0.6] | 0.0% (0/1000) [0.0, 0.4] | 0/1 | 0.00% | 9.34538 |  | {"EDGE_FOLD":1,"SELF_INTERSECTION_EDGE":1,"SHARP_VERTEX":1} |
| gen-zzangupenn | raw | 80.9% (809/1000) [78.3, 83.2] | 52.5% (525/1000) [49.4, 55.6] | 58.5% (585/1000) [55.4, 61.5] | 646/738 | 22.07% | 30.867 | 0.5 | {"SHARP_VERTEX":525,"LOCAL_KINK":585,"CLOSURE_TANGENT":154,"EDGE_FOLD":15,"SELF_INTERSECTION_EDGE":12} |
| gen-zzangupenn | cs25 | 0.4% (4/1000) [0.2, 1.0] | 13.4% (134/1000) [11.4, 15.7] | 21.0% (210/1000) [18.6, 23.6] | 2/327 | 2.84% | 18.7225 |  | {"LOCAL_KINK":210,"CLOSURE_TANGENT":56,"SHARP_VERTEX":134,"EDGE_FOLD":75,"SELF_INTERSECTION_EDGE":66,"EDGE_EDGE_INTERSECTION":1} |
| gen-zzangupenn | cs10 | 0.0% (0/1000) [0.0, 0.4] | 4.7% (47/1000) [3.6, 6.2] | 3.1% (31/1000) [2.2, 4.4] | 0/223 | 0.00% | 8.75841 |  | {"EDGE_FOLD":223,"SELF_INTERSECTION_EDGE":212,"CLOSURE_TANGENT":47,"SHARP_VERTEX":47,"LOCAL_KINK":31,"EDGE_EDGE_INTERSECTION":3} |
| real-bacinger-f1 | raw | 100.0% (40/40) [91.2, 100.0] | 90.0% (36/40) [76.9, 96.0] | 47.5% (19/40) [32.9, 62.5] | 37/37 | 46.46% | 43.1354 | 1.98636 | {"SHARP_VERTEX":36,"LOCAL_KINK":19,"SELF_INTERSECTION_EDGE":2,"EDGE_FOLD":2,"EDGE_EDGE_INTERSECTION":1,"SELF_INTERSECTION_CENTERLINE":1} |
| real-bacinger-f1 | cs25 | 0.0% (0/40) [0.0, 8.8] | 5.0% (2/40) [1.4, 16.5] | 20.0% (8/40) [10.5, 34.8] | 0/8 | 0.40% | 17.9741 |  | {"EDGE_FOLD":1,"LOCAL_KINK":8,"SELF_INTERSECTION_EDGE":3,"SHARP_VERTEX":2,"EDGE_EDGE_INTERSECTION":1,"SELF_INTERSECTION_CENTERLINE":1} |
| real-bacinger-f1 | cs10 | 0.0% (0/40) [0.0, 8.8] | 0.0% (0/40) [0.0, 8.8] | 0.0% (0/40) [0.0, 8.8] | 0/10 | 0.00% | 8.23438 |  | {"EDGE_FOLD":8,"SELF_INTERSECTION_EDGE":10,"EDGE_EDGE_INTERSECTION":1,"SELF_INTERSECTION_CENTERLINE":1} |
| gen-driftschool-s0 | raw | 0.0% (0/1000) [0.0, 0.4] | 0.0% (0/1000) [0.0, 0.4] | 0.0% (0/1000) [0.0, 0.4] | 0/0 | 0.00% | 4.11795 | 0.0454519 | {} |
| gen-driftschool-s0 | cs25 | 3.7% (37/1000) [2.7, 5.1] | 0.0% (0/1000) [0.0, 0.4] | 0.7% (7/1000) [0.3, 1.4] | 0/7 | 3.03% | 14.2604 |  | {"LOCAL_KINK":7} |
| gen-driftschool-s0 | cs10 | 0.0% (0/1000) [0.0, 0.4] | 0.0% (0/1000) [0.0, 0.4] | 0.0% (0/1000) [0.0, 0.4] | 0/0 | 0.00% | 6.38909 |  | {} |
| gen-driftschool-s1 | raw | 0.0% (0/1000) [0.0, 0.4] | 0.0% (0/1000) [0.0, 0.4] | 0.0% (0/1000) [0.0, 0.4] | 0/0 | 0.00% | 4.89587 | 0.0666635 | {} |
| gen-driftschool-s1 | cs25 | 0.0% (0/1000) [0.0, 0.4] | 0.0% (0/1000) [0.0, 0.4] | 0.8% (8/1000) [0.4, 1.6] | 0/8 | 0.00% | 10.0347 |  | {"LOCAL_KINK":8} |
| gen-driftschool-s1 | cs10 | 0.0% (0/1000) [0.0, 0.4] | 0.0% (0/1000) [0.0, 0.4] | 0.0% (0/1000) [0.0, 0.4] | 0/0 | 0.00% | 4.8847 |  | {} |
| gen-driftschool-s2 | raw | 0.0% (0/1000) [0.0, 0.4] | 0.0% (0/1000) [0.0, 0.4] | 0.0% (0/1000) [0.0, 0.4] | 0/0 | 0.00% | 5.33583 | 0.100002 | {} |
| gen-driftschool-s2 | cs25 | 0.0% (0/1000) [0.0, 0.4] | 0.0% (0/1000) [0.0, 0.4] | 0.3% (3/1000) [0.1, 0.9] | 0/3 | 0.00% | 6.92596 |  | {"LOCAL_KINK":3} |
| gen-driftschool-s2 | cs10 | 0.0% (0/1000) [0.0, 0.4] | 0.0% (0/1000) [0.0, 0.4] | 0.0% (0/1000) [0.0, 0.4] | 0/0 | 0.00% | 5.32642 |  | {} |
| gen-driftschool-s3 | raw | 0.0% (0/1000) [0.0, 0.4] | 0.0% (0/1000) [0.0, 0.4] | 0.0% (0/1000) [0.0, 0.4] | 0/0 | 0.00% | 5.81655 | 0.125006 | {} |
| gen-driftschool-s3 | cs25 | 0.0% (0/1000) [0.0, 0.4] | 0.0% (0/1000) [0.0, 0.4] | 0.0% (0/1000) [0.0, 0.4] | 0/0 | 0.00% | 6.3246 |  | {} |
| gen-driftschool-s3 | cs10 | 0.0% (0/1000) [0.0, 0.4] | 0.0% (0/1000) [0.0, 0.4] | 0.0% (0/1000) [0.0, 0.4] | 0/0 | 0.00% | 4.87323 |  | {} |
| gen-driftschool-s4 | raw | 0.0% (0/1000) [0.0, 0.4] | 0.0% (0/1000) [0.0, 0.4] | 0.0% (0/1000) [0.0, 0.4] | 0/0 | 0.00% | 6.17321 | 0.133338 | {} |
| gen-driftschool-s4 | cs25 | 0.0% (0/1000) [0.0, 0.4] | 0.0% (0/1000) [0.0, 0.4] | 0.0% (0/1000) [0.0, 0.4] | 0/0 | 0.00% | 6.27076 |  | {} |
| gen-driftschool-s4 | cs10 | 0.0% (0/1000) [0.0, 0.4] | 0.0% (0/1000) [0.0, 0.4] | 0.0% (0/1000) [0.0, 0.4] | 0/0 | 0.00% | 5.09916 |  | {} |

## raw -> cs25 transitions (v1.3)

| source | ok/ok | fail -> ok | ok -> fail | fail/fail |
|---|---|---|---|---|
| gen-trackseed | 1000 | 0 | 0 | 0 |
| real-tumftm | 13 | 7 | 0 | 5 |
| gen-e5-thorimbert | 987 | 0 | 0 | 13 |
| gen-juangallostra | 0 | 106 | 0 | 892 |
| gen-amz-voronoi | 914 | 0 | 0 | 7 |
| gen-carracing | 376 | 152 | 16 | 456 |
| gen-zzangupenn | 240 | 433 | 22 | 305 |
| real-bacinger-f1 | 3 | 29 | 0 | 8 |
| gen-driftschool-s0 | 993 | 0 | 7 | 0 |
| gen-driftschool-s1 | 992 | 0 | 8 | 0 |
| gen-driftschool-s2 | 997 | 0 | 3 | 0 |
| gen-driftschool-s3 | 1000 | 0 | 0 | 0 |
| gen-driftschool-s4 | 1000 | 0 | 0 | 0 |

## TUMFTM at the median and at the minimum width (v1.3)

| arm | median width | minimum width |
|---|---|---|
| raw | 52.0% (13/25) [33.5, 70.0] | 52.0% (13/25) [33.5, 70.0] |
| cs25 | 80.0% (20/25) [60.9, 91.1] | 96.0% (24/25) [80.5, 99.3] |
| cs10 | 84.0% (21/25) [65.3, 93.6] | 92.0% (23/25) [75.0, 97.8] |

| circuit | width | min width | raw | raw errors | raw warnings | cs25 | cs25 errors | raw @ min | cs25 @ min | raw v1.2 | cs25 v1.2 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Austin | 13.03 | 11.06 | ok |  |  | ok |  | ok | ok | ok | ok |
| BrandsHatch | 9.10 | 7.45 | ok |  |  | ok |  | ok | ok | ok | ok |
| Budapest | 9.96 | 7.63 | fail | LOCAL_KINK |  | ok |  | fail | ok | fail | ok |
| Catalunya | 10.88 | 8.56 | ok |  |  | ok |  | ok | ok | ok | ok |
| Hockenheim | 12.94 | 7.39 | ok |  |  | ok |  | ok | ok | ok | ok |
| IMS | 15.30 | 15.30 | ok |  |  | ok |  | ok | ok | ok | ok |
| Melbourne | 12.24 | 8.05 | fail | LOCAL_KINK;SHARP_VERTEX |  | ok |  | fail | ok | fail | ok |
| MexicoCity | 11.65 | 9.72 | fail | LOCAL_KINK |  | ok |  | fail | ok | fail | ok |
| Montreal | 9.00 | 8.15 | ok |  |  | ok |  | ok | ok | ok | ok |
| Monza | 9.00 | 7.52 | ok |  |  | ok |  | ok | ok | ok | ok |
| MoscowRaceway | 10.70 | 9.72 | fail | LOCAL_KINK |  | ok |  | fail | ok | fail | ok |
| Norisring | 16.30 | 10.30 | ok |  |  | ok |  | ok | ok | ok | ok |
| Nuerburgring | 10.96 | 7.62 | ok |  |  | ok |  | ok | ok | ok | ok |
| Oschersleben | 10.06 | 8.40 | ok |  |  | ok |  | ok | ok | ok | ok |
| Sakhir | 12.90 | 10.77 | fail | LOCAL_KINK |  | fail | LOCAL_KINK | fail | ok | fail | fail |
| SaoPaulo | 11.73 | 8.93 | ok |  |  | ok |  | ok | ok | ok | ok |
| Sepang | 14.49 | 13.60 | fail | LOCAL_KINK |  | ok |  | fail | ok | fail | ok |
| Shanghai | 12.73 | 10.03 | fail | LOCAL_KINK;SHARP_VERTEX |  | fail | LOCAL_KINK | fail | ok | fail | fail |
| Silverstone | 13.76 | 11.27 | ok |  |  | ok |  | ok | ok | ok | ok |
| Sochi | 12.01 | 11.13 | fail | LOCAL_KINK;SHARP_VERTEX |  | fail | LOCAL_KINK | fail | ok | fail | fail |
| Spa | 9.21 | 7.87 | fail | SHARP_VERTEX |  | fail | LOCAL_KINK | fail | ok | ok | fail |
| Spielberg | 10.83 | 10.15 | fail | SHARP_VERTEX |  | ok |  | fail | ok | ok | ok |
| Suzuka | 9.17 | 7.79 | fail | EDGE_EDGE_INTERSECTION;SELF_INTERSECTION_CENTERLINE;SELF_INTERSECTION_EDGE |  | fail | EDGE_EDGE_INTERSECTION;SELF_INTERSECTION_CENTERLINE;SELF_INTERSECTION_EDGE | fail | fail | fail | fail |
| YasMarina | 12.76 | 10.00 | fail | LOCAL_KINK;SHARP_VERTEX |  | ok |  | fail | ok | fail | ok |
| Zandvoort | 9.48 | 7.98 | ok |  |  | ok |  | ok | ok | ok | ok |

## juangallostra quantisation caveat

Its input is an integer pixel grid; the raw and smoothed rates measure the grid, not track shapes (a vertex displaced by half a pixel turns the heading by q degrees at the median spacing). Not a headline number.

| source | tracks with all-integer coordinates | median spacing (raw) | q (deg) |
|---|---|---|---|
| gen-trackseed | 0/1000 | 6.67489 | 8.56777 |
| real-tumftm | 0/25 | 5.00018 | 11.4208 |
| gen-e5-thorimbert | 0/1000 | 2 | 28.0725 |
| gen-juangallostra | 998/998 | 2.23607 | 25.2088 |
| gen-amz-voronoi | 0/921 | 0.319539 | 114.837 |
| gen-carracing | 0/1000 | 3.5 | 16.2602 |
| gen-zzangupenn | 0/1000 | 5 | 11.4212 |
| real-bacinger-f1 | 0/40 | 23.8363 | 2.40337 |
| gen-driftschool-s0 | 0/1000 | 0.0999942 | 157.381 |
| gen-driftschool-s1 | 0/1000 | 0.0999953 | 157.381 |
| gen-driftschool-s2 | 0/1000 | 0.100002 | 157.38 |
| gen-driftschool-s3 | 0/1000 | 0.100005 | 157.379 |
| gen-driftschool-s4 | 0/1000 | 0.100003 | 157.379 |
