import Svg, { Circle, Line } from 'react-native-svg';

import { SIGN_BEARING, type SignId } from '@/data/content';
import { useAppTheme } from '@/theme/ThemeContext';

type Props = { sign: SignId; size?: number; accessibilityLabel?: string };

/**
 * The traditional eight-direction layout of the weekday signs, drawn as a simple compass with the
 * sign's direction highlighted. Purely geometric — no religious or sacred imagery.
 */
export function SignCompass({ sign, size = 72, accessibilityLabel }: Props) {
  const { colors } = useAppTheme();
  const c = size / 2;
  const r = c - 8;
  const point = (deg: number, radius: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return { x: c + radius * Math.cos(rad), y: c + radius * Math.sin(rad) };
  };
  const active = point(SIGN_BEARING[sign], r);
  return (
    <Svg
      width={size}
      height={size}
      accessible={!!accessibilityLabel}
      accessibilityLabel={accessibilityLabel}
      importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}
    >
      <Circle cx={c} cy={c} r={r} stroke={colors.border} strokeWidth={1.5} fill="none" />
      {Object.values(SIGN_BEARING).map((deg) => {
        const p = point(deg, r);
        return <Circle key={deg} cx={p.x} cy={p.y} r={3} fill={colors.border} />;
      })}
      <Line x1={c} y1={c} x2={active.x} y2={active.y} stroke={colors.primary} strokeWidth={2} strokeLinecap="round" />
      <Circle cx={active.x} cy={active.y} r={6} fill={colors.primary} />
      <Circle cx={c} cy={c} r={3.5} fill={colors.accent} />
    </Svg>
  );
}
