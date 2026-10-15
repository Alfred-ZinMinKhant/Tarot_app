/**
 * Fails (exit 1) unless data/cards.json holds all 78 cards with every field in both languages
 * and matches what `npm run build:cards` would generate.
 */
import { existsSync, readFileSync } from 'node:fs';

import { CARDS_JSON, readSources, REVIEW_JSON, serialise } from './lib/card-files';
import { buildCards, type CardReviewFile, validateCards, validateReview, validateSources } from './lib/cards';

if (!existsSync(CARDS_JSON)) {
  console.error('data/cards.json is missing — run `npm run build:cards`.');
  process.exit(1);
}
const raw = readFileSync(CARDS_JSON, 'utf8');
const sources = readSources();
const review = JSON.parse(readFileSync(REVIEW_JSON, 'utf8')) as CardReviewFile;
const errors = [...validateSources(sources), ...validateCards(JSON.parse(raw)), ...validateReview(review)];
if (raw !== serialise(buildCards(sources))) {
  errors.push('data/cards.json is out of date with data/cards/*.json — run `npm run build:cards`.');
}
if (errors.length) {
  console.error(`Card validation failed with ${errors.length} problem(s):`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}
console.log(
  `Card validation passed: 78 cards, every field present in English and Burmese; ${review.pending.length} cards awaiting native-speaker review.`,
);
