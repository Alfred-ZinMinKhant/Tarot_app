/**
 * Writes the in-app Privacy Policy and Terms of Use as Markdown and HTML for hosting: the stores
 * need a public privacy-policy URL. Values come from .env (PUBLISHER_NAME, SUPPORT_EMAIL,
 * LEGAL_EFFECTIVE_DATE), the same as in the app.
 *
 *   npm run legal:export     → store/legal/{privacy,terms}-{en,my}.{md,html}
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import brand from '../src/config/brand.json';
import { LEGAL_DOCS, type LegalDocId, renderLegal } from '../src/data/content';
import { LANGUAGES, type Language } from '../src/i18n/languages';
import { formatDate } from '../src/utils/dates';

const root = join(__dirname, '..');

/** Minimal .env reader (KEY=value lines); real environment variables win. */
function env(): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    for (const line of readFileSync(join(root, '.env'), 'utf8').split('\n')) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (m) out[m[1]!] = m[2]!.replace(/^["']|["']$/g, '');
    }
  } catch {
    // no .env: fine
  }
  return { ...out, ...(process.env as Record<string, string>) };
}

const e = env();
const vars = (lang: Language) => ({
  appName: brand.appName[lang],
  publisher: e.PUBLISHER_NAME ?? '',
  contactEmail: e.SUPPORT_EMAIL ?? '',
});
const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(e.LEGAL_EFFECTIVE_DATE ?? '');
const effective = dateMatch ? new Date(+dateMatch[1]!, +dateMatch[2]! - 1, +dateMatch[3]!) : null;
const effectiveLabel: Record<Language, string> = { en: 'Effective from', my: 'အသက်ဝင်သည့်ရက်' };

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const out = join(root, 'store', 'legal');
mkdirSync(out, { recursive: true });
for (const doc of LEGAL_DOCS as readonly LegalDocId[]) {
  for (const lang of LANGUAGES) {
    const page = renderLegal(doc, lang, vars(lang));
    const date = effective ? `${effectiveLabel[lang]}: ${formatDate(effective, lang, { style: 'long' })}` : '';
    const md = [`# ${page.title}`, date && `_${date}_`, ...page.sections.flatMap((s) => [`## ${s.heading}`, s.body])]
      .filter(Boolean)
      .join('\n\n');
    writeFileSync(join(out, `${doc}-${lang}.md`), md + '\n');
    const html = `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(page.title)} · ${escape(brand.appName[lang])}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+Myanmar&display=swap">
<style>
  body { font-family: system-ui, "Noto Sans Myanmar", "Padauk", sans-serif; line-height: 1.8; max-width: 42rem;
         margin: 0 auto; padding: 1.5rem 1rem 3rem; color: #14102B; background: #F8F1E4; }
  h1 { color: #2A1B54; } h2 { color: #2A1B54; font-size: 1.15rem; margin-top: 2rem; }
  @media (prefers-color-scheme: dark) { body { color: #F8F1E4; background: #14102B; } h1, h2 { color: #D4AF37; } }
</style>
</head>
<body>
<h1>${escape(page.title)}</h1>
${date ? `<p><em>${escape(date)}</em></p>\n` : ''}${page.sections.map((s) => `<h2>${escape(s.heading)}</h2>\n<p>${escape(s.body)}</p>`).join('\n')}
</body>
</html>
`;
    writeFileSync(join(out, `${doc}-${lang}.html`), html);
  }
}
console.log(`Wrote store/legal/*.md and *.html${effective ? '' : ' (set LEGAL_EFFECTIVE_DATE to show a date)'}`);
