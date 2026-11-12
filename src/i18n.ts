// UI-only dictionary: English (default) and Korean. Nothing here touches generation, validation or
// export. Korean values are the original strings of the Korean-only UI, kept verbatim.
//
// Language resolution order: ?lang=en|ko in the URL, then localStorage ('tracklab-lang'), then English.
// Every storage access is wrapped in try/catch (private mode, blocked storage, sandboxed iframes).

export type Lang = 'en' | 'ko';
export const LANGUAGES: readonly Lang[] = ['en', 'ko'];
export const LANG_STORAGE_KEY = 'tracklab-lang';

const en = {
  'meta.description': 'TrackLab Lite — a local 3D lab for procedural track generation and manual driving',
  'brand.aria': 'TrackLab Lite home',
  'lang.group.aria': 'Language',
  'panel.title': 'Track Lab',
  'panel.subtitle': 'Changes apply automatically.',
  'sec.shape': 'Track shape',
  'sec.cornerPattern': 'Corner pattern',
  'sec.environment': 'Environment',
  'sec.io': 'JSON import / export',
  'sec.validation': 'Validation',
  'cornerPattern.label': 'Corner pattern',
  'cornerPattern.auto': 'Auto (original generator)',
  'cornerPattern.rightAngle': 'Right angle (90° L-corner)',
  'cornerPattern.hairpin': 'Hairpin (U-turn)',
  'cornerPattern.sCurve': 'S-curve (curvature reversal)',
  'autoJoin.label': 'Straight joins',
  'autoJoin.tangent': 'Tangent (v1.1, default)',
  'autoJoin.legacy': 'Legacy (v1.0)',
  'autoJoin.inert': 'Not used with a corner pattern: the track is built with the Legacy (v1.0) join.',
  'scene.label': 'Background type',
  'scene.nature': 'Nature',
  'scene.city': 'City',
  'scene.mixed': 'Mixed',
  'io.fileAria': 'Select track JSON file',
  'seed.note': 'Same value, same track',
  'seed.shuffleAria': 'Generate a track with a new seed',
  'seed.shuffleTitle': 'Generate with a new seed [R]',
  'reset.label': 'Reset to defaults',
  'sidebar.note': 'Generated entirely in the browser.<br>No model download · no API connection',
  'camera.groupAria': 'Camera mode',
  'camera.overview': 'Full track',
  'camera.chase': 'Vehicle chase',
  'hint.drag': 'Drag to rotate',
  'hint.zoom': 'Scroll to zoom',
  'hint.pan': 'Right-click to pan',
  'hint.chase': '↑ accelerate · ← → steer · Space brake',
  'minimap.aria': 'Live minimap',
  'minimap.canvasAria': 'Track outline and current vehicle position',
  'minimap.vehicle': 'Vehicle',
  'minimap.start': 'Start',
  'canvas.aria': '3D track driving view. Drive with the arrow keys, switch camera with C',
  'coin.complete': (n: number) => `All ${n} coins collected!`,
  'coin.hudAria': 'Collected coins',
  'metrics.aria': 'Generated track information',
  'ready.hint': 'Click the view, then use the arrow keys to start',
  'controls.drive': 'Accelerate / reverse',
  'controls.steer': 'Steer',
  'controls.brake': 'Brake',
  'controls.camera': 'Camera',
  'controls.newTrack': 'New track',
  'slider.numberAria': (label: string) => `${label} numeric input`,
  'slider.curves': 'Segments', 'slider.straight': 'Straight ratio', 'slider.width': 'Track width',
  'slider.size': 'Overall size', 'slider.height': 'Elevation amplitude', 'slider.obstacles': 'Obstacles',
  'slider.density': 'Scenery density', 'slider.cornerCount': 'Corner count', 'slider.cornerStrength': 'Corner strength',
  'unit.count': 'count',
  // status line
  'status.preparing': 'Preparing track…',
  'status.waitingInput': 'Waiting for input · applies automatically once the number is complete',
  'status.applied': (seed: number) => `Generated · current settings applied · Seed ${seed}`,
  'status.pending': 'Update pending · 150 ms after last input',
  'status.updating': 'Updating track…',
  'status.generated': (samples: number, seed: number) =>
    `Generated · ${samples} samples · Seed ${seed} · vehicle safely respawned / speed 0`,
  'status.patternFailed': 'Pattern application failed · previous track kept',
  'status.initFailed': 'Initialization failed',
  'error.startup': (detail: string) =>
    `Cannot start the 3D view. Check that your browser supports WebGL 2 and that hardware acceleration is enabled. ${detail}`,
  'warning.keepPrevious': (detail: string) =>
    `${detail} · Keeping the previous track and coin state. Reduce the count/width or select Auto.`,
  // pattern status
  'pattern.autoNone': 'Auto · original generation method (no special pattern applied)',
  'pattern.noneApplied': '0 patterns · original generation method (no special pattern applied)',
  'pattern.autoIdle': 'Auto · original generation method',
  'pattern.failed': (attempts: number) => `0 requested patterns applied · ${attempts} checks failed · previous track kept`,
  'pattern.updateFailed': 'Track update failed',
  'pattern.sCurve': (changes: number) => `S-curve: ${changes} curvature reversal${changes === 1 ? '' : 's'}`,
  'pattern.applied': (inserted: number, requested: number, kinds: string, attempts: number, scale: string) =>
    `${inserted} / ${requested} applied · ${kinds} · road/sidewalk checks passed · ${attempts} attempt${attempts === 1 ? '' : 's'} · layout scale ×${scale}`,
  // validation
  'validation.counts': (errors: number, warnings: number) => `Errors ${errors} · Warnings ${warnings}`,
  'validation.more': (n: number) => `… and ${n} more`,
  // import / export
  'io.exported': (name: string) => `Exported · ${name}`,
  'io.exportedStatus': (name: string) => `JSON exported · ${name}`,
  'io.failed': (reason: string) => `Import failed · ${reason} · previous track kept`,
  'io.reasonBuild': 'this build could not generate the track',
  'io.reasonDigest': 'regenerated digest differs from the document',
  'io.imported': (seed: number, digest: string, sameBuild: boolean, version: string) =>
    `Imported · Seed ${seed} · digest ${digest} ${sameBuild ? 'regeneration matches' : `(generator v${version}, regeneration verified)`}`,
};

type Dict = typeof en;
export type Key = keyof Dict;

const ko: Dict = {
  'meta.description': 'TrackLab Lite — 절차적 트랙 생성과 직접 주행을 위한 로컬 3D 실험실',
  'brand.aria': 'TrackLab Lite 홈',
  'lang.group.aria': '언어',
  'panel.title': '트랙 실험실',
  'panel.subtitle': '조건을 조절하면 자동 반영됩니다.',
  'sec.shape': '트랙 형태',
  'sec.cornerPattern': 'Corner Pattern',
  'sec.environment': '환경 설정',
  'sec.io': 'JSON 입출력',
  'sec.validation': 'Validation',
  'cornerPattern.label': '코너 패턴',
  'cornerPattern.auto': 'Auto · 기존 생성',
  'cornerPattern.rightAngle': '90° · L자 코너',
  'cornerPattern.hairpin': 'Hairpin · U자 헤어핀',
  'cornerPattern.sCurve': 'S-Curve · S자 코너',
  'autoJoin.label': '직선 연결',
  'autoJoin.tangent': '접선 연결 (v1.1, 기본)',
  'autoJoin.legacy': '기존 방식 (v1.0)',
  'autoJoin.inert': '코너 패턴 사용 시 적용되지 않음: 기존 방식(v1.0)으로 생성됩니다.',
  'scene.label': '배경 종류',
  'scene.nature': 'Nature · 자연',
  'scene.city': 'City · 도시',
  'scene.mixed': 'Mixed · 혼합',
  'io.fileAria': '트랙 JSON 파일 선택',
  'seed.note': '같은 값, 같은 트랙',
  'seed.shuffleAria': '새 Seed로 트랙 생성',
  'seed.shuffleTitle': '새 Seed로 생성 [R]',
  'reset.label': '기본값으로 초기화',
  'sidebar.note': '브라우저 안에서 생성됩니다.<br>모델 다운로드 · API 연결 없음',
  'camera.groupAria': '카메라 모드',
  'camera.overview': '전체 트랙',
  'camera.chase': '차량 추적',
  'hint.drag': '드래그 회전',
  'hint.zoom': '휠 확대',
  'hint.pan': '우클릭 이동',
  'hint.chase': '↑ 가속 · ← → 직접 조향 · Space 브레이크',
  'minimap.aria': '실시간 미니맵',
  'minimap.canvasAria': '트랙 윤곽과 실제 차량 위치',
  'minimap.vehicle': '차량',
  'minimap.start': '시작점',
  'canvas.aria': '3D 트랙 주행 화면. 방향키로 운전, C로 카메라 전환',
  'coin.complete': (n: number) => `코인 ${n}개를 모두 모았습니다!`,
  'coin.hudAria': '획득 코인',
  'metrics.aria': '생성된 트랙 정보',
  'ready.hint': '화면 클릭 후 방향키로 출발',
  'controls.drive': '가속 / 후진',
  'controls.steer': '조향',
  'controls.brake': '브레이크',
  'controls.camera': '카메라',
  'controls.newTrack': '새 트랙',
  'slider.numberAria': (label: string) => `${label} 숫자 입력`,
  'slider.curves': '구간 수', 'slider.straight': '직선 비율', 'slider.width': '트랙 폭',
  'slider.size': '전체 크기', 'slider.height': '고저차 진폭', 'slider.obstacles': '장애물 수',
  'slider.density': '배경 밀도', 'slider.cornerCount': '코너 개수', 'slider.cornerStrength': '코너 강도',
  'unit.count': '개',
  'status.preparing': '트랙 준비 중…',
  'status.waitingInput': '입력 대기 · 숫자를 완성하면 자동 적용됩니다',
  'status.applied': (seed: number) => `생성 완료 · 현재 설정 적용됨 · Seed ${seed}`,
  'status.pending': '자동 갱신 대기 · 마지막 입력 후 150ms',
  'status.updating': '트랙 갱신 중…',
  'status.generated': (samples: number, seed: number) =>
    `생성 완료 · ${samples} samples · Seed ${seed} · 차량 안전 재배치 / 속도 0`,
  'status.patternFailed': '패턴 적용 실패 · 이전 트랙 유지',
  'status.initFailed': '초기화 실패',
  'error.startup': (detail: string) =>
    `3D 화면을 시작할 수 없습니다. WebGL 2를 지원하는 브라우저와 하드웨어 가속을 확인해 주세요. ${detail}`,
  'warning.keepPrevious': (detail: string) =>
    `${detail} · 이전 트랙과 코인 상태를 유지합니다. 개수/폭을 줄이거나 Auto를 선택하세요.`,
  'pattern.autoNone': 'Auto · 기존 생성 방식 (특수 패턴 미적용)',
  'pattern.noneApplied': '0개 · 기존 생성 방식 (특수 패턴 미적용)',
  'pattern.autoIdle': 'Auto · 기존 생성 방식',
  'pattern.failed': (attempts: number) => `요청 패턴 0개 적용 · ${attempts}회 검사 실패 · 이전 트랙 유지`,
  'pattern.updateFailed': '트랙 갱신 실패',
  'pattern.sCurve': (changes: number) => `S 곡률 반전 ${changes}회`,
  'pattern.applied': (inserted: number, requested: number, kinds: string, attempts: number, scale: string) =>
    `${inserted} / ${requested}개 적용 · ${kinds} · 도로/보도 검사 통과 · ${attempts}회 시도 · 공간 ${scale}배`,
  'validation.counts': (errors: number, warnings: number) => `오류 ${errors} · 경고 ${warnings}`,
  'validation.more': (n: number) => `… 외 ${n}건`,
  'io.exported': (name: string) => `내보내기 완료 · ${name}`,
  'io.exportedStatus': (name: string) => `JSON 내보내기 완료 · ${name}`,
  'io.failed': (reason: string) => `가져오기 실패 · ${reason} · 이전 트랙을 유지합니다`,
  'io.reasonBuild': '현재 빌드에서 트랙을 생성하지 못했습니다',
  'io.reasonDigest': '재생성된 digest가 문서와 다릅니다',
  'io.imported': (seed: number, digest: string, sameBuild: boolean, version: string) =>
    `가져오기 완료 · Seed ${seed} · digest ${digest} ${sameBuild ? '재생성 일치' : `(생성기 v${version}, 재생성 검증됨)`}`,
};

const dictionaries: Record<Lang, Dict> = { en, ko };

const isLang = (value: unknown): value is Lang => value === 'en' || value === 'ko';

/** URL parameter first, then localStorage, then English. Never throws. */
export function resolveLanguage(): Lang {
  try {
    const fromUrl = new URLSearchParams(location.search).get('lang');
    if (isLang(fromUrl)) return fromUrl;
  } catch { /* fall through */ }
  try {
    const stored = localStorage.getItem(LANG_STORAGE_KEY);
    if (isLang(stored)) return stored;
  } catch { /* storage unavailable: default */ }
  return 'en';
}

let current: Lang = resolveLanguage();
export const getLanguage = (): Lang => current;

/** Translate `key` in the current language; parameterised messages take their arguments after the key. */
export function t<K extends Key>(key: K, ...args: Dict[K] extends (...a: infer A) => string ? A : []): string {
  const entry = dictionaries[current][key] as string | ((...a: unknown[]) => string);
  return typeof entry === 'function' ? entry(...args) : entry;
}

/** Attribute helpers for the static template (re-applied by applyStaticTranslations). */
export const textAttr = (key: Key) => `data-i18n="${key}"`;
export const htmlAttr = (key: Key) => `data-i18n-html="${key}"`;
/** `attrs` is a list of [attribute, key] pairs, e.g. [['aria-label', 'brand.aria']]. */
export const attrAttr = (...attrs: Array<[string, Key]>) => `data-i18n-attr="${attrs.map(([a, k]) => `${a}:${k}`).join(';')}"`;

/**
 * Re-translate every element marked with data-i18n (replaces the first non-blank text node, so child
 * elements such as <span> or <kbd> are preserved), data-i18n-html (trusted dictionary markup) and
 * data-i18n-attr. Parameterless keys only.
 */
export function applyStaticTranslations(root: ParentNode = document): void {
  const text = (key: string) => (t as (k: string) => string)(key);
  for (const el of root.querySelectorAll<HTMLElement>('[data-i18n]')) {
    const value = text(el.dataset.i18n!);
    const node = [...el.childNodes].find(n => n.nodeType === Node.TEXT_NODE && n.nodeValue!.trim() !== '');
    if (node) {
      const old = node.nodeValue!;
      node.nodeValue = `${/^\s*/.exec(old)![0]}${value}${/\s*$/.exec(old)![0]}`;
    } else el.prepend(value);
  }
  for (const el of root.querySelectorAll<HTMLElement>('[data-i18n-html]')) el.innerHTML = text(el.dataset.i18nHtml!);
  for (const el of root.querySelectorAll<HTMLElement>('[data-i18n-attr]')) {
    for (const pair of el.dataset.i18nAttr!.split(';')) {
      const [attr, key] = pair.split(':');
      el.setAttribute(attr, text(key));
    }
  }
  document.documentElement.lang = current;
  document.querySelector('meta[name="description"]')?.setAttribute('content', t('meta.description'));
}

/**
 * Switch language: persists the choice (try/catch), mirrors it into an existing ?lang= parameter so a reload
 * keeps the choice, and re-applies the static translations. Callers refresh their dynamic text afterwards.
 */
export function setLanguage(lang: Lang): void {
  current = lang;
  try { localStorage.setItem(LANG_STORAGE_KEY, lang); } catch { /* storage unavailable: choice lasts for this page view */ }
  try {
    const url = new URL(location.href);
    if (url.searchParams.has('lang')) { url.searchParams.set('lang', lang); history.replaceState(history.state, '', url); }
  } catch { /* ignore */ }
  applyStaticTranslations();
}
