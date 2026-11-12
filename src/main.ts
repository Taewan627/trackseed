import './style.css';
import { DEFAULTS, LIMITS, generateTrack, sanitize, type Params } from './core.js';
import { Minimap } from './minimap.js';
import { TrackView } from './view.js';
import { NO_INPUT, spawnVehicle, updateVehicle, type Controls } from './vehicle.js';
import { COIN_COUNT, CoinRun } from './coins.js';
import { PatternGenerationError } from './patterns.js';
import { TrackDocumentError, exportTrack, importTrack, parseTrackDocument, serializeTrack } from './schema.js';
import { validateTrack, type ValidationResult } from './validate.js';
import { VERSION } from './version.js';
import { LANGUAGES, applyStaticTranslations, attrAttr, getLanguage, htmlAttr, setLanguage, t, textAttr, type Key, type Lang } from './i18n.js';

const app = document.querySelector<HTMLDivElement>('#app')!;
const T = (key: Key) => textAttr(key);
app.innerHTML = `
  <header class="app-header">
    <a class="brand" href="./" aria-label="${t('brand.aria')}" ${attrAttr(['aria-label', 'brand.aria'])}><span class="brand-mark">⌁</span><strong>TrackLab<span> Lite</span></strong><span class="version">v${VERSION}</span></a>
    <div class="header-path">WORKSPACE <span>/</span> Procedural track studio</div>
    <div class="local-badge"><i></i> LOCAL SESSION</div>
    <div class="lang-toggle" id="lang-toggle" role="group" aria-label="${t('lang.group.aria')}" ${attrAttr(['aria-label', 'lang.group.aria'])}><button type="button" id="lang-en" data-lang="en" lang="en" aria-pressed="true">EN</button><button type="button" id="lang-ko" data-lang="ko" lang="ko" aria-pressed="false">한국어</button></div>
  </header>
  <aside class="sidebar">
    <div class="panel-title"><span class="eyebrow">TRACK GENERATOR</span><h1 ${T('panel.title')}>${t('panel.title')}<span>↗</span></h1><p ${T('panel.subtitle')}>${t('panel.subtitle')}</p></div>
    <form id="parameters"><div class="parameter-scroll">
      <section class="parameter-section"><h2 ${T('sec.shape')}><span>01</span> ${t('sec.shape')}</h2><div id="geometry-fields"></div></section>
      <section class="parameter-section"><h2 ${T('sec.cornerPattern')}><span>02</span> ${t('sec.cornerPattern')}</h2>
        <label class="select-field" for="cornerPattern" ${T('cornerPattern.label')}>${t('cornerPattern.label')}<select id="cornerPattern" name="cornerPattern"><option value="auto" ${T('cornerPattern.auto')}>${t('cornerPattern.auto')}</option><option value="right-angle" ${T('cornerPattern.rightAngle')}>${t('cornerPattern.rightAngle')}</option><option value="hairpin" ${T('cornerPattern.hairpin')}>${t('cornerPattern.hairpin')}</option><option value="s-curve" ${T('cornerPattern.sCurve')}>${t('cornerPattern.sCurve')}</option></select></label>
        <div id="corner-fields"></div><p id="pattern-status" class="pattern-status" role="status">${t('pattern.autoIdle')}</p>
        <p id="pattern-warning" class="pattern-warning" role="alert" hidden></p>
      </section>
      <section class="parameter-section"><h2 ${T('sec.environment')}><span>03</span> ${t('sec.environment')}</h2><div id="environment-fields"></div>
        <label class="select-field" for="scene" ${T('scene.label')}>${t('scene.label')}<select id="scene" name="scene"><option value="nature" ${T('scene.nature')}>${t('scene.nature')}</option><option value="city" ${T('scene.city')}>${t('scene.city')}</option><option value="mixed" selected ${T('scene.mixed')}>${t('scene.mixed')}</option></select></label>
      </section>
      <section class="parameter-section"><h2 ${T('sec.io')}><span>04</span> ${t('sec.io')}</h2>
        <div class="io-actions"><button type="button" id="export-json" class="io-button">Export JSON</button><button type="button" id="import-json" class="io-button">Import JSON</button></div>
        <input id="import-file" type="file" accept=".json,application/json" hidden aria-label="${t('io.fileAria')}" ${attrAttr(['aria-label', 'io.fileAria'])}>
        <p id="io-message" class="io-message" role="status" hidden></p>
      </section>
      <section class="parameter-section" id="validation-section"><h2 ${T('sec.validation')}><span>05</span> ${t('sec.validation')}</h2>
        <div class="validation-head"><span id="validation-badge" class="validation-badge" role="status">—</span><span id="validation-counts" class="validation-counts"></span></div>
        <ul id="validation-checks" class="validation-checks"></ul>
        <ul id="validation-violations" class="validation-violations"></ul>
      </section>
      <section class="seed-section"><div class="seed-label"><label for="seed">RANDOM SEED</label><span ${T('seed.note')}>${t('seed.note')}</span></div><div class="seed-input"><span>#</span><input id="seed" name="seed" type="number" min="0" max="2147483647" step="1" required value="42"><button type="button" id="shuffle" aria-label="${t('seed.shuffleAria')}" title="${t('seed.shuffleTitle')}" ${attrAttr(['aria-label', 'seed.shuffleAria'], ['title', 'seed.shuffleTitle'])}>⤨</button></div></section>
      </div><div class="form-actions"><button class="generate" type="submit">Generate track <span>↗</span></button><button id="reset" class="reset" type="button" ${T('reset.label')}>${t('reset.label')}</button></div>
    </form>
    <div class="sidebar-note"><span>◇</span><p ${htmlAttr('sidebar.note')}>${t('sidebar.note')}</p></div>
  </aside>
  <main class="workspace">
    <div class="viewport-toolbar"><div><span class="live-dot"></span><strong>3D VIEWPORT</strong><span class="toolbar-separator">/</span><span id="camera-label"></span></div><div class="camera-tabs" role="group" aria-label="${t('camera.groupAria')}" ${attrAttr(['aria-label', 'camera.groupAria'])}><button id="overview" class="active" aria-pressed="true">Overview</button><button id="chase" aria-pressed="false">Drive <kbd>C</kbd></button></div></div>
    <div id="viewport" class="viewport">
      <div class="scene-caption"><div class="eyebrow">PROCEDURAL CIRCUIT <span>01</span></div><h2 id="track-name">Circuit / 000042</h2><p id="scene-description">Catmull–Rom · Closed loop</p></div>
      <section class="minimap-panel" aria-label="${t('minimap.aria')}" ${attrAttr(['aria-label', 'minimap.aria'])}><div class="mini-title"><span>TRACK MAP</span><span class="mini-live"><i></i> LIVE</span></div><canvas id="minimap" aria-label="${t('minimap.canvasAria')}" ${attrAttr(['aria-label', 'minimap.canvasAria'])}></canvas><div class="map-legend"><span ${T('minimap.vehicle')}><i class="legend-car"></i> ${t('minimap.vehicle')}</span><span ${T('minimap.start')}><i class="legend-start"></i> ${t('minimap.start')}</span><span>TOP VIEW</span></div></section>
      <div class="viewport-bottom"><div class="scene-status"><span class="status-dot"></span><span id="status" role="status" aria-live="polite"></span></div><span id="orbit-hint"></span></div>
      <div id="error" role="alert" hidden></div>
      <div id="coin-complete" class="coin-complete" role="status" aria-live="polite" hidden></div>
    </div>
    <section class="metrics" aria-label="${t('metrics.aria')}" ${attrAttr(['aria-label', 'metrics.aria'])}><div><span>TRACK LENGTH</span><strong id="length">—</strong><small>world units</small></div><div><span>SEGMENTS</span><strong id="segments">—</strong><small id="segment-detail">—</small></div><div><span>ELEVATION RANGE</span><strong id="elevation">—</strong><small>world units</small></div><div><span>ENVIRONMENT</span><strong id="props">—</strong><small>procedural objects</small></div><div class="ready-indicator"><i></i><span>READY TO DRIVE<br><small ${T('ready.hint')}>${t('ready.hint')}</small></span></div></section>
  </main>
  <footer class="hud"><div class="speedometer"><span>SPEED</span><strong id="speed">0.0</strong><small>u/s</small><span id="gear" class="gear">N</span></div><div class="coin-hud" role="status" aria-live="polite" aria-label="${t('coin.hudAria')}" ${attrAttr(['aria-label', 'coin.hudAria'])}><span>COINS</span><strong id="coin-count">0 / ${COIN_COUNT}</strong></div><div class="controls-hint"><span ${T('controls.drive')}><kbd>↑</kbd><kbd>↓</kbd> ${t('controls.drive')}</span><span ${T('controls.steer')}><kbd>←</kbd><kbd>→</kbd> ${t('controls.steer')}</span><span ${T('controls.brake')}><kbd>Space</kbd> ${t('controls.brake')}</span><span ${T('controls.camera')}><kbd>C</kbd> ${t('controls.camera')}</span><span ${T('controls.newTrack')}><kbd>R</kbd> ${t('controls.newTrack')}</span></div><div class="seed-hud">SEED <strong id="active-seed">42</strong><span id="surface">ASPHALT</span></div></footer>
`;

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
type SliderKey = Exclude<keyof typeof LIMITS, 'seed'>;
const labels: Record<SliderKey, [Key, string]> = {
  curves: ['slider.curves', 'unit.count'], straight: ['slider.straight', 'ratio'], width: ['slider.width', 'u'],
  size: ['slider.size', '1–3'], height: ['slider.height', 'u'], obstacles: ['slider.obstacles', 'unit.count'], density: ['slider.density', '0–20'],
  cornerCount: ['slider.cornerCount', 'unit.count'], cornerStrength: ['slider.cornerStrength', '%'],
};
for (const key of Object.keys(labels) as SliderKey[]) {
  const [min, max, step] = LIMITS[key], [labelKey, unitText] = labels[key], label = t(labelKey);
  const unit = unitText === 'unit.count' ? t('unit.count') : unitText, unitAttrs = unitText === 'unit.count' ? T('unit.count') : '';
  const field = document.createElement('div'); field.className = 'slider-field';
  field.innerHTML = `<div class="field-heading"><label for="${key}" ${T(labelKey)}>${label}</label><div><input aria-label="${t('slider.numberAria', label)}" id="${key}-value" type="number" min="${min}" max="${max}" step="${step}" required value="${DEFAULTS[key]}"><span ${unitAttrs}>${unit}</span></div></div><input id="${key}" name="${key}" type="range" min="${min}" max="${max}" step="${step}" value="${DEFAULTS[key]}">`;
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

// Language-dependent text is kept as thunks (or small state) so a language switch re-renders it without
// regenerating anything; setters render immediately, exactly as the former direct textContent writes did.
type Msg = () => string;
let statusMsg: Msg = () => t('status.preparing');
let patternStatusMsg: Msg = () => t('pattern.autoIdle');
let patternWarningMsg: Msg | null = null;
let ioMsg: Msg | null = null;
let errorMsg: Msg | null = null;
let validationText = { errors: 0, warnings: 0, more: 0 };
let cameraMode: 'overview' | 'chase' = 'overview';
const setStatus = (fn: Msg) => { statusMsg = fn; $('status').textContent = fn(); };
const setPatternStatus = (fn: Msg) => { patternStatusMsg = fn; $('pattern-status').textContent = fn(); };
const setPatternWarning = (fn: Msg) => { patternWarningMsg = fn; $('pattern-warning').hidden = false; $('pattern-warning').textContent = fn(); };
function renderOrbitHint() {
  const hint = $('orbit-hint');
  if (cameraMode === 'overview') hint.innerHTML = `${t('hint.drag')} <span>·</span> ${t('hint.zoom')} <span>·</span> ${t('hint.pan')}`;
  else hint.textContent = t('hint.chase');
}
/** Re-render every language-dependent string (static strings are handled by applyStaticTranslations). */
function refreshLanguage() {
  const lang = getLanguage();
  for (const code of LANGUAGES) {
    const button = $(`lang-${code}`);
    button.setAttribute('aria-pressed', String(code === lang)); button.classList.toggle('active', code === lang);
  }
  $('status').textContent = statusMsg();
  $('pattern-status').textContent = patternStatusMsg();
  if (patternWarningMsg) $('pattern-warning').textContent = patternWarningMsg();
  if (ioMsg) $('io-message').textContent = ioMsg();
  if (errorMsg) $('error').textContent = errorMsg();
  $('camera-label').textContent = t(cameraMode === 'overview' ? 'camera.overview' : 'camera.chase');
  renderOrbitHint();
  $('coin-complete').textContent = t('coin.complete', COIN_COUNT);
  for (const key of Object.keys(labels) as SliderKey[]) {
    $(`${key}-value`).setAttribute('aria-label', t('slider.numberAria', t(labels[key][0])));
  }
  if (validationText.errors || validationText.warnings || lastValidation) {
    $('validation-counts').textContent = t('validation.counts', validationText.errors, validationText.warnings);
    const more = document.querySelector('#validation-violations .violation-more');
    if (more) more.textContent = t('validation.more', validationText.more);
  }
  if (view) view.renderer.domElement.setAttribute('aria-label', t('canvas.aria'));
}

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
    setStatus(() => t('status.waitingInput')); return;
  }
  if (JSON.stringify(readParams()) === JSON.stringify(track.params)) {
    showPatternReport();
    const seed = track.params.seed; setStatus(() => t('status.applied', seed)); return;
  }
  setStatus(() => t('status.pending'));
  regenerationTimer = setTimeout(() => generate(), 150);
}

function generate() {
  clearTimeout(regenerationTimer); regenerationTimer = undefined;
  setStatus(() => t('status.updating'));
  let prepared;
  try {
    const next = generateTrack(readParams());
    prepared = { next, nextPose: spawnVehicle(next), nextCoins: new CoinRun(next) };
  } catch (error) {
    clearInput();
    const detail = String(error instanceof Error ? error.message : error);
    const attempts = error instanceof PatternGenerationError ? error.attempts : null;
    setPatternWarning(() => t('warning.keepPrevious', detail));
    setPatternStatus(() => attempts !== null ? t('pattern.failed', attempts) : t('pattern.updateFailed'));
    setStatus(() => t('status.patternFailed')); return;
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
  const samples = track.points.length - 1, activeSeed = track.params.seed;
  setStatus(() => t('status.generated', samples, activeSeed));
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
  validationText = { errors, warnings, more: 0 };
  $('validation-counts').textContent = t('validation.counts', errors, warnings);
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
    validationText.more = result.violations.length - shown.length;
    li.textContent = t('validation.more', validationText.more); vlist.append(li);
  }
  lastValidation = { ok: result.ok, errors, warnings, checks: result.checks.length,
    failedChecks: result.checks.filter(c => !c.passed).map(c => c.id) };
}
function setIoMessage(fn: Msg, kind: 'ok' | 'error') {
  const el = $('io-message'); ioMsg = fn; el.hidden = false; el.textContent = fn(); el.className = `io-message ${kind}`;
}
function exportJson() {
  const json = serializeTrack(track);
  const digest: string = JSON.parse(json).integrity.digest;
  lastExportDigest = digest;
  const name = `tracklab-${track.params.seed}-${digest.slice(0, 8)}.json`;
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  setIoMessage(() => t('io.exported', name), 'ok');
  setStatus(() => t('io.exportedStatus', name));
}
function importFailure(reason: Msg) {
  const message: Msg = () => t('io.failed', reason());
  setIoMessage(message, 'error'); setStatus(message);
}
async function importJson(file: File) {
  let doc, params;
  try {
    doc = parseTrackDocument(await file.text());
    importTrack(doc, { verify: 'regenerate' });
    params = doc.params;
  } catch (error) {
    const reason = error instanceof TrackDocumentError ? error.message : error instanceof Error ? error.message : String(error);
    importFailure(() => reason); return;
  }
  const previous = track.params, before = generation;
  clearTimeout(regenerationTimer); regenerationTimer = undefined;
  writeParams(params); generate();
  if (generation === before) {
    writeParams(previous); showPatternReport();
    importFailure(() => t('io.reasonBuild')); return;
  }
  const contentDigest: string = JSON.parse(serializeTrack(track)).integrity.contentDigest;
  const sameBuild = exportTrack(track).generator.version === doc.generator.version;
  if (contentDigest !== doc.integrity.contentDigest) {
    importFailure(() => t('io.reasonDigest')); return;
  }
  const digest = doc.integrity.digest.slice(0, 8), version = doc.generator.version;
  const message: Msg = () => t('io.imported', params.seed, digest, sameBuild, version);
  setIoMessage(message, 'ok'); setStatus(message);
}
function showPatternReport() {
  $('pattern-warning').hidden = true; patternWarningMsg = null;
  const r = track.patternReport, auto = track.params.cornerPattern === 'auto';
  setPatternStatus(() => !r.inserted ? t(auto ? 'pattern.autoNone' : 'pattern.noneApplied')
    : t('pattern.applied', r.inserted, r.requested, r.patterns.map(m => m.kind === 's-curve'
      ? t('pattern.sCurve', m.curvatureChanges) : `${Math.abs(m.turnDegrees).toFixed(0)}°`).join(' / '), r.attempts, r.scale.toFixed(2)));
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
  cameraMode = mode;
  $('camera-label').textContent = t(mode === 'overview' ? 'camera.overview' : 'camera.chase');
  renderOrbitHint();
  view.renderer.domElement.focus({ preventScroll: true });
}

applyStaticTranslations(); refreshLanguage();
for (const code of LANGUAGES) $(`lang-${code}`).addEventListener('click', () => { setLanguage(code as Lang); refreshLanguage(); });

try {
  view = new TrackView($('viewport')); minimap = new Minimap($<HTMLCanvasElement>('minimap'));
  refreshLanguage();
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
  const detail = String(error instanceof Error ? error.message : error);
  $('error').hidden = false; errorMsg = () => t('error.startup', detail); $('error').textContent = errorMsg();
  setStatus(() => t('status.initFailed')); console.error(error);
}
