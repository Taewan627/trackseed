// Bundled so that compare.mjs can call sanitize() under plain Node (core.ts imports './detmath.js', which Node cannot resolve from .ts sources).
export { sanitize } from '../../../src/core.ts';
