import { Text, View } from 'react-native';
import { Person } from '@/data/mock';
import { colors } from '@/theme';

const tones: Record<Person['tone'], { bg: string; fg: string; border?: string }> = {
  ink: { bg: colors.label, fg: colors.white },
  chrome: { bg: colors.chrome, fg: colors.label },
  outline: { bg: colors.card, fg: colors.label, border: colors.label },
  graphite: { bg: colors.graphite, fg: colors.white },
  light: { bg: colors.chromeLight, fg: colors.label },
};

export function Avatar({ person, size = 40, ring, override }: {
  person: Pick<Person, 'initial' | 'tone'>; size?: number; ring?: string; override?: { bg: string; fg: string };
}) {
  const t = override ?? tones[person.tone];
  const border = 'border' in t ? (t as { border?: string }).border : undefined;
  return (
    <View
      style={{
        width: size, height: size, borderRadius: size / 2, backgroundColor: t.bg,
        borderWidth: ring ? 2 : border ? 1 : 0, borderColor: ring ?? border,
        alignItems: 'center', justifyContent: 'center',
      }}
    >
      <Text style={{ color: t.fg, fontSize: size * 0.4, fontWeight: '600' }}>{person.initial}</Text>
    </View>
  );
}
