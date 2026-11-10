#!/usr/bin/env bash
# Builds the two engine-portable ESM bundles and the self-contained page.html.
# esbuild is pinned to 0.25; bundles are unminified ESM, target es2020, platform neutral.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"; repo="$(cd "$here/../.." && pwd)"
legacy=/tmp/tlsx-legacy
[ -d "$legacy/src" ] || git -C "$repo" worktree add --detach "$legacy" 6fea4d6
[ "$(git -C "$legacy" rev-parse --short=7 HEAD)" = "6fea4d6" ] || { echo "legacy worktree is not at 6fea4d6" >&2; exit 1; }
mkdir -p "$here/build"
common=(--bundle --format=esm --platform=neutral --target=es2020 --log-level=warning)
npx -y esbuild@0.25 "${common[@]}" "$here/entry-v05.mjs" --outfile="$here/build/v05.mjs"
npx -y esbuild@0.25 "${common[@]}" --alias:@legacy="$legacy/src" "$here/entry-legacy.mjs" --outfile="$here/build/legacy.mjs"
node "$here/make-page.mjs"
sha256sum "$here/build/v05.mjs" "$here/build/legacy.mjs" | sed "s#$here/##" | tee "$here/build/BUNDLE_SHA256.txt"
