import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { CoverKey } from '@/data/mock';
import { colors } from '@/theme';
import { Cover } from './Cover';
import { Spin } from './Motion';

type Props = {
  cover: CoverKey;
  size: number;
  spinning?: boolean;
  /** 'silver' = chrome disc with grooves (default), 'vinyl' = black record, 'picture' = cover printed on the whole disc */
  finish?: 'silver' | 'vinyl' | 'picture';
  /** label diameter relative to the disc */
  label?: number;
  holeColor?: string;
  duration?: number;
};

/** A record whose centre label is the album cover. */
export function Disc({ cover, size, spinning = false, finish = 'silver', label = 0.47, holeColor = colors.bg, duration = 3600 }: Props) {
  const r = size / 2;
  const labelSize = finish === 'picture' ? size : Math.round(size * label);
  const hole = Math.max(4, Math.round(size * 0.04));
  const body = finish === 'vinyl' ? colors.vinyl : colors.chrome;
  const groove = finish === 'vinyl' ? colors.vinylGroove : colors.bg;
  return (
    <Spin running={spinning} duration={duration} style={{ width: size, height: size }}>
      {finish !== 'picture' && (
        <Svg width={size} height={size} viewBox="0 0 100 100" style={{ position: 'absolute' }}>
          <Circle cx={50} cy={50} r={49.5} fill={body} />
          {[46, 41, 36, 31].map((g, i) => (
            <Circle key={g} cx={50} cy={50} r={g} fill="none" stroke={groove} strokeWidth={0.35} opacity={i % 2 ? 0.55 : 0.85} />
          ))}
          <Path d="M50 5 A45 45 0 0 1 86 24" fill="none" stroke="#FFFFFF" strokeWidth={2.4} strokeLinecap="round" opacity={finish === 'vinyl' ? 0.16 : 0.35} />
        </Svg>
      )}
      <View style={{ position: 'absolute', left: r - labelSize / 2, top: r - labelSize / 2 }}>
        <Cover cover={cover} size={labelSize} radius={labelSize / 2} />
      </View>
      <View style={{ position: 'absolute', left: r - hole / 2, top: r - hole / 2, width: hole, height: hole, borderRadius: hole / 2, backgroundColor: holeColor }} />
    </Spin>
  );
}
