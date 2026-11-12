#!/usr/bin/env bash
# Fetches the third-party generator at the pinned commit into build/third_party/ (gitignored; its code is NOT committed here)
# and records commit hash + SHA-256 of the files used in build/THIRD_PARTY.txt.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
repo=https://github.com/YannThorimbert/RacingTrackGenerator.git
pin=3a359db8231df13e7b0cd4cedb3580348f9ae012
dest="$here/build/third_party"
mkdir -p "$here/build"
if [ ! -d "$dest/.git" ]; then git clone --quiet "$repo" "$dest"; fi
git -C "$dest" fetch --quiet origin
git -C "$dest" checkout --quiet --detach "$pin"
[ "$(git -C "$dest" rev-parse HEAD)" = "$pin" ] || { echo "not at pinned commit" >&2; exit 1; }
{
  echo "repository: $repo"
  echo "licence: MIT (c) 2020 Yann Thorimbert (file LICENSE)"
  echo "pinned commit: $pin"
  echo "upstream HEAD at fetch time: $(git -C "$dest" rev-parse origin/HEAD 2>/dev/null || git -C "$dest" ls-remote origin HEAD | cut -f1)"
  echo "commit date: $(git -C "$dest" log -1 --format=%cI "$pin")"
  (cd "$dest" && sha256sum index.html LICENSE README.md)
} | tee "$here/build/THIRD_PARTY.txt"
