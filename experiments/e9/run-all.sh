#!/usr/bin/env bash
# E9 phase 2: extract (pinned fetch + adapters, network needed) -> run twice -> analyze -> figure -> DETERMINISM.txt -> results/.
# Usage: ./run-all.sh            (writes results/; the scratch copies of the two determinism runs go to build/det1 and build/det2)
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
cd "$here"
(cd ../.. && npm run build:cli > /dev/null)
./extract.sh > build/extract.log 2>&1 || { cat build/extract.log; exit 1; }
rm -rf build/det1 build/det2 results; mkdir -p results
node run.mjs build/det1
node analyze.mjs build/det1
node run.mjs build/det2
node analyze.mjs build/det2
# determinism: every output except the timing files must have identical sha256 in the two runs; the polyline set hash is part of env.json
{
  echo "E9 determinism check ($(date -u +%FT%TZ)), node $(node --version)"
  echo "polylines SHA256SUMS sha256: $(sha256sum build/polylines/SHA256SUMS | cut -d' ' -f1)"
  ok=1
  for f in tracks.csv sources.json env.json SUMMARY.json SUMMARY.md; do
    a=$(sha256sum build/det1/$f | cut -d' ' -f1); b=$(sha256sum build/det2/$f | cut -d' ' -f1)
    if [ "$a" = "$b" ]; then echo "identical  $a  $f"; else echo "DIFFERENT  $a  $b  $f"; ok=0; fi
  done
  echo "excluded from the hash: timing.json, TIMING.md (wall-clock times)"
  [ $ok = 1 ] && echo "P4.1: held (all non-timing outputs identical)" || echo "P4.1: FAILED"
} | tee results/DETERMINISM.txt
for f in tracks.csv sources.json env.json SUMMARY.json SUMMARY.md timing.json TIMING.md; do cp build/det1/$f results/; done
gzip -n -9 -f results/tracks.csv
python3 -I make-figure.py results results/figure-e9
