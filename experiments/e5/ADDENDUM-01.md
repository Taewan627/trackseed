# E5 ADDENDUM-01: Q2 validity re-run under validator v1.1 (pre-registration)

Status: committed BEFORE the addendum is run and before any of its outputs exist. Predictions below are not edited after the run; a
prediction that fails is reported as failed. The original E5 files (PROTOCOL.md, results/, the harness and the committed
results/validity.jsonl) are kept untouched.

## Reason

The validator changed after E5 was run. The original Q2 (results/SUMMARY.md, section Q2; results/validity.jsonl) used the
validator with the `ratio` seam rule as its default, which the validator at that time had. Since validator v1.1 (docs/validator.md)
the default is `closureTangentMode: 'kink'`: the local-kink outlier rule is applied at every vertex (the seam is reported as
CLOSURE_TANGENT, the other vertices as LOCAL_KINK). The addendum asks what the same third-party outputs look like under the current
default. It is a new measurement under a new rule; it does not replace the original Q2.

## What is re-run

- Q2 only (validity). Q1 and Q3 are not re-run.
- The same 1000 seeds as E5 (PROTOCOL.md, "Fixed case set"; SHA-256 of `JSON.stringify(seeds)` asserted by the harness).
- The same pinned third-party commit 3a359db8231df13e7b0cd4cedb3580348f9ae012, fetched by `experiments/e5/fetch.sh`, and the same
  unmodified script text and seeding method (adapter.mjs, PROTOCOL.md "Seeding method").
- Node 22 only (system `node`, v22.23.4 at the time of the run). No other engine is run.
- Validator: the default options of the current `src/validate.ts` (v1.1, `closureTangentMode: 'kink'`), called as
  `validateTrack(trackFromPolyline({ points, width: W, closed: true }))` with no options, exactly as analyze.mjs calls it.
- Widths: W = 4 (primary), 8 and 14 (sensitivity), as in the original Q2.
- Pass = `ok` (no error-severity violation); warnings do not fail, as in the original Q2.

Not changed: run.mjs, analyze.mjs, adapter.mjs, the committed results. The collection and analysis are done by a new script,
`experiments/e5/addendum-01.mjs`, whose outputs go only to `experiments/e5/results/addendum-01/` (committed) and to the git-ignored
`experiments/e5/out/addendum-01/` (polylines). Third-party code stays in the git-ignored `experiments/e5/build/`.

## Definitions fixed before the run

- "Output" = an outcome-`ok` polyline. In the original E5 all 1000 cases were `ok` (results/SUMMARY.md, "Outputs with outcome ok:
  1000 of 1000"). The denominator of every share below is the number of outputs (1000 if all cases are ok again).
- Baseline (v1.0) = the committed `results/validity.jsonl`, field `wW.ok` and `wW.codes`. Before the new numbers are reported, the
  addendum script also runs the current build with `closureTangentMode: 'ratio'` (the legacy rule) and checks that it reproduces the
  committed file exactly. That check is a reproduction check of the baseline, not a prediction; if it fails, that is reported first.
- Transition table: per width, the number of outputs with ok -> not ok and not ok -> ok between the committed baseline and the
  addendum run, plus the count of each violation code.

## Predictions (recorded before the run)

- P-A1: the pass share at W = 4 stays at or above 95% (at least 950 of the 1000 outputs pass under v1.1). Basis: the original pass
  share at W = 4 is 98.7% (987 of 1000) under the `ratio` rule.
- P-A2: at W = 4, the number of outputs whose violation codes include LOCAL_KINK or CLOSURE_TANGENT is at most 2% of the outputs
  (at most 20 of 1000). Basis: the original Q2 found no such code at any width; the kink rule is the one that finds new turns.
- P-A3: at every width W in {4, 8, 14}, every output that failed under v1.0 (committed `ok` false) still fails under v1.1 (`ok`
  false). The reason given in advance is that the new rule only adds checks. This reason is not fully accurate, and it is recorded
  here so that the result is read correctly: in mode `kink` the seam is tested with the kink rule instead of the `ratio` rule
  (floor 12 degrees, window 2..3 instead of 3 each side including the neighbours), so an output whose seam failed under `ratio` can
  pass under `kink`. P-A3 is evaluated as written (failure set under v1.0 is a subset of the failure set under v1.1); if it fails, the
  transition table shows the cause.

## Outputs

- `experiments/e5/results/addendum-01/SUMMARY.md`: per-width pass counts and Wilson 95% intervals, error and warning code counts
  per width, the v1.0 -> v1.1 transition table, the reproduction check of the baseline, and a table of P-A1 to P-A3 with the observed
  values and whether each held.
- `experiments/e5/results/addendum-01/SUMMARY.json`: the same numbers in machine-readable form.
- `experiments/e5/results/addendum-01/validity.jsonl`: one line per seed with `w4`, `w8`, `w14` (`ok`, `codes`) under v1.1, in the
  same layout as the committed results/validity.jsonl.
- `experiments/e5/results/addendum-01/node22.json`: the Node 22 digests of the re-collected polylines, to be compared with
  `results/node22.json` (a check that the input is the same, not a prediction).
- `experiments/e5/results/addendum-01/DETERMINISM.txt`: the SHA-256 of the analysis outputs from two consecutive analysis runs,
  which must be identical.

## Reporting rules

- Numbers as produced by the script. A failed prediction is reported as failed.
- Any deviation from this file (for example an engine that cannot run, or a failed reproduction check) is listed in SUMMARY.md.
- The addendum says nothing about the quality of the third-party generator or about any user of it. Violation codes are the
  validator's output; whether a flagged geometry is a bug of the third-party program or a consequence of the chosen width is not
  decided here.
