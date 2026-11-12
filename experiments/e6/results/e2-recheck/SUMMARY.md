# E2 recheck: post-RT1 validator v1.1

Reproduction of the amendment-01 ok column by the 'ratio' rule on the regenerated grid: EXACT (0 mismatches over 48,600 cases).

| mode | generated | ok under ratio (v1.0.0) | ok under v1.1 default | ok -> not ok | not ok -> ok |
|---|---|---|---|---|---|
| auto | 12150 (failed 0) | 31.21% [30.39, 32.04] | 29.75% [28.95, 30.57] | 177 (1.46% [1.26, 1.69]) | 0 (0.00% [0.00, 0.03]) |
| right-angle | 12150 (failed 0) | 100.00% [99.97, 100.00] | 100.00% [99.97, 100.00] | 0 (0.00% [0.00, 0.03]) | 0 (0.00% [0.00, 0.03]) |
| hairpin | 12144 (failed 6) | 100.00% [99.97, 100.00] | 100.00% [99.97, 100.00] | 0 (0.00% [0.00, 0.03]) | 0 (0.00% [0.00, 0.03]) |
| s-curve | 12150 (failed 0) | 100.00% [99.97, 100.00] | 100.00% [99.97, 100.00] | 0 (0.00% [0.00, 0.03]) | 0 (0.00% [0.00, 0.03]) |

v1.1 error/violation code counts (tracks with the code, per mode):

- auto: {"MAX_SLOPE":8100,"EDGE_FOLD":8073,"MIN_TURN_RADIUS":8508,"SELF_INTERSECTION_EDGE":7881,"CLOSURE_TANGENT":5427,"LOCAL_KINK":8100}
- right-angle: {"MAX_SLOPE":8100}
- hairpin: {"MAX_SLOPE":8096}
- s-curve: {"MAX_SLOPE":8100}
