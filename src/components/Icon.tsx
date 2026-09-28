import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors } from '@/theme';

export type IconName =
  | 'back' | 'down' | 'close' | 'plus' | 'play' | 'pause' | 'prev' | 'next' | 'search' | 'share'
  | 'check' | 'globe' | 'people' | 'lock' | 'mail' | 'pin' | 'heart' | 'phone' | 'laptop'
  | 'speaker' | 'listen' | 'jam' | 'lists' | 'arrow' | 'up' | 'downTri' | 'more' | 'left' | 'right';

type Props = { name: IconName; size?: number; color?: string; strokeWidth?: number };

export function Icon({ name, size = 22, color = colors.label, strokeWidth = 1.8 }: Props) {
  const s = { stroke: color, strokeWidth, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const f = { fill: color };
  const body = (() => {
    switch (name) {
      case 'back': return <Path d="M15 5l-7 7 7 7" {...s} strokeWidth={2} />;
      case 'left': return <Path d="M15 6l-6 6 6 6" {...s} strokeWidth={2} />;
      case 'right': return <Path d="M9 6l6 6-6 6" {...s} strokeWidth={2} />;
      case 'down': return <Path d="M6 9l6 6 6-6" {...s} strokeWidth={2} />;
      case 'close': return <Path d="M6 6l12 12M18 6L6 18" {...s} strokeWidth={2.2} />;
      case 'plus': return <Path d="M12 5v14M5 12h14" {...s} strokeWidth={2} />;
      case 'play': return <Path d="M7 5l12 7-12 7z" {...f} />;
      case 'pause': return (<><Rect x={6.5} y={5} width={3.5} height={14} rx={1} {...f} /><Rect x={14} y={5} width={3.5} height={14} rx={1} {...f} /></>);
      case 'prev': return (<><Path d="M19 5.5L9 12l10 6.5z" {...f} /><Rect x={5} y={5.5} width={2} height={13} rx={1} {...f} /></>);
      case 'next': return (<><Path d="M5 5.5L15 12 5 18.5z" {...f} /><Rect x={17} y={5.5} width={2} height={13} rx={1} {...f} /></>);
      case 'search': return (<><Circle cx={11} cy={11} r={6.5} {...s} /><Path d="M16 16l4.5 4.5" {...s} /></>);
      case 'share': return (<><Path d="M12 4v11M8 8l4-4 4 4" {...s} /><Path d="M6 12v6.5A1.5 1.5 0 0 0 7.5 20h9a1.5 1.5 0 0 0 1.5-1.5V12" {...s} /></>);
      case 'check': return <Path d="M5 12.5l4.5 4.5L19 7.5" {...s} strokeWidth={strokeWidth + 0.7} />;
      case 'globe': return (<><Circle cx={12} cy={12} r={9} {...s} /><Path d="M3 12h18M12 3c2.8 3 2.8 15 0 18M12 3c-2.8 3-2.8 15 0 18" {...s} /></>);
      case 'people': return (<><Circle cx={9} cy={9} r={3.5} {...s} /><Circle cx={17} cy={10} r={2.5} {...s} /><Path d="M3 19c.8-3 3.2-4.5 6-4.5s5.2 1.5 6 4.5" {...s} /></>);
      case 'lock': return (<><Rect x={5} y={11} width={14} height={9} rx={2} {...s} /><Path d="M8 11V8a4 4 0 0 1 8 0v3" {...s} /></>);
      case 'mail': return (<><Rect x={3} y={5.5} width={18} height={13} rx={2.5} {...s} /><Path d="M3.5 7l8.5 6 8.5-6" {...s} /></>);
      case 'pin': return (<><Path d="M12 21s-6-5.4-6-11a6 6 0 0 1 12 0c0 5.6-6 11-6 11z" {...s} /><Circle cx={12} cy={10} r={2} {...s} /></>);
      case 'heart': return <Path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" {...s} />;
      case 'phone': return (<><Rect x={7} y={3} width={10} height={18} rx={2} {...s} /><Path d="M11 18h2" {...s} /></>);
      case 'laptop': return (<><Rect x={5} y={5} width={14} height={10} rx={1.5} {...s} /><Path d="M3 19h18" {...s} /></>);
      case 'speaker': return (<><Rect x={6} y={3} width={12} height={18} rx={2} {...s} /><Circle cx={12} cy={14} r={3} {...s} /><Circle cx={12} cy={7} r={1} {...s} /></>);
      case 'listen': return (<><Circle cx={12} cy={12} r={9} {...s} /><Circle cx={12} cy={12} r={2.5} {...s} /></>);
      case 'jam': return (<><Circle cx={9} cy={9} r={3.5} {...s} /><Circle cx={16.5} cy={10.5} r={2.5} {...s} /><Path d="M3 19c.8-3 3.2-4.5 6-4.5s5.2 1.5 6 4.5" {...s} /><Path d="M15 15.2c2.6-.3 4.6.9 5.5 3.3" {...s} /></>);
      case 'lists': return (<><Path d="M8 6h12M8 12h12M8 18h12" {...s} /><Circle cx={4} cy={6} r={1} {...f} /><Circle cx={4} cy={12} r={1} {...f} /><Circle cx={4} cy={18} r={1} {...f} /></>);
      case 'arrow': return <Path d="M4 12h15M13 6l6 6-6 6" {...s} strokeWidth={2} />;
      case 'up': return <Path d="M12 4l9 14H3z" {...f} />;
      case 'downTri': return <Path d="M12 20L3 6h18z" {...f} />;
      case 'more': return (<><Circle cx={5} cy={12} r={1.6} {...f} /><Circle cx={12} cy={12} r={1.6} {...f} /><Circle cx={19} cy={12} r={1.6} {...f} /></>);
    }
  })();
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {body}
    </Svg>
  );
}
