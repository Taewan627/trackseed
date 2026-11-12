#!/usr/bin/env bash
# Runs every available engine for v0.5 and legacy v0.4, then builds the agreement summary.
# A failing engine is recorded in results/<label>.error.txt and reported by compare.mjs; the script continues.
set -uo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
cd "$here"
./build.sh || { echo "build failed" >&2; exit 1; }
git clean -fdq -- results; mkdir -p results # only untracked leftovers are removed: committed files (NOTES.md, other versions) stay
fail() { echo "ENGINE FAILED: $1" >&2; }

node_like() { # label, command...
  local label="$1"; shift
  for s in v05 legacy; do
    if "$@" "$here/run.mjs" $s > "results/$label.$s.json" 2> "results/$label.$s.err"; then rm -f "results/$label.$s.err"
    else { echo "command: $* run.mjs $s"; cat "results/$label.$s.err"; } > "results/$label.error.txt"; rm -f "results/$label.$s.json" "results/$label.$s.err"; fail "$label ($s)"; fi
  done
}
node_like node22 node
node_like node22-repeat node
node_like node20 npx -y -p node@20.20.2 node
node_like node24 npx -y -p node@24.22.2 node
node_like deno npx -y deno@2.9.6 run --allow-read
node_like bun npx -y bun@1.4.4 run

# Browsers run the self-contained page.html through playwright-core (Chrome: /usr/bin/google-chrome; Firefox: Playwright build,
# installed once beforehand with `npx -y playwright@1.64.1 install firefox`, see the report).
for br in chrome firefox; do
  if ! node run-browser.mjs $br 2> "results/$br.err"; then { echo "$br failed"; tail -20 "results/$br.err"; } > "results/$br.error.txt"; fail $br; fi
  rm -f "results/$br.err"
done

node compare.mjs
