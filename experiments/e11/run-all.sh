#!/usr/bin/env bash
# E11 full procedure (PROTOCOL.md section 7, step 3): bundle, two evaluation runs in parallel, determinism check, analysis.
# Usage: npm run build:cli && experiments/e11/run-all.sh [resultsDir]   (default experiments/e11/results; runs go to experiments/e11/build/)
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
results="${1:-$here/results}"
"$here/build.sh"
mkdir -p "$here/build" "$results"
node "$here/run.mjs" "$here/build/run-a" > "$here/build/run-a.log" &
pa=$!
node "$here/run.mjs" "$here/build/run-b" > "$here/build/run-b.log" &
pb=$!
wait "$pa"; wait "$pb"
ha=$(node -e 'process.stdout.write(require("crypto").createHash("sha256").update(require("fs").readFileSync(process.argv[1])).digest("hex"))' "$here/build/run-a/run.json")
hb=$(node -e 'process.stdout.write(require("crypto").createHash("sha256").update(require("fs").readFileSync(process.argv[1])).digest("hex"))' "$here/build/run-b/run.json")
{ echo "run-a/run.json sha256 $ha"; echo "run-b/run.json sha256 $hb"; [ "$ha" = "$hb" ] && echo "identical: yes" || echo "identical: no"; } > "$results/DETERMINISM.txt"
node -e 'const os=require("os");process.stdout.write(JSON.stringify({node:process.version,v8:process.versions.v8,platform:process.platform,arch:process.arch,cpu:os.cpus()[0].model},null,2)+"\n")' > "$results/env.json"
node "$here/analyze.mjs" "$here/build/run-a" "$results" "$results/DETERMINISM.txt"
