#!/usr/bin/env bash
# Runs every available engine for S1 and S2, then builds the summary.
# A failing engine is recorded in results/v1.1.0/<label>.error.txt and reported by compare.mjs; the script continues.
# Needs PLAYWRIGHT_BROWSERS_PATH to point at the Playwright browsers (firefox, webkit), e.g. /opt/pw-browsers.
set -uo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
cd "$here"
./build.sh || { echo "build failed" >&2; exit 1; }
out="$here/../results/v1.1.0"
git clean -fdq -- "$out"; mkdir -p "$out" # only untracked leftovers are removed: committed files (NOTES.md, ...) stay
fail() { echo "ENGINE FAILED: $1" >&2; }
node_like() { # label, command...
  local label="$1"; shift
  for s in s1 s2; do
    if "$@" "$here/run.mjs" $s > "$out/$label.$s.json" 2> "$out/$label.$s.err"; then rm -f "$out/$label.$s.err"
    else { echo "command: $* run.mjs $s"; cat "$out/$label.$s.err"; } > "$out/$label.error.txt"; rm -f "$out/$label.$s.json" "$out/$label.$s.err"; fail "$label ($s)"; fi
  done
}
node_like node22 node
node_like node22-repeat node
node_like node20 npx -y -p node@20.20.2 node
node_like node24 npx -y -p node@24.22.2 node
node_like deno npx -y deno@2.9.6 run --allow-read
node_like bun npx -y bun@1.4.4 run
for br in chrome firefox webkit; do
  if ! node run-browser.mjs $br 2> "$out/$br.err"; then { echo "$br failed"; tail -20 "$out/$br.err"; } > "$out/$br.error.txt"; fail $br; fi
  rm -f "$out/$br.err"
done
node compare.mjs
