# E1 at v1.2.0: cross-engine agreement of document digest and contentDigest

Addendum (pre-registration): ../../ADDENDUM-v1.2.0.md. Reference: Node 22. 1000 cases per subject (experiments/e1/cases.mjs). S1 = v1.2.0 default join, S2 = v1.2.0 with autoJoin 'legacy'. Agreement = cases whose value equals the Node 22 value of the same case id.

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

## Predictions P2 to P4 (per engine)

Expected before the run (addendum): every count below is 1000 / 1000 except the three digest columns of P4, which are 0 / 1000. Comparison files: committed results of v1.1.0 (S1, S2, Node 22) and v1.0.0 (v100, Node 22).

| Engine | P2 S1 contentDigest == v1.1.0 S1 | P2 S2 contentDigest == v1.1.0 S2 | P3 S2 contentDigest == v1.0.0 | P4 S1 digest == v1.1.0 S1 (expect 0) | P4 S2 digest == v1.1.0 S2 (expect 0) | P4 S2 digest == v1.0.0 (expect 0) |
|---|---|---|---|---|---|---|
| Node 22 (reference) | 1000 / 1000 | 1000 / 1000 | 1000 / 1000 | 0 / 1000 | 0 / 1000 | 0 / 1000 |
| Node 22 (repeat run) | 1000 / 1000 | 1000 / 1000 | 1000 / 1000 | 0 / 1000 | 0 / 1000 | 0 / 1000 |
| Node 20 | 1000 / 1000 | 1000 / 1000 | 1000 / 1000 | 0 / 1000 | 0 / 1000 | 0 / 1000 |
| Node 24 | 1000 / 1000 | 1000 / 1000 | 1000 / 1000 | 0 / 1000 | 0 / 1000 | 0 / 1000 |
| Deno | 1000 / 1000 | 1000 / 1000 | 1000 / 1000 | 0 / 1000 | 0 / 1000 | 0 / 1000 |
| Bun (JavaScriptCore) | 1000 / 1000 | 1000 / 1000 | 1000 / 1000 | 0 / 1000 | 0 / 1000 | 0 / 1000 |
| Chrome headless (V8) | 1000 / 1000 | 1000 / 1000 | 1000 / 1000 | 0 / 1000 | 0 / 1000 | 0 / 1000 |
| Firefox (SpiderMonkey) | 1000 / 1000 | 1000 / 1000 | 1000 / 1000 | 0 / 1000 | 0 / 1000 | 0 / 1000 |
| WebKit (Playwright build, JavaScriptCore) | 1000 / 1000 | 1000 / 1000 | 1000 / 1000 | 0 / 1000 | 0 / 1000 | 0 / 1000 |

## Consequence of P2: S1 against S2 contentDigest (expected 400 differ, 600 equal)

| Engine | S1 != S2 contentDigest | per configuration | differing ids are exactly the expected ids |
|---|---|---|---|
| Node 22 (reference) | 400 / 1000 | auto 200, extreme 200 | yes |
| Node 22 (repeat run) | 400 / 1000 | auto 200, extreme 200 | yes |
| Node 20 | 400 / 1000 | auto 200, extreme 200 | yes |
| Node 24 | 400 / 1000 | auto 200, extreme 200 | yes |
| Deno | 400 / 1000 | auto 200, extreme 200 | yes |
| Bun (JavaScriptCore) | 400 / 1000 | auto 200, extreme 200 | yes |
| Chrome headless (V8) | 400 / 1000 | auto 200, extreme 200 | yes |
| Firefox (SpiderMonkey) | 400 / 1000 | auto 200, extreme 200 | yes |
| WebKit (Playwright build, JavaScriptCore) | 400 / 1000 | auto 200, extreme 200 | yes |

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

- 86daefb6584e1e61d62eb5394e2bfff81ff99e0b2f6e7db4c169fc38e1b14e19  build/s1.mjs
- 5f63662933ae09cb84efc4e460853ae9e2d52e32c3e755c53c25d556ec23072e  build/s2.mjs

## Checks (P5)

- Node 22 (reference): SHA-256 self-test pass; THROW cases S1 0, S2 0; recomputed contentDigest differs from embedded in S1 0, S2 0 cases; generator (VERSION) 1.2.0 / 1.2.0; stamps read from the documents S1 ["1.2.0"], S2 ["1.2.0"]
- Node 22 (repeat run): SHA-256 self-test pass; THROW cases S1 0, S2 0; recomputed contentDigest differs from embedded in S1 0, S2 0 cases; generator (VERSION) 1.2.0 / 1.2.0; stamps read from the documents S1 ["1.2.0"], S2 ["1.2.0"]
- Node 20: SHA-256 self-test pass; THROW cases S1 0, S2 0; recomputed contentDigest differs from embedded in S1 0, S2 0 cases; generator (VERSION) 1.2.0 / 1.2.0; stamps read from the documents S1 ["1.2.0"], S2 ["1.2.0"]
- Node 24: SHA-256 self-test pass; THROW cases S1 0, S2 0; recomputed contentDigest differs from embedded in S1 0, S2 0 cases; generator (VERSION) 1.2.0 / 1.2.0; stamps read from the documents S1 ["1.2.0"], S2 ["1.2.0"]
- Deno: SHA-256 self-test pass; THROW cases S1 0, S2 0; recomputed contentDigest differs from embedded in S1 0, S2 0 cases; generator (VERSION) 1.2.0 / 1.2.0; stamps read from the documents S1 ["1.2.0"], S2 ["1.2.0"]
- Bun (JavaScriptCore): SHA-256 self-test pass; THROW cases S1 0, S2 0; recomputed contentDigest differs from embedded in S1 0, S2 0 cases; generator (VERSION) 1.2.0 / 1.2.0; stamps read from the documents S1 ["1.2.0"], S2 ["1.2.0"]
- Chrome headless (V8): SHA-256 self-test pass; THROW cases S1 0, S2 0; recomputed contentDigest differs from embedded in S1 0, S2 0 cases; generator (VERSION) 1.2.0 / 1.2.0; stamps read from the documents S1 ["1.2.0"], S2 ["1.2.0"]
- Firefox (SpiderMonkey): SHA-256 self-test pass; THROW cases S1 0, S2 0; recomputed contentDigest differs from embedded in S1 0, S2 0 cases; generator (VERSION) 1.2.0 / 1.2.0; stamps read from the documents S1 ["1.2.0"], S2 ["1.2.0"]
- WebKit (Playwright build, JavaScriptCore): SHA-256 self-test pass; THROW cases S1 0, S2 0; recomputed contentDigest differs from embedded in S1 0, S2 0 cases; generator (VERSION) 1.2.0 / 1.2.0; stamps read from the documents S1 ["1.2.0"], S2 ["1.2.0"]
