# E3 protocol (pre-registration): expressive range of TrackLab v0.5 by corner-pattern mode

Status: committed before any E2 or E3 result exists. No E3 code exists at this commit. Later edits to this file are deviations and must be listed in the DEVIATIONS section of results/SUMMARY.md, never made here.

## Question

What region of metric space do TrackLab's four corner-pattern modes (auto, right-angle, hairpin, s-curve) cover, and how do the modes differ? The idea of describing a generator by the distribution of its outputs over a few interpretable metrics (the expressive range) follows Smith and Whitehead, "Analyzing the Expressive Range of a Level Generator", PCG Workshop 2010. It is cited as an idea only; none of their metrics, binning or conclusions is reproduced.

## Data

No new generation. Input is `experiments/e2/results/validity.csv.gz` (E2 validity run: full factorial, 12,150 cases per mode, as defined in experiments/e2/PROTOCOL.md). Primary population: all GENERATED tracks of a mode (valid or not), because the generator's expressive range is the range of what it emits. Secondary population: only tracks with validator ok = 1 (reported in the summary tables, no separate figures).

## Metric pairs (axes)

1. (curvatureEntropyBits, straightLengthFraction) - x = straightLengthFraction ("straightFraction"), y = curvatureEntropyBits
2. (length, totalTurningDegrees) - x = totalTurningDegrees, y = length
3. (maxAbsSlope, elevationRange) - x = elevationRange, y = maxAbsSlope

(Order of the pair in the task statement is (y-metric, x-metric) in the first and second item; the axes above are the fixed assignment.)

## Plots

One figure per pair, 2 rows x 4 columns (one column per mode, order auto, right-angle, hairpin, s-curve). Row 1: 2D histogram, 30 x 30 linear bins between the pooled (all four modes) minimum and maximum of each metric over the primary population; the colour scale (log10 of count + 1) is shared by the four panels of a pair. Row 2: scatter of every track of the mode (marker size 1, alpha 0.15), same axis limits as row 1. PNG at <= 110 dpi, each file <= 300 KB.

## Summary statistics (per mode, per metric of the six above; also straightLengthFraction etc.)

n, mean, sd (n-1), median, IQR (Q3 - Q1), min, max (numpy linear-interpolation quantiles). Per pair and mode: number of occupied bins of the 30 x 30 grid (coverage = occupied / 900) and the Shannon entropy (bits) of the normalised 2D histogram.

No hypothesis tests. Differences between modes are described, not tested; the design is a balanced factorial in which `straight`, `curves`, `size`, `width`, `height` take fixed levels, so the ranges reflect that grid and not a natural parameter distribution; this is stated in the summary.

## Predictions (written before any run)

1. Every mode has totalTurningDegrees >= 360 for essentially all tracks (a closed planar loop turns at least once around); median totalTurningDegrees of the three pattern modes exceeds that of Auto.
2. Pattern modes smooth the base track and insert curved collars, so their median straightLengthFraction is predicted to be <= Auto's.
3. elevationRange is approximately proportional to the height parameter (elevationRange / height between about 1.5 and 2.8 for height > 0) in every mode; maxAbsSlope is exactly 0 wherever height = 0.
4. Coverage (occupied bins of pair 1) is predicted to be largest for Auto and smallest for hairpin.
