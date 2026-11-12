# Applying TrackLab to third-party track generators

TrackLab's validator and metrics work on a closed polyline, not only on TrackLab's own documents. `src/polyline.ts` builds a
Track-like object from `{ points: [{x, y?, z}], width, closed: true }` (x/z ground plane, y height; normals and float32 road edges
as in `src/core.ts`; no repair, no resampling unless asked). Command line:

```
tracklab validate-polyline track.json --width 4      # JSON {"points": [[x,z], ...]} or [{x,y,z}, ...]; .csv: x,z[,y]
tracklab metrics-polyline  track.csv  --width 4
```

Exit codes and the report format are those of `validate` and `metrics`; `--resample-spacing S` (off by default) resamples by
arc length first and must be reported when used.

## Third-party generator studied (experiment E5)

| | |
|---|---|
| Generator | RacingTrackGenerator, "Procedural racing track generation in 2D and 3D using JavaScript" |
| Author | Yann Thorimbert |
| Repository | https://github.com/YannThorimbert/RacingTrackGenerator |
| Licence | MIT, Copyright (c) 2020 Yann Thorimbert |
| Commit used | 3a359db8231df13e7b0cd4cedb3580348f9ae012 (2020-07-31) |
| File used | `index.html`, its single inline `<script>` (2D centre-line generator) |

Its code is NOT included in this repository. `experiments/e5/fetch.sh` clones it at the pinned commit into the git-ignored
`experiments/e5/build/third_party/` and records the commit and the SHA-256 of the files used (`build/THIRD_PARTY.txt`). The MIT
licence text and copyright notice stay in that clone (file `LICENSE`); this note and `experiments/e5/CANDIDATES.md` credit the
author. The author of the generator did not take part in, review or endorse this work.

How it is run: the unmodified script text is executed headless as the body of a function whose `document`, `window`, `console` and
`Math` arguments are supplied by `experiments/e5/adapter.mjs`. The only change is the random source: `Math.random` is replaced by a
seeded 32-bit generator (mulberry32). Every other `Math` function is the engine's own. The seeded outputs therefore come from the same
algorithm but are not the output stream of the shipped, unseeded page. Protocol, results and limits: `experiments/e5/PROTOCOL.md`,
`experiments/e5/results/SUMMARY.md`.
