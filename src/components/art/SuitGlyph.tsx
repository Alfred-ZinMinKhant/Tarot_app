import Svg, { Circle, Line, Path } from 'react-native-svg';

import type { Suit } from '@/data/types';

type Props = { suit: Suit; size?: number; color: string };

/** Simple original line glyphs for each suit (and a sun for the Major Arcana). */
export function SuitGlyph({ suit, size = 48, color }: Props) {
  const common = { stroke: color, strokeWidth: 2.4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {suit === 'major' ? (
        <>
          <Circle cx={24} cy={24} r={8} {...common} />
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i / 8) * Math.PI * 2;
            return (
              <Line
                key={i}
                x1={24 + 13 * Math.cos(a)}
                y1={24 + 13 * Math.sin(a)}
                x2={24 + 20 * Math.cos(a)}
                y2={24 + 20 * Math.sin(a)}
                {...common}
              />
            );
          })}
        </>
      ) : null}
      {suit === 'wands' ? (
        <>
          <Line x1={12} y1={42} x2={36} y2={6} {...common} />
          <Path d="M30 15c4-2 7-1 9 1-3 2-6 2-9-1zM24 24c-4-1-7 0-9 2 3 2 6 1 9-2zM28 19c1-4 0-7-2-9-2 3-1 6 2 9z" {...common} />
        </>
      ) : null}
      {suit === 'cups' ? (
        <>
          <Path d="M13 8h22c0 12-4 19-11 19S13 20 13 8z" {...common} />
          <Line x1={24} y1={27} x2={24} y2={38} {...common} />
          <Path d="M16 41h16" {...common} />
          <Path d="M16 13h16" {...common} strokeWidth={1.4} />
        </>
      ) : null}
      {suit === 'swords' ? (
        <>
          <Path d="M24 4l4 6v22h-8V10z" {...common} />
          <Line x1={14} y1={32} x2={34} y2={32} {...common} />
          <Line x1={24} y1={32} x2={24} y2={41} {...common} />
          <Circle cx={24} cy={44} r={2} {...common} />
        </>
      ) : null}
      {suit === 'pentacles' ? (
        <>
          <Circle cx={24} cy={24} r={18} {...common} />
          <Path d="M24 9l8.8 27.1L9.7 19.3h28.6L15.2 36.1z" {...common} strokeWidth={1.8} />
        </>
      ) : null}
    </Svg>
  );
}
