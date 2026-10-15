/**
 * Original card-back artwork, generated as an SVG string so the same source can be rendered in the
 * app (react-native-svg `SvgXml`) and exported to PNG for store assets.
 *
 * Motifs: a lotus rising from water inside a ring of light, "kanok" flame-scrolls in the corners, a
 * crescent moon and small stars, over a fine diamond lattice. Deliberately no religious figures or
 * sacred buildings (see docs/DECISIONS.md).
 */
import { palette } from '@/theme/colors';

const W = 300;
const H = 520;
const CX = W / 2;
const CY = 270;

const GOLD = palette.gold;
const INDIGO = palette.indigo;
const MIDNIGHT = palette.midnight;

const round = (n: number) => Math.round(n * 100) / 100;

function lattice(): string {
  const lines: string[] = [];
  for (let d = -H; d < W + H; d += 22) {
    lines.push(`M${d} 0L${d + H} ${H}`, `M${d} ${H}L${d + H} 0`);
  }
  return `<path d="${lines.join('')}" stroke="${GOLD}" stroke-opacity="0.1" stroke-width="1" fill="none" clip-path="url(#panel)"/>`;
}

function ring(): string {
  const parts = [
    `<circle cx="${CX}" cy="${CY}" r="80" fill="none" stroke="${GOLD}" stroke-width="1.6"/>`,
    `<circle cx="${CX}" cy="${CY}" r="72" fill="none" stroke="${GOLD}" stroke-width="0.8" stroke-opacity="0.7"/>`,
  ];
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2;
    const r1 = i % 2 ? 86 : 84;
    const r2 = i % 2 ? 94 : 102;
    parts.push(
      `<path d="M${round(CX + r1 * Math.cos(a))} ${round(CY + r1 * Math.sin(a))}L${round(CX + r2 * Math.cos(a))} ${round(CY + r2 * Math.sin(a))}" stroke="${GOLD}" stroke-width="${i % 2 ? 0.8 : 1.4}" stroke-linecap="round"/>`,
    );
  }
  return parts.join('');
}

function petal(angle: number, length: number, fill: string, fillOpacity = 1): string {
  const w = length * 0.24;
  const d = `M0 ${-length}C${w} ${-length * 0.66} ${w} ${-length * 0.26} 0 0C${-w} ${-length * 0.26} ${-w} ${-length * 0.66} 0 ${-length}Z`;
  return `<path d="${d}" transform="translate(${CX} ${CY + 18}) rotate(${angle})" fill="${fill}" fill-opacity="${fillOpacity}" stroke="${GOLD}" stroke-width="1.4" stroke-linejoin="round"/>`;
}

function lotus(): string {
  const outer = [-60, -30, 30, 60].map((a) => petal(a, 62, MIDNIGHT));
  const inner = [-46, -16, 16, 46].map((a) => petal(a, 54, GOLD, 0.22));
  const centre = petal(0, 70, GOLD, 0.9);
  const bowl = `<path d="M${CX - 58} ${CY + 20}Q${CX} ${CY + 48} ${CX + 58} ${CY + 20}" fill="none" stroke="${GOLD}" stroke-width="1.6" stroke-linecap="round"/>`;
  const waves = [0, 1, 2]
    .map((i) => {
      const y = CY + 40 + i * 9;
      const half = 40 - i * 10;
      return `<path d="M${CX - half} ${y}q${half / 4} -5 ${half / 2} 0t${half / 2} 0t${half / 2} 0t${half / 2} 0" fill="none" stroke="${GOLD}" stroke-width="1" stroke-opacity="${0.8 - i * 0.2}" stroke-linecap="round"/>`;
    })
    .join('');
  return [...outer, ...inner, centre, bowl, waves].join('');
}

/** A flame-like double scroll for one corner, drawn for the top-left and mirrored for the others. */
function kanok(transform: string): string {
  const scroll =
    'M6 6C46 6 66 30 58 52C52 66 34 64 34 52C34 44 44 42 46 48' +
    'M6 6C6 46 30 66 52 58C66 52 64 34 52 34C44 34 42 44 48 46' +
    'M6 6C26 14 40 28 44 40';
  const leaf = 'M8 8C20 9 27 15 25 25C15 23 9 17 8 8Z';
  return `<g transform="${transform}"><path d="${scroll}" fill="none" stroke="${GOLD}" stroke-width="2" stroke-linecap="round"/><path d="${leaf}" fill="${GOLD}"/></g>`;
}

function sparkle(x: number, y: number, s: number): string {
  return `<path d="M0 ${-s}L${s / 4} ${-s / 4}L${s} 0L${s / 4} ${s / 4}L0 ${s}L${-s / 4} ${s / 4}L${-s} 0L${-s / 4} ${-s / 4}Z" transform="translate(${x} ${y})" fill="${GOLD}"/>`;
}

function crescent(x: number, y: number, rotate = 0): string {
  return `<path d="M0 -14A14 14 0 1 0 0 14A10 14 0 1 1 0 -14Z" transform="translate(${x} ${y}) rotate(${rotate})" fill="${GOLD}"/>`;
}

export function buildCardBackSvg(): string {
  const corners = [
    'translate(22 22)',
    `translate(${W - 22} 22) scale(-1 1)`,
    `translate(22 ${H - 22}) scale(1 -1)`,
    `translate(${W - 22} ${H - 22}) scale(-1 -1)`,
  ]
    .map(kanok)
    .join('');
  const stars = [
    sparkle(CX - 44, 78, 5),
    sparkle(CX + 44, 78, 5),
    sparkle(CX - 26, 104, 3),
    sparkle(CX + 26, 104, 3),
    sparkle(CX - 44, H - 66, 5),
    sparkle(CX + 44, H - 66, 5),
    sparkle(CX - 26, H - 104, 3),
    sparkle(CX + 26, H - 104, 3),
  ].join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<defs>
<clipPath id="panel"><rect x="20" y="20" width="${W - 40}" height="${H - 40}" rx="8"/></clipPath>
<radialGradient id="glow" cx="50%" cy="52%" r="60%"><stop offset="0" stop-color="#3A2A6B"/><stop offset="1" stop-color="${MIDNIGHT}"/></radialGradient>
</defs>
<rect width="${W}" height="${H}" rx="18" fill="${INDIGO}"/>
<rect x="12" y="12" width="${W - 24}" height="${H - 24}" rx="12" fill="url(#glow)" stroke="${GOLD}" stroke-width="2"/>
${lattice()}
<rect x="20" y="20" width="${W - 40}" height="${H - 40}" rx="8" fill="none" stroke="${GOLD}" stroke-width="0.8" stroke-opacity="0.7"/>
${corners}
${crescent(CX, 80)}
${crescent(CX, H - 80, 180)}
${stars}
${ring()}
${lotus()}
</svg>`;
}

export const CARD_BACK_SVG = buildCardBackSvg();
export const CARD_ASPECT = W / H;
