# TrackLab Lite v0.4

Processing 트랙 생성기를 Vite + TypeScript + Three.js로 옮긴 로컬 웹 프로토타입입니다. React, 서버, 데이터베이스, 물리엔진, LLM/API 연결, 외부 모델·텍스처를 사용하지 않습니다. 모든 트랙·차량·배경은 브라우저 안에서 기본 도형으로 생성합니다.

## 실행

Node.js 20.19+ 또는 22.12+가 필요합니다. 이 폴더에서 실행합니다.

```powershell
cd D:\phd\_project\nexkathon\tracklab-lite
npm install
npm run dev
```

터미널에 표시되는 로컬 주소(기본 `http://127.0.0.1:5173`)를 엽니다. 왼쪽 패널은 공간이 부족하면 스크롤됩니다. 슬라이더·숫자·Seed·배경 종류를 변경하면 마지막 입력 후 150ms에 자동 반영됩니다. Overview와 Drive 모두 동일하며 값 표시는 즉시 바뀝니다. **Generate track**은 수동 재생성용으로 유지합니다. 같은 Seed와 파라미터는 동일한 결과를 재현합니다. 모든 재생성은 차량을 검증된 아스팔트 시작 위치에 놓고 속도를 0으로 초기화하며 상태 표시줄로 알립니다. 빈 숫자 입력은 완성될 때까지 적용을 보류합니다.

| 조작 | 동작 |
| --- | --- |
| ↑ | 가속 |
| ↓ | 감속 후 후진 |
| ← / → | 차량 방향 조향, 후진 시 조향 반전 |
| Space | 브레이크 |
| C | 전체 트랙 / 차량 후방 추적 카메라 |
| R / Seed 옆 ⤨ | 현재 패널 설정을 새 Seed로 생성 |
| 마우스 드래그 / 휠 / 우클릭 드래그 | 전체 트랙 카메라 회전 / 확대 / 이동 |

입력 필드와 버튼에 포커스가 있으면 주행 단축키가 작동하지 않습니다. **3D 화면을 클릭해 운전을 시작하세요.** 포커스가 입력 필드나 다른 창으로 이동하면 눌린 주행 키를 해제합니다. 속도는 수평 월드 좌표의 `u/s`이며 실제 km/h로 환산하지 않습니다.

## 구현 범위

- P0: Seed 기반 Waypoint, 직선/원본 Catmull–Rom 혼합, 기본 모드 구간당 60샘플, X/Z와 높이가 연결된 폐곡선, 실제 도로 폭을 반영한 자동 스케일 미니맵.
- P1: 월드 좌표 위치·방향·속도, 시간 기반 가속·마찰·제동·후진, 속도별 조향, 고저차와 차량 피치, 관찰/후방 카메라.
- P2: 어두운 아스팔트 / 밝은 낮은 연석 / 보도. 차량은 아스팔트 안에서만 주행합니다. 메시와 공유하는 양쪽 경계, 경사에서 기울어진 차체까지 포함하는 7.2u 보수적 반경, 바깥 방향 속도 제거와 접선 방향 벽 슬라이딩, 120Hz 이동 분할, 실제 위치 기반 장애물 충돌을 사용합니다. 연석과 보도는 배경입니다.
- P3: 기본 도형을 InstancedMesh로 묶은 나무·벤치·가로등·건물. Nature/City/Mixed, 밀도 0 지원, 시작점과 전체 도로를 검사해 배치.
- P4: 범위 검사, 키 포커스·창 크기 대응, 반복 생성 시 GPU 자원 해제, 단위/브라우저 테스트, 정적 빌드.
- 미니맵: 패널 배경은 45% 불투명도이며, 트랙·차량·방향·텍스트는 선명하게 유지합니다. Overview/Drive 모두 뒤의 3D 화면이 비칩니다.
- 코인: Seed로 재현 가능한 황금색 3D 코인 10개를 아스팔트 위에 배치합니다. 시작점·실제 차량 배치 위치·장애물을 피하며 접근하면 한 번만 획득합니다. HUD의 `COINS 0 / 10`이 즉시 갱신되고, 모두 획득하면 완료 메시지를 표시합니다. 수동/자동 재생성은 코인과 카운터를 함께 초기화합니다.
- 특수 코너: `Corner Pattern`에서 Auto / 90° / Hairpin / S-Curve, 0–3개, 강도 20–100%를 선택합니다. Auto 또는 0개는 기존 도로 좌표를 그대로 유지합니다. 선택된 패턴은 독립 곡선으로 삽입하고 실제 방향/곡률을 검사합니다. 결과는 왼쪽 패널에 표시합니다.
- JSON 입출력: 패널의 `Export JSON`은 현재 트랙을 Exchange format v1 문서(`serializeTrack`)로 `tracklab-<seed>-<digest 앞 8자>.json`이라는 이름으로 내려받습니다. `Import JSON`은 파일을 `parseTrackDocument`로 검사하고 `importTrack(doc, {verify:'regenerate'})`로 문서의 파라미터에서 재생성한 결과가 문서 digest와 같은지 확인한 뒤, 패널 값을 문서의 `params`로 바꾸어 기존 생성 경로로 트랙·미니맵·코인·차량을 다시 만듭니다. 형식·digest·재생성 검증에 실패하면 상태 표시줄과 패널에 오류를 보이고 이전 트랙을 유지합니다.
- Validation: 매 (재생성) 후 `validateTrack` 결과를 패널에 표시합니다. OK/INVALID 배지, 검사별 통과/실패 개수, 처음 5건의 위반(코드·메시지)을 보이며 경고는 오류와 다른 색(점선 테두리)으로 구분합니다. 이 표시는 검증 결과를 보고만 하며 트랙을 수정하거나 생성을 막지 않습니다. 기본 Seed 42 Auto 트랙은 알려진 오른쪽 경계 자기교차·경계 접힘 때문에 INVALID로 표시됩니다.

### 파라미터

| 값 | 범위 | 기본값 |
| --- | --- | --- |
| Waypoint 구간 수 | 3–10 | 6 |
| 직선 비율 | 0–0.6 | 0.25 |
| 도로 전체 폭 | 20–80u | 40u |
| 전체 크기 | 1 / 2 / 3 | 2 |
| 고저차 진폭 | 0–200u | 80u |
| 장애물 | 0–8개 | 3 |
| 배경 밀도 | 0–20 | 10 |
| 배경 종류 | Nature / City / Mixed | Mixed |
| Random Seed | 0–2147483647 정수 | 42 |
| Corner Pattern | Auto / 90° / Hairpin / S-Curve | Auto |
| 코너 개수 | 0–3 | 1 |
| 코너 강도 | 20–100% | 60% |

구간 수는 원본의 `numCurves`와 같습니다. 그중 `round(비율 × 구간 수)`개가 직선으로 선택됩니다. 따라서 표시된 비율은 구간 개수 기준이며 실제 도로 길이의 비율과는 다릅니다. 밀도는 배치 시도 수(`밀도 × 8`)를 정하며, 도로/시작점과 겹치는 후보는 생략합니다. 고저차 입력은 진폭이고, 아래 ELEVATION RANGE는 생성된 실제 최고점−최저점입니다.

특수 패턴 모드는 원본 Catmull–Rom/직선 중심선을 바탕으로 접합부를 완화하고, 곡선·접선 연결부를 삽입한 뒤 약 8u 간격으로 다시 샘플링합니다. 강도는 목표각 대신 회전 반경과 S자 변위를 조절합니다. 도로·연석·보도 폭에 맞춰 최대 6회 시도하며, 필요한 경우 트랙 공간을 1.00–3.25배로 넓힙니다. 실제 확대 배수와 적용 개수, 측정 각도/곡률 반전이 패널에 표시됩니다. 검사에 실패하면 **이전 트랙과 코인 상태를 유지하고 경고**하며, 정상 트랙으로 조용히 대체하지 않습니다. 개수/폭을 줄이거나 Auto를 선택해 복구할 수 있습니다.

## 빌드와 테스트

```powershell
npm run build
npm test
npx playwright install chromium
npm run test:browser
npm run preview
```

- `build`: 엄격한 TypeScript 검사와 Vite 정적 번들 생성 → `dist/`.
- `test`: Node 내장 테스트 러너로 핵심 생성·직접 주행·충돌 수학 검증.
- `test:browser`: 현재 소스를 빌드한 뒤 로컬 개발/preview 서버를 자동으로 띄우고 Playwright Chromium에서 실제 렌더링·폼·키보드 입력·리사이즈·반복 생성 검증. 테스트용 Chromium만 최초 설치합니다.
- `test-results/`: 브라우저 스크린샷. 실패 시 trace도 저장합니다. `?test=1` 개발 서버에서만 진단 데이터를 노출하며 프로덕션 번들에서는 제거됩니다.

v0.4의 적용 성공률과 최신 검증은 [V04_REPORT.md](V04_REPORT.md)를 참고하세요. 핵심 로직 37개와 브라우저 35개를 검사합니다. 기존 55개 테스트 파일은 보존하고, 패턴 검사 17개와 안정 버전 형상 해시를 추가했습니다. [COINS_REPORT.md](COINS_REPORT.md), [V03_REPORT.md](V03_REPORT.md), [TEST_REPORT.md](TEST_REPORT.md), [DRIVING_QUALITY_REPORT.md](DRIVING_QUALITY_REPORT.md)는 이전 변경 기록입니다. 브라우저 테스트는 소프트웨어 WebGL로 진행하므로 실제 데스크톱 GPU FPS나 Firefox/Safari 호환성을 입증하는 성능 시험은 아닙니다.

### Exchange format (v1)

`src/schema.ts`의 `exportTrack(track)`은 트랙 전체를 `tracklab.track` 스키마 v1 JSON 문서로 내보내고, `serializeTrack(track)`은 이를 정렬 키·공백 없는 정규(canonical) JSON 문자열로 만듭니다. 문서 필드는 다음과 같습니다.

| 필드 | 내용 |
| --- | --- |
| `schema`, `schemaVersion` | 항상 `"tracklab.track"`, `1` |
| `generator` | `{ name: "tracklab", version }` (`src/version.ts`, `package.json`과 동일) |
| `params` | `sanitize()`를 거친 `Params` (범위를 벗어나거나 정규화되지 않은 값은 거부) |
| `geometry` | `points`, `normals`, `roadEdges`, `straightSegments`, `length`, `bounds` |
| `props`, `obstacles`, `coins` | 소품, 장애물, 코인 10개 |
| `patternReport` | 특수 코너 적용·검증 결과 |
| `integrity` | `{ algorithm: "sha256", canonical: "sorted-keys-json", digest }` — `digest`는 `integrity`를 제외한 문서를 `canonicalStringify`한 문자열의 SHA-256(순수 TS 구현, 브라우저에서도 동작) |

`parseTrackDocument(json)`은 구조를 검증하고(스키마·버전·필수 필드·유한 수·digest 불일치) 위반 시 경로가 포함된 메시지(`$.geometry.points[7].x: ...`)의 `TrackDocumentError`를 던집니다. `importTrack(doc, { verify })`는 두 가지 검증 모드를 제공합니다.

- `'digest'`(기본): 구조와 SHA-256 무결성만 확인합니다. 우연한 손상과 단순 변조를 잡지만, digest를 다시 계산해 넣은 위조는 통과합니다.
- `'regenerate'`: 위 검사에 더해 `generateTrack(doc.params)`로 트랙을 다시 생성해 digest가 동일한지 확인합니다. 파라미터가 저장된 형상을 완전히 결정함을 증명하며, 재계산된 위조도 잡아냅니다.

설계 목표: 생성 경로(`core.ts`, `patterns.ts`, `coins.ts`)는 엔진마다 결과가 다를 수 있는 `Math.sin/cos/atan2/hypot/exp` 대신 `src/detmath.ts`의 결정적 구현만 사용하고(IEEE-754 기본 연산과 정확 반올림 `Math.sqrt`만 의존; 이 가정은 명세가 아닌 주요 엔진의 공통 동작입니다), 같은 시드가 JavaScript 엔진·OS와 무관하게 비트 단위로 같은 문서와 digest를 만들도록 설계했습니다. 현재 검증 증거는 Node 22(Linux)에서의 실행뿐이며, 엔진·OS 간 일치 여부는 계획된 결정성 실험(E1)에서 검증할 예정이고 아직 검증되지 않았습니다. 또한 `src/vehicle.ts`의 주행 런타임은 여전히 `Math.*`를 사용하므로 이 결정성 보장의 범위에 포함되지 않습니다.

## Headless usage

TrackLab can be used without a browser: a validator (`src/validate.ts`), geometric metrics (`src/metrics.ts`) and a command line (`src/cli.ts`, Node >= 20, no DOM). None of them change generation output.

```bash
npm ci
npm run build:cli                      # tsc -p tsconfig.cli.json -> cli-dist/
node cli-dist/cli.js --help            # also: generate|batch|validate|metrics --help
node cli-dist/cli.js generate --seed 7 --set curves=8 --set cornerPattern=hairpin --out track.json
node cli-dist/cli.js validate track.json --verify regenerate    # exit 0 ok / 1 violations / 2 invalid document
node cli-dist/cli.js metrics track.json
node cli-dist/cli.js batch --grid examples/grid-small.json --out out/ --jsonl out/summary.jsonl
```

`package.json` declares `"bin": {"tracklab": "cli-dist/cli.js"}`; `cli-dist/` is a build artifact and is git-ignored. `npm test` runs `build:cli` first because `tests/cli.test.ts` spawns the compiled CLI.

Commands:

| Command | Behaviour | Exit codes |
| --- | --- | --- |
| `generate [--seed N] [--params file.json \| --set key=value ...] [--out file.json]` | Canonical `TrackDocumentV1` (see "Exchange format") to `--out` or stdout. Unknown keys and out-of-range values are rejected, not clamped. | 0 ok, 1 generator rejected the parameters, 2 usage error |
| `batch --grid grid.json --out dir/ [--jsonl summary.jsonl] [--no-timing]` | One document per case plus one JSONL summary line per case (below). | 0 completed, 2 invalid grid or usage |
| `validate file.json [--verify digest\|regenerate] [--limit key=value ...] [--strict]` | Parses the document (schema, digest, optional regeneration), runs the validator, prints the report as JSON. | 0 no error-severity violation, 1 at least one (`--strict`: warnings too), 2 invalid document |
| `metrics file.json [--samples]` | Metrics as JSON (`--samples` adds the per-sample curvature array). | 0, or 2 invalid document |

Grid file (`examples/grid-small.json` expands to 48 cases, including the three corner-pattern modes):

```json
{ "seeds":  { "from": 1, "to": 6 },
  "params": { "cornerPattern": ["auto", "right-angle", "hairpin", "s-curve"], "straight": [0, 0.3], "obstacles": 3 } }
```

Array-valued parameters are swept (Cartesian product, parameter names sorted alphabetically, first name slowest, seeds innermost in ascending order); scalars are fixed. `seeds` may also be an array. Case `k` is written to `case-<k, 4+ digits>-seed<seed>.json`. A case whose generation throws (for example a corner pattern that cannot be fitted) is recorded with `"generated": false` and the error message and does not stop the batch.

JSONL line fields. Deterministic: `case`, `file`, `seed`, `params` (sanitized), `generated`, `digest` (document SHA-256), `ok`, `violationCodes` (sorted unique codes), `checkFailures` (complete failure count per failing check), `metrics` (all metrics except the per-sample array), `error`. Non-deterministic wall-clock data appears only under `timing.generation_ms` (time of the `generateTrack()` call, `performance.now()`); `--no-timing` omits it so that two runs give byte-identical JSONL.

### Validator

`validateTrack(track, options?) => { ok, violations, checks }` is pure and takes anything with `params.width`, `points` and `roadEdges` (a `Track` or an imported document). It reports problems on every generation mode and never repairs them; in particular Auto mode runs no geometry audit at generation time, and the validator reports the overlaps at sharp straight/curve joins that the "알려진 한계와 다음 단계" section below admits. `ok` is false iff a check of severity `error` failed or was skipped. Every check appears in `checks` with `passed`, `skipped`, `checked` (items examined), `failures` (complete count) and `stats` (observed extremes). `violations` lists at most `maxViolationsPerCheck` entries per code.

| Check (`checks[].id`) | Codes | Severity | Definition and default limit |
| --- | --- | --- | --- |
| `structure` | `STRUCTURE` | error | at least 4 points; both `roadEdges` have one entry per point |
| `finite` | `NON_FINITE` | error | every x/y/z of points and both edges, and `params.width`, is finite; if it fails, all later checks are `skipped` |
| `closure` | `CLOSURE_POSITION`, `CLOSURE_EDGE`, `CLOSURE_HEIGHT`, `CLOSURE_TANGENT` | error | last point equals first within `closureTolerance` = 1e-6 (3D; also each edge); \|y_last - y_first\| <= `heightTolerance` = 1e-6; `CLOSURE_TANGENT` (v0.5.1, seam-continuity outlier test): with theta0 the heading change (x/z, degrees) between the segment entering and the segment leaving the seam and theta_i the per-vertex heading changes of the 3 vertices on each side of the seam, the check fails iff theta0 > max(`tangentToleranceDegrees` = 5, `seamRatio` = 2 x max theta_i). Rationale: a closure defect is a seam that turns markedly more than its own neighbourhood; the absolute 5 degree limit of v0.5.0 alone conflated sampling resolution (turning per vertex on a tight curve) with a discontinuity and flagged ordinary pattern-mode tracks. `stats` reports `tangentDegrees` (theta0), `neighbourhoodMaxDegrees` and `tangentRatio`. Option `closureTangentMode: 'absolute'` restores the v0.5.0 rule (theta0 > `tangentToleranceDegrees`); it is a library option only, because the CLI `--limit` accepts numbers only |
| `self-intersection` | `SELF_INTERSECTION_CENTERLINE`, `SELF_INTERSECTION_EDGE`, `EDGE_EDGE_INTERSECTION` | error | planar (x/z) segment intersection, found with a spatial hash, of the centerline with itself, of each road edge with itself, and of the left edge with the right edge; segments sharing a vertex are skipped, touching counts as intersecting. A grade-separated crossing is therefore reported too. `index`/`value` are the two segment indices |
| `edge-fold` | `EDGE_FOLD` | error | the two ribbon triangles of every segment (the triangles used for the asphalt mesh) must have x/z cross product > `foldEpsilon` = 1e-5; otherwise the ribbon is flipped or degenerate there (inner edge crossing itself) |
| `min-turn-radius` | `MIN_TURN_RADIUS` | warning | local radius 1/\|kappa\| (kappa as defined below) < `minRadiusToHalfWidth` x width/2, default factor 1 |
| `max-slope` | `MAX_SLOPE` | warning | \|dy\| / planar run of a segment > `maxSlope` = 0.3 (rise over run, about 16.7 degrees). This default is a convention of this tool, not a standard |

Defaults are exported as `DEFAULT_VALIDATE_OPTIONS`; on the CLI use `--limit key=value` (numeric limits). Version 0.5.1 changes only the validator (and the `generator.version` stamp, hence the digest, of exported documents); generation output is unchanged and the golden-v05 hashes still hold. See experiments/AMENDMENT-01.md.

### Metrics

`computeMetrics(track, options?) => TrackMetrics` takes the centerline in TrackLab convention (closed, last point repeats the first). All fields are geometric; none rates fun or difficulty. Curvature is the discrete Menger curvature of the x/z projection at sample `i` from its neighbours `a`, `b`, `c`: `kappa = 2 cross(b - a, c - b) / (|b - a| |c - b| |c - a|)` (1/R of the circle through the three points; sign = sign of the x/z cross product).

| Field | Definition |
| --- | --- |
| `sampleCount` | `points.length - 1` |
| `length` | closed 3D arc length, sum of Euclidean segment lengths |
| `boundingBoxArea` | (max x - min x) (max z - min z) of the centerline points, without road margin |
| `straightLengthFraction` | 3D arc length of segments whose two end samples both have \|kappa\| < `straightKappa` = 5e-4 (radius > 2000) divided by `length`. By arc length, not segment count; unrelated to `params.straight`, which counts spline pieces |
| `meanAbsCurvature`, `maxAbsCurvature`, `p95AbsCurvature` | mean, maximum and 95th percentile (nearest rank: the ceil(0.95 n)-th smallest) of \|kappa\| over samples |
| `curvatureEntropyBits` | Shannon entropy, in bits, of the distribution of samples over 8 fixed \|kappa\| bins with lower edges 0, 5e-4, 1e-3, 2e-3, 4e-3, 8e-3, 1.6e-2, 3.2e-2 (last bin open); `curvatureHistogram` holds the counts. Adapted from the curvature-entropy idea in Loiacono, Cardamone & Lanzi, IEEE TCIAIG 3(3), 2011; the bins and the use of discrete Menger curvature are choices of this tool, so values are not comparable with that paper |
| `turnCount` | number of maximal runs of consecutive samples with the same sign of kappa and \|kappa\| > `turnKappa` = 4e-3 (radius < 250); a run touching the seam is merged across it; an S-curve counts as 2 |
| `elevationRange` | max y - min y |
| `maxAbsSlope`, `meanAbsSlope` | max over segments of \|dy\| / planar run; sum \|dy\| / sum planar run (run-weighted mean). Segments with zero planar run are skipped |
| `totalTurningDegrees` | sum over vertices of the absolute heading change in the x/z plane, in degrees (360 for a simple loop) |
| `curvature` | the signed kappa per sample (omitted by the CLI unless `--samples`) |

Thresholds are options (`straightKappa`, `turnKappa`). `validate.ts` and `metrics.ts` use only `+ - * /`, `Math.sqrt`, exact `Math.*` helpers and `src/detmath.ts` (plus a local `dlog2` built from those operations), so they inherit the same unverified-across-engines caveat as generation: the only verified evidence is Node 22 on Linux.

## 구성과 원본 차이

```text
src/core.ts       파라미터, PRNG, 트랙 생성, 투영, 절차적 배치
src/vehicle.ts    독립적인 월드 좌표 주행과 충돌
src/coins.ts      Seed 기반 코인 배치와 중복 없는 획득 상태
src/patterns.ts   특수 곡선 삽입, 제한 재시도, 각도/곡률/전체 경계 검사
src/view.ts       Three.js 메시, 인스턴싱, 카메라, GPU 자원 정리
src/minimap.ts    공유 트랙 좌표를 사용하는 캐시된 2D 지도
src/main.ts       UI, 키 입력, 120Hz 고정 간격 시뮬레이션
tests/           핵심 로직과 실제 Chromium 통합 테스트
```

원본의 균일 Catmull–Rom 수식, 반경 `300 + size × 60`, 반경·각도 노이즈와 직선 혼합 구조를 유지했습니다. 원본의 높이 `3.7`주기를 `4`주기로 바꿔 끝점의 높이/기울기를 연결했습니다. `carT`/`carOffset` 레일 주행은 제거했습니다. 폭은 원본의 `width × 1.2` 암묵적 실제 폭 대신 입력한 값을 실제 도로 전체 폭으로 사용합니다. PRNG가 Processing과 달라 **Processing에서 같은 Seed로 나온 모양과는 일치하지 않습니다.** 웹 버전 안에서 재현성을 보장합니다.

상세 원본 조사와 확인된 경계조건은 [SOURCE_ANALYSIS.md](SOURCE_ANALYSIS.md)를 참고하세요. `../vclass` 원본은 변경하지 않았고, PDF/PPTX 이미지나 개인정보는 애플리케이션에 포함하지 않았습니다.

## 알려진 한계와 다음 단계

- 차량/장애물 충돌은 평면 원형 근사입니다. 벤치·나무·가로등·건물은 시각 배경이며 별도 충돌체는 없습니다.
- Auto/0개 모드는 원본 방식대로 직선과 곡선을 섞으므로 일부 접합점에서 방향이 급하게 바뀔 수 있습니다. 특수 패턴 모드는 접합부를 완화하고 전체 경계와 곡률을 검사합니다. 큰 진폭의 최대 경사는 제한하지 않으며, 3D 뱅킹이나 정교한 물리는 구현하지 않습니다.
- 추적 카메라는 보간 후 실제 도로 메시 위로 높이를 보정하고, 가림이 있을 때 안전한 범위에서 추적 거리를 줄입니다. 급경사·예각 접점의 메시 겹침과 일부 배경 가림은 남아 있습니다. v0.3은 충돌에 실제 아스팔트 경계를 사용합니다. 차량 높이는 겹친 삼각형 중 위쪽의 실제 표면을 따르므로 극단 설정에서는 기존 메시의 단차에 따른 높이 변화가 남습니다. 원본 생성 방식의 접선/메시 개선은 이번 변경에 포함하지 않았습니다.
- 정교한 물리, 드리프트, 자동 주행, 미니맵 편집, 트랙 내보내기, 원본 S키 스크린샷 저장, 모바일 터치 입력은 이번 범위에 없습니다.
- 초기 JS 번들은 Three.js 렌더러를 포함해 약 590KB(압축 전)로, Vite의 500KB 청크 경고가 있습니다. 빌드는 성공합니다. 필요하면 후속 단계에서 초기 로딩을 측정하고 렌더러 지연 로딩을 검토합니다.
- 다음 검증: 실제 데스크톱 GPU에서 장시간 운전/반복 생성, Firefox/Safari 확인, 극단 Seed별 접합부 주행과 카메라 가림 개선.

## 정적 배포 준비 및 권리

2026-11-06 사용자 요청으로 Production의 Vercel 인증 보호를 해제했습니다. **https://tracklab-lite.vercel.app 에서 로그인 없이 바로 실행할 수 있습니다.** 인증 정보가 없는 새 브라우저에서 3D 트랙, 실시간 변경, 직접 주행, 코너 3종, 미니맵과 코인 수집을 재검증했습니다. 기존 72개 테스트와 배포 이력은 [VERCEL_PRODUCTION_REPORT.md](VERCEL_PRODUCTION_REPORT.md)에 기록했습니다. 아래 내용은 초기 로컬 구현 시점의 배포/권리 보류 기록입니다.

`dist/`만 정적으로 호스팅하면 됩니다. 향후 Vercel 설정은 Root Directory `tracklab-lite`, Build Command `npm run build`, Output Directory `dist`를 사용합니다. 저장소 연동·배포 스크립트·자동 배포는 만들지 않았고 **이번 작업에서 외부 배포나 공개 저장소 업로드를 하지 않았습니다.**

원본 코드·첨부 자료의 저작자 허락, 라이선스와 공개 가능한 범위는 제공된 파일만으로 확정할 수 없습니다. 원본을 포함한 재배포·외부 공개는 권리 확인 전 보류합니다. 참가 규정 전체에 대한 법률/공식 적격성 판정은 하지 않았습니다. 구현에는 외부 게임 소스/에셋, 제3자 모델, API Key, 개인정보를 포함하지 않습니다. 의존성의 라이선스 고지는 해당 npm 패키지에 포함되어 있습니다. 프로젝트는 `private: true`이며 별도의 공개 배포 라이선스를 부여하지 않았습니다.
