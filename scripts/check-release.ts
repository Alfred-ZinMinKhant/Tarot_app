/**
 * Checks the release environment before an EAS build: ads without real AdMob IDs, a secret
 * RevenueCat key, or empty legal contact details. Reads .env (real environment variables win).
 *
 *   npm run check:release                                 check the local .env
 *   eas env:pull production --path .env.production
 *   npm run check:release -- .env.production              check what EAS will build with
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { checkRelease, type Env } from './lib/release-check';

const root = join(__dirname, '..');
const file = process.argv[2] ?? '.env';

/** Minimal .env reader (KEY=value lines). */
function read(path: string): Env {
  const out: Env = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m) out[m[1]!] = m[2]!.replace(/^["']|["']$/g, '');
  }
  return out;
}

let fileEnv: Env = {};
try {
  fileEnv = read(join(root, file));
} catch {
  console.error(`Could not read ${file}.`);
  process.exit(1);
}

const { errors, warnings, notes } = checkRelease({ ...fileEnv, ...process.env });
for (const n of notes) console.log(`note     ${n}`);
for (const w of warnings) console.log(`warning  ${w}`);
for (const e of errors) console.log(`ERROR    ${e}`);
console.log(errors.length ? `\n${errors.length} problem(s) to fix before building.` : '\nRelease environment looks fine.');
process.exit(errors.length ? 1 : 0);
