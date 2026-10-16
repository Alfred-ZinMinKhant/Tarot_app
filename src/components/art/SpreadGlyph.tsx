import Svg, { G, Rect } from 'react-native-svg';

import { layoutSize, type Spread } from '@/engine';

import { CARD_ASPECT } from './cardBackSvg';
import { PositionGlyphShapes } from './PositionGlyph';

type Props = { spread: Spread; size?: number; color: string; fill: string };

const SYMBOL_MIN_WIDTH = 12; // mini cards narrower than this stay plain
const GAP = 0.25; // gap between mini cards, as a fraction of card width

/** Miniature of a spread's layout: one tiny card per position, drawn from the spread data itself. */
export function SpreadGlyph({ spread, size = 64, color, fill }: Props) {
  const { width: cols, height: rows } = layoutSize(spread);
  // Card width that fits the layout inside the square box (rotated cards are no wider than card height).
  const unitW = cols + GAP * (cols - 1);
  const unitH = (rows - 1) * (1 / CARD_ASPECT + GAP) + 1 / CARD_ASPECT;
  const pad = 4;
  const inner = size - pad * 2;
  const cw = Math.min(inner / unitW, inner / unitH, size * 0.34);
  const ch = cw / CARD_ASPECT;
  const stepX = cw * (1 + GAP);
  const stepY = ch + cw * GAP;
  const offX = (size - ((cols - 1) * stepX + cw)) / 2;
  const offY = (size - ((rows - 1) * stepY + ch)) / 2;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {spread.positions.map((p) => {
        const x = offX + p.x * stepX;
        const y = offY + p.y * stepY;
        return (
          <G key={p.id}>
            <Rect
              x={x}
              y={y}
              width={cw}
              height={ch}
              rx={cw * 0.14}
              fill={fill}
              stroke={color}
              strokeWidth={1.6}
              rotation={p.rotate ?? 0}
              originX={x + cw / 2}
              originY={y + ch / 2}
            />
            {cw >= SYMBOL_MIN_WIDTH ? (
              <G transform={`translate(${x + cw / 2 - (cw * 0.62) / 2} ${y + ch / 2 - (cw * 0.62) / 2}) scale(${(cw * 0.62) / 48})`}>
                <PositionGlyphShapes id={p.id} color={color} strokeWidth={4} />
              </G>
            ) : null}
          </G>
        );
      })}
    </Svg>
  );
}
