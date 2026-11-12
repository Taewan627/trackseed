#!/usr/bin/env bash
# Builds the v1.0.0 and v0.5.0 (commit 145277e) ESM bundles and the self-contained page.html. esbuild 0.25, es2020, platform neutral.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"; repo="$(cd "$here/../../.." && pwd)"
old=/tmp/tlsx-v050
[ -d "$old/src" ] || git -C "$repo" worktree add --detach "$old" 145277e
[ "$(git -C "$old" rev-parse --short=7 HEAD)" = "145277e" ] || { echo "v0.5.0 worktree is not at 145277e" >&2; exit 1; }
mkdir -p "$here/build"
common=(--bundle --format=esm --platform=neutral --target=es2020 --log-level=warning)
npx -y esbuild@0.25.12 "${common[@]}" "$here/entry-v100.mjs" --outfile="$here/build/v100.mjs"
npx -y esbuild@0.25.12 "${common[@]}" --alias:@v050="$old/src" "$here/entry-v050.mjs" --outfile="$here/build/v050.mjs"
node "$here/make-page.mjs"
sha256sum "$here/build/v100.mjs" "$here/build/v050.mjs" | sed "s#$here/##" | tee "$here/build/BUNDLE_SHA256.txt"
