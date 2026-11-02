import { AppStack } from '@/components/AppStack';
import { colors } from '@/theme';

export default function AuthLayout() {
  return <AppStack bg={colors.bg} routes={[{ name: 'welcome', bg: colors.darkBg }]} />;
}
