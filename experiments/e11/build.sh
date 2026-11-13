#!/usr/bin/env bash
# Bundles src/ (generator, vehicle model, metrics, validator) for E11 into the gitignored experiments/e11/build/ (esbuild 0.25.12 through npx, as E1).
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p build
npx -y esbuild@0.25.12 --bundle --format=esm --platform=neutral --target=es2020 --log-level=warning entry.mjs --outfile=build/e11.mjs
