# E6 DEV selection summary

DEV seeds: 20; clean generated tracks N1 9718 (failed 2), N2 1080 (failed 0); N3 60; defect bases 1260 (failed 0).

Admissible configurations (FPR on N1+N2 <= 1% and 0 flags on N3): 622 of 711.

## Best admissible configuration per family (same criterion restricted to the family)

| family | configuration | FP N1 | FP N2 | FP N3 | recall seamSpike | interiorSpike | corner | tangent | macro |
|---|---|---|---|---|---|---|---|---|---|
| A1 | turn T=35 (id 11) | 0/9718 | 0/1080 | 0/60 | 92.98% (3987/4288) | 95.20% (3851/4045) | 85.80% (3891/4535) | 100.00% (3780/3780) | 93.50% |
| A2 | curvature c=1.5 (id 17) | 0/9718 | 30/1080 | 0/60 | 68.17% (2923/4288) | 67.00% (2710/4045) | 63.73% (2890/4535) | 66.48% (2513/3780) | 66.34% |
| C | spike ts=0.3 tw=0.05 (id 115) | 0/9718 | 0/1080 | 0/60 | 92.47% (3965/4288) | 94.96% (3841/4045) | 85.27% (3867/4535) | 99.05% (3744/3780) | 92.94% |
| B | outlier K=3 q=1 r=3 F=12 (id 53) | 0/9718 | 0/1080 | 0/60 | 100.00% (4288/4288) | 100.00% (4045/4045) | 100.00% (4535/4535) | 100.00% (3780/3780) | 100.00% |
| B+A2 | outlier K=3 q=1 r=3 F=12 + curvature c=0.5 (id 213) | 0/9718 | 0/1080 | 0/60 | 100.00% (4288/4288) | 99.75% (4035/4045) | 99.71% (4522/4535) | 100.00% (3780/3780) | 99.87% |
| B+C | outlier K=3 q=1 r=3 F=8 + spike ts=0.2 tw=0.1 (id 487) | 0/9718 | 0/1080 | 0/60 | 90.51% (3881/4288) | 92.21% (3730/4045) | 83.99% (3809/4535) | 98.44% (3721/3780) | 91.29% |

## Selected (PROTOCOL 6)

**outlier K=3 q=1 r=3 F=12** (id 53, family B); 33 configuration(s) in the final tie set; best admissible macro recall 100.00%.

## Legacy-style references (not candidates): FP counts of every A1 threshold

| T | FP N1 | FP N2 | FP N3 | macro recall |
|---|---|---|---|---|
| turn T=10 | 614 | 108 | 24 | 100.00% |
| turn T=12 | 208 | 0 | 21 | 100.00% |
| turn T=14 | 0 | 0 | 21 | 100.00% |
| turn T=16 | 0 | 0 | 9 | 100.00% |
| turn T=18 | 0 | 0 | 9 | 100.00% |
| turn T=20 | 0 | 0 | 9 | 100.00% |
| turn T=22 | 0 | 0 | 9 | 100.00% |
| turn T=24 | 0 | 0 | 9 | 100.00% |
| turn T=26 | 0 | 0 | 9 | 100.00% |
| turn T=28 | 0 | 0 | 9 | 100.00% |
| turn T=30 | 0 | 0 | 6 | 100.00% |
| turn T=35 | 0 | 0 | 0 | 93.50% |
| turn T=40 | 0 | 0 | 0 | 92.41% |
