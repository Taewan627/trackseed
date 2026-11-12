# E5 / WP2: third-party procedural track generators considered

Search date: 2026-11-12. Goal: open-source procedural racetrack/circuit generators in JavaScript or TypeScript, permissive licence
(MIT/BSD/Apache/ISC/Unlicense), scriptable (ideally seedable) generation. Every candidate that surfaced is listed, kept or not.

Search method (all of it, including what did not work):
- WebSearch, 6 queries (procedural race track generator javascript/typescript/three.js/npm/canvas/closed loop). The GitHub REST API
  and `gh api` were not usable in this sandbox (no linked account); `git clone` over HTTPS worked for 12 of 13 repositories, one
  (vnau/ProceduralTrackGeneration) could not be cloned; its language and licence come from awesome.ecosyste.ms (a secondary source).
- npm registry search (7 queries: race track generator, racetrack procedural, procedural track, racing track generator,
  circuit generator racing, race-track, track-generator): no package that generates race tracks (hits were unrelated: promise
  races, circuit breakers, audio tracks).
- "Last commit" = date of HEAD of the default branch of a depth-limited clone made on the search date. Languages = file extensions
  of tracked files. Licence = the repository's LICENSE file (or none). I did not read every repository exhaustively; the reason
  column says how far the inspection went.
- Known gap: this is a keyword search, not a systematic survey. Generators that are not described with these words, or that live
  in closed or unindexed places, were not found.

| # | Candidate (URL) | Language | Licence | Last commit | Decision | Reason |
|---|---|---|---|---|---|---|
| 1 | https://github.com/YannThorimbert/RacingTrackGenerator | JavaScript (one inline script in index.html + three.js demo files) | MIT (c) 2020 Yann Thorimbert | 2020-07-31 (3a359db) | KEPT (chosen) | Closed-loop 2D centre-line generator (random base polygon, hairpin/S/chicane/K sections, smoothing, collision rejection) plus 3D STL export. Randomness only through one `rand()` -> `Math.random()` (a commented-out `Math.sin` fake seed is in the file). Uses Math.sin/cos/atan2/acos/hypot, so it is a real test of cross-engine determinism. Runs headless when document/window/Math are injected. Not seedable as shipped: seeded by replacing the Math.random source only (see PROTOCOL.md). |
| 2 | https://github.com/statox/procedural-race | TypeScript (p5.js) | none (no LICENSE file, no package.json licence field) | 2021-09-30 | rejected | Convex-hull based closed tracks, but no licence: all rights reserved by default, so it cannot be redistributed or credited under a licence. Not used, not run. |
| 3 | https://github.com/TechnologicTEC/Random-Racing | TypeScript | none (no LICENSE file, no licence field) | 2026-11-11 | rejected | Seedable track lab (`?seed=`), but no licence. Not used, not run. |
| 4 | https://github.com/UstymUkhman/tricky-track | JavaScript (three.js + ammo.js game) | MIT | 2024-04-21 | rejected | Procedural endless sequence of road tiles (random width/rotation via Math.random), not a closed circuit; coupled to three.js/physics. A closed-loop validator does not apply. |
| 5 | https://github.com/mckoss/racetrack | TypeScript | MIT | 2025-02-09 | rejected | Racetrack (Martin Gardner) game simulator. Tracks are hand-written or parametric (snake, spiral); no random generator of circuits. |
| 6 | https://github.com/belkadev/gen-city | TypeScript | MIT | 2023-08-25 | rejected | City generator, not a race track (surfaced in search only). Not inspected beyond the README. |
| 7 | https://github.com/juangallostra/procedural-tracks | Python (numpy/scipy/opencv) | MIT | 2022-06-22 | rejected (language) | Out of the requested language scope (JS/TS). Could in principle serve Q2/Q3 only, not Q1 (no JS engines); not done. |
| 8 | https://github.com/AMZ-Racing/random-track-generator | Python | MIT | 2025-10-09 | rejected (language) | Formula-Student cone tracks, Python. Same remark as 7. |
| 9 | https://github.com/ostad-ai/RaceTrack-Generator | Python (Perlin noise, spline filters, JSON export, Pygame demo) | MIT | 2026-09-06 | rejected (language) | Same remark as 7. |
| 10 | https://github.com/vnau/ProceduralTrackGeneration | C# (per awesome.ecosyste.ms; not cloneable here) | MIT (per awesome.ecosyste.ms) | 2017-11-03 (per awesome.ecosyste.ms) | rejected (language) | Simulated-annealing generator in C#. |
| 11 | https://github.com/adrianogil/proceduralrace | C# (Unity) | MIT | 2018-02-26 | rejected (language) | Unity project. |
| 12 | https://github.com/ChickenKorma/Track-Generator | C# (Unity) | none | 2022-10-10 | rejected | Unity, no licence. |
| 13 | https://github.com/DanielWindhede/Exjobb | C# (Unity) | none | 2021-04-03 | rejected | Unity, no licence. |
| 14 | https://github.com/LasseHenrich/racetrack-generation | C# (Unity) | none | 2026-11-03 | rejected | Unity, no licence. |
| 15 | https://github.com/clearpathrobotics/cpr_gazebo (cpr_race_modules) | not inspected | not inspected | not inspected | not examined | Surfaced once in search; a robotics race-module package, not a JS/TS generator by its title; not opened. |

Result: exactly one candidate (row 1) is a JavaScript/TypeScript, permissively licensed, closed-circuit procedural track generator
found by this search. No second generator was selected (no honest second candidate exists in the list above that satisfies all
three requirements). Conclusion limits: one third-party generator, 2020 code, one author.

Attribution: row 1 is (c) 2020 Yann Thorimbert, MIT licence; see docs/external-generators.md.
