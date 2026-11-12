# E9 Q3: wall time per track (trackFromPolyline + validateTrack + computeMetrics, raw arm, main width)

Machine: Intel(R) Xeon(R) Processor @ 2.30GHz, 2 cores, linux x64, 8 GB, Node v22.23.4. One pass per track after a 20-track warm-up. Indicative only; this file is excluded from the determinism hash.

| source | n | median ms | p95 ms | max ms |
|---|---|---|---|---|
| real-tumftm | 25 | 3.20 | 5.39 | 7.40 |
| gen-e5-thorimbert | 1000 | 2.13 | 4.67 | 45.54 |
| gen-juangallostra | 998 | 3.83 | 6.82 | 23.77 |
| gen-amz-voronoi | 921 | 13.02 | 22.31 | 84.40 |
| gen-carracing | 1000 | 0.87 | 3.01 | 8.93 |
| gen-zzangupenn | 1000 | 0.45 | 1.96 | 43.34 |
| real-bacinger-f1 | 40 | 0.47 | 0.74 | 2.07 |
| gen-driftschool-s0 | 1000 | 2.25 | 5.92 | 25.26 |
| gen-driftschool-s1 | 1000 | 2.85 | 6.00 | 51.42 |
| gen-driftschool-s2 | 1000 | 3.50 | 6.70 | 32.61 |
| gen-driftschool-s3 | 1000 | 4.24 | 7.45 | 35.05 |
| gen-driftschool-s4 | 1000 | 5.13 | 8.88 | 45.97 |

P3.1 (median < 20 ms for every generator source and < 50 ms for TUMFTM; p95 < 100 ms for every primary source; no track above 1 s): held.
