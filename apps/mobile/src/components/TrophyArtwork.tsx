import Svg, { Circle, G, Line, Path, Polygon, Rect } from 'react-native-svg';

import { palette } from '../theme/theme';
import type { Trophy } from '../types';

type TrophyArtworkProps = {
  trophy: Trophy;
  size?: number;
};

const categoryColors: Record<Trophy['category'], { primary: string; secondary: string }> = {
  workout: { primary: palette.accent, secondary: '#0E7490' },
  measurement: { primary: palette.gold, secondary: '#B45309' },
  consistency: { primary: '#F97316', secondary: '#C2410C' },
  exploration: { primary: '#60A5FA', secondary: '#2563EB' },
};

export function TrophyArtwork({ trophy, size = 72 }: TrophyArtworkProps) {
  const colors = categoryColors[trophy.category];
  const center = size / 2;
  const medalRadius = size * 0.28;

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Rect x="31" y="4" width="14" height="34" rx="4" fill={colors.secondary} transform="rotate(-12 38 21)" />
      <Rect x="55" y="4" width="14" height="34" rx="4" fill={colors.secondary} transform="rotate(12 62 21)" />
      <Circle cx={center} cy={center + 5} r={medalRadius + 7} fill={colors.secondary} opacity={0.35} />
      <Circle cx={center} cy={center + 5} r={medalRadius} fill={colors.primary} />
      <Circle cx={center} cy={center + 5} r={medalRadius - 5} fill="none" stroke="#FFF7DD" strokeWidth="2" opacity={0.8} />
      <G fill="#FFF7DD" stroke="#FFF7DD" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {trophy.category === 'workout' && (
          <Path d="M46 55 L53 55 L49 63 L56 63 L45 77 L48 67 L42 67 Z" />
        )}
        {trophy.category === 'measurement' && (
          <G fill="none">
            <Path d="M39 68 A12 12 0 0 1 61 68" />
            <Line x1="50" y1="68" x2="56" y2="58" />
            <Line x1="42" y1="68" x2="42" y2="65" />
            <Line x1="50" y1="68" x2="50" y2="64" />
            <Line x1="58" y1="68" x2="58" y2="65" />
          </G>
        )}
        {trophy.category === 'consistency' && (
          <G fill="none">
            <Path d="M50 57 C42 49 35 60 50 75 C65 60 58 49 50 57 Z" />
            <Path d="M39 78 C45 82 55 82 61 78" />
          </G>
        )}
        {trophy.category === 'exploration' && (
          <G>
            <Polygon points="50,53 57,67 50,79 43,67" />
            <Circle cx="50" cy="66" r="3" fill={colors.secondary} stroke="none" />
          </G>
        )}
      </G>
    </Svg>
  );
}
