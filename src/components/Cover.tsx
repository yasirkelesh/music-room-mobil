import { View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { covers, CoverKey } from '@/data/mock';

type Props = { cover: CoverKey; size: number; radius?: number };

/**
 * Album cover. Today it draws stand-in artwork; once the provider API is wired,
 * swap the <Svg> for <Image source={{ uri }} /> — every screen keeps working.
 */
export function Cover({ cover, size, radius = 8 }: Props) {
  const c = covers[cover];
  const a = c.base;
  const b = c.ink;
  const art = (() => {
    switch (c.kind) {
      case 'sun':
        return (<>
          <Circle cx={50} cy={58} r={27} fill={b} />
          <Rect y={62} width={100} height={3} fill={a} />
          <Rect y={69} width={100} height={4} fill={a} />
          <Rect y={77} width={100} height={23} fill={a} />
          <Rect x={12} y={84} width={76} height={1.5} fill={b} opacity={0.6} />
        </>);
      case 'orbs':
        return (<>
          <Circle cx={34} cy={38} r={20} fill={b} />
          <Circle cx={66} cy={62} r={20} fill="none" stroke={b} strokeWidth={3} />
          <Circle cx={72} cy={26} r={5} fill={b} />
        </>);
      case 'stripes':
        return <Path d="M-10 70 L70 -10 M-10 90 L90 -10 M-10 110 L110 -10 M10 110 L110 10 M30 110 L110 30" stroke={b} strokeWidth={7} />;
      case 'grid': {
        const dots = [];
        for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) dots.push(<Circle key={`${i}${j}`} cx={20 + j * 20} cy={20 + i * 20} r={(i + j) % 3 === 0 ? 7 : 4} fill={b} />);
        return <>{dots}</>;
      }
      case 'split':
        return (<>
          <Rect x={50} width={50} height={100} fill={b} />
          <Rect x={30} y={30} width={40} height={40} fill={a} />
          <Circle cx={50} cy={50} r={12} fill={b} />
        </>);
      case 'waves':
        return <Path d="M0 40 Q25 28 50 40 T100 40 M0 56 Q25 44 50 56 T100 56 M0 72 Q25 60 50 72 T100 72" fill="none" stroke={b} strokeWidth={4} />;
      case 'rings':
        return (<>
          <Circle cx={50} cy={50} r={34} fill="none" stroke={b} strokeWidth={3} />
          <Circle cx={50} cy={50} r={22} fill="none" stroke={b} strokeWidth={3} />
          <Circle cx={50} cy={50} r={10} fill={b} />
        </>);
    }
  })();
  return (
    <View style={{ width: size, height: size, borderRadius: radius, overflow: 'hidden', backgroundColor: a }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Rect width={100} height={100} fill={a} />
        {art}
      </Svg>
    </View>
  );
}

/** 2×2 collage of covers, used for playlists (Apple Music style). */
export function Mosaic({ items, size, radius = 8 }: { items: CoverKey[]; size: number; radius?: number }) {
  const q = size / 2;
  const four = [0, 1, 2, 3].map((i) => items[i % items.length]);
  return (
    <View style={{ width: size, height: size, borderRadius: radius, overflow: 'hidden', flexDirection: 'row', flexWrap: 'wrap' }}>
      {four.map((k, i) => <Cover key={i} cover={k} size={q} radius={0} />)}
    </View>
  );
}
