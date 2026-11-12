#!/usr/bin/env bash
# Fetches the third-party generator and builds the engine-portable bundle and the self-contained browser page.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
"$here/fetch.sh" > /dev/null
mkdir -p "$here/build"
npx -y esbuild@0.25 --bundle --format=esm --platform=neutral --target=es2020 --log-level=warning \
  "$here/adapter.mjs" --outfile="$here/build/e5.mjs"
node "$here/make-page.mjs"
{ cat "$here/build/THIRD_PARTY.txt"; echo; sha256sum "$here/build/e5.mjs" | sed "s#$here/##"; } > "$here/build/BUNDLE_SHA256.txt"
cat "$here/build/BUNDLE_SHA256.txt"
