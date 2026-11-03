import { AppStack } from '@/components/AppStack';
import { colors } from '@/theme';

export default function PartyLayout() {
  return (
    <AppStack
      bg={colors.darkBg}
      routes={[
        { name: 'rules', bg: colors.bg },
        // add songs on top of the room, so the queue is one swipe away
        { name: 'suggest', modal: true, bg: '#111' },
      ]}
    />
  );
}
