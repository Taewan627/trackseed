# Paper figures and intervals

Scripts and small data behind the figures and the seed-clustered intervals of the SoftwareX article about TrackSeed. They are not part of the library, the CLI or the tests, and nothing under `paper/` is imported by `src/`. Run every command from the repository root.

## What is here

| File | Produces | Reads |
| --- | --- | --- |
| `scripts/fig1_architecture.py` | Fig. 1 (module structure), `figures/fig1_architecture.png` | nothing; the box texts are typed in the script |
| `scripts/smoothing_probe.mjs` | `data/smoothing_probe.json` (spikes on a circle, raw and `--resample-smooth`; Sec. 2.2) | a built checkout (`cli-dist/`) |
| `scripts/w2_example.mjs` | `w2_melbourne_raw.json`, `w2_melbourne_smooth.json` (W2 verdicts, Sec. 3.2) and, for `fig_w2.py` only, `w2_melbourne_points.json` (not committed) | the TUMFTM Melbourne polyline in `experiments/e9/build/polylines` (fetched, not committed); a built checkout |
| `scripts/fig_w2.py` | Fig. 3 (W2: flagged vertices, road edges, smoothed points), `figures/fig_w2.png` | `w2_melbourne_points.json` and `w2_melbourne_raw.json` from `w2_example.mjs` |
| `scripts/fig_e9_addendum.py` | Fig. 4 (E9 addendum-02: raw and common-sampling shares, TUMFTM at median and minimum width), `figures/fig_e9_addendum.png` | `experiments/e9/results/addendum-02/SUMMARY.json` (read with `git show`) |
| `scripts/fig_ui_screenshots.mjs` | the one browser screenshot of the web interface, `ui_v120_0441abe_seed42_validation.png` | a built and served copy of commit 0441abe; Playwright |
| `scripts/fig_ui_compose.py` | Fig. 2 (web interface: whole window and two magnified panels), `figures/fig_ui.png` | that screenshot |
| `scripts/cluster_intervals.py` | `data/cluster_intervals.json` and `.md` (seed-clustered bootstrap intervals, Table 1) | `experiments/e6/results/heldout/instances.csv.gz` and `heldout.json`, `experiments/e7/results/heldout/cases.csv.gz` |
| `scripts/common.py` | paths, palette, Wilson interval | |
| `scripts/archive/fig_e9.py` | Figure of the first E9 run (validator v1.2); no longer in the article, kept for reference only | `experiments/e9/results/SUMMARY.json` (older run) |
| `data/*` | committed outputs: `cluster_intervals.json` and `.md`, `smoothing_probe.json`, `w2_melbourne_raw.json`, `w2_melbourne_smooth.json`, `ui_capture_0441abe.log` (log of the Fig. 2 capture), `npm_test_0441abe.txt` (143 of 143 Node tests), `npm_pack_check_0441abe.txt` | |

The figures themselves are not committed (they are the article's files). The TUMFTM polyline is third-party data and is not committed; `experiments/e9/adapters/real_tumftm.py` fetches it at a pinned commit.

Inputs are read with `git show <rev>:<path>`, never from the working tree. The default revision is `0441abe` (TrackSeed v1.2.0 release candidate, the figure build commit). The files read lie under `experiments/e6`, `e7` and `e9`; they are the same at 0441abe and at the commit that adds `paper/`. Environment variables: `TLSX_REPO` (default: this repository), `TLSX_REV` (default `0441abe`), `TLSX_OUT` (output root; figures go to `$TLSX_OUT/figures`, data to `$TLSX_OUT/data`; default: this `paper/` folder, which would overwrite the committed `data/` files, so use a scratch folder to check).

## Environment of the checks

Linux x86_64; Python 3.13.18 with numpy 2.5.3, pandas 3.0.5, matplotlib 3.11.2 and Pillow 12.3.0 (font DejaVu Sans); Node.js v22.23.4; `playwright` 1.64.1 from `node_modules` (`npm ci`), Chromium from `/opt/pw-browsers`. The Python scripts and `smoothing_probe.mjs` need no network. `w2_example.mjs` needs the third-party polyline (network, once). The UI screenshot needs a built copy of the application (`npm run build`).

## Commands

Intervals, Figures 1 and 4, and the smoothing probe (about a minute, no network; run from the repository root after `npm run build:cli`):

```
OUT=/tmp/paper-check
TLSX_OUT=$OUT python3 -I paper/scripts/cluster_intervals.py     # data/cluster_intervals.json, .md (10000 resamples, PCG64 seed 20261113)
TLSX_OUT=$OUT python3 -I paper/scripts/fig1_architecture.py     # figures/fig1_architecture.png
TLSX_OUT=$OUT python3 -I paper/scripts/fig_e9_addendum.py       # figures/fig_e9_addendum.png; asserts the numbers quoted in the text
node paper/scripts/smoothing_probe.mjs . $OUT/smoothing_probe.json
cmp $OUT/data/cluster_intervals.json paper/data/cluster_intervals.json
```

`cluster_intervals.py` is deterministic. The committed `data/cluster_intervals.json` and `.md` record `rev` 3765362, the revision of the results they were first generated from; run them with `TLSX_REV=3765362` to get byte-identical files (at the default 0441abe only the `rev` line differs; the interval numbers are the same). `smoothing_probe.json` is compared by content (the JSON is identical to the committed file).

W2 example (Sec. 3.2; needs the TUMFTM polyline, fetched once by `experiments/e9/adapters/real_tumftm.py` or `experiments/e9/extract.sh`):

```
node paper/scripts/w2_example.mjs . experiments/e9/build/polylines $OUT/w2
python3 -I paper/scripts/fig_w2.py $OUT/w2                      # figures/fig_w2.png
```

Figure 2 (web interface), from commit 0441abe so that the header reads `v1.2.0` whatever the current tree is:

```
git worktree add /tmp/ts-fig 23b6bb9 && ln -s "$PWD/node_modules" /tmp/ts-fig/node_modules
(cd /tmp/ts-fig && npm run build && npx vite preview --host 127.0.0.1 --port 4173 &)
mkdir -p /tmp/uishots
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node paper/scripts/fig_ui_screenshots.mjs "$PWD" /tmp/uishots http://127.0.0.1:4173/
TLSX_OUT=$OUT python3 -I paper/scripts/fig_ui_compose.py /tmp/uishots     # figures/fig_ui.png
pkill -f "vite preview"; git worktree remove /tmp/ts-fig --force
```

The capture uses a 860 x 722 CSS-pixel window at device scale factor 3, `?lang=en`, the default parameters (seed 42) and software WebGL (SwiftShader). The script exits non-zero unless the header reads `TrackSeed` and `v1.2.0`, the language is English, all thirteen parameters equal `DEFAULTS` of `src/core.ts`, the validation badge is `OK` with `Errors 0 · Warnings 0` and ten `pass` rows, and the Validation panel, seed field and buttons are fully visible. The sidebar is scrolled to its end, so parameter sections 01 to 04 lie above the visible part. `fig_ui_compose.py` shows the whole screenshot uncropped (panel a) and two magnified crops of the same screenshot (b, c); their source regions are outlined in (a).

The W2 example and the UI capture were not re-run for this check (no network, no third-party polyline here, no browser run): their committed outputs are `data/w2_melbourne_raw.json`, `w2_melbourne_smooth.json` and `ui_capture_0441abe.log`.

## Results of the check (0441abe tree, one machine)

- `data/cluster_intervals.json` and `.md`: byte-identical to the committed files at `TLSX_REV=3765362`; at the default `0441abe` the `.md` header and the `rev` line of the `.json` differ, nothing else.
- `figures/fig1_architecture.png` and `fig_e9_addendum.png`: byte-identical to the files in the manuscript workspace (same machine and library versions; other matplotlib or font versions may differ in pixels, not in the plotted numbers, which `fig_e9_addendum.py` asserts against `SUMMARY.json`).
- `smoothing_probe.json`: identical in content to the committed file.
- `fig_ui.png`: two captures of the application differ in 345 of 5.6 million screenshot pixels (all inside the 3D viewport, maximum channel-sum difference 116) because the software-rendered 3D view is not pixel-stable; the sidebar, header and every text are identical. A PNG comparison of this figure is therefore not byte-exact.

## Limits

The scripts are the authors' own and were written for the article; they are not tested by `npm test` and are not covered by the determinism claims of the library. Third-party sources of E9 are not read here; the E9 results come from `experiments/e9/results/`.
