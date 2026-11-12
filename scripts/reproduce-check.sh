#!/usr/bin/env bash
# Re-runs experiment runners at the current HEAD into a scratch directory and compares the result with the committed files.
# Nothing under experiments/*/results/ or any other tracked file is written. Bundles go to the gitignored experiments/*/build/.
# See REPRODUCE.md for the table of experiments, commands and what each group covers.
#
# Usage: scripts/reproduce-check.sh <scratch-dir> [group ...]
#   groups: e1 e2 amend e6 e7 e5          (default: e1 e2 amend e6 e7; e5 needs network to fetch the third-party generator)
# Output: <scratch-dir>/reproduce-check.tsv (label, committed file, fresh file, raw sha256 match, decompressed or JSON content match)
#         and <scratch-dir>/logs/*.log. Exit status is 0 even when a comparison differs; read the table.
set -uo pipefail
repo="$(cd "$(dirname "$0")/.." && pwd)"
scratch="${1:?usage: scripts/reproduce-check.sh <scratch-dir> [group ...]}"; shift
groups=("$@"); [ ${#groups[@]} -eq 0 ] && groups=(e1 e2 amend e6 e7)
mkdir -p "$scratch/logs"; scratch="$(cd "$scratch" && pwd)"
tsv="$scratch/reproduce-check.tsv"; : > "$tsv"
E="npx -y esbuild@0.25 --bundle --format=esm --platform=neutral --target=es2020 --log-level=warning"

cd "$repo" || exit 1 # committed paths in compare() are repo-relative
note() { echo "[$(date +%T)] $*" >&2; }
# compare <label> <committed (repo-relative)> <fresh (absolute)>
compare() {
  node -e '
    const fs = require("fs"), zlib = require("zlib"), crypto = require("crypto");
    const [label, committed, fresh] = process.argv.slice(1);
    const sha = b => crypto.createHash("sha256").update(b).digest("hex").slice(0, 16);
    const a = fs.readFileSync(committed), b = fs.readFileSync(fresh);
    const raw = sha(a) === sha(b) ? "yes" : "no";
    let content;
    if (committed.endsWith(".gz")) content = sha(zlib.gunzipSync(a)) === sha(zlib.gunzipSync(b)) ? "yes" : "no";
    else if (committed.endsWith(".json")) { // JSON: compare the field named by env CMP_FIELD if set, else the whole file
      const ja = JSON.parse(a), jb = JSON.parse(b), f = process.env.CMP_FIELD;
      content = f ? (JSON.stringify(ja[f]) === JSON.stringify(jb[f]) ? "yes" : "no") : (raw === "yes" ? "yes" : "no");
    } else content = raw;
    console.log([label, committed, fresh, raw, content].join("\t"));
  ' "$1" "$2" "$3" >> "$tsv" 2>> "$scratch/logs/compare.err" || echo -e "$1\t$2\t$3\terror\terror" >> "$tsv"
}

for g in "${groups[@]}"; do
  case "$g" in
  e1)
    note "e1: bundles at HEAD (legacy and v0.5.0 aliases use detached worktrees of 6fea4d6 and 145277e, as in the build scripts)"
    legacy=/tmp/tlsx-legacy; v050=/tmp/tlsx-v050
    [ -d "$legacy/src" ] || git -C "$repo" worktree add --detach "$legacy" 6fea4d6 >/dev/null 2>&1
    [ -d "$v050/src" ] || git -C "$repo" worktree add --detach "$v050" 145277e >/dev/null 2>&1
    cd "$repo/experiments/e1" && mkdir -p build && $E entry-v05.mjs --outfile=build/v05.mjs && $E --alias:@legacy="$legacy/src" entry-legacy.mjs --outfile=build/legacy.mjs \
      && node run.mjs v05 > "$scratch/e1-node22.v05.json" 2> "$scratch/logs/e1.log" && node run.mjs legacy > "$scratch/e1-node22.legacy.json" 2>> "$scratch/logs/e1.log"
    cd "$repo/experiments/e1/v1.0.0" && mkdir -p build && $E entry-v100.mjs --outfile=build/v100.mjs && $E --alias:@v050="$v050/src" entry-v050.mjs --outfile=build/v050.mjs \
      && node run.mjs v100 > "$scratch/e1-node22.v100.json" 2>> "$scratch/logs/e1.log" && node run.mjs v050 > "$scratch/e1-node22.v050.json" 2>> "$scratch/logs/e1.log"
    cd "$repo"
    CMP_FIELD=cases compare "E1 node22 legacy (experiments/e1, alias 6fea4d6)" "experiments/e1/results/node22.legacy.json" "$scratch/e1-node22.legacy.json"
    CMP_FIELD=cases compare "E1 node22 v05 (HISTORICAL: entry-v05 bundles current src; not reproducible by design)" "experiments/e1/results/node22.v05.json" "$scratch/e1-node22.v05.json"
    for s in v100 v050; do CMP_FIELD=cases compare "E1 v1.0.0 node22 $s" "experiments/e1/results/v1.0.0/node22.$s.json" "$scratch/e1-node22.$s.json"; done
    ;;
  e2)
    note "e2: full validity run (48,600 cases)"
    (cd "$repo/experiments/e2" && ./build.sh > "$scratch/logs/e2-build.log" 2>&1 && node build/run.mjs validity "$scratch/e2-validity.csv.gz" > "$scratch/logs/e2.log" 2>&1)
    compare "E2 validity (experiments/e2)" "experiments/e2/results/validity.csv.gz" "$scratch/e2-validity.csv.gz"
    ;;
  amend)
    note "amend: AMENDMENT-01 E2 validity, closure rule 'ratio'"
    (cd "$repo/experiments/amendment-01" && ./build.sh > "$scratch/logs/amend-build.log" 2>&1 && CLOSURE_TANGENT_MODE=ratio node build/run-e2.mjs validity "$scratch/amend-validity.csv.gz" > "$scratch/logs/amend.log" 2>&1)
    compare "AMENDMENT-01 E2 validity (ratio)" "experiments/e2/results/amendment-01/validity.csv.gz" "$scratch/amend-validity.csv.gz"
    ;;
  e6)
    note "e6: DEV, HELD-OUT (reads the committed DEV inputs) and E2 recheck"
    cd "$repo" && npm run build:cli > "$scratch/logs/build-cli.log" 2>&1
    mkdir -p "$scratch/e6/dev" "$scratch/e6/heldout" "$scratch/e6/e2-recheck"
    node experiments/e6/run-dev.mjs "$scratch/e6/dev/candidates.json" > "$scratch/logs/e6-dev.log" 2>&1 && node experiments/e6/select.mjs "$scratch/e6/dev" >> "$scratch/logs/e6-dev.log" 2>&1
    node experiments/e6/run-heldout.mjs "$scratch/e6/heldout" > "$scratch/logs/e6-heldout.log" 2>&1
    node experiments/e6/e2-recheck.mjs "$scratch/e6/e2-recheck" > "$scratch/logs/e6-recheck.log" 2>&1
    for f in candidates.json candidates.csv FROZEN.json DEV_SUMMARY.md; do compare "E6 DEV $f" "experiments/e6/results/dev/$f" "$scratch/e6/dev/$f"; done
    for f in heldout.json instances.csv.gz auto-straight.json; do compare "E6 HELD-OUT $f" "experiments/e6/results/heldout/$f" "$scratch/e6/heldout/$f"; done
    for f in validity-v1.1.csv.gz SUMMARY.json SUMMARY.md; do compare "E6 E2 recheck $f" "experiments/e6/results/e2-recheck/$f" "$scratch/e6/e2-recheck/$f"; done
    ;;
  e7)
    note "e7: repro, dev, heldout (each is one run; the committed DETERMINISM.txt records two runs)"
    cd "$repo" && npm run build:cli > "$scratch/logs/build-cli.log" 2>&1
    for set in repro dev heldout; do
      mkdir -p "$scratch/e7/$set"; node experiments/e7/run.mjs $set "$scratch/e7/$set" > "$scratch/logs/e7-$set.log" 2>&1
      for f in cases.csv.gz SUMMARY.json SUMMARY.md; do compare "E7 $set $f" "experiments/e7/results/$set/$f" "$scratch/e7/$set/$f"; done
    done
    node experiments/e7/exploratory.mjs > "$scratch/e7/exploratory.txt" 2> "$scratch/logs/e7-exploratory.log"
    compare "E7 exploratory.txt (experiments/e7/results)" "experiments/e7/results/exploratory.txt" "$scratch/e7/exploratory.txt"
    ;;
  e5)
    note "e5: fetch the pinned third-party generator (network) and run node22 into scratch"
    cd "$repo" && npm run build:cli > "$scratch/logs/build-cli.log" 2>&1
    if (cd "$repo/experiments/e5" && ./build.sh > "$scratch/logs/e5-build.log" 2>&1); then
      mkdir -p "$scratch/e5"
      (cd "$repo/experiments/e5" && E5_SCRATCH="$scratch/e5" node run.mjs node22 > "$scratch/logs/e5.log" 2>&1)
      CMP_FIELD=cases compare "E5 node22 cases (experiments/e5)" "experiments/e5/results/node22.json" "$scratch/e5/results/node22.json"
      # analysis: committed engine JSONs as inputs, fresh node22 JSON and polylines; other engines' out/*.polylines.json are gitignored and absent
      an="$scratch/e5-analysis"; mkdir -p "$an/results" "$an/out"
      cp "$repo"/experiments/e5/results/*.json "$repo"/experiments/e5/results/*.error.txt "$an/results/" 2>/dev/null
      cp "$scratch/e5/results/node22.json" "$an/results/node22.json"; cp "$scratch/e5/out/node22.polylines.json" "$an/out/"
      (cd "$repo" && E5_SCRATCH="$an" node experiments/e5/analyze.mjs > "$scratch/logs/e5-analyze.log" 2>&1)
      compare "E5 analysis validity.jsonl" "experiments/e5/results/validity.jsonl" "$an/results/validity.jsonl"
      compare "E5 analysis SUMMARY.json (differs only in polyline-based secondary blocks, see REPRODUCE_CHECK.md)" "experiments/e5/results/SUMMARY.json" "$an/results/SUMMARY.json"
      compare "E5 analysis SUMMARY.md (differs only in polyline-based secondary rows)" "experiments/e5/results/SUMMARY.md" "$an/results/SUMMARY.md"
    else echo -e "E5 build\t-\t-\tnot run\tnot run (see logs/e5-build.log)" >> "$tsv"; fi
    ;;
  *) note "unknown group $g" ;;
  esac
done
cd "$repo" && git status --short | sed 's/^/tracked-or-untracked change: /' >&2
note "table: $tsv"
cat "$tsv"
