# E7 freeze

Frozen at the commit that adds this file. From here on no change to `src/`, `scripts/` or the E7 harness (`experiments/e7/run.mjs`, `run-twice.mjs`) is allowed before the HELD-OUT run; a change would invalidate the freeze and be a deviation.

- Generator code under evaluation: the tree of commit 80ae58a ("Auto generator: explicit autoJoin option"), unchanged in `src/` at this commit. Constants: JOIN_BLEND = 0.35, JOIN_GAIN = 1.75 (as stated in PROTOCOL.md section 2, committed in bd3a642 before any evaluation). They were not changed after the protocol commit.
- DEV (SEEDS[150..169]) was evaluated once with the harness as committed here: `node experiments/e7/run-twice.mjs dev experiments/e7/results/dev`; all predictions P1-P8, P10 held on DEV (results/dev/SUMMARY.md). Default parameters 20 of 20 ok.
- Legacy reproduction P9 on REPRO (SEEDS[0..49]): `node experiments/e7/run-twice.mjs repro experiments/e7/results/repro`; 12,150 cases, 0 mismatches (results/repro/SUMMARY.md).
- No code, constant or default value was adjusted as a result of the DEV run; PROTOCOL.md was not edited.
- HELD-OUT (SEEDS[170..199]) has not been run and no per-case HELD-OUT output has been looked at. It is run exactly once with `node experiments/e7/run-twice.mjs heldout experiments/e7/results/heldout` (the command runs the evaluation twice and compares SHA-256).
