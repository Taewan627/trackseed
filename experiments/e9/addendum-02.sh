#!/usr/bin/env bash
# E9 ADDENDUM-02: extract (pinned fetch + adapters, network needed) -> TrackSeed adapter -> run twice -> analyse -> figure -> DETERMINISM.txt -> results/addendum-02/.
# Usage: ./addendum-02.sh   (the scratch copies of the two runs go to build/a2-det1 and build/a2-det2; original E9 results are not touched)
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"; cd "$here"
out=results/addendum-02
(cd ../.. && npm run build:cli > /dev/null)
./extract.sh > build/extract-a2.log 2>&1 || { cat build/extract-a2.log; exit 1; }
node adapters/gen_trackseed.mjs --build build
rm -rf build/a2-det1 build/a2-det2; mkdir -p "$out"
node addendum-02.mjs build/a2-det1 && node analyze-addendum-02.mjs build/a2-det1
node addendum-02.mjs build/a2-det2 && node analyze-addendum-02.mjs build/a2-det2
{
  echo "E9 addendum-02 determinism check ($(date -u +%FT%TZ)), node $(node --version): two full runs (addendum-02.mjs + analyze-addendum-02.mjs), sha256 of every output"
  echo "E9 polylines SHA256SUMS sha256: $(sha256sum build/polylines/SHA256SUMS | cut -d' ' -f1)"
  ok=1
  for f in tracks.csv sources.json env.json SUMMARY.json SUMMARY.md; do
    a=$(sha256sum build/a2-det1/$f | cut -d' ' -f1); b=$(sha256sum build/a2-det2/$f | cut -d' ' -f1)
    if [ "$a" = "$b" ]; then echo "identical  $a  $f"; else echo "DIFFERENT  $a  $b  $f"; ok=0; fi
  done
  [ $ok = 1 ] && echo "A12: held (all outputs identical in the two runs)" || echo "A12: FAILED"
} | tee "$out/DETERMINISM.txt"
for f in tracks.csv sources.json env.json SUMMARY.json SUMMARY.md; do cp build/a2-det1/$f "$out/"; done
gzip -n -9 -f "$out/tracks.csv"
python3 -I make-figure-addendum-02.py "$out" "$out/figure-e9-addendum-02"
