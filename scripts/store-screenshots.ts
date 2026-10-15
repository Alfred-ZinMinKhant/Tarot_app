/**
 * Captures store screenshots of the web build in English and Burmese.
 *
 *   npx expo export --platform web --output-dir dist
 *   npm run store:screenshots
 *
 * Writes store/screenshots/{ios-6.9,android-phone}/{en,my}/NN-name.png:
 *   iOS 6.9" (1290×2796) and Android phone (1080×1920).
 * Uses Chromium from Playwright (`npx playwright install chromium` once, or set CHROMIUM_PATH).
 * Re-run after `npm run images -- --download` so the screenshots show the real card art.
 */
import { createReadStream, existsSync, mkdirSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join } from 'node:path';

import { chromium, type Page } from 'playwright';

const root = join(__dirname, '..');
const dist = join(root, 'dist');
const PORT = 8790;

const DEVICES = [
  { dir: 'ios-6.9', width: 430, height: 932, scale: 3 },
  { dir: 'android-phone', width: 360, height: 640, scale: 3 },
] as const;

const TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.ttf': 'font/ttf',
  '.json': 'application/json',
  '.wav': 'audio/wav',
  '.ico': 'image/x-icon',
};

/** Static server with single-page-app fallback (expo-router web routes). */
function serve() {
  return createServer((req, res) => {
    let file = join(dist, decodeURIComponent((req.url ?? '/').split('?')[0]!));
    if (!existsSync(file) || statSync(file).isDirectory()) file = join(dist, 'index.html');
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    createReadStream(file).pipe(res);
  }).listen(PORT);
}

const v = (id: string) => `[data-testid="${id}"] >> visible=true`;
const last = (page: Page, id: string) => page.locator(`[data-testid="${id}"] >> visible=true`).last();

async function capture(page: Page, lang: 'en' | 'my', out: string) {
  let n = 0;
  const shot = async (name: string, wait = 800) => {
    await page.waitForTimeout(wait);
    n += 1;
    await page.screenshot({ path: join(out, `${String(n).padStart(2, '0')}-${name}.png`) });
  };
  const top = async () => {
    await page.mouse.move(100, 200);
    await page.mouse.wheel(0, -5000);
  };

  // Onboarding: language, name and weekday sign.
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForSelector(v('onboarding-welcome'), { timeout: 30000 });
  await page.click(v(`onboarding-language-${lang}`));
  await last(page, 'onboarding-next').click();
  await page.waitForTimeout(500);
  await last(page, 'onboarding-next').click();
  await page.waitForSelector(v('onboarding-about-you'));
  await page.fill(v('onboarding-name'), lang === 'my' ? 'သီရိ' : 'Thiri');
  await page.click(v('onboarding-sign-friday'));
  await last(page, 'onboarding-next').click();
  await page.waitForSelector(v('screen-home'));

  // Home with the Card of the Day revealed.
  await page.click(v('daily-reveal'));
  await shot('home', 1400);

  // Celtic Cross reading.
  await page.click(v('home-spread-celtic-cross'));
  await page.fill(v('reading-question-input'), lang === 'my' ? 'ဒီလ ဘာကို အာရုံစိုက်သင့်လဲ' : 'What should I focus on this month?');
  await page.click(v('reading-start'));
  await page.click(v('reading-shuffle'));
  await page.waitForSelector(v('reading-pick-title'));
  await shot('pick-cards', 900);
  await page.click(v('reading-pick-for-me'));
  await page.click(v('reading-reveal-all'));
  await page.waitForSelector(v('reading-summary'));
  await top();
  await shot('celtic-cross', 5000); // let the "saved" toast disappear

  // Card detail.
  await page.goto(`http://localhost:${PORT}/card/major-17-star`);
  await page.waitForSelector(v('card-title'));
  await shot('card-meaning');

  // Library, journal, sign, learn.
  await page.goto(`http://localhost:${PORT}/library`);
  await page.waitForSelector(v('screen-library'));
  await shot('library', 1200);
  await page.goto(`http://localhost:${PORT}/sign`);
  await page.waitForSelector(v('sign-detail'));
  await shot('weekday-sign');
  await page.goto(`http://localhost:${PORT}/learn`);
  await page.waitForSelector(v('screen-learn'));
  await shot('learn');
}

async function main() {
  if (!existsSync(join(dist, 'index.html'))) {
    console.error('dist/ is missing: run `npx expo export --platform web --output-dir dist` first.');
    process.exit(1);
  }
  const server = serve();
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  try {
    for (const d of DEVICES) {
      for (const lang of ['en', 'my'] as const) {
        const out = join(root, 'store', 'screenshots', d.dir, lang);
        mkdirSync(out, { recursive: true });
        const ctx = await browser.newContext({
          viewport: { width: d.width, height: d.height },
          deviceScaleFactor: d.scale,
          colorScheme: 'dark',
          locale: lang === 'my' ? 'my-MM' : 'en-US',
        });
        await capture(await ctx.newPage(), lang, out);
        await ctx.close();
        console.log(`store/screenshots/${d.dir}/${lang}: done`);
      }
    }
  } finally {
    await browser.close();
    server.close();
  }
}

void main();
