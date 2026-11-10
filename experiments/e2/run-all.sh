#!/usr/bin/env bash
# E2 driver: validity run, timing run (+ determinism check), 5 timing repetitions of the 500-case subset, then analysis.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"; cd "$here"
./build.sh
mkdir -p results out
{ lscpu; echo; node --version; node -p "process.versions.v8"; nproc; uname -a; } > results/environment.txt
node build/run.mjs validity results/validity.csv.gz | tee out/validity.log
node build/run.mjs timing out/validity-from-timing-run.csv.gz results/timing.csv.gz | tee out/timing.log
cmp results/validity.csv.gz out/validity-from-timing-run.csv.gz && echo "DETERMINISM: validity run and timing run CSVs byte-identical" | tee out/determinism.log
for i in 1 2 3 4 5; do node build/run.mjs rep out/rep$i.json; done
python3 analyze.py
