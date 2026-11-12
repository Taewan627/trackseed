// Validator v1.3 added two checks on by default in mode 'kink': SHARP_VERTEX (an error, option sharpVertexDegrees) and UNDERSAMPLED (a warning, option
// undersampledCheck). Spread into the options of every validateTrack call of a runner whose committed results predate v1.3, so that they reproduce
// (the report is then identical to the v1.2.0 report, checks included); see docs/validator.md, "Absolute per-vertex rule and sampling diagnostic".
export const V12_VALIDATOR_PIN = Object.freeze({ sharpVertexDegrees: Infinity, undersampledCheck: false });
