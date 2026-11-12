# E9 attribution

Experiment E9 uses tracks that the authors of TrackLab/TrackSeed did not create. All sources are fetched at run time at pinned commits
(`fetch.sh`) into the gitignored `build/`. Nothing from these sources is committed here, neither code nor data nor derived polylines.
Hashes of the licence files are in `dryrun/THIRD_PARTY.txt`.

| Source | Role | Pinned commit | Licence | Copyright / credit |
|---|---|---|---|---|
| https://github.com/TUMFTM/racetrack-database | 25 real circuit centre lines with widths | `e59595d1f3573b30d1ded6a08984935b957688e0` | LGPL-3.0 (`LICENSE`, no copyright line inside) | Chair of Automotive Technology, TU Munich (contact A. Heilmeier; widths: A. de Paula Suiti). Centre lines originate from OpenStreetMap, (c) OpenStreetMap contributors, ODbL 1.0 (https://www.openstreetmap.org/copyright) |
| https://github.com/bacinger/f1-circuits | 40 F1 circuit centre lines (lon/lat) | `8094e957b8d6aa8b9f4510c93968556cccd30e02` | MIT (`LICENSE.md`) | Copyright (c) 2019-2025 Tomislav Bacinger. README credits a Google My Maps layer as initial data source and Wikipedia / formula1.com for altitudes |
| https://github.com/juangallostra/procedural-tracks | generator | `8e22e36b2d0b15209eb165371faf1e2870b8834b` | MIT (`LICENSE`) | Copyright (c) 2020 Juan Gallostra Acín |
| https://github.com/AMZ-Racing/random-track-generator | generator | `b9e42a7845911c055d14997073fb3c49dcf54732` | MIT (`LICENSE`) | Copyright (c) 2024 Mees van Löben Sels (Formula Student Team Delft; README credits I-Hudson/Race-Track-Generator as the origin of the idea) |
| https://github.com/Farama-Foundation/Gymnasium (tag v1.4.0) | generator (CarRacing) | `8ba8c3a63bb4e000b7f33923f43d292acac07be1` | MIT (`LICENSE`) | Copyright (c) 2016 OpenAI, Copyright (c) 2022 Farama Foundation |
| https://github.com/alexnieves-cs/drift-school | generator (TypeScript) | `f4c61cf7ffb746a105d90c7f0cae665dc53ae765` | MIT (`LICENSE`) | Copyright (c) 2026 Alex Nieves |
| https://github.com/zzangupenn/track_gen | generator (related to CarRacing) | `e5ea23d2de72969c8c02491738275f0a31e97b6b` | MIT (`LICENSE`) | Copyright (c) 2020 Joseph Auckley, Matthew O'Kelly, Aman Sinha, Hongrui Zheng, Zirui Zang |
| https://github.com/YannThorimbert/RacingTrackGenerator | generator (already used in E5, not re-fetched by E9) | `3a359db8231df13e7b0cd4cedb3580348f9ae012` | MIT | Copyright (c) 2020 Yann Thorimbert |

Notes
- TUMFTM data are LGPL-3.0 licensed *data* (an unusual choice; the LGPL is a software licence) and OSM-derived. Our use is read-only at run time. If any
  derived number from them is ever published (tables of per-circuit results are not a copy of the data), cite the repository and OpenStreetMap.
- Python packages used by the adapters (numpy, scipy, shapely, matplotlib, opencv, gpxpy, PyYAML, Box2D, pygame-ce) are installed from PyPI under their own licences
  and are not redistributed.
