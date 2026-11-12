#!/usr/bin/env bash
# E9: fetches every third-party source at a pinned commit into build/third_party/<name>/ (gitignored; NO third-party code or data is
# committed to this repository) and records licence file hashes in build/THIRD_PARTY.txt.
# Needs network access to github.com. Python dependencies: see requirements.txt (pip install --break-system-packages -r requirements.txt).
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
tp="$here/build/third_party"
mkdir -p "$tp"
log="$here/build/THIRD_PARTY.txt"
: > "$log"

# fetch NAME URL COMMIT LICENCE_FILE LICENCE_SUMMARY
fetch() {
  local name="$1" url="$2" pin="$3" licfile="$4" lic="$5" d="$tp/$1"
  if [ ! -d "$d/.git" ]; then git init --quiet "$d"; git -C "$d" remote add origin "$url"; fi
  if [ "$(git -C "$d" rev-parse -q --verify HEAD 2>/dev/null || true)" != "$pin" ]; then
    git -C "$d" fetch --quiet --depth 1 origin "$pin"
    git -C "$d" checkout --quiet --detach FETCH_HEAD
  fi
  [ "$(git -C "$d" rev-parse HEAD)" = "$pin" ] || { echo "$name: not at pinned commit $pin" >&2; exit 1; }
  {
    echo "== $name"
    echo "repository: $url"
    echo "pinned commit: $pin ($(git -C "$d" log -1 --format=%cI))"
    echo "licence: $lic (file $licfile)"
    (cd "$d" && sha256sum "$licfile")
  } | tee -a "$log"
}

# --- real circuits ---
fetch tumftm-racetrack-database https://github.com/TUMFTM/racetrack-database.git e59595d1f3573b30d1ded6a08984935b957688e0 LICENSE \
  "LGPL-3.0 (no copyright line in the file; contact TUM FTM); centre lines derived from OpenStreetMap (ODbL) -> fetched at run time only, never vendored"
fetch bacinger-f1-circuits https://github.com/bacinger/f1-circuits.git 8094e957b8d6aa8b9f4510c93968556cccd30e02 LICENSE.md \
  "MIT, Copyright (c) 2019-2025 Tomislav Bacinger (initial circuit data from a Google My Maps layer, see CANDIDATES.md)"
# --- procedural generators ---
fetch juangallostra-procedural-tracks https://github.com/juangallostra/procedural-tracks.git 8e22e36b2d0b15209eb165371faf1e2870b8834b LICENSE \
  "MIT, Copyright (c) 2020 Juan Gallostra Acin"
fetch amz-random-track-generator https://github.com/AMZ-Racing/random-track-generator.git b9e42a7845911c055d14997073fb3c49dcf54732 LICENSE \
  "MIT, Copyright (c) 2024 Mees van Loben Sels"
fetch gymnasium https://github.com/Farama-Foundation/Gymnasium.git 8ba8c3a63bb4e000b7f33923f43d292acac07be1 LICENSE \
  "MIT, Copyright (c) 2016 OpenAI, (c) 2022 Farama Foundation (tag v1.4.0)"
fetch drift-school https://github.com/alexnieves-cs/drift-school.git f4c61cf7ffb746a105d90c7f0cae665dc53ae765 LICENSE \
  "MIT, Copyright (c) 2026 Alex Nieves"
fetch zzangupenn-track-gen https://github.com/zzangupenn/track_gen.git e5ea23d2de72969c8c02491738275f0a31e97b6b LICENSE \
  "MIT, Copyright (c) 2020 Joseph Auckley, Matthew O'Kelly, Aman Sinha, Hongrui Zheng, Zirui Zang"
echo "fetch.sh: done (see $log)"
