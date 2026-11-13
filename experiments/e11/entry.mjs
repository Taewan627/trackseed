// E11 bundle entry (esbuild, see build.sh): the generator, the web interface's vehicle model, metrics and validator, from src/ at HEAD.
export { generateTrack, project, DEFAULTS } from '../../src/core.ts';
export { spawnVehicle, updateVehicle } from '../../src/vehicle.ts';
export { computeMetrics } from '../../src/metrics.ts';
export { validateTrack } from '../../src/validate.ts';
export { VERSION } from '../../src/version.ts';
