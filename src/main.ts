import './style.css';
import { DEFAULTS, LIMITS, generateTrack, sanitize, type Params } from './core.js';
import { Minimap } from './minimap.js';
import { TrackView } from './view.js';
import { NO_INPUT, spawnVehicle, updateVehicle, type Controls } from './vehicle.js';
import { COIN_COUNT, CoinRun } from './coins.js';
import { PatternGenerationError } from './patterns.js';
import { TrackDocumentError, exportTrack, importTrack, parseTrackDocument, serializeTrack } from './schema.js';
import { validateTrack, type ValidationResult } from './validate.js';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <header class="app-header">
    <a class="brand" href="./" aria-label="TrackLab Lite 홈"><span class="brand-mark">⌁</span><strong>TrackLab<span> Lite</span></strong><span class="version">v0.4</span></a>
    <div class="header-path">WORKSPACE <span>/</span> Procedural track studio</div>
    <div class="local-badge"><i></i> LOCAL SESSION</div>
  </header>
  <aside class="sidebar">
    <div class="panel-title"><span class="eyebrow">TRACK GENERATOR</span><h1>트랙 실험실<span>↗</span></h1><p>조건을 조절하면 자동 반영됩니다.</p></div>
    <form id="parameters"><div class="parameter-scroll">
      <section class="parameter-section"><h2><span>01</span> 트랙 형태</h2><div id="geometry-fields"></div></section>
      <section class="parameter-section"><h2><span>02</span> Corner Pattern</h2>
        <label class="select-field" for="cornerPattern">코너 패턴<select id="cornerPattern" name="cornerPattern"><option value="auto">Auto · 기존 생성</option><option value="right-angle">90° · L자 코너</option><option value="hairpin">Hairpin · U자 헤어핀</option><option value="s-curve">S-Curve · S자 코너</option></select></label>
        <div id="corner-fields"></div><p id="pattern-status" class="pattern-status" role="status">Auto · 기존 생성 방식</p>
        <p id="pattern-warning" class="pattern-warning" role="alert" hidden></p>
      </section>
      <section class="parameter-section"><h2><span>03</span> 환경 설정</h2><div id="environment-fields"></div>
        <label class="select-field" for="scene">배경 종류<select id="scene" name="scene"><option value="nature">Nature · 자연</option><option value="city">City · 도시</option><option value="mixed" selected>Mixed · 혼합</option></select></label>
      </section>
      <section class="parameter-section"><h2><span>04</span> JSON 입출력</h2>
        <div class="io-actions"><button type="button" id="export-json" class="io-button">Export JSON</button><button type="button" id="import-json" class="io-button">Import JSON</button></div>
        <input id="import-file" type="file" accept=".json,application/json" hidden aria-label="트랙 JSON 파일 선택">
        <p id="io-message" class="io-message" role="status" hidden></p>
      </section>
      <section class="parameter-section" id="validation-section"><h2><span>05</span> Validation</h2>
        <div class="validation-head"><span id="validation-badge" class="validation-badge" role="status">—</span><span id="validation-counts" class="validation-counts"></span></div>
        <ul id="validation-checks" class="validation-checks"></ul>
        <ul id="validation-violations" class="validation-violations"></ul>
      </section>
      <section class="seed-section"><div class="seed-label"><label for="seed">RANDOM SEED</label><span>같은 값, 같은 트랙</span></div><div class="seed-input"><span>#</span><input id="seed" name="seed" type="number" min="0" max="2147483647" step="1" required value="42"><button type="button" id="shuffle" aria-label="새 Seed로 트랙 생성" title="새 Seed로 생성 [R]">⤨</button></div></section>
      </div><div class="form-actions"><button class="generate" type="submit">Generate track <span>↗</span></button><button id="reset" class="reset" type="button">기본값으로 초기화</button></div>
    </form>
    <div class="sidebar-note"><span>◇</span><p>브라우저 안에서 생성됩니다.<br>모델 다운로드 · API 연결 없음</p></div>
  </aside>
  <main class="workspace">
    <div class="viewport-toolbar"><div><span class="live-dot"></span><strong>3D VIEWPORT</strong><span class="toolbar-separator">/</span><span id="camera-label">전체 트랙</span></div><div class="camera-tabs" role="group" aria-label="카메라 모드"><button id="overview" class="active" aria-pressed="true">Overview</button><button id="chase" aria-pressed="false">Drive <kbd>C</kbd></button></div></div>
    <div id="viewport" class="viewport">
      <div class="scene-caption"><div class="eyebrow">PROCEDURAL CIRCUIT <span>01</span></div><h2 id="track-name">Circuit / 000042</h2><p id="scene-description">Catmull–Rom · Closed loop</p></div>
      <section class="minimap-panel" aria-label="실시간 미니맵"><div class="mini-title"><span>TRACK MAP</span><span class="mini-live"><i></i> LIVE</span></div><canvas id="minimap" aria-label="트랙 윤곽과 실제 차량 위치"></canvas><div class="map-legend"><span><i class="legend-car"></i> 차량</span><span><i class="legend-start"></i> 시작점</span><span>TOP VIEW</span></div></section>
      <div class="viewport-bottom"><div class="scene-status"><span class="status-dot"></span><span id="status" role="status" aria-live="polite">트랙 준비 중…</span></div><span id="orbit-hint">드래그 회전 <span>·</span> 휠 확대 <span>·</span> 우클릭 이동</span></div>
      <div id="error" role="alert" hidden></div>
      <div id="coin-complete" class="coin-complete" role="status" aria-live="polite" hidden>코인 10개를 모두 모았습니다!</div>
    </div>
    <section class="metrics" aria-label="생성된 트랙 정보"><div><span>TRACK LENGTH</span><strong id="length">—</strong><small>world units</small></div><div><span>SEGMENTS</span><strong id="segments">—</strong><small id="segment-detail">—</small></div><div><span>ELEVATION RANGE</span><strong id="elevation">—</strong><small>world units</small></div><div><span>ENVIRONMENT</span><strong id="props">—</strong><small>procedural objects</small></div><div class="ready-indicator"><i></i><span>READY TO DRIVE<br><small>화면 클릭 후 방향키로 출발</small></span></div></section>
  </main>
  <footer class="hud"><div class="speedometer"><span>SPEED</span><strong id="speed">0.0</strong><small>u/s</small><span id="gear" class="gear">N</span></div><div class="coin-hud" role="status" aria-live="polite" aria-label="획득 코인"><span>COINS</span><strong id="coin-count">0 / ${COIN_COUNT}</strong></div><div class="controls-hint"><span><kbd>↑</kbd><kbd>↓</kbd> 가속 / 후진</span><span><kbd>←</kbd><kbd>→</kbd> 조향</span><span><kbd>Space</kbd> 브레이크</span><span><kbd>C</kbd> 카메라</span><span><kbd>R</kbd> 새 트랙</span></div><div class="seed-hud">SEED <strong id="active-seed">42</strong><span id="surface">ASPHALT</span></div></footer>
`;

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
type SliderKey = Exclude<keyof typeof LIMITS, 'seed'>;
const labels: Record<SliderKey, [string, string]> = {
  curves: ['구간 수', '개'], straight: ['직선 비율', 'ratio'], width: ['트랙 폭', 'u'],
  size: ['전체 크기', '1–3'], height: ['고저차 진폭', 'u'], obstacles: ['장애물 수', '개'], density: ['배경 밀도', '0–20'],
  cornerCount: ['코너 개수', '개'], cornerStrength: ['코너 강도', '%'],
};
for (const key of Object.keys(labels) as SliderKey[]) {
  const [min, max, step] = LIMITS[key], [label, unit] = labels[key];
  const field = document.createElement('div'); field.className = 'slider-field';
  field.innerHTML = `<div class="field-heading"><label for="${key}">${label}</label><div><input aria-label="${label} 숫자 입력" id="${key}-value" type="number" min="${min}" max="${max}" step="${step}" required value="${DEFAULTS[key]}"><span>${unit}</span></div></div><input id="${key}" name="${key}" type="range" min="${min}" max="${max}" step="${step}" value="${DEFAULTS[key]}">`;
  $(key.startsWith('corner') ? 'corner-fields' : key === 'density' || key === 'obstacles' ? 'environment-fields' : 'geometry-fields').append(field);
  const range = $<HTMLInputElement>(key), number = $<HTMLInputElement>(`${key}-value`);
  range.addEventListener('input', () => { number.value = range.value; });
  number.addEventListener('input', () => { if (number.value !== '') range.value = number.value; });
}

let generation = 0;
let track = generateTrack();
let pose = spawnVehicle(track);
let coinRun = new CoinRun(track);
const keys = new Set<string>();
const clearInput = () => keys.clear();
let view: TrackView;
let minimap: Minimap;
let regenerationTimer: ReturnType<typeof setTimeout> | undefined;
let accumulator = 0;
let lastExportDigest: string | null = null;
let lastValidation: { ok: boolean; errors: number; warnings: number; checks: number; failedChecks: string[] } | null = null;

function readParams(): Params {
  const raw = Object.fromEntries(Object.keys(LIMITS).map(key => [key,
    Number($<HTMLInputElement>(key === 'seed' ? key : `${key}-value`).value)]));
  return sanitize({ ...raw, scene: $<HTMLSelectElement>('scene').value as Params['scene'],
    cornerPattern: $<HTMLSelectElement>('cornerPattern').value as Params['cornerPattern'] });
}
function writeParams(p: Params) {
  for (const key of Object.keys(LIMITS) as (keyof typeof LIMITS)[]) {
    $<HTMLInputElement>(key).value = String(p[key]);
    if (key !== 'seed') $<HTMLInputElement>(`${key}-value`).value = String(p[key]);
  }
  $<HTMLSelectElement>('scene').value = p.scene;
  $<HTMLSelectElement>('cornerPattern').value = p.cornerPattern;
}
function pending() {
  clearTimeout(regenerationTimer);
  const inputs = $('parameters').querySelectorAll<HTMLInputElement>('input[type=number]');
  if ([...inputs].some(input => input.value === '' || !Number.isFinite(input.valueAsNumber))) {
    $('status').textContent = '입력 대기 · 숫자를 완성하면 자동 적용됩니다'; return;
  }
  if (JSON.stringify(readParams()) === JSON.stringify(track.params)) {
    showPatternReport();
    $('status').textContent = `생성 완료 · 현재 설정 적용됨 · Seed ${track.params.seed}`; return;
  }
  $('status').textContent = '자동 갱신 대기 · 마지막 입력 후 150ms';
  regenerationTimer = setTimeout(() => generate(), 150);
}

function generate() {
  clearTimeout(regenerationTimer); regenerationTimer = undefined;
  $('status').textContent = '트랙 갱신 중…';
  let prepared;
  try {
    const next = generateTrack(readParams());
    prepared = { next, nextPose: spawnVehicle(next), nextCoins: new CoinRun(next) };
  } catch (error) {
    clearInput();
    $('pattern-warning').hidden = false;
    $('pattern-warning').textContent = `${error instanceof Error ? error.message : error} · 이전 트랙과 코인 상태를 유지합니다. 개수/폭을 줄이거나 Auto를 선택하세요.`;
    $('pattern-status').textContent = error instanceof PatternGenerationError
      ? `요청 패턴 0개 적용 · ${error.attempts}회 검사 실패 · 이전 트랙 유지` : '트랙 갱신 실패';
    $('status').textContent = '패턴 적용 실패 · 이전 트랙 유지'; return;
  }
  const { next, nextPose, nextCoins } = prepared;
  view.setTrack(next, nextCoins.coins); minimap.setTrack(next); track = next; coinRun = nextCoins; generation++;
  pose = nextPose; clearInput(); accumulator = 0;
  writeParams(track.params);
  $('track-name').textContent = `Circuit / ${String(track.params.seed).padStart(6, '0')}`;
  $('length').textContent = Math.round(track.length).toLocaleString();
  $('segments').textContent = String(track.params.curves).padStart(2, '0');
  const straights = track.straightSegments.filter(Boolean).length;
  $('segment-detail').textContent = `${track.params.curves - straights} curves / ${straights} straights`;
  $('elevation').textContent = `${Math.round(track.bounds.maxY - track.bounds.minY)}`;
  $('props').textContent = String(track.props.length).padStart(2, '0');
  $('active-seed').textContent = String(track.params.seed);
  $('scene-description').textContent = `Catmull–Rom · Closed loop · ${track.params.width}u wide`;
  $('status').textContent = `생성 완료 · ${track.points.length - 1} samples · Seed ${track.params.seed} · 차량 안전 재배치 / 속도 0`;
  if (view.mode === 'chase') view.setMode('chase', pose);
  view.render(pose, 0); minimap.draw(pose.x, pose.z, pose.heading);
  $('speed').textContent = '0.0'; $('gear').textContent = 'N'; $('surface').textContent = 'ASPHALT';
  updateCoinHUD();
  showPatternReport();
  showValidation();
}
const VIOLATION_LIMIT = 5;
function showValidation() {
  const result: ValidationResult = validateTrack(track);
  const errors = result.checks.filter(c => c.severity === 'error').reduce((n, c) => n + c.failures, 0);
  const warnings = result.checks.filter(c => c.severity === 'warning').reduce((n, c) => n + c.failures, 0);
  const badge = $('validation-badge');
  badge.textContent = result.ok ? 'OK' : 'INVALID';
  badge.className = `validation-badge ${result.ok ? 'ok' : 'invalid'}`;
  $('validation-counts').textContent = `오류 ${errors} · 경고 ${warnings}`;
  const list = $('validation-checks'); list.replaceChildren();
  for (const c of result.checks) {
    const li = document.createElement('li');
    li.className = `check-${c.skipped ? 'skipped' : c.passed ? 'pass' : c.severity}`;
    li.dataset.check = c.id;
    const name = document.createElement('span'); name.textContent = c.id;
    const value = document.createElement('b'); value.textContent = c.skipped ? 'skipped' : c.passed ? 'pass' : `${c.failures} ${c.severity === 'error' ? 'error' : 'warning'}${c.failures === 1 ? '' : 's'}`;
    li.append(name, value); list.append(li);
  }
  const vlist = $('validation-violations'); vlist.replaceChildren();
  const shown = [...result.violations].sort((a, b) => Number(a.severity === 'warning') - Number(b.severity === 'warning')).slice(0, VIOLATION_LIMIT);
  for (const v of shown) {
    const li = document.createElement('li'); li.className = `violation-${v.severity}`;
    const code = document.createElement('code'); code.textContent = v.code;
    li.append(code, ` ${v.message}`); vlist.append(li);
  }
  if (result.violations.length > shown.length) {
    const li = document.createElement('li'); li.className = 'violation-more';
    li.textContent = `… 외 ${result.violations.length - shown.length}건`; vlist.append(li);
  }
  lastValidation = { ok: result.ok, errors, warnings, checks: result.checks.length,
    failedChecks: result.checks.filter(c => !c.passed).map(c => c.id) };
}
function setIoMessage(text: string, kind: 'ok' | 'error') {
  const el = $('io-message'); el.hidden = false; el.textContent = text; el.className = `io-message ${kind}`;
}
function exportJson() {
  const json = serializeTrack(track);
  const digest: string = JSON.parse(json).integrity.digest;
  lastExportDigest = digest;
  const name = `tracklab-${track.params.seed}-${digest.slice(0, 8)}.json`;
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  setIoMessage(`내보내기 완료 · ${name}`, 'ok');
  $('status').textContent = `JSON 내보내기 완료 · ${name}`;
}
function importFailure(reason: string) {
  const message = `가져오기 실패 · ${reason} · 이전 트랙을 유지합니다`;
  setIoMessage(message, 'error'); $('status').textContent = message;
}
async function importJson(file: File) {
  let doc, params;
  try {
    doc = parseTrackDocument(await file.text());
    importTrack(doc, { verify: 'regenerate' });
    params = doc.params;
  } catch (error) {
    importFailure(error instanceof TrackDocumentError ? error.message : error instanceof Error ? error.message : String(error)); return;
  }
  const previous = track.params, before = generation;
  clearTimeout(regenerationTimer); regenerationTimer = undefined;
  writeParams(params); generate();
  if (generation === before) {
    writeParams(previous); showPatternReport();
    importFailure('현재 빌드에서 트랙을 생성하지 못했습니다'); return;
  }
  const digest: string = JSON.parse(serializeTrack(track)).integrity.digest;
  const sameBuild = exportTrack(track).generator.version === doc.generator.version;
  if (sameBuild && digest !== doc.integrity.digest) {
    importFailure('재생성된 digest가 문서와 다릅니다'); return;
  }
  const message = `가져오기 완료 · Seed ${params.seed} · digest ${doc.integrity.digest.slice(0, 8)} ${sameBuild ? '재생성 일치' : `(생성기 v${doc.generator.version}, 재생성 검증됨)`}`;
  setIoMessage(message, 'ok'); $('status').textContent = message;
}
function showPatternReport() {
  $('pattern-warning').hidden = true;
  const r = track.patternReport;
  $('pattern-status').textContent = !r.inserted ? (track.params.cornerPattern === 'auto'
    ? 'Auto · 기존 생성 방식 (특수 패턴 미적용)' : '0개 · 기존 생성 방식 (특수 패턴 미적용)')
    : `${r.inserted} / ${r.requested}개 적용 · ${r.patterns.map(m => m.kind === 's-curve'
      ? `S 곡률 반전 ${m.curvatureChanges}회` : `${Math.abs(m.turnDegrees).toFixed(0)}°`).join(' / ')} · 도로/보도 검사 통과 · ${r.attempts}회 시도 · 공간 ${r.scale.toFixed(2)}배`;
}
function updateCoinHUD() {
  $('coin-count').textContent = `${coinRun.count} / ${COIN_COUNT}`;
  $('coin-complete').hidden = !coinRun.complete;
}
function randomize() {
  const values = crypto.getRandomValues(new Uint32Array(1));
  $<HTMLInputElement>('seed').value = String(values[0] & 0x7fffffff); generate();
}
function setCamera(mode: 'overview' | 'chase') {
  view.setMode(mode, pose);
  for (const name of ['overview', 'chase']) {
    $(name).classList.toggle('active', name === mode); $(name).setAttribute('aria-pressed', String(name === mode));
  }
  $('camera-label').textContent = mode === 'overview' ? '전체 트랙' : '차량 추적';
  $('orbit-hint').textContent = mode === 'overview' ? '드래그 회전 · 휠 확대 · 우클릭 이동' : '↑ 가속 · ← → 직접 조향 · Space 브레이크';
  view.renderer.domElement.focus({ preventScroll: true });
}

try {
  view = new TrackView($('viewport')); minimap = new Minimap($<HTMLCanvasElement>('minimap'));
  generate();
  $('parameters').addEventListener('submit', event => { event.preventDefault(); generate(); view.renderer.domElement.focus(); });
  $('parameters').addEventListener('input', pending);
  $('parameters').addEventListener('change', pending);
  $('shuffle').addEventListener('click', randomize);
  $('export-json').addEventListener('click', exportJson);
  $('import-json').addEventListener('click', () => $<HTMLInputElement>('import-file').click());
  $('import-file').addEventListener('change', event => {
    const input = event.target as HTMLInputElement, file = input.files?.[0];
    input.value = ''; if (file) void importJson(file);
  });
  $('reset').addEventListener('click', () => { writeParams(DEFAULTS); generate(); });
  $('overview').addEventListener('click', () => setCamera('overview'));
  $('chase').addEventListener('click', () => setCamera('chase'));
  view.renderer.domElement.addEventListener('pointerdown', () => view.renderer.domElement.focus());
  const editable = (target: EventTarget | null) => target instanceof HTMLElement &&
    (Boolean(target.closest('input, select, textarea, button')) || target.isContentEditable);
  window.addEventListener('keydown', event => {
    if (editable(event.target) || event.ctrlKey || event.metaKey || event.altKey) return;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault(); keys.add(event.code);
    }
    if (event.repeat) return;
    if (event.code === 'KeyC') { event.preventDefault(); setCamera(view.mode === 'overview' ? 'chase' : 'overview'); }
    if (event.code === 'KeyR') { event.preventDefault(); randomize(); }
  });
  window.addEventListener('keyup', event => keys.delete(event.code));
  window.addEventListener('blur', clearInput);
  document.addEventListener('visibilitychange', clearInput);
  document.addEventListener('focusin', event => { if (editable(event.target)) clearInput(); });
  let last = performance.now();
  function frame(now: number) {
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    const controls: Controls = { ...NO_INPUT, throttle: keys.has('ArrowUp'), reverse: keys.has('ArrowDown'),
      left: keys.has('ArrowLeft'), right: keys.has('ArrowRight'), brake: keys.has('Space') };
    accumulator += dt;
    while (accumulator >= 1 / 120) {
      updateVehicle(pose, controls, track, 1 / 120); accumulator -= 1 / 120;
      const collected = coinRun.collect(pose);
      if (collected.length) { view.hideCoins(collected); updateCoinHUD(); }
    }
    view.render(pose, dt); minimap.draw(pose.x, pose.z, pose.heading);
    $('speed').textContent = Math.abs(pose.speed).toFixed(1);
    $('gear').textContent = Math.abs(pose.speed) < 0.1 ? 'N' : pose.speed < 0 ? 'R' : 'D';
    $('surface').textContent = pose.collision > 0 ? 'CONTACT' : pose.surface.toUpperCase();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  window.addEventListener('pagehide', event => {
    clearTimeout(regenerationTimer);
    clearInput();
    if (!event.persisted) view.dispose();
  });
  // Read-only diagnostics only in the local dev server, explicitly opted into by tests.
  if (import.meta.env.DEV && new URLSearchParams(location.search).has('test')) {
    Object.defineProperty(window, '__tracklab', { get: () => ({ track, pose, generation,
      coins: { positions: coinRun.coins, collected: coinRun.collectedIds, count: coinRun.count,
        remaining: view.visibleCoinCount, total: COIN_COUNT },
      exportDigest: lastExportDigest, validation: lastValidation,
      mode: view.mode, marker: minimap.marker, memory: { ...view.renderer.info.memory },
      calls: view.renderer.info.render.calls, triangles: view.renderer.info.render.triangles, input: [...keys] }) });
  }
} catch (error) {
  $('error').hidden = false;
  $('error').textContent = `3D 화면을 시작할 수 없습니다. WebGL 2를 지원하는 브라우저와 하드웨어 가속을 확인해 주세요. ${error instanceof Error ? error.message : error}`;
  $('status').textContent = '초기화 실패'; console.error(error);
}
