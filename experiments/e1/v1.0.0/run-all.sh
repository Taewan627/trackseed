#!/usr/bin/env bash
# Runs every available engine for v1.0.0 and v0.5.0 (commit 145277e), then builds the summary.
# A failing engine is recorded in results/<label>.error.txt and reported by compare.mjs; the script continues.
set -uo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
cd "$here"
./build.sh || { echo "build failed" >&2; exit 1; }
out="$here/../results/v1.0.0"
rm -rf "$out"; mkdir -p "$out"
fail() { echo "ENGINE FAILED: $1" >&2; }
node_like() { # label, command...
  local label="$1"; shift
  for s in v100 v050; do
    if "$@" "$here/run.mjs" $s > "$out/$label.$s.json" 2> "$out/$label.$s.err"; then rm -f "$out/$label.$s.err"
    else { echo "command: $* run.mjs $s"; cat "$out/$label.$s.err"; } > "$out/$label.error.txt"; rm -f "$out/$label.$s.json" "$out/$label.$s.err"; fail "$label ($s)"; fi
  done
}
node_like node22 node
node_like node22-repeat node
node_like node20 npx -y -p node@20 node
node_like node24 npx -y -p node@24 node
node_like deno npx -y deno run --allow-read
node_like bun npx -y bun@1 run
for br in chrome firefox; do
  if ! node run-browser.mjs $br 2> "$out/$br.err"; then { echo "$br failed"; tail -20 "$out/$br.err"; } > "$out/$br.error.txt"; fail $br; fi
  rm -f "$out/$br.err"
done
node compare.mjs
