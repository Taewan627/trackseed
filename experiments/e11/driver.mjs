// E11 scripted driver (PROTOCOL.md section 2): pure-pursuit steering converted to key taps (sigma-delta duty cycle), a speed rule from the
// full-lock turning radius of src/vehicle.ts, and an optional reaction delay. One decision per physics step (1/120 s, as src/main.ts).
import { project, spawnVehicle, updateVehicle } from './build/e11.mjs';

export const DT = 1 / 120;
export const PROFILES = { D0: { delay: 0, f: 1.0 }, D1: { delay: 0.2, f: 1.0 }, D2: { delay: 0.2, f: 1.5 } };
const LOOK_MIN = 20, LOOK_T = 0.35, MAX_TIME = 400, STUCK_TIME = 15;

const deltaMax = v => 0.48 / (1 + Math.max(Math.abs(v), 1) / 115);   // vehicle.ts full-lock steering angle
/** Highest speed whose full-lock turning radius 11 / tan(deltaMax(v)) is at most R / f; 8 if even a standing car cannot. */
export function speedForRadius(R, f) {
  const need = Math.atan(11 * f / R);
  return need >= 0.48 ? 8 : Math.min(160, 115 * (0.48 / need - 1));
}

/** Arc lengths and the radius of the circle through vertices i-2, i, i+2 of the closed centre line. */
export function prepare(track) {
  const P = track.points, n = P.length - 1, s = [0];
  for (let i = 0; i < n; i++) s.push(s[i] + Math.hypot(P[i + 1].x - P[i].x, P[i + 1].z - P[i].z));
  const R = new Array(n);
  for (let i = 0; i < n; i++) {
    const a = P[(i - 2 + n) % n], b = P[i], c = P[(i + 2) % n];
    const ab = Math.hypot(b.x - a.x, b.z - a.z), bc = Math.hypot(c.x - b.x, c.z - b.z), ca = Math.hypot(a.x - c.x, a.z - c.z);
    const cross = Math.abs((b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x));
    R[i] = cross < 1e-9 ? Infinity : (ab * bc * ca) / (2 * cross);
  }
  return { P, n, s, L: s[n], R };
}

function pointAt(g, dist) {
  const d = ((dist % g.L) + g.L) % g.L;
  let lo = 0, hi = g.n;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (g.s[m] <= d) lo = m; else hi = m; }
  const t = (d - g.s[lo]) / ((g.s[lo + 1] - g.s[lo]) || 1), a = g.P[lo], b = g.P[lo + 1];
  return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, i: lo };
}

/** One lap from the spawn pose. Returns the measures of PROTOCOL.md section 4. */
export function drive(track, { delay, f }) {
  const g = prepare(track), car = spawnVehicle(track), hist = [], lag = Math.round(delay / DT);
  const along = pr => g.s[pr.index] + pr.t * (g.s[pr.index + 1] - g.s[pr.index]);
  let sPrev = along(project(track, car.x, car.z, car.roadIndex)), progress = 0, steps = 0;
  let contacts = 0, contactSteps = 0, wasContact = false, brakeSteps = 0, reversals = 0, lastSteer = 0, acc = 0, lastProg = 0, lastProgStep = 0;
  const input = { throttle: false, reverse: false, left: false, right: false, brake: false };
  let end = 'timeout';
  while (steps * DT < MAX_TIME) {
    const sCar = along(project(track, car.x, car.z, car.roadIndex));
    let ds = sCar - sPrev; if (ds < -g.L / 2) ds += g.L; if (ds > g.L / 2) ds -= g.L;
    progress += ds; sPrev = sCar;
    if (progress >= g.L) { end = 'finished'; break; }
    if (progress > lastProg + 1) { lastProg = progress; lastProgStep = steps; }
    if ((steps - lastProgStep) * DT > STUCK_TIME) { end = 'stuck'; break; }
    hist.push({ x: car.x, z: car.z, heading: car.heading, speed: car.speed, s: sCar });
    if (hist.length > lag + 1) hist.shift();
    const o = hist[0];                                   // the state observed `delay` seconds ago (the oldest kept)
    const v = Math.abs(o.speed), Ld = Math.max(LOOK_MIN, LOOK_T * v);
    const tg = pointAt(g, o.s + Ld);
    let alpha = Math.atan2(tg.x - o.x, tg.z - o.z) - o.heading;
    alpha = Math.atan2(Math.sin(alpha), Math.cos(alpha));
    const delta = Math.atan(11 * 2 * Math.sin(alpha) / Ld);
    acc += Math.max(-1, Math.min(1, delta / deltaMax(v)));
    const steer = acc >= 0.5 ? 1 : acc <= -0.5 ? -1 : 0;
    acc -= steer;
    input.left = steer > 0; input.right = steer < 0;
    if (steer !== 0) { if (lastSteer !== 0 && steer !== lastSteer) reversals++; lastSteer = steer; }
    let rAhead = Infinity;
    const preview = v * v / 300 + 30;
    for (let d = 0; d <= preview; d += 3) { const q = pointAt(g, o.s + d); if (g.R[q.i] < rAhead) rAhead = g.R[q.i]; }
    const vt = speedForRadius(rAhead, f);
    input.throttle = v < vt - 2; input.brake = v > vt + 2;
    if (input.brake) brakeSteps++;
    updateVehicle(car, input, track, DT);
    steps++;
    const contact = car.collision === 0.25;
    if (contact) { contactSteps++; if (!wasContact) contacts++; }
    wasContact = contact;
  }
  const time = steps * DT;
  return {
    end, L: g.L, time, progress: Math.min(progress, g.L), meanSpeed: end === 'finished' ? g.L / time : null,
    contacts, contactsPerKm: contacts / (g.L / 1000), contactTime: contactSteps * DT, brakeTime: brakeSteps * DT,
    reversalsPerMin: time > 0 ? reversals / (time / 60) : 0,
  };
}
