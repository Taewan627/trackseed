#!/usr/bin/env bash
# Builds the S1 and S2 ESM bundles (same tree) and the self-contained page.html. esbuild 0.25, es2020, platform neutral.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$here/build"
common=(--bundle --format=esm --platform=neutral --target=es2020 --log-level=warning)
npx -y esbuild@0.25 "${common[@]}" "$here/entry-s1.mjs" --outfile="$here/build/s1.mjs"
npx -y esbuild@0.25 "${common[@]}" "$here/entry-s2.mjs" --outfile="$here/build/s2.mjs"
node "$here/make-page.mjs"
sha256sum "$here/build/s1.mjs" "$here/build/s2.mjs" | sed "s#$here/##" | tee "$here/build/BUNDLE_SHA256.txt"
