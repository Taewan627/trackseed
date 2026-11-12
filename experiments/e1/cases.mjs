// Fixed E1 case set; see PROTOCOL.md. 200 seeds x 5 configurations = 1000 cases.
import { sha256 } from '../../src/sha256.ts';
import { V100_PIN } from '../_v100-params.mjs';

const FIXED = [0, 1, 2, 3, 7, 42, 100, 1234, 12345, 65535, 65536, 99999, 1000000, 16777216, 2147483646, 2147483647];
const SEEDS_SHA256 = '5c5e64d680cecf26dacdad15c0766f498c9c85a997c0df1531b49e5a327a9f07';

function mulberry32(seed) { // identical to random() in src/core.ts
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const SEEDS = (() => {
  const r = mulberry32(20261111), seeds = [...FIXED];
  while (seeds.length < 200) { const v = Math.floor(r() * 2147483648); if (!seeds.includes(v)) seeds.push(v); }
  return seeds;
})();
if (sha256(JSON.stringify(SEEDS)) !== SEEDS_SHA256) throw new Error('E1 seed list does not match PROTOCOL.md');

export const CONFIGS = [
  ['auto', {}],
  ['right-angle', { cornerPattern: 'right-angle', cornerCount: 2, cornerStrength: 60 }],
  ['hairpin', { cornerPattern: 'hairpin', cornerCount: 1, cornerStrength: 80 }],
  ['s-curve', { cornerPattern: 's-curve', cornerCount: 3, cornerStrength: 40, curves: 8 }],
  ['extreme', { curves: 10, size: 3, width: 80, height: 200, obstacles: 8, density: 20 }],
];

// height: the v1.0.0 default (80) is pinned where a configuration leaves it unset; explicit values (extreme: 200) win.
// Only height is taken from V100_PIN here: autoJoin is set by each entry (v1.0.0 entries pin 'legacy'; entry-v05 and the
// v0.5/tangent subjects keep the default), so this list must not change it.
export const CASES = CONFIGS.flatMap(([cid, over]) => SEEDS.map(seed => ({ id: `${cid}:${seed}`, params: { height: V100_PIN.height, ...over, seed } })));
if (CASES.length !== 1000) throw new Error('expected 1000 cases');

/** digestOf(params) -> hex string; thrown errors become THROW:<name>. */
export function runCases(digestOf, generatorVersion) {
  const cases = CASES.map(c => {
    let digest;
    try { digest = digestOf(c.params); } catch (e) { digest = 'THROW:' + (e && e.name || 'Error'); }
    return { id: c.id, digest };
  });
  return { generatorVersion, selfTest: sha256('abc') === 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad', cases };
}
