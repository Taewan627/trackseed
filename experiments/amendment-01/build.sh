#!/usr/bin/env bash
# Bundles the amendment runners (esbuild 0.25) against the CURRENT src/ (v0.5.1 validator).
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$here/build"
for k in e2 e4; do
  npx -y esbuild@0.25.12 --bundle --format=esm --platform=node --target=node20 --log-level=warning "$here/run-$k.mjs" --outfile="$here/build/run-$k.mjs"
done
sha256sum "$here"/build/run-e2.mjs "$here"/build/run-e4.mjs | sed "s#$here/##" | tee "$here/build/BUNDLE_SHA256.txt"
