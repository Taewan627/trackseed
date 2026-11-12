// Library entry point of the trackseed package: the generator, validator, metrics, exchange format and polyline path.
// Everything here is Node- and browser-safe (no DOM, no Node built-ins). The sub-path exports ("trackseed/core", ...) expose
// the same modules one by one.
export * from './core.js';
export * from './validate.js';
export * from './metrics.js';
export * from './schema.js';
export * from './polyline.js';
export { VERSION } from './version.js';
