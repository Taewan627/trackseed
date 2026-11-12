// Parameter values whose DEFAULTS changed after v1.0.0 (autoJoin in v1.1, height in v1.1/E8). Spread into params of runners whose committed results predate the change so they reproduce; see REPRODUCE.md.
export const V100_PIN = Object.freeze({ autoJoin: 'legacy', height: 80 });
