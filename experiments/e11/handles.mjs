// E11 handles (PROTOCOL.md section 3), shared by run.mjs and analyze.mjs. One factor at a time around the defaults; the default track ({}) is the
// shared middle level. Levels are listed from low to high; the last level is "high" in the effect of PROTOCOL.md section 4
// (width is listed 80 -> 20 so that high = narrow, the direction expected to be harder; for straight, high = 0.6 is expected to be easier).
const HP = (count, strength) => ({ cornerPattern: 'hairpin', cornerCount: count, cornerStrength: strength });
export const HANDLES = {
  straight: [[0, { straight: 0 }], [0.1, { straight: 0.1 }], [0.25, {}], [0.4, { straight: 0.4 }], [0.6, { straight: 0.6 }]],
  curves: [[3, { curves: 3 }], [4, { curves: 4 }], [6, {}], [8, { curves: 8 }], [10, { curves: 10 }]],
  height: [[0, { height: 0 }], [20, {}], [80, { height: 80 }], [200, { height: 200 }]],
  width: [[80, { width: 80 }], [60, { width: 60 }], [40, {}], [30, { width: 30 }], [20, { width: 20 }]],
  hairpins: [[0, {}], [1, HP(1, 60)], [2, HP(2, 60)], [3, HP(3, 60)]],
  hairpinStrength: [[20, HP(2, 20)], [60, HP(2, 60)], [100, HP(2, 100)]],
};
export const HANDLES_FOR_ANALYSIS = HANDLES;
