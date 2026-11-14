#!/usr/bin/env bash
# Builds the E1b ESM bundle (esbuild 0.25, es2020, platform neutral) and the self-contained browser page.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"; repo="$(cd "$here/../.." && pwd)"
legacy=/tmp/tlsx-legacy
[ -d "$legacy/src" ] || git -C "$repo" worktree add --detach "$legacy" 75dced7
[ "$(git -C "$legacy" rev-parse --short=7 HEAD)" = "75dced7" ] || { echo "legacy worktree is not at 75dced7 (6fea4d6 before the trailer edit, docs/commit-map.txt)" >&2; exit 1; }
mkdir -p "$here/build"
npx -y esbuild@0.25.12 --bundle --format=esm --platform=neutral --target=es2020 --log-level=warning \
  --alias:@legacy="$legacy/src" "$here/entry.mjs" --outfile="$here/build/e1b.mjs"
node "$here/make-page.mjs"
sha256sum "$here/build/e1b.mjs" | sed "s#$here/##" | tee "$here/build/BUNDLE_SHA256.txt"
