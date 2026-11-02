import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { CoverSource } from '@/data/mock';
import { colors } from '@/theme';
import { Cover } from './Cover';
import { Spin } from './Motion';

type Props = {
  cover: CoverSource;
  size: number;
  spinning?: boolean;
  /** 'silver' = chrome disc with grooves (default), 'vinyl' = black record, 'picture' = cover printed on the whole disc */
  finish?: 'silver' | 'vinyl' | 'picture';
  /** label diameter relative to the disc */
  label?: number;
  holeColor?: string;
  duration?: number;
  /** soft coloured glow behind the record. Drawn on a static layer so the spin never re-rasterises a shadow. */
  glow?: { color: string; radius?: number; opacity?: number; offsetY?: number };
};

/** A record whose centre label is the album cover. */
export function Disc({ cover, size, spinning = false, finish = 'silver', label = 0.47, holeColor = colors.bg, duration = 3600, glow }: Props) {
  const r = size / 2;
  const labelSize = finish === 'picture' ? size : Math.round(size * label);
  const hole = Math.max(4, Math.round(size * 0.04));
  const body = finish === 'vinyl' ? colors.vinyl : colors.chrome;
  const groove = finish === 'vinyl' ? colors.vinylGroove : colors.bg;
  return (
    <View style={{ width: size, height: size }}>
      {glow && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute', width: size, height: size, borderRadius: r, backgroundColor: body,
            shadowColor: glow.color, shadowOpacity: glow.opacity ?? 0.35, shadowRadius: glow.radius ?? 30,
            shadowOffset: { width: 0, height: glow.offsetY ?? 0 },
          }}
        />
      )}
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
    </View>
  );
}
