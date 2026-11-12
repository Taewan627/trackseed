#!/usr/bin/env bash
# E9 phase 1: fetch (pinned) -> adapters -> build/polylines/<source>/<id>.json (+ manifest.tsv, failures.tsv per source) -> summary table.
# Usage: ./extract.sh [N_SEEDS]   (default 1000 = the full E5 seed list; the dry run in dryrun/ used the default)
# No validation or metrics are run here.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
cd "$here"
n="${1:-1000}"
./fetch.sh
node adapters/seeds.mjs
rm -rf build/polylines
export SDL_VIDEODRIVER=dummy SDL_AUDIODRIVER=dummy MPLBACKEND=Agg PYGAME_HIDE_SUPPORT_PROMPT=1
python3 -I adapters/real_tumftm.py   --build build
python3 -I adapters/real_bacinger.py --build build
python3 -I adapters/gen_juangallostra.py --build build --limit "$n"
python3 -I adapters/gen_amz.py           --build build --limit "$n"
python3 -I adapters/gen_carracing.py     --build build --limit "$n"
python3 -I adapters/gen_zzangupenn.py    --build build --limit "$n"
for stage in 0 1 2 3 4; do node adapters/gen_driftschool.mjs --build build --limit "$n" --stage "$stage"; done
python3 -I adapters/summarize.py build
(cd ../.. && npm run build:cli > /dev/null)   # parse check uses the built src/polyline.ts (cli-dist/, gitignored)
node adapters/parse_check.mjs build
