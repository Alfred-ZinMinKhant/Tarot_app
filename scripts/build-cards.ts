/**
 * Generates data/cards.json from src/data/deck.ts + data/cards/*.json.
 *
 *   npm run build:cards
 */
import { writeFileSync } from 'node:fs';

import { CARDS_JSON, readSources, serialise } from './lib/card-files';
import { buildCards, validateCards, validateSources } from './lib/cards';

const sources = readSources();
const sourceErrors = validateSources(sources);
const cards = buildCards(sources);
writeFileSync(CARDS_JSON, serialise(cards));

const errors = [...sourceErrors, ...validateCards(cards)];
console.log(`Wrote ${cards.length} cards to data/cards.json`);
if (errors.length) {
  console.error(`${errors.length} problem(s):`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}
