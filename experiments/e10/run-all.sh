#!/usr/bin/env bash
# E10: build -> run twice (in parallel, into build/det1 and build/det2) -> analyse -> figure -> DETERMINISM.txt -> results/.
# Usage: ./run-all.sh   (about 25 minutes on the 2-core verification machine; the two runs use one core each)
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"; cd "$here"
(cd ../.. && npm run build:cli > /dev/null)
rm -rf build/det1 build/det2; mkdir -p build results
node run.mjs build/det1 > build/run1.log 2>&1 & p1=$!
node run.mjs build/det2 > build/run2.log 2>&1 & p2=$!
wait $p1; wait $p2
cat build/run1.log
node analyze.mjs build/det1 > build/analyze1.log; node analyze.mjs build/det2 > /dev/null
{
  echo "E10 determinism check ($(date -u +%FT%TZ)), node $(node --version): two full runs (run.mjs + analyze.mjs), sha256 of every output"
  ok=1
  for f in instances.csv clean.json env.json SUMMARY.json SUMMARY.md; do
    a=$(sha256sum build/det1/$f | cut -d' ' -f1); b=$(sha256sum build/det2/$f | cut -d' ' -f1)
    if [ "$a" = "$b" ]; then echo "identical  $a  $f"; else echo "DIFFERENT  $a  $b  $f"; ok=0; fi
  done
  [ $ok = 1 ] && echo "all outputs identical in the two runs" || echo "DETERMINISM FAILED"
} | tee results/DETERMINISM.txt
for f in instances.csv clean.json env.json SUMMARY.json SUMMARY.md; do cp build/det1/$f results/; done
gzip -n -9 -f results/instances.csv
python3 -I make-figure.py results results/figure-e10
