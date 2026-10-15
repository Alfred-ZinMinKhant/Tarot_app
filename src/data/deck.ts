/**
 * Structural facts about the 78-card Rider–Waite–Smith deck: ids, numbering, suits, elements,
 * astrological associations (Golden Dawn attributions) and the Wikimedia Commons file names of the
 * 1909 Pamela Colman Smith scans. Text content lives in `data/cards/*.json`.
 */
import type { Language } from '../i18n/languages';
import type { Arcana, Element, Suit } from './types';

type L10n = Record<Language, string>;

export interface DeckEntry {
  id: string;
  arcana: Arcana;
  suit: Suit;
  number: number;
  element: Element;
  astrology: L10n;
  commonsFile: string;
}

export const SUIT_LABELS: Record<Suit, L10n> = {
  major: { en: 'Major Arcana', my: 'အဓိကအာကာနာ' },
  wands: { en: 'Wands', my: 'တုတ်' },
  cups: { en: 'Cups', my: 'ခွက်' },
  swords: { en: 'Swords', my: 'ဓား' },
  pentacles: { en: 'Pentacles', my: 'ဒင်္ဂါး' },
};

export const ELEMENT_LABELS: Record<Element, L10n> = {
  fire: { en: 'Fire', my: 'မီး' },
  water: { en: 'Water', my: 'ရေ' },
  air: { en: 'Air', my: 'လေ' },
  earth: { en: 'Earth', my: 'မြေ' },
};

const SIGNS = {
  aries: { en: 'Aries', my: 'မိဿရာသီ' },
  taurus: { en: 'Taurus', my: 'ပြိဿရာသီ' },
  gemini: { en: 'Gemini', my: 'မေထုန်ရာသီ' },
  cancer: { en: 'Cancer', my: 'ကရကဋ်ရာသီ' },
  leo: { en: 'Leo', my: 'သိဟ်ရာသီ' },
  virgo: { en: 'Virgo', my: 'ကန်ရာသီ' },
  libra: { en: 'Libra', my: 'တူရာသီ' },
  scorpio: { en: 'Scorpio', my: 'ဗြိစ္ဆာရာသီ' },
  sagittarius: { en: 'Sagittarius', my: 'ဓနုရာသီ' },
  capricorn: { en: 'Capricorn', my: 'မကာရရာသီ' },
  aquarius: { en: 'Aquarius', my: 'ကုံရာသီ' },
  pisces: { en: 'Pisces', my: 'မိန်ရာသီ' },
} satisfies Record<string, L10n>;

const PLANETS = {
  sun: { en: 'the Sun', my: 'နေ' },
  moon: { en: 'the Moon', my: 'လ' },
  mercury: { en: 'Mercury', my: 'ဗုဒ္ဓဟူးဂြိုဟ်' },
  venus: { en: 'Venus', my: 'သောကြာဂြိုဟ်' },
  mars: { en: 'Mars', my: 'အင်္ဂါဂြိုဟ်' },
  jupiter: { en: 'Jupiter', my: 'ကြာသပတေးဂြိုဟ်' },
  saturn: { en: 'Saturn', my: 'စနေဂြိုဟ်' },
  uranus: { en: 'Uranus', my: 'ယူရေးနပ်စ်ဂြိုဟ်' },
  neptune: { en: 'Neptune', my: 'နက်ပကျွန်းဂြိုဟ်' },
  pluto: { en: 'Pluto', my: 'ပလူတိုဂြိုဟ်' },
} satisfies Record<string, L10n>;

type Sign = keyof typeof SIGNS;
type Planet = keyof typeof PLANETS;

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const planet = (p: Planet): L10n => ({ en: capitalise(PLANETS[p].en), my: PLANETS[p].my });
const sign = (s: Sign): L10n => SIGNS[s];
const planetInSign = (p: Planet, s: Sign): L10n => ({
  en: `${capitalise(PLANETS[p].en)} in ${SIGNS[s].en}`,
  my: `${SIGNS[s].my}ရှိ ${PLANETS[p].my}`,
});
const elementOf = (inner: Element, outer: Element): L10n => ({
  en: `${ELEMENT_LABELS[inner].en} of ${ELEMENT_LABELS[outer].en}`,
  my: `${ELEMENT_LABELS[outer].my}ဓာတ်ထဲမှ ${ELEMENT_LABELS[inner].my}ဓာတ်`,
});
const rootOf = (e: Element): L10n => ({
  en: `Root of ${ELEMENT_LABELS[e].en}`,
  my: `${ELEMENT_LABELS[e].my}ဓာတ်၏ အရင်းအမြစ်`,
});

const MAJORS: [slug: string, element: Element, astrology: L10n, commonsName: string][] = [
  ['fool', 'air', planet('uranus'), 'Fool'],
  ['magician', 'air', planet('mercury'), 'Magician'],
  ['high-priestess', 'water', planet('moon'), 'High_Priestess'],
  ['empress', 'earth', planet('venus'), 'Empress'],
  ['emperor', 'fire', sign('aries'), 'Emperor'],
  ['hierophant', 'earth', sign('taurus'), 'Hierophant'],
  ['lovers', 'air', sign('gemini'), 'Lovers'],
  ['chariot', 'water', sign('cancer'), 'Chariot'],
  ['strength', 'fire', sign('leo'), 'Strength'],
  ['hermit', 'earth', sign('virgo'), 'Hermit'],
  ['wheel-of-fortune', 'fire', planet('jupiter'), 'Wheel_of_Fortune'],
  ['justice', 'air', sign('libra'), 'Justice'],
  ['hanged-man', 'water', planet('neptune'), 'Hanged_Man'],
  ['death', 'water', sign('scorpio'), 'Death'],
  ['temperance', 'fire', sign('sagittarius'), 'Temperance'],
  ['devil', 'earth', sign('capricorn'), 'Devil'],
  ['tower', 'fire', planet('mars'), 'Tower'],
  ['star', 'air', sign('aquarius'), 'Star'],
  ['moon', 'water', sign('pisces'), 'Moon'],
  ['sun', 'fire', planet('sun'), 'Sun'],
  ['judgement', 'fire', planet('pluto'), 'Judgement'],
  ['world', 'earth', planet('saturn'), 'World'],
];

type MinorSuit = Exclude<Suit, 'major'>;

const SUIT_ELEMENT: Record<MinorSuit, Element> = {
  wands: 'fire',
  cups: 'water',
  swords: 'air',
  pentacles: 'earth',
};

/** Golden Dawn decans for the pips 2–10. */
const DECANS: Record<MinorSuit, [Planet, Sign][]> = {
  wands: [
    ['mars', 'aries'], ['sun', 'aries'], ['venus', 'aries'],
    ['saturn', 'leo'], ['jupiter', 'leo'], ['mars', 'leo'],
    ['mercury', 'sagittarius'], ['moon', 'sagittarius'], ['saturn', 'sagittarius'],
  ],
  cups: [
    ['venus', 'cancer'], ['mercury', 'cancer'], ['moon', 'cancer'],
    ['mars', 'scorpio'], ['sun', 'scorpio'], ['venus', 'scorpio'],
    ['saturn', 'pisces'], ['jupiter', 'pisces'], ['mars', 'pisces'],
  ],
  swords: [
    ['moon', 'libra'], ['saturn', 'libra'], ['jupiter', 'libra'],
    ['venus', 'aquarius'], ['mercury', 'aquarius'], ['moon', 'aquarius'],
    ['jupiter', 'gemini'], ['mars', 'gemini'], ['sun', 'gemini'],
  ],
  pentacles: [
    ['jupiter', 'capricorn'], ['mars', 'capricorn'], ['sun', 'capricorn'],
    ['mercury', 'taurus'], ['moon', 'taurus'], ['saturn', 'taurus'],
    ['sun', 'virgo'], ['venus', 'virgo'], ['mercury', 'virgo'],
  ],
};

/** Court cards as elemental sub-aspects of their suit (a common modern convention). */
const COURT_ELEMENT: Record<11 | 12 | 13 | 14, Element> = {
  11: 'earth', // Page
  12: 'air', // Knight
  13: 'water', // Queen
  14: 'fire', // King
};

const RANK_SLUGS = [
  'ace', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'page', 'knight', 'queen', 'king',
] as const;

const COMMONS_SUIT: Record<MinorSuit, string> = {
  wands: 'Wands',
  cups: 'Cups',
  swords: 'Swords',
  pentacles: 'Pents',
};

/**
 * Wikimedia Commons uses `WandsNN.jpg` etc. for the minor arcana, with one historical exception
 * (the Nine of Wands is uploaded as `Tarot_Nine_of_Wands.jpg`).
 */
function commonsMinor(suit: MinorSuit, n: number): string {
  if (suit === 'wands' && n === 9) return 'Tarot_Nine_of_Wands.jpg';
  return `${COMMONS_SUIT[suit]}${String(n).padStart(2, '0')}.jpg`;
}

function buildDeck(): DeckEntry[] {
  const deck: DeckEntry[] = MAJORS.map(([slug, element, astrology, commons], number) => ({
    id: `major-${String(number).padStart(2, '0')}-${slug}`,
    arcana: 'major',
    suit: 'major',
    number,
    element,
    astrology,
    commonsFile: `RWS_Tarot_${String(number).padStart(2, '0')}_${commons}.jpg`,
  }));
  for (const suit of ['wands', 'cups', 'swords', 'pentacles'] as const) {
    const element = SUIT_ELEMENT[suit];
    RANK_SLUGS.forEach((rank, i) => {
      const number = i + 1;
      let astrology: L10n;
      if (number === 1) astrology = rootOf(element);
      else if (number <= 10) {
        const [p, s] = DECANS[suit][number - 2]!;
        astrology = planetInSign(p, s);
      } else astrology = elementOf(COURT_ELEMENT[number as 11 | 12 | 13 | 14], element);
      deck.push({
        id: `${suit}-${String(number).padStart(2, '0')}-${rank}`,
        arcana: 'minor',
        suit,
        number,
        element,
        astrology,
        commonsFile: commonsMinor(suit, number),
      });
    });
  }
  return deck;
}

export const DECK: readonly DeckEntry[] = buildDeck();
