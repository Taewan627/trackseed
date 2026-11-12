# E1 at v1.1.0: cross-engine agreement of document digest and contentDigest

Addendum (pre-registration): ../../ADDENDUM-v1.1.0.md. Reference: Node 22. 1000 cases per subject (experiments/e1/cases.mjs). S1 = v1.1.0 default join, S2 = v1.1.0 with autoJoin 'legacy'. Agreement = cases whose value equals the Node 22 value of the same case id.

| Engine | S1 digest | mism. | S1 contentDigest | mism. | S2 digest | mism. | S2 contentDigest | mism. |
|---|---|---|---|---|---|---|---|---|
| Node 22 (reference) | 100.0% | 0 | 100.0% | 0 | 100.0% | 0 | 100.0% | 0 |
| Node 22 (repeat run) | 100.0% | 0 | 100.0% | 0 | 100.0% | 0 | 100.0% | 0 |
| Node 20 | 100.0% | 0 | 100.0% | 0 | 100.0% | 0 | 100.0% | 0 |
| Node 24 | 100.0% | 0 | 100.0% | 0 | 100.0% | 0 | 100.0% | 0 |
| Deno | 100.0% | 0 | 100.0% | 0 | 100.0% | 0 | 100.0% | 0 |
| Bun (JavaScriptCore) | 100.0% | 0 | 100.0% | 0 | 100.0% | 0 | 100.0% | 0 |
| Chrome headless (V8) | 100.0% | 0 | 100.0% | 0 | 100.0% | 0 | 100.0% | 0 |
| Firefox (SpiderMonkey) | 100.0% | 0 | 100.0% | 0 | 100.0% | 0 | 100.0% | 0 |
| WebKit (Playwright build, JavaScriptCore) | 100.0% | 0 | 100.0% | 0 | 100.0% | 0 | 100.0% | 0 |

## Predictions P2 to P4 (per engine, same engine for S1 and S2)

Expected before the run (addendum): S1 and S2 contentDigest differ in 400 cases and are equal in 600.

| Engine | P2 S2 contentDigest == committed v1.0.0 | P2 S2 digest == v1.0.0 digest | P3 S1 != S2 contentDigest | P3 per configuration | P3 differing ids are exactly the expected ids | P4 S1 digest == S2 digest | P4 digest-equal iff content-equal |
|---|---|---|---|---|---|---|---|
| Node 22 (reference) | 1000 / 1000 | 0 / 1000 | 400 / 1000 | auto 200, extreme 200 | yes | 600 / 1000 | 1000 / 1000 |
| Node 22 (repeat run) | 1000 / 1000 | 0 / 1000 | 400 / 1000 | auto 200, extreme 200 | yes | 600 / 1000 | 1000 / 1000 |
| Node 20 | 1000 / 1000 | 0 / 1000 | 400 / 1000 | auto 200, extreme 200 | yes | 600 / 1000 | 1000 / 1000 |
| Node 24 | 1000 / 1000 | 0 / 1000 | 400 / 1000 | auto 200, extreme 200 | yes | 600 / 1000 | 1000 / 1000 |
| Deno | 1000 / 1000 | 0 / 1000 | 400 / 1000 | auto 200, extreme 200 | yes | 600 / 1000 | 1000 / 1000 |
| Bun (JavaScriptCore) | 1000 / 1000 | 0 / 1000 | 400 / 1000 | auto 200, extreme 200 | yes | 600 / 1000 | 1000 / 1000 |
| Chrome headless (V8) | 1000 / 1000 | 0 / 1000 | 400 / 1000 | auto 200, extreme 200 | yes | 600 / 1000 | 1000 / 1000 |
| Firefox (SpiderMonkey) | 1000 / 1000 | 0 / 1000 | 400 / 1000 | auto 200, extreme 200 | yes | 600 / 1000 | 1000 / 1000 |
| WebKit (Playwright build, JavaScriptCore) | 1000 / 1000 | 0 / 1000 | 400 / 1000 | auto 200, extreme 200 | yes | 600 / 1000 | 1000 / 1000 |

## Engine versions

- Node 22 (reference): node v22.23.4 V8 12.4.254.21-node.57
- Node 22 (repeat run): node v22.23.4 V8 12.4.254.21-node.57
- Node 20: node v20.20.2 V8 11.3.244.8-node.38
- Node 24: node v24.22.2 V8 13.6.233.17-node.63
- Deno: deno 2.9.6 V8 15.0.245.2-rusty
- Bun (JavaScriptCore): bun 1.4.4 rev 38afee6c84fcf48c0edb2466aa4b27d287a59c30
- Chrome headless (V8): browser Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/153.0.0.0 Safari/537.36 (chrome 153.0.8010.12 via playwright-core)
- Firefox (SpiderMonkey): browser Mozilla/5.0 (X11; Linux x86_64; rv:157.0) Gecko/20100101 Firefox/157.0 (firefox 157.0 via playwright-core)
- WebKit (Playwright build, JavaScriptCore): browser Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.2 Safari/605.1.15 (webkit 27.2 via playwright-core)

## Bundles (SHA-256, built by build.sh, esbuild 0.25, ESM)

- 907dd67459fc15d4a1db16b04631bab6492728fcbcec1ece9618ef7676f95988  build/s1.mjs
- 7af08ac34997ac29cb1ce05c3188f7dffa9027ccb19c7e9fe7945d15c99c9560  build/s2.mjs

## Checks (P5)

- Node 22 (reference): SHA-256 self-test pass; THROW cases S1 0, S2 0; recomputed contentDigest differs from embedded in S1 0, S2 0 cases; generator 1.1.0 / 1.1.0
- Node 22 (repeat run): SHA-256 self-test pass; THROW cases S1 0, S2 0; recomputed contentDigest differs from embedded in S1 0, S2 0 cases; generator 1.1.0 / 1.1.0
- Node 20: SHA-256 self-test pass; THROW cases S1 0, S2 0; recomputed contentDigest differs from embedded in S1 0, S2 0 cases; generator 1.1.0 / 1.1.0
- Node 24: SHA-256 self-test pass; THROW cases S1 0, S2 0; recomputed contentDigest differs from embedded in S1 0, S2 0 cases; generator 1.1.0 / 1.1.0
- Deno: SHA-256 self-test pass; THROW cases S1 0, S2 0; recomputed contentDigest differs from embedded in S1 0, S2 0 cases; generator 1.1.0 / 1.1.0
- Bun (JavaScriptCore): SHA-256 self-test pass; THROW cases S1 0, S2 0; recomputed contentDigest differs from embedded in S1 0, S2 0 cases; generator 1.1.0 / 1.1.0
- Chrome headless (V8): SHA-256 self-test pass; THROW cases S1 0, S2 0; recomputed contentDigest differs from embedded in S1 0, S2 0 cases; generator 1.1.0 / 1.1.0
- Firefox (SpiderMonkey): SHA-256 self-test pass; THROW cases S1 0, S2 0; recomputed contentDigest differs from embedded in S1 0, S2 0 cases; generator 1.1.0 / 1.1.0
- WebKit (Playwright build, JavaScriptCore): SHA-256 self-test pass; THROW cases S1 0, S2 0; recomputed contentDigest differs from embedded in S1 0, S2 0 cases; generator 1.1.0 / 1.1.0
