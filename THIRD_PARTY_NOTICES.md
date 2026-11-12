# Third-party notices

TrackLab is released under the licence in `LICENSE` (the same text is in `Licence.txt`). This file lists third-party code and packages used by the project and the notices they require.

## 1. fdlibm / FreeBSD msun (Sun Microsystems, Inc.)

Sources checked for the notice text:

- https://netlib.org/fdlibm/k_sin.c (the notice below is copied byte-for-byte from this file; the same block appears in https://netlib.org/fdlibm/e_sqrt.c)
- https://github.com/freebsd/freebsd-src/blob/main/lib/msun/src/k_sin.c (the same notice text)

Notice, verbatim:

```
/*
 * ====================================================
 * Copyright (C) 1993 by Sun Microsystems, Inc. All rights reserved.
 *
 * Developed at SunSoft, a Sun Microsystems, Inc. business.
 * Permission to use, copy, modify, and distribute this
 * software is freely granted, provided that this notice 
 * is preserved.
 * ====================================================
 */
```

The notice is preserved verbatim in the header comment of `src/detmath.ts`.

Parts of `src/detmath.ts` that derive from fdlibm:

- `sinKernel`: the coefficients S1 to S6 and the polynomial of `__kernel_sin` (k_sin.c).
- `cosKernel`: the coefficients C1 to C6 of `__kernel_cos` (k_cos.c). The polynomial is evaluated in a rearranged form (no qx split), so its results are not bit-identical to fdlibm's `__kernel_cos`.
- `datan`: the ATAN_HI, ATAN_LO and AT coefficients, and the four-interval argument reduction of `s_atan.c`.
- `dexp`: the ln 2 split constants, 1/ln 2, the coefficients E1 to E5, and the reduction and final formula of `e_exp.c`.

Project code, not taken from fdlibm: the argument reduction `reduce` (Cody-Waite with pi/2 pieces generated for this project, not fdlibm's `__ieee754_rem_pio2`), the quadrant dispatch in `dsin` and `dcos`, `datan2`, `dhypot`, and the 2^k scaling `pow2` used by `dexp`.

## 2. three.js (MIT)

- Package: `three`, version 0.187.0 (`dependencies` in `package.json`).
- Use: runtime dependency of the web UI (`src/view.ts` imports it). The CLI does not use it.
- Licence: MIT. Copyright (c) 2010-2026 three.js authors. Text as shipped in `node_modules/three/LICENSE`:

```
The MIT License

Copyright © 2010-2026 three.js authors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

## 3. Development tooling

These are build and test tools listed in `devDependencies`. They are not runtime dependencies of the CLI or the web UI.

- `vite` 8.3.5: MIT. Copyright (c) 2019-present, VoidZero Inc. and Vite contributors. Licence file: `node_modules/vite/LICENSE.md`.
- `typescript` 5.9.3: Apache License 2.0. Licence file: `node_modules/typescript/LICENSE.txt`.
- `@playwright/test` 1.64.1: Apache License 2.0. Licence file: `node_modules/@playwright/test/LICENSE`.

The full text of the Apache License 2.0 is in the licence files named above.

## 4. Third-party data and generators used by experiments (not distributed)

Experiment E9 (`experiments/e9/`) applies the polyline input path to tracks that were not created by TrackLab/TrackSeed. The sources below are fetched at run time into the gitignored `experiments/e9/build/` at the pinned commits (`experiments/e9/fetch.sh`). **No third-party code and no third-party data (not even derived polylines) is committed or distributed in this repository**; the notices are given for credit and so that the licence terms are visible. Licence texts are in the fetched repositories (file names and SHA-256 in `experiments/e9/dryrun/THIRD_PARTY.txt`). Details, decisions and the rejected candidates: `experiments/e9/CANDIDATES.md`, `experiments/e9/ATTRIBUTION.md`.

- TUMFTM/racetrack-database (commit `e59595d1f3573b30d1ded6a08984935b957688e0`): LGPL-3.0 (licence file without copyright line; Technical University of Munich, Chair of Automotive Technology). Centre lines are derived from OpenStreetMap, (c) OpenStreetMap contributors, ODbL 1.0.
- bacinger/f1-circuits (commit `8094e957b8d6aa8b9f4510c93968556cccd30e02`): MIT, Copyright (c) 2019-2025 Tomislav Bacinger.
- juangallostra/procedural-tracks (commit `8e22e36b2d0b15209eb165371faf1e2870b8834b`): MIT, Copyright (c) 2020 Juan Gallostra Acín.
- AMZ-Racing/random-track-generator (commit `b9e42a7845911c055d14997073fb3c49dcf54732`): MIT, Copyright (c) 2024 Mees van Löben Sels.
- Farama-Foundation/Gymnasium, tag v1.4.0 (commit `8ba8c3a63bb4e000b7f33923f43d292acac07be1`): MIT, Copyright (c) 2016 OpenAI, Copyright (c) 2022 Farama Foundation.
- alexnieves-cs/drift-school (commit `f4c61cf7ffb746a105d90c7f0cae665dc53ae765`): MIT, Copyright (c) 2026 Alex Nieves.
- zzangupenn/track_gen (commit `e5ea23d2de72969c8c02491738275f0a31e97b6b`): MIT, Copyright (c) 2020 Joseph Auckley, Matthew O'Kelly, Aman Sinha, Hongrui Zheng, Zirui Zang.
