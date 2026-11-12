// AMENDMENT-01 copy of e1b/entry.mjs (validator v0.5.1 default mode). E1b bundle entry: legacy v0.4 generateTrack + v0.5 validateTrack on the 1000 E1 cases.
import { generateTrack } from '@legacy/core.ts';
import { validateTrack } from '../../../src/validate.ts';
import { V12_VALIDATOR_PIN } from '../../_v12-validator.mjs';
import { CASES } from '../../e1/cases.mjs';

const KIND = { tree: 'T', bench: 'B', lamp: 'L', building: 'U' };

export function record(params) {
  let track;
  try { track = generateTrack(params); } catch (e) { return { throw: (e && e.name) || 'Error' }; }
  const v = validateTrack(track, V12_VALIDATOR_PIN); // pin: validator v1.3 checks off (experiments/_v12-validator.mjs); the rule is the current default 'kink', not the v0.5.1 default of the committed run
  const pr = track.patternReport;
  return {
    throw: null,
    nPoints: track.points.length,
    inserted: pr.inserted, attempts: pr.attempts, scale: pr.scale,
    straightSegments: track.straightSegments.map(b => (b ? 1 : 0)).join(''),
    straightCount: track.straightSegments.filter(Boolean).length,
    propCount: track.props.length,
    propKinds: track.props.map(p => KIND[p.kind] ?? '?').join(''),
    obstacleCount: track.obstacles.length,
    ok: v.ok,
    codes: [...new Set(v.violations.map(x => x.code))].sort().join(','),
    // secondary (exploratory)
    checkFailures: v.checks.map(c => `${c.id}:${c.failures}`).join(' '),
    length: track.length,
  };
}

export function runE1b() {
  return { generator: '0.4-legacy@6fea4d6 + v0.5 validateTrack', cases: CASES.map(c => ({ id: c.id, rec: record(c.params) })) };
}
export default runE1b;
