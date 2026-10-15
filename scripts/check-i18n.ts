/**
 * Fails (exit 1) when en.json and my.json drift apart.
 *
 *   npm run check:i18n          verify
 *   npm run i18n:mark-pending   list every new Burmese key in my.review.json → "pending"
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { checkLocales, type Json, type ReviewFile, syncReview } from './lib/i18n-check';

const dir = join(__dirname, '..', 'locales');
const read = <T = Json>(file: string): T => JSON.parse(readFileSync(join(dir, file), 'utf8')) as T;

const en = read('en.json');
const my = read('my.json');
let review = read<ReviewFile>('my.review.json');

if (process.argv.includes('--mark-pending')) {
  review = syncReview(my, review);
  writeFileSync(join(dir, 'my.review.json'), JSON.stringify(review, null, 2) + '\n');
  console.log(`my.review.json: ${review.pending.length} pending, ${review.reviewed.length} reviewed`);
}

const errors = checkLocales(en, my, review);
if (errors.length) {
  console.error(`i18n check failed with ${errors.length} problem(s):`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}
console.log(
  `i18n check passed: keys match; ${review.pending.length} Burmese strings awaiting native-speaker review.`,
);
