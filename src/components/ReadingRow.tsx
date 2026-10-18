import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { getCard } from '@/data/cards';
import type { ReadingRecord } from '@/db/types';
import type { Language } from '@/i18n/languages';
import { useSettings } from '@/store/settings';
import { MIN_TAP, radius, spacing } from '@/theme/spacing';
import { useAppTheme } from '@/theme/ThemeContext';
import { formatDate, formatTime } from '@/utils/dates';
import { readingTitle } from '@/utils/readings';

import { AppText } from './AppText';
import { CardFace } from './art/CardFace';
import { Icon } from './Icon';

const MAX_FAN = 3;
const THUMB_W = 46;
const FAN_STEP = 16;
const TILT = [-7, 0, 7];

type Props = {
  reading: ReadingRecord;
  lang: Language;
  /** Show the question the reading was asked (the Journal does; Home keeps rows short). */
  showQuestion?: boolean;
  testID?: string;
};

/** A saved reading: its cards fanned like a hand, the title, when and what it was about. */
export function ReadingRow({ reading, lang, showQuestion = false, testID }: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const burmeseNumerals = useSettings((s) => s.burmeseNumerals);
  const date = new Date(reading.createdAt);
  const title = readingTitle(reading, lang, t('journal.dailyLabel'));
  const cards = reading.cards.flatMap((c) => {
    const card = getCard(c.cardId);
    return card ? [{ card, reversed: c.reversed }] : [];
  });
  const when = `${formatDate(date, lang, { style: 'short', burmeseNumerals })} · ${formatTime(date, lang, { burmeseNumerals })}`;
  const fan = cards.slice(0, MAX_FAN);
  const extra = cards.length - fan.length;
  const fanWidth = THUMB_W + (fan.length - 1) * FAN_STEP;

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/journal/[id]', params: { id: reading.id } })}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${when}`}
      testID={testID}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={[styles.fanBox, { backgroundColor: colors.surfaceAlt }]}>
        <View style={{ width: fanWidth, height: THUMB_W * 1.7 }}>
          {fan.map(({ card, reversed }, i) => (
            <View
              key={`${card.id}-${i}`}
              style={[
                styles.thumb,
                {
                  left: i * FAN_STEP,
                  zIndex: i,
                  transform: [{ rotate: `${fan.length === 1 ? 0 : (TILT[i] ?? 0)}deg` }],
                },
              ]}
            >
              <CardFace card={card} width={THUMB_W} reversed={reversed} showName={false} />
            </View>
          ))}
        </View>
        {extra > 0 ? (
          <View style={[styles.more, { backgroundColor: colors.primary }]}>
            <AppText variant="caption" tone="onPrimary" bold>
              +{extra}
            </AppText>
          </View>
        ) : null}
      </View>

      <View style={styles.text}>
        <View style={styles.titleRow}>
          <AppText variant="label" bold style={styles.flex} numberOfLines={1}>
            {title}
          </AppText>
          <View style={styles.chevron}>
            <Icon name="back" size={18} color={colors.textMuted} />
          </View>
        </View>
        <View style={styles.meta}>
          <View style={[styles.pill, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
            <AppText variant="caption" tone="accent" bold>
              {t(`reading.topics.${reading.topic}`)}
            </AppText>
          </View>
          <AppText variant="caption" tone="textMuted" style={styles.flex} numberOfLines={1}>
            {when}
          </AppText>
        </View>
        {showQuestion && reading.question ? (
          <AppText variant="caption" numberOfLines={2} style={styles.question}>
            “{reading.question}”
          </AppText>
        ) : null}
        <AppText variant="caption" tone="textMuted" numberOfLines={1}>
          {cards.map((c) => c.card[lang].name).join(lang === 'my' ? '၊ ' : ', ')}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: MIN_TAP,
  },
  fanBox: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minWidth: 76,
  },
  thumb: {
    position: 'absolute',
    top: 0,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  more: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    borderRadius: radius.pill,
    paddingHorizontal: 6,
    zIndex: 10,
  },
  text: { flex: 1, gap: spacing.xs },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  chevron: { transform: [{ rotate: '180deg' }] },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  pill: { borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: spacing.sm, paddingVertical: 1 },
  question: { fontStyle: 'italic' },
});
