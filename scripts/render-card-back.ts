/**
 * Exports the original card-back artwork (src/components/art/cardBackSvg.ts) as SVG and PNG for
 * documentation and store assets.
 *
 *   npm run render:card-back
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import sharp from 'sharp';

import { CARD_BACK_SVG } from '../src/components/art/cardBackSvg';

const out = join(__dirname, '..', 'assets', 'images');
mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'card-back.svg'), CARD_BACK_SVG + '\n');
sharp(Buffer.from(CARD_BACK_SVG))
  .resize(900)
  .png()
  .toFile(join(out, 'card-back.png'))
  .then(() => console.log('Wrote assets/images/card-back.svg and card-back.png'));
