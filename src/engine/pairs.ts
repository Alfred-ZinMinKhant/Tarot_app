import type { Language } from '@/i18n/languages';

import type { DrawnCard } from './draw';

type Pair = { a: string; b: string } & Record<Language, string>;

/**
 * Short, hand-written predictions for well-known card combinations. They appear when both cards land
 * anywhere in the same reading, whichever way up, to add something no single-card text can.
 */
export const PAIRS: readonly Pair[] = [
  { a: 'major-16-tower', b: 'major-17-star',
    en: 'The Tower with the Star: a sudden upheaval is coming, and real healing will follow it. What falls apart will make room for hope.',
    my: 'မျှော်စင်နဲ့ ကြယ်: ရုတ်တရက် ပြောင်းလဲမှုတစ်ခု လာမယ်၊ ပြီးရင် အမှန်တကယ် ပြန်လည်သက်သာမှု လိုက်လာလိမ့်မယ်။ ပြိုကျသွားတာက မျှော်လင့်ချက်အတွက် နေရာဖယ်ပေးလိမ့်မယ်။' },
  { a: 'major-16-tower', b: 'major-18-moon',
    en: 'The Tower with the Moon: expect a shaky, unclear stretch. Big decisions made now are likely to look different once you can see more, so wait.',
    my: 'မျှော်စင်နဲ့ လ: မခိုင်မလုံ၊ မရှင်းလင်းတဲ့ ကာလတစ်ခု ကြုံရလိမ့်မယ်။ အခု ချမှတ်တဲ့ ဆုံးဖြတ်ချက်ကြီးတွေက ပိုမြင်လာတဲ့အခါ ကွဲပြားနေနိုင်လို့ စောင့်ပါ။' },
  { a: 'major-18-moon', b: 'major-17-star',
    en: 'The Moon with the Star: your fears and confusion will ease soon, and a calmer hope will come into view.',
    my: 'လနဲ့ ကြယ်: ကြောက်ရွံ့မှုနဲ့ ရှုပ်ထွေးမှုတွေ မကြာခင် ပြေလျော့လာပြီး ငြိမ်းချမ်းတဲ့ မျှော်လင့်ချက်တစ်ခု မြင်ရလိမ့်မယ်။' },
  { a: 'major-13-death', b: 'major-20-judgement',
    en: 'Death with Judgement: an ending you have avoided will have to be faced, and it will free you for a real fresh start.',
    my: 'သေခြင်းနဲ့ စီရင်ချက်: ရှောင်နေခဲ့တဲ့ အဆုံးသတ်ကို မကြာခင် ရင်ဆိုင်ရလိမ့်မယ်၊ အဲဒါက အမှန်တကယ် အသစ်စတင်ဖို့ လွတ်မြောက်စေလိမ့်မယ်။' },
  { a: 'major-13-death', b: 'major-10-wheel-of-fortune',
    en: 'Death with the Wheel of Fortune: change is coming whether or not you push for it. Things will turn, and it goes better if you move with it.',
    my: 'သေခြင်းနဲ့ ကံကြမ္မာစက်ဝိုင်း: သင်မတွန်းလည်း ပြောင်းလဲမှု လာမှာပဲ။ အခြေအနေတွေ လှည့်ပြောင်းလိမ့်မယ်၊ လိုက်ပါရင် ပိုကောင်းလိမ့်မယ်။' },
  { a: 'major-06-lovers', b: 'major-15-devil',
    en: 'The Lovers with the Devil: a strong attraction is ahead, and you will have to decide whether it is a free choice or a habit you cannot let go of.',
    my: 'ချစ်သူများနဲ့ မကောင်းဆိုးဝါး: ပြင်းထန်တဲ့ ဆွဲဆောင်မှု ရှေ့မှာ ရှိတယ်၊ ဒါဟာ လွတ်လပ်စွာ ရွေးချယ်တာလား၊ လွှတ်မပေးနိုင်တဲ့ အကျင့်လားဆိုတာ ဆုံးဖြတ်ရလိမ့်မယ်။' },
  { a: 'major-00-fool', b: 'major-01-magician',
    en: 'The Fool with the Magician: a new beginning is opening up, and you will have the skills to make it work. Start, and use what you already have.',
    my: 'လူအနဲ့ မှော်ဆရာ: အစပြုမှုအသစ်တစ်ခု ပွင့်လာမယ်၊ ဖြစ်မြောက်အောင် လုပ်နိုင်တဲ့ ကျွမ်းကျင်မှုလည်း သင့်မှာ ရှိလိမ့်မယ်။ စတင်ပြီး ရှိပြီးသားကို အသုံးချပါ။' },
  { a: 'major-03-empress', b: 'major-04-emperor',
    en: 'The Empress with the Emperor: care and structure will come together, and growth will last when warmth is paired with a plan.',
    my: 'ဧကရီနဲ့ ဧကရာဇ်: ဂရုစိုက်မှုနဲ့ ဖွဲ့စည်းပုံ ပေါင်းစပ်လာမယ်၊ နွေးထွေးမှုနဲ့ အစီအစဉ်ပါရင် တိုးတက်မှု ရှည်ကြာလိမ့်မယ်။' },
  { a: 'major-02-high-priestess', b: 'major-09-hermit',
    en: 'The High Priestess with the Hermit: the answer you want will come from within. Quiet time before you decide will bring clarity.',
    my: 'ပုရောဟိတ်မကြီးနဲ့ ရသေ့: သင်လိုချင်တဲ့ အဖြေက ကိုယ့်အတွင်းကနေ လာလိမ့်မယ်။ မဆုံးဖြတ်ခင် တိတ်ဆိတ်တဲ့ အချိန်ယူရင် ရှင်းလင်းလာလိမ့်မယ်။' },
  { a: 'major-08-strength', b: 'major-07-chariot',
    en: 'Strength with the Chariot: steady courage and clear direction are on your side. Gentle persistence will carry you further than force.',
    my: 'ခွန်အားနဲ့ စစ်ရထား: တည်ငြိမ်တဲ့ သတ္တိနဲ့ ရှင်းလင်းတဲ့ ဦးတည်ချက်က သင့်ဘက်မှာ ရှိတယ်။ ပျော့ပျောင်းတဲ့ ဇွဲက အားနဲ့ထက် ပိုဝေးဝေး ပို့ပေးလိမ့်မယ်။' },
  { a: 'major-12-hanged-man', b: 'major-14-temperance',
    en: 'The Hanged Man with Temperance: a time of waiting is coming, and patience will pay off. Balance now, and the result will come.',
    my: 'ဇောက်ထိုးဆွဲထားသူနဲ့ မျှတခြင်း: စောင့်ရမယ့်ကာလ လာမယ်၊ စိတ်ရှည်ရင် ရလဒ်ရလိမ့်မယ်။ အခု ချိန်ညှိထားပါ၊ ရလဒ်က နောက်ကလိုက်လာလိမ့်မယ်။' },
  { a: 'major-11-justice', b: 'major-20-judgement',
    en: 'Justice with Judgement: a moment of honest accounting is coming. You will own what is yours, and the rest will fall away.',
    my: 'တရားမျှတမှုနဲ့ စီရင်ချက်: ရိုးသားစွာ ပြန်တွက်ချက်ရမယ့် အချိန် လာမယ်။ ကိုယ့်တာဝန်ကို လက်ခံရလိမ့်မယ်၊ ကျန်တာတွေ ကွာကျသွားလိမ့်မယ်။' },
  { a: 'major-19-sun', b: 'major-21-world',
    en: 'The Sun with the World: success and completion are on the way. A chapter will close well, so make time to enjoy it.',
    my: 'နေနဲ့ ကမ္ဘာ: အောင်မြင်မှုနဲ့ ပြီးမြောက်မှု လာနေတယ်။ အခန်းတစ်ခု ကောင်းကောင်းပိတ်သွားလိမ့်မယ်၊ ခံစားဖို့ အချိန်ယူပါ။' },
  { a: 'major-15-devil', b: 'major-16-tower',
    en: 'The Devil with the Tower: a hold that felt secure will break. It will hurt, and it will also be your way out.',
    my: 'မကောင်းဆိုးဝါးနဲ့ မျှော်စင်: လုံခြုံတယ်ထင်ခဲ့တဲ့ ချည်နှောင်မှု ကျိုးပြတ်လိမ့်မယ်။ နာကျင်ပေမယ့် အဲဒါပဲ သင့်လမ်းထွက် ဖြစ်လိမ့်မယ်။' },
  { a: 'cups-01-ace', b: 'cups-02-two',
    en: 'Ace and Two of Cups: a new emotional connection is coming, mutual and open-hearted. Let it unfold at its own pace.',
    my: 'ခွက် အေ့စ်နဲ့ ခွက် နှစ်လုံး: ပြန်လည်ဖလှယ်တဲ့ စိတ်ခံစားမှု ဆက်နွယ်ချက်အသစ်တစ်ခု လာလိမ့်မယ်။ သူ့အရှိန်နဲ့ သူ ပွင့်လန်းပါစေ။' },
  { a: 'pentacles-05-five', b: 'pentacles-06-six',
    en: 'Five and Six of Pentacles: a lean stretch is coming, and help will arrive after it. Accepting support is allowed.',
    my: 'ဒင်္ဂါး ငါးပြားနဲ့ ဒင်္ဂါး ခြောက်ပြား: ခက်ခဲတဲ့ကာလ လာမယ်၊ ပြီးရင် အကူအညီ ရောက်လာလိမ့်မယ်။ အထောက်အပံ့ကို လက်ခံလို့ရပါတယ်။' },
  { a: 'swords-03-three', b: 'major-17-star',
    en: 'Three of Swords with the Star: heartache is coming, and recovery will follow it. Grieve honestly; healing will come.',
    my: 'ဓား သုံးလက်နဲ့ ကြယ်: စိတ်နာကျင်မှုတစ်ခု ကြုံရမယ်၊ ပြီးရင် ပြန်လည်ကောင်းမွန်လာလိမ့်မယ်။ ရိုးရိုးသားသား ဝမ်းနည်းပါ၊ ကုစားမှု လာလိမ့်မယ်။' },
];

const PAIR_LIMIT = 2;

/** Notes for any known pair that both appear in the reading (at most two, in the list's order). */
export function pairNotes(drawn: readonly DrawnCard[], lang: Language): string[] {
  const ids = new Set(drawn.map((d) => d.cardId));
  return PAIRS.filter((p) => ids.has(p.a) && ids.has(p.b)).slice(0, PAIR_LIMIT).map((p) => p[lang]);
}
