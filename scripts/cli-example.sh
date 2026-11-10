#!/usr/bin/env bash
# Regenerates docs/cli-example-output.txt: real output of the README quick-start CLI commands (trimmed with head/ellipsis marks).
# Usage (from the repository root, after `npm ci && npm run build:cli`): bash scripts/cli-example.sh
set -eu
cd "$(dirname "$0")/.."
tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
cli="node cli-dist/cli.js"
trim() { local n="$1"; shift; "$@" | head -n "$n"; echo "  ... (output trimmed)"; }
{
echo "\$ tracklab generate --seed 7 --set curves=8 --set cornerPattern=hairpin --out track.json"
$cli generate --seed 7 --set curves=8 --set cornerPattern=hairpin --out "$tmp/track.json"; echo "exit 0; track.json: $(wc -c < "$tmp/track.json") bytes"
echo; echo "\$ tracklab validate track.json --verify regenerate"
node cli-dist/cli.js validate "$tmp/track.json" --verify regenerate | sed "s#$tmp/##" | head -n 14; echo "  ... (violations list trimmed)"
node -e 'const r=JSON.parse(require("fs").readFileSync(0,"utf8"));console.log("checks (id: passed, failures):",r.checks.map(c=>c.id+": "+c.passed+", "+c.failures).join(" | "))' < <($cli validate "$tmp/track.json" --verify regenerate)
echo "exit $($cli validate "$tmp/track.json" --verify regenerate >/dev/null; echo $?)"
echo; echo "\$ tracklab metrics track.json"
trim 12 $cli metrics "$tmp/track.json"
echo; echo "\$ tracklab batch --grid examples/grid-small.json --out out/ --jsonl out/summary.jsonl --no-timing"
$cli batch --grid examples/grid-small.json --out "$tmp/out" --jsonl "$tmp/out/summary.jsonl" --no-timing 2>&1
echo "first JSONL line (cut to 520 characters):"; head -n 1 "$tmp/out/summary.jsonl" | cut -c1-520
} 2>&1 | sed 's/\r$//' > docs/cli-example-output.txt
