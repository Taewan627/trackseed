# E1 at v1.0.0: cross-engine agreement of document digest and contentDigest

Addendum: ../../ADDENDUM-v1.0.0.md. Reference: Node 22. 1000 cases per subject (experiments/e1/cases.mjs). Agreement = cases whose value equals the Node 22 value of the same case id. v1.0.0 = this tree; v0.5.0 = commit 145277e (content-equivalent digest computed by the harness).

| Engine | v1.0.0 digest | mism. | v1.0.0 contentDigest | mism. | v0.5.0 digest | mism. | v0.5.0 content-equivalent | mism. |
|---|---|---|---|---|---|---|---|---|
| Node 22 (reference) | 100.0% | 0 | 100.0% | 0 | 100.0% | 0 | 100.0% | 0 |
| Node 22 (repeat run) | 100.0% | 0 | 100.0% | 0 | 100.0% | 0 | 100.0% | 0 |
| Node 20 | 100.0% | 0 | 100.0% | 0 | 100.0% | 0 | 100.0% | 0 |
| Node 24 | 100.0% | 0 | 100.0% | 0 | 100.0% | 0 | 100.0% | 0 |
| Deno | 100.0% | 0 | 100.0% | 0 | 100.0% | 0 | 100.0% | 0 |
| Bun (JavaScriptCore) | 100.0% | 0 | 100.0% | 0 | 100.0% | 0 | 100.0% | 0 |
| Chrome headless (V8) | 100.0% | 0 | 100.0% | 0 | 100.0% | 0 | 100.0% | 0 |
| Firefox (SpiderMonkey) | 100.0% | 0 | 100.0% | 0 | 100.0% | 0 | 100.0% | 0 |

## Cross-version comparison (same engine, same case id)

| Engine | v1.0.0 contentDigest == v0.5.0 content-equivalent | v1.0.0 digest == v0.5.0 digest |
|---|---|---|
| Node 22 (reference) | 1000 / 1000 | 0 / 1000 |
| Node 22 (repeat run) | 1000 / 1000 | 0 / 1000 |
| Node 20 | 1000 / 1000 | 0 / 1000 |
| Node 24 | 1000 / 1000 | 0 / 1000 |
| Deno | 1000 / 1000 | 0 / 1000 |
| Bun (JavaScriptCore) | 1000 / 1000 | 0 / 1000 |
| Chrome headless (V8) | 1000 / 1000 | 0 / 1000 |
| Firefox (SpiderMonkey) | 1000 / 1000 | 0 / 1000 |

Sanity: v0.5.0 bundle digest equals the digest recorded in the original E1 run (results/node22.v05.json, generator 0.5.0): 1000 / 1000.

## Engine versions

- Node 22 (reference): node v22.23.4 V8 12.4.254.21-node.57
- Node 22 (repeat run): node v22.23.4 V8 12.4.254.21-node.57
- Node 20: node v20.20.2 V8 11.3.244.8-node.38
- Node 24: node v24.22.2 V8 13.6.233.17-node.63
- Deno: deno 2.9.6 V8 15.0.245.2-rusty
- Bun (JavaScriptCore): bun 1.4.4 rev 38afee6c84fcf48c0edb2466aa4b27d287a59c30
- Chrome headless (V8): browser Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/153.0.0.0 Safari/537.36 (chrome 153.0.8010.12 via playwright-core)
- Firefox (SpiderMonkey): browser Mozilla/5.0 (X11; Linux x86_64; rv:157.0) Gecko/20100101 Firefox/157.0 (firefox 157.0 via playwright-core)

## Bundles (SHA-256, built by build.sh, esbuild 0.25, ESM)

- 85caf0c4e06456d48be8b717b76ed309d3721ac2617acb764f3ac721ab7e0dc0  build/v100.mjs
- cbb8c20c2ad5af899125cac3b9675572268aa98dfad6aadc5e4b5820e4c6ef5a  build/v050.mjs

## Checks

- Node 22 (reference): SHA-256 self-test pass; THROW cases v1.0.0 0, v0.5.0 0; recomputed contentDigest differs from embedded in 0 cases; generator 1.0.0 / 0.5.0
- Node 22 (repeat run): SHA-256 self-test pass; THROW cases v1.0.0 0, v0.5.0 0; recomputed contentDigest differs from embedded in 0 cases; generator 1.0.0 / 0.5.0
- Node 20: SHA-256 self-test pass; THROW cases v1.0.0 0, v0.5.0 0; recomputed contentDigest differs from embedded in 0 cases; generator 1.0.0 / 0.5.0
- Node 24: SHA-256 self-test pass; THROW cases v1.0.0 0, v0.5.0 0; recomputed contentDigest differs from embedded in 0 cases; generator 1.0.0 / 0.5.0
- Deno: SHA-256 self-test pass; THROW cases v1.0.0 0, v0.5.0 0; recomputed contentDigest differs from embedded in 0 cases; generator 1.0.0 / 0.5.0
- Bun (JavaScriptCore): SHA-256 self-test pass; THROW cases v1.0.0 0, v0.5.0 0; recomputed contentDigest differs from embedded in 0 cases; generator 1.0.0 / 0.5.0
- Chrome headless (V8): SHA-256 self-test pass; THROW cases v1.0.0 0, v0.5.0 0; recomputed contentDigest differs from embedded in 0 cases; generator 1.0.0 / 0.5.0
- Firefox (SpiderMonkey): SHA-256 self-test pass; THROW cases v1.0.0 0, v0.5.0 0; recomputed contentDigest differs from embedded in 0 cases; generator 1.0.0 / 0.5.0
