import Svg, { Circle, G, Line, Path } from 'react-native-svg';

type Symbol =
  | 'moon' | 'sun' | 'star' | 'eye' | 'bolt' | 'key' | 'person'
  | 'heart' | 'sprout' | 'mountain' | 'target' | 'ring' | 'arrow';

/** Which symbol stands for each spread position id. */
const SYMBOL_FOR: Record<string, Symbol> = {
  focus: 'star',
  past: 'moon',
  present: 'sun',
  future: 'star',
  situation: 'eye',
  challenge: 'bolt',
  advice: 'key',
  you: 'person',
  connection: 'heart',
  other: 'person',
  potential: 'sprout',
  crossing: 'bolt',
  foundation: 'mountain',
  'recent-past': 'moon',
  aim: 'target',
  'near-future': 'star',
  self: 'person',
  surroundings: 'ring',
  'hopes-fears': 'heart',
  direction: 'arrow',
};

export function hasPositionGlyph(id: string): boolean {
  return id in SYMBOL_FOR;
}

type ShapesProps = { id: string; color: string; strokeWidth?: number };

/** The symbol drawn on a 48x48 grid; wrap it in an Svg viewBox or scale it with a transform. */
export function PositionGlyphShapes({ id, color, strokeWidth = 2.4 }: ShapesProps) {
  const symbol = SYMBOL_FOR[id];
  const c = { stroke: color, strokeWidth, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  switch (symbol) {
    case 'moon':
      return <Path d="M31 8a17 17 0 1 0 9 26 14 14 0 0 1-9-26z" {...c} />;
    case 'sun':
      return (
        <G>
          <Circle cx={24} cy={24} r={8} {...c} />
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i / 8) * Math.PI * 2;
            return <Line key={i} x1={24 + 13 * Math.cos(a)} y1={24 + 13 * Math.sin(a)} x2={24 + 20 * Math.cos(a)} y2={24 + 20 * Math.sin(a)} {...c} />;
          })}
        </G>
      );
    case 'star':
      return <Path d="M24 5l4.6 14.4L43 24l-14.4 4.6L24 43l-4.6-14.4L5 24l14.4-4.6z" {...c} />;
    case 'eye':
      return (
        <G>
          <Path d="M4 24c6-10 13-14 20-14s14 4 20 14c-6 10-13 14-20 14S10 34 4 24z" {...c} />
          <Circle cx={24} cy={24} r={5} {...c} />
        </G>
      );
    case 'bolt':
      return <Path d="M27 4L10 27h12l-3 17 19-24H26z" {...c} />;
    case 'key':
      return (
        <G>
          <Circle cx={15} cy={15} r={8} {...c} />
          <Line x1={21} y1={21} x2={40} y2={40} {...c} />
          <Line x1={33} y1={33} x2={38} y2={28} {...c} />
          <Line x1={28} y1={28} x2={32} y2={24} {...c} />
        </G>
      );
    case 'person':
      return (
        <G>
          <Circle cx={24} cy={15} r={8} {...c} />
          <Path d="M8 42c0-9 7-15 16-15s16 6 16 15" {...c} />
        </G>
      );
    case 'heart':
      return <Path d="M24 41C10 31 6 24 6 17a9 9 0 0 1 18-3 9 9 0 0 1 18 3c0 7-4 14-18 24z" {...c} />;
    case 'sprout':
      return (
        <G>
          <Line x1={24} y1={42} x2={24} y2={20} {...c} />
          <Path d="M24 26C14 26 9 20 9 11c9 0 15 5 15 15zM24 22c0-8 5-13 15-13 0 9-5 13-15 13z" {...c} />
        </G>
      );
    case 'mountain':
      return <Path d="M4 40L19 12l8 15 5-8 12 21z" {...c} />;
    case 'target':
      return (
        <G>
          <Circle cx={24} cy={24} r={18} {...c} />
          <Circle cx={24} cy={24} r={9} {...c} />
          <Circle cx={24} cy={24} r={1.5} {...c} />
        </G>
      );
    case 'ring':
      return (
        <G>
          <Circle cx={24} cy={24} r={8} {...c} />
          <Circle cx={24} cy={24} r={18} {...c} strokeDasharray="3 5" />
        </G>
      );
    case 'arrow':
      return (
        <G>
          <Line x1={24} y1={42} x2={24} y2={8} {...c} />
          <Path d="M12 20L24 7l12 13" {...c} />
        </G>
      );
    default:
      return null;
  }
}

type Props = { id: string; size?: number; color: string };

export function PositionGlyph({ id, size = 32, color }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <PositionGlyphShapes id={id} color={color} />
    </Svg>
  );
}
