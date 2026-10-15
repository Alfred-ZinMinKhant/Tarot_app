/**
 * Fails (exit 1) unless spreads, lessons, weekday signs and legal texts are complete in both
 * languages (see scripts/lib/content.ts for the rules).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  type ContentReviewFile,
  validateContentReview,
  validateLegal,
  validateLessons,
  validateSigns,
  validateSpreads,
} from './lib/content';

const read = (file: string): unknown => JSON.parse(readFileSync(join(__dirname, '..', 'data', file), 'utf8'));

const ids = (file: string) => (read(file) as { id: string }[]).map((x) => x.id);
const review = read('content.review.json') as ContentReviewFile;
const errors = [
  ...validateSpreads(read('spreads.json')),
  ...validateLessons(read('lessons.json')),
  ...validateSigns(read('weekday-signs.json')),
  ...validateLegal(read('legal.json')),
  ...validateContentReview(review, { lessons: ids('lessons.json'), signs: ids('weekday-signs.json') }),
];
if (errors.length) {
  console.error(`Content validation failed with ${errors.length} problem(s):`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}
console.log(
  `Content validation passed: spreads, lessons, weekday signs and legal texts are complete in English and Burmese; ${review.pending.length} items awaiting native-speaker review.`,
);
