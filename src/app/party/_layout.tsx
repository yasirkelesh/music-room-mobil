import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colors } from '@/theme';

export default function PartyLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.darkBg } }}>
        <Stack.Screen name="rules" options={{ contentStyle: { backgroundColor: colors.bg } }} />
      </Stack>
    </>
  );
}
