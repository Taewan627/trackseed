# E1 summary: cross-engine agreement

Reference: Node 22. Cases per subject: 1000 (200 seeds x 5 configurations, see PROTOCOL.md). Agreement = cases whose digest equals the Node 22 digest for the same case id.

| Engine | v0.5 agreement | v0.5 mismatches | legacy v0.4 agreement | legacy v0.4 mismatches |
|---|---|---|---|---|
| Node 22 (reference) | 100.0% | 0 | 100.0% | 0 |
| Node 22 (repeat run) | 100.0% | 0 | 100.0% | 0 |
| Node 20 | 100.0% | 0 | 100.0% | 0 |
| Node 24 | 100.0% | 0 | 48.7% | 513 |
| Deno | 100.0% | 0 | 0.0% | 1000 |
| Bun (JavaScriptCore) | 100.0% | 0 | 0.0% | 1000 |
| Chrome headless (V8) | 100.0% | 0 | 0.0% | 1000 |
| Firefox (SpiderMonkey) | 100.0% | 0 | 0.0% | 1000 |

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

- 2df5079cf7caa92b8f44fc6fbd158adb9a72cea059f909c7430f6ea408fd4ddb  build/v05.mjs
- b2baf31904ee8bfceb556d7c921ebda30e96049886760d7537bd6b90c0013b8c  build/legacy.mjs

## Checks

- Node 22 (reference): SHA-256 self-test pass; cases producing THROW: v0.5 0, legacy 0; generator 0.5.0 / 0.4-legacy@6fea4d6
- Node 22 (repeat run): SHA-256 self-test pass; cases producing THROW: v0.5 0, legacy 0; generator 0.5.0 / 0.4-legacy@6fea4d6
- Node 20: SHA-256 self-test pass; cases producing THROW: v0.5 0, legacy 0; generator 0.5.0 / 0.4-legacy@6fea4d6
- Node 24: SHA-256 self-test pass; cases producing THROW: v0.5 0, legacy 0; generator 0.5.0 / 0.4-legacy@6fea4d6
- Deno: SHA-256 self-test pass; cases producing THROW: v0.5 0, legacy 0; generator 0.5.0 / 0.4-legacy@6fea4d6
- Bun (JavaScriptCore): SHA-256 self-test pass; cases producing THROW: v0.5 0, legacy 0; generator 0.5.0 / 0.4-legacy@6fea4d6
- Chrome headless (V8): SHA-256 self-test pass; cases producing THROW: v0.5 0, legacy 0; generator 0.5.0 / 0.4-legacy@6fea4d6
- Firefox (SpiderMonkey): SHA-256 self-test pass; cases producing THROW: v0.5 0, legacy 0; generator 0.5.0 / 0.4-legacy@6fea4d6

## First mismatching case ids (up to 10 per subject)

- Node 24 legacy: right-angle:0, right-angle:1, right-angle:2, right-angle:3, right-angle:7, right-angle:42, right-angle:100, right-angle:1234, right-angle:12345, right-angle:65535
- Deno legacy: auto:0, auto:1, auto:2, auto:3, auto:7, auto:42, auto:100, auto:1234, auto:12345, auto:65535
- Bun (JavaScriptCore) legacy: auto:0, auto:1, auto:2, auto:3, auto:7, auto:42, auto:100, auto:1234, auto:12345, auto:65535
- Chrome headless (V8) legacy: auto:0, auto:1, auto:2, auto:3, auto:7, auto:42, auto:100, auto:1234, auto:12345, auto:65535
- Firefox (SpiderMonkey) legacy: auto:0, auto:1, auto:2, auto:3, auto:7, auto:42, auto:100, auto:1234, auto:12345, auto:65535
