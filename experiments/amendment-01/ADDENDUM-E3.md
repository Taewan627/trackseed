# AMENDMENT-01 addendum: E3 valid-only tables under the amended validator (pre-registration)

Status: committed alone, before the re-run. No code or output for this re-run exists at this commit. Later edits to this file are deviations and must be listed in a DEVIATIONS section of the result summary, never made here.

## Why

experiments/amendment-01/SUMMARY.md states that E3's primary analysis (all generated tracks, metrics only) is unaffected by the validator change, and that E3's SECONDARY tables (valid tracks only, `ok = 1`) select on `ok` and therefore change under the amended CLOSURE_TANGENT rule; they were not re-run. This addendum closes that gap.

## What is re-run

Only the secondary (valid-only) part of experiments/e3/analyze.py, with `ok` taken from the amended validity file experiments/e2/results/amendment-01/validity.csv.gz (validator 0.5.1, closureTangentMode ratio) instead of experiments/e2/results/validity.csv.gz:

- per-mode summary statistics (n, mean, sd, median, IQR, min, max) of the six metrics of E3's PROTOCOL.md, over generated tracks with ok = 1;
- coverage of the 30 x 30 grid and 2D-histogram entropy for the three metric pairs, with bin edges pooled over the four modes of the valid-only population (as in the original secondary tables);
- a comparison table of the original (S3b rule) valid-only n and medians against the amended ones.

No new generation, no new figures, no hypothesis tests. Analysis code: a new file experiments/e3/analyze_amendment01.py (the original analyze.py and every existing file under experiments/e3 stay untouched). Outputs: experiments/e3/results/amendment-01/{tables.md,SUMMARY.json}.

The E3 primary analysis is not re-run. Check: the committed experiments/e3/results/{SUMMARY.json,tables.md} and figures are byte-identical before and after (SHA-256 recorded in the result summary), and running the original analyze.py on the unchanged inputs reproduces them.

## Predictions (written before the re-run, derived only from numbers already in amendment-01/SUMMARY.md and E3's primary tables)

1. The valid-only population of right-angle, hairpin and s-curve equals the primary population, because the amended ok rate is 100% in these modes: n = 12150, 12144, 12150, and every statistic and every coverage/entropy value of these three modes equals the primary value (the bin edges of the pooled valid-only population differ from the primary pooled edges only through Auto, so coverage and entropy values of these modes may differ slightly; statistics must be identical).
2. Auto valid-only n = 3792 (31.21% of 12,150, as in the amendment summary).
3. Auto valid-only tracks are dominated by `straight = 0` (about 95% of them, from the amended invalid rate of 10.7% for straight = 0 against 89.3% of 4,050 tracks valid, of 3,792 valid in total): the valid-only median straightLengthFraction of Auto is 0 (exactly), against 0.3263 in the primary population.
4. Consequently the protocol's prediction 2 (pattern-mode median straightLengthFraction <= Auto's) is expected to be reversed in the valid-only population (pattern medians 0.113, 0.062, 0.003 against Auto 0), and the Auto occupied-bin count of pair 1 in the valid-only population is smaller than its primary count.
5. Valid-only Auto median totalTurningDegrees stays 360.
