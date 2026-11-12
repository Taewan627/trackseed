# Paper figures and intervals

Scripts and small data behind the figures and the seed-clustered intervals of the SoftwareX article about TrackSeed. They are not part of the library, the CLI or the tests, and nothing under `paper/` is imported by `src/`. Run every command from the repository root.

## What is here

| File | Produces | Reads |
| --- | --- | --- |
| `scripts/fig1_architecture.py` | Fig. 1 (module structure), `figures/fig1_architecture.png` | nothing; the box texts are typed in the script |
| `scripts/fig_ui_screenshots.mjs` | the one browser screenshot of the web interface, `ui_v120_seed42_validation.png` | a built and served copy of commit 3765362 |
| `scripts/fig_ui_compose.py` | Fig. 2 (web interface), `figures/fig_ui.png` | that screenshot |
| `scripts/fig_e9.py` | Fig. 3 (E9 validity and metrics), `figures/fig_e9.png` | `experiments/e9/results/SUMMARY.json`, `tracks.csv.gz` |
| `scripts/cluster_intervals.py` | `data/cluster_intervals.json` and `.md` (seed-clustered bootstrap intervals of Table 1) | `experiments/e6/results/heldout/instances.csv.gz` and `heldout.json`, `experiments/e7/results/heldout/cases.csv.gz` |
| `scripts/common.py` | paths, palette, Wilson interval | |
| `data/cluster_intervals.json`, `.md` | the committed output of `cluster_intervals.py` | |

The figures themselves are not committed (they are the article's files).

Inputs are read with `git show <rev>:<path>`, never from the working tree. The default revision is `3765362` (TrackSeed v1.2.0). The files read lie under `experiments/e6`, `e7` and `e9`; they are the same at 3765362 and at the commit that adds `paper/`, so `TLSX_REV=HEAD` gives the same results there. Environment variables: `TLSX_REPO` (default: this repository), `TLSX_REV` (default 3765362), `TLSX_OUT` (output root; figures go to `$TLSX_OUT/figures`, data to `$TLSX_OUT/data`; default: this `paper/` folder, which would overwrite `data/cluster_intervals.*`, so use a scratch folder to check).

## Environment of the checks

Linux x86_64, Python 3.13.18 with numpy 2.5.3, pandas 3.0.5, matplotlib 3.11.2 and Pillow 12.3.0 (font DejaVu Sans); Node.js v22.23.4; `playwright` 1.64.1 from `node_modules` (`npm ci`), Chromium from `/opt/pw-browsers`. The Python scripts need no network. The UI screenshot needs a built copy of the application (`npm run build`).

## Commands

Figures 1 and 3 and the intervals (about 2 seconds, no network):

```
OUT=/tmp/paper-check
TLSX_OUT=$OUT python3 -I paper/scripts/cluster_intervals.py     # data/cluster_intervals.json, .md (10000 resamples, PCG64 seed 20261113)
TLSX_OUT=$OUT python3 -I paper/scripts/fig_e9.py                # figures/fig_e9.png
TLSX_OUT=$OUT python3 -I paper/scripts/fig1_architecture.py     # figures/fig1_architecture.png
cmp $OUT/data/cluster_intervals.json paper/data/cluster_intervals.json && cmp $OUT/data/cluster_intervals.md paper/data/cluster_intervals.md && echo same
```

`cluster_intervals.py` is deterministic and must reproduce the two committed files byte for byte (it writes `rev` into the JSON, so a different `TLSX_REV` changes that line only).

Figure 2 (web interface), from commit 3765362 so that the header reads `v1.2.0` whatever the current tree is:

```
git worktree add /tmp/ts-fig 3765362 && ln -s "$PWD/node_modules" /tmp/ts-fig/node_modules
(cd /tmp/ts-fig && npm run build && npx vite preview --host 127.0.0.1 --port 4173 &)
mkdir -p /tmp/uishots
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node paper/scripts/fig_ui_screenshots.mjs "$PWD" /tmp/uishots http://127.0.0.1:4173/
TLSX_OUT=$OUT python3 -I paper/scripts/fig_ui_compose.py /tmp/uishots     # figures/fig_ui.png
pkill -f "vite preview"; git worktree remove /tmp/ts-fig --force
```

The capture uses a 860 x 722 CSS-pixel window at device scale factor 3, `?lang=en`, the default parameters (seed 42) and software WebGL (SwiftShader). The script exits non-zero unless the header reads `TrackSeed` and `v1.2.0`, the language is English, all thirteen parameters equal `DEFAULTS` of `src/core.ts`, the validation badge is `OK` with `Errors 0 · Warnings 0` and eight `pass` rows, and the Validation panel, seed field and buttons are fully visible. The sidebar is scrolled to its end, so parameter sections 01 to 04 lie above the visible part. The sidebar title still reads "Track Lab" at 3765362; the figure shows it. `fig_ui_compose.py` shows the whole screenshot uncropped (panel a) and two magnified crops of the same screenshot (b, c); their source regions are outlined in (a).

## Results of the check (v1.2.0 tree, one machine)

- `data/cluster_intervals.json` and `.md`: byte-identical to the committed files.
- `fig1_architecture.png` and `fig_e9.png`: byte-identical to the files in the manuscript workspace (same machine and library versions; other matplotlib or font versions may differ in pixels, not in the plotted numbers, which `fig_e9.py` asserts against `SUMMARY.json`).
- `fig_ui.png`: two captures of the application differ in 345 of 5.6 million screenshot pixels (all inside the 3D viewport, maximum channel-sum difference 116) because the software-rendered 3D view is not pixel-stable; the sidebar, header and every text are identical. A PNG comparison of this figure is therefore not byte-exact.

## Limits

The scripts are the authors' own and were written for the article; they are not tested by `npm test` and are not covered by the determinism claims of the library. Third-party sources of E9 are not read here; the E9 results come from `experiments/e9/results/`.
