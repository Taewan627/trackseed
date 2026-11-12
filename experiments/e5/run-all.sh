#!/usr/bin/env bash
# Runs every available engine on the 1000 registered cases, then the analysis (twice, to check its determinism).
set -uo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
cd "$here"
(cd ../.. && npm run build:cli > /dev/null) || { echo "build:cli failed" >&2; exit 1; }
./build.sh || { echo "build failed" >&2; exit 1; }
rm -rf out; git clean -fdq -- results; mkdir -p results out # only untracked leftovers of results/ are removed: committed files (NOTES.md, ...) stay
fail() { echo "ENGINE FAILED: $1" >&2; }
node_like() { # label, command...
  local label="$1"; shift
  if "$@" "$here/run.mjs" "$label" 2> "results/$label.err"; then rm -f "results/$label.err"
  else { echo "command: $* run.mjs $label"; cat "results/$label.err"; } > "results/$label.error.txt"; rm -f "results/$label.err" "results/$label.json"; fail "$label"; fi
}
node_like node22 node
node_like node22-repeat node
node_like node20 npx -y -p node@20.20.2 node
node_like node24 npx -y -p node@24.22.2 node
node_like deno npx -y deno@2.9.6 run --allow-read --allow-write
node_like bun npx -y bun@1.4.4 run
for br in chrome firefox; do
  if ! node run-browser.mjs $br 2> "results/$br.err"; then { echo "$br failed"; tail -20 "results/$br.err"; } > "results/$br.error.txt"; fail $br; fi
  rm -f "results/$br.err"
done
node analyze.mjs && mkdir -p out/run1 && cp results/SUMMARY.md results/SUMMARY.json out/run1/ && node analyze.mjs && \
  cmp results/SUMMARY.md out/run1/SUMMARY.md && cmp results/SUMMARY.json out/run1/SUMMARY.json && echo "analysis deterministic: two runs byte-identical" | tee results/ANALYSIS_DETERMINISM.txt
python3 make-figure.py
