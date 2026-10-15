/**
 * Renders the original app icon set and Play Store graphics from code (no third-party art):
 * two tarot cards with a crescent moon and stars, gold on midnight indigo.
 *
 *   npm run render:icons
 *
 * Writes assets/images/{icon,android-icon-*,splash-icon,favicon}.png and
 * store/graphics/{app-store-icon-1024,play-icon-512,feature-graphic}.png.
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

import sharp from 'sharp';

const GOLD = '#D4AF37';
const INDIGO = '#14102B';
const MIDNIGHT = '#2A1B54';
const IVORY = '#F8F1E4';
const TEAL = '#4FB6A8';

const images = join(__dirname, '..', 'assets', 'images');
const store = join(__dirname, '..', 'store', 'graphics');

const sparkle = (x: number, y: number, s: number, fill: string) =>
  `<path d="M${x} ${y - s} Q${x} ${y} ${x + s} ${y} Q${x} ${y} ${x} ${y + s} Q${x} ${y} ${x - s} ${y} Q${x} ${y} ${x} ${y - s}Z" fill="${fill}"/>`;

/** A waxing-crescent shape opening to the right: outer half-circle, shallower inner arc back. */
const crescent = (cx: number, cy: number, r: number, fill: string) =>
  `<path d="M${cx} ${cy - r} A${r} ${r} 0 0 0 ${cx} ${cy + r} A${r * 1.35} ${r * 1.35} 0 0 1 ${cx} ${cy - r}Z" fill="${fill}"/>`;

/** The two-card glyph, drawn in a 1024 box. `mono` = single-colour silhouette. */
function glyph(mono?: string): string {
  const gold = mono ?? GOLD;
  const face = mono ? 'none' : MIDNIGHT;
  const back = mono ? 'none' : '#3A2A6B';
  return `
  <g transform="rotate(12 512 540)">
    <rect x="352" y="250" width="340" height="540" rx="34" fill="${back}" stroke="${gold}" stroke-width="18" opacity="${mono ? 1 : 0.75}"/>
  </g>
  <g transform="rotate(-8 512 520)">
    <rect x="322" y="222" width="360" height="580" rx="36" fill="${face}" stroke="${gold}" stroke-width="22"/>
    <rect x="356" y="256" width="292" height="512" rx="20" fill="none" stroke="${gold}" stroke-width="6" opacity="0.7"/>
    ${crescent(500, 480, 110, gold)}
    ${sparkle(590, 380, 34, mono ?? IVORY)}
    ${sparkle(430, 640, 22, mono ?? TEAL)}
    ${sparkle(600, 650, 16, gold)}
  </g>`;
}

const svg = (body: string, w = 1024, h = 1024) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;

const background = (w = 1024, h = 1024) => `
  <defs>
    <radialGradient id="bg" cx="50%" cy="42%" r="70%">
      <stop offset="0%" stop-color="${MIDNIGHT}"/>
      <stop offset="100%" stop-color="${INDIGO}"/>
    </radialGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  ${sparkle(w * 0.16, h * 0.18, 14, GOLD)}${sparkle(w * 0.84, h * 0.22, 10, IVORY)}${sparkle(w * 0.8, h * 0.84, 12, GOLD)}${sparkle(w * 0.2, h * 0.8, 8, IVORY)}`;

/** Android adaptive icons keep content inside the central 66% safe zone. */
const safe = (inner: string) => `<g transform="translate(512 512) scale(0.62) translate(-512 -540)">${inner}</g>`;

async function png(svgText: string, file: string, size?: { w: number; h: number }, flatten = false) {
  let img = sharp(Buffer.from(svgText));
  if (size) img = img.resize(size.w, size.h);
  if (flatten) img = img.flatten({ background: INDIGO });
  await img.png().toFile(file);
  console.log(`wrote ${file.replace(join(__dirname, '..') + '/', '')}`);
}

async function main() {
  mkdirSync(images, { recursive: true });
  mkdirSync(store, { recursive: true });
  const full = svg(background() + `<g transform="translate(0 -20)">${glyph()}</g>`);

  // iOS / App Store icons must be opaque.
  await png(full, join(images, 'icon.png'), undefined, true);
  await png(full, join(store, 'app-store-icon-1024.png'), undefined, true);
  await png(full, join(store, 'play-icon-512.png'), { w: 512, h: 512 }, true);
  await png(full, join(images, 'favicon.png'), { w: 48, h: 48 }, true);

  await png(svg(safe(glyph())), join(images, 'android-icon-foreground.png'), { w: 512, h: 512 });
  await png(svg(background()), join(images, 'android-icon-background.png'), { w: 512, h: 512 });
  await png(svg(safe(glyph('#FFFFFF'))), join(images, 'android-icon-monochrome.png'), { w: 432, h: 432 });
  await png(svg(`<g transform="translate(0 -20)">${glyph()}</g>`), join(images, 'splash-icon.png'), { w: 512, h: 512 });

  // Google Play feature graphic, 1024×500. Text-free so it works for both store languages.
  const feature = svg(
    background(1024, 500) +
      `<g opacity="0.45" transform="translate(250 260) scale(0.34) translate(-512 -520) rotate(-14 512 520)">${glyph()}</g>` +
      `<g opacity="0.45" transform="translate(774 260) scale(0.34) translate(-512 -520) rotate(14 512 520)">${glyph()}</g>` +
      `<g transform="translate(512 255) scale(0.5) translate(-512 -520)">${glyph()}</g>` +
      sparkle(120, 120, 10, IVORY) +
      sparkle(910, 380, 12, GOLD),
    1024,
    500,
  );
  await png(feature, join(store, 'feature-graphic.png'), undefined, true);
}

void main();
