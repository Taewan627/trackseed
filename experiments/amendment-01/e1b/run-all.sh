#!/usr/bin/env bash
# Runs every available engine; raw outputs go to gitignored out/, then compare.mjs writes ../../e1b/results/amendment-01/.
set -uo pipefail
here="$(cd "$(dirname "$0")" && pwd)"; cd "$here"
./build.sh || exit 1
RES="$here/../../e1b/results/amendment-01"; rm -rf out; mkdir -p out "$RES"
runit() { local label="$1"; shift
  if "$@" "$here/run.mjs" > "out/$label.json" 2> "out/$label.err"; then rm -f "out/$label.err"; else echo "ENGINE FAILED: $label" >&2; mv "out/$label.err" "$RES/$label.error.txt"; rm -f "out/$label.json"; fi; }
runit node22 node
runit node22-repeat node
runit node20 npx -y -p node@20 node
runit node24 npx -y -p node@24 node
runit deno npx -y deno run --allow-read
runit bun npx -y bun@1 run
for br in chrome firefox; do node run-browser.mjs $br 2> "out/$br.err" && rm -f "out/$br.err" || { echo "ENGINE FAILED: $br" >&2; tail -20 "out/$br.err" > "$RES/$br.error.txt"; }; done
node compare.mjs
