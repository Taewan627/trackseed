#!/usr/bin/env bash
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$here/build"
npx -y esbuild@0.25.12 --bundle --format=esm --platform=node --target=node20 --log-level=warning "$here/run.mjs" --outfile="$here/build/run.mjs"
sha256sum "$here/build/run.mjs" | sed "s#$here/##" | tee "$here/build/BUNDLE_SHA256.txt"
