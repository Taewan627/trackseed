// CI determinism check: contentDigest of fixed generation cases.
//
// Cases: seeds 0, 1, 42, 7 with cornerPattern auto and hairpin (the defaults for every other parameter).
//
// Default mode generates each case in-process from cli-dist/ (run `npm run build:cli` first) and
// prints { "seed-<n>-<pattern>": "<contentDigest>" } as JSON on stdout. It has no Node-only
// dependencies, so the same file runs unchanged under Node, Deno and Bun.
//
// --from-dir <dir>  Read <dir>/seed<n>-<pattern>.json instead of generating. Those files are the
//                   output of `node cli-dist/cli.js generate --seed <n> --set cornerPattern=<pattern>`.
// --auto-join <j>   Auto join of the generated cases: legacy (default; the v1.0.0 construction, the 8 digests of
//                   tests/fixtures/ci-golden-digests.json) or tangent (the current DEFAULTS join; golden
//                   tests/fixtures/ci-golden-digests-v1.1.json). Only affects module generation; with --from-dir the
//                   files decide (generate them with --set autoJoin=legacy, or without it for tangent). Corner-pattern
//                   cases are identical under both (the option is inert when a pattern is spliced).
// --check <file>    Compare with a golden JSON object of the same shape. Mismatches and missing keys
//                   are listed on stderr and the exit status is 1; a usage error exits with 2.
//
// Examples (from the repository root):
//   node scripts/ci-digests.mjs > tests/fixtures/ci-golden-digests.json
//   node scripts/ci-digests.mjs --from-dir "$RUNNER_TEMP/cli" --check tests/fixtures/ci-golden-digests.json
//   node scripts/ci-digests.mjs --auto-join tangent --check tests/fixtures/ci-golden-digests-v1.1.json
//   deno run -A scripts/ci-digests.mjs --check tests/fixtures/ci-golden-digests.json
//   bun scripts/ci-digests.mjs --check tests/fixtures/ci-golden-digests.json

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { generateTrack } from '../cli-dist/core.js';
import { exportTrack } from '../cli-dist/schema.js';

const SEEDS = [0, 1, 42, 7];
const PATTERNS = ['auto', 'hairpin'];

const args = typeof Deno !== 'undefined' ? Deno.args : process.argv.slice(2);
const USAGE = 'usage: ci-digests.mjs [--auto-join legacy|tangent] [--from-dir DIR] [--check GOLDEN.json]';

function usage(message) {
  console.error(`ci-digests: ${message}`);
  console.error(USAGE);
  process.exit(2);
}

function option(name) {
  const i = args.indexOf(name);
  if (i < 0) return undefined;
  if (i + 1 >= args.length || args[i + 1].startsWith('--')) usage(`${name} needs a value`);
  return args[i + 1];
}

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--from-dir' || args[i] === '--check' || args[i] === '--auto-join') { i++; continue; }
  usage(`unknown argument "${args[i]}"`);
}

const caseKey = (seed, pattern) => `seed-${seed}-${pattern}`;

const autoJoin = option('--auto-join') ?? 'legacy';
if (autoJoin !== 'legacy' && autoJoin !== 'tangent') usage(`--auto-join must be legacy or tangent, got "${autoJoin}"`);

function digestsFromModules() {
  const out = {};
  for (const seed of SEEDS) {
    for (const pattern of PATTERNS) {
      out[caseKey(seed, pattern)] = exportTrack(generateTrack({ seed, cornerPattern: pattern, autoJoin })).integrity.contentDigest;
    }
  }
  return out;
}

function digestsFromDir(dir) {
  const out = {};
  for (const seed of SEEDS) {
    for (const pattern of PATTERNS) {
      const file = join(dir, `seed${seed}-${pattern}.json`);
      if (!existsSync(file)) {
        console.error(`ci-digests: missing ${file}`);
        process.exit(1);
      }
      out[caseKey(seed, pattern)] = JSON.parse(readFileSync(file, 'utf8')).integrity.contentDigest;
    }
  }
  return out;
}

const fromDir = option('--from-dir');
const golden = option('--check');

const digests = fromDir !== undefined ? digestsFromDir(fromDir) : digestsFromModules();
console.log(JSON.stringify(digests, null, 2));

if (golden !== undefined) {
  const expected = JSON.parse(readFileSync(golden, 'utf8'));
  const keys = [...new Set([...Object.keys(expected), ...Object.keys(digests)])];
  const bad = keys.filter(k => digests[k] !== expected[k]);
  if (bad.length > 0) {
    for (const k of bad) console.error(`MISMATCH ${k}: got ${digests[k]}, expected ${expected[k]}`);
    console.error(`ci-digests: ${bad.length} of ${keys.length} digests differ from ${golden}`);
    process.exitCode = 1;
  } else {
    console.error(`ci-digests: all ${keys.length} digests match ${golden}`);
  }
}
