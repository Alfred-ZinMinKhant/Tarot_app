import type { ColorValue } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type IconName =
  | 'home'
  | 'cards'
  | 'journal'
  | 'learn'
  | 'settings'
  | 'moon'
  | 'globe'
  | 'check'
  | 'back'
  | 'search'
  | 'close'
  | 'lock'
  | 'star';

type Props = { name: IconName; size?: number; color: ColorValue };

/** Small original line-icon set (keeps the bundle free of icon-font packages). */
export function Icon({ name, size = 24, color }: Props) {
  const common = { stroke: color, strokeWidth: 1.8, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no">
      {name === 'home' && (
        <>
          <Path {...common} d="M4 11.5 12 4l8 7.5" />
          <Path {...common} d="M6.5 10v9.5h11V10" />
          <Path {...common} d="M10.5 19.5v-5h3v5" />
        </>
      )}
      {name === 'cards' && (
        <>
          <Rect {...common} x={7} y={3.5} width={11} height={16} rx={2} />
          <Path {...common} d="M5 6.5v12.5a2 2 0 0 0 2 2h8" />
          <Path {...common} d="M12.5 8.5l1.2 2.4 2.6.4-1.9 1.8.5 2.6-2.4-1.3-2.3 1.3.4-2.6-1.9-1.8 2.6-.4z" />
        </>
      )}
      {name === 'journal' && (
        <>
          <Path {...common} d="M6 3.5h11a1.5 1.5 0 0 1 1.5 1.5v15H7a1.5 1.5 0 0 1-1.5-1.5V4A.5.5 0 0 1 6 3.5z" />
          <Path {...common} d="M5.5 17.5A1.5 1.5 0 0 1 7 16h11.5" />
          <Path {...common} d="M9.5 8h5M9.5 11h3.5" />
        </>
      )}
      {name === 'learn' && (
        <>
          <Path {...common} d="M12 6.5C10 5 7 4.5 4 5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5c-3-.5-6 0-8 1.5z" />
          <Path {...common} d="M12 6.5v13" />
        </>
      )}
      {name === 'settings' && (
        <>
          <Circle {...common} cx={12} cy={12} r={3} />
          <Path
            {...common}
            d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6 18 18M6 18l1.4-1.4M16.6 7.4 18 6"
          />
        </>
      )}
      {name === 'moon' && <Path {...common} d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z" />}
      {name === 'globe' && (
        <>
          <Circle {...common} cx={12} cy={12} r={8.5} />
          <Path {...common} d="M3.5 12h17M12 3.5c2.5 2.5 3.5 5.5 3.5 8.5s-1 6-3.5 8.5c-2.5-2.5-3.5-5.5-3.5-8.5s1-6 3.5-8.5z" />
        </>
      )}
      {name === 'check' && <Path {...common} d="M5 12.5 10 17l9-10" />}
      {name === 'back' && <Path {...common} d="M15 5l-7 7 7 7" />}
      {name === 'search' && (
        <>
          <Circle {...common} cx={10.5} cy={10.5} r={6} />
          <Path {...common} d="M15 15l5 5" />
        </>
      )}
      {name === 'close' && <Path {...common} d="M6 6l12 12M18 6 6 18" />}
      {name === 'lock' && (
        <>
          <Rect {...common} x={5} y={11} width={14} height={10} rx={2} />
          <Path {...common} d="M8 11V8a4 4 0 0 1 8 0v3" />
        </>
      )}
      {name === 'star' && <Path {...common} d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.3-4.1 5.9-.9z" />}
    </Svg>
  );
}
