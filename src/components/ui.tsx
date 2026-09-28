import { Children, isValidElement, ReactNode } from 'react';
import {
  Pressable,
  PressableProps,
  ScrollView,
  StyleProp,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, space, type } from '@/theme';
import { Icon, IconName } from './Icon';

export const tap = () => Haptics.selectionAsync().catch(() => {});

/* ---------- layout ---------- */

export function Screen({ children, dark, scroll, style, padded = true }: {
  children: ReactNode; dark?: boolean; scroll?: boolean; style?: StyleProp<ViewStyle>; padded?: boolean;
}) {
  const bg = dark ? colors.darkBg : colors.bg;
  const inner = [{ flexGrow: 1, paddingHorizontal: padded ? space.screen : 0, paddingBottom: space.xl }, style];
  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: bg }}>
      {scroll ? (
        <ScrollView contentContainerStyle={inner} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, inner]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function TopBar({ left, right, dark }: { left?: ReactNode; right?: ReactNode; dark?: boolean }) {
  return (
    <View style={{ height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      {left ?? <BackButton dark={dark} />}
      {right ?? <View />}
    </View>
  );
}

export function BackButton({ dark, icon = 'back', label = 'Geri' }: { dark?: boolean; icon?: IconName; label?: string }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} hitSlop={8} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={{ width: 44, height: 44, justifyContent: 'center' }}>
      <Icon name={icon} color={dark ? colors.white : colors.label} />
    </Pressable>
  );
}

export function TextButton({ title, onPress, dark, muted, weight = '500', size = 15 }: {
  title: string; onPress?: () => void; dark?: boolean; muted?: boolean; weight?: TextStyle['fontWeight']; size?: number;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={8} style={({ pressed }) => ({ minHeight: 44, justifyContent: 'center', opacity: pressed ? 0.5 : 1 })}>
      <Text style={{ fontSize: size, fontWeight: weight, color: muted ? colors.secondary : dark ? colors.white : colors.label }}>{title}</Text>
    </Pressable>
  );
}

/* ---------- type ---------- */

export function Title({ children, dark, style }: { children: ReactNode; dark?: boolean; style?: StyleProp<TextStyle> }) {
  return <Text accessibilityRole="header" style={[type.largeTitle, { color: dark ? colors.white : colors.label, marginTop: space.l }, style]}>{children}</Text>;
}

export function Sub({ children, dark, style }: { children: ReactNode; dark?: boolean; style?: StyleProp<TextStyle> }) {
  return <Text style={[type.body, { color: dark ? colors.darkSecondary : colors.secondary, marginTop: 6, lineHeight: 23 }, style]}>{children}</Text>;
}

export function SectionHeader({ children, icon, dark }: { children: ReactNode; icon?: IconName; dark?: boolean }) {
  const c = dark ? colors.darkSecondary : colors.secondary;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: space.xl, marginBottom: 6, marginHorizontal: space.l }}>
      {icon && <Icon name={icon} size={14} color={c} strokeWidth={2} />}
      <Text style={[type.footnote, { color: c, textTransform: 'uppercase' }]}>{children}</Text>
    </View>
  );
}

/* ---------- buttons ---------- */

type PillVariant = 'primary' | 'secondary' | 'outline' | 'light';

export function Pill({ title, onPress, variant = 'primary', disabled, left, right, height = 52, style }: {
  title: string; onPress?: () => void; variant?: PillVariant; disabled?: boolean; left?: ReactNode; right?: ReactNode; height?: number; style?: StyleProp<ViewStyle>;
}) {
  const bg = disabled ? colors.disabled
    : variant === 'primary' ? colors.label
    : variant === 'secondary' ? colors.card
    : variant === 'light' ? colors.white
    : 'transparent';
  const fg = variant === 'primary' || disabled ? colors.white : variant === 'light' ? colors.black : colors.label;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => { tap(); onPress?.(); }}
      style={({ pressed }) => [{
        height, borderRadius: height / 2, backgroundColor: bg, borderWidth: variant === 'outline' ? 1 : 0, borderColor: colors.label,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 20,
        opacity: pressed ? 0.75 : 1, transform: [{ scale: pressed ? 0.98 : 1 }],
      }, style]}
    >
      {left}
      <Text style={[type.headline, { color: fg }]}>{title}</Text>
      {right}
    </Pressable>
  );
}

export function IconButton({ icon, label, onPress, size = 44, filled, color, iconSize = 20, style }: {
  icon: IconName; label: string; onPress?: () => void; size?: number; filled?: boolean; color?: string; iconSize?: number; style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => { tap(); onPress?.(); }}
      hitSlop={6}
      style={({ pressed }) => [{
        width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center',
        backgroundColor: filled ? colors.label : 'transparent', opacity: pressed ? 0.6 : 1,
      }, style]}
    >
      <Icon name={icon} size={iconSize} color={color ?? (filled ? colors.white : colors.label)} />
    </Pressable>
  );
}

/* ---------- grouped lists ---------- */

export function Group({ children, dark, style }: { children: ReactNode; dark?: boolean; style?: StyleProp<ViewStyle> }) {
  const items = Children.toArray(children).filter(isValidElement);
  return (
    <View style={[{ backgroundColor: dark ? '#1C1C1E' : colors.card, borderRadius: radius.card, paddingLeft: space.l, overflow: 'hidden' }, style]}>
      {items.map((child, i) => (
        <View key={i} style={{ paddingRight: space.l, borderBottomWidth: i < items.length - 1 ? StyleSheet.hairlineWidth : 0, borderBottomColor: dark ? colors.darkHairline : colors.separator }}>
          {child}
        </View>
      ))}
    </View>
  );
}

export function Row({ title, value, left, right, onPress, subtitle, height = 48 }: {
  title: string; value?: string; left?: ReactNode; right?: ReactNode; onPress?: () => void; subtitle?: string; height?: number;
}) {
  const content = (
    <View style={{ minHeight: height, flexDirection: 'row', alignItems: 'center', gap: space.m }}>
      {left}
      <View style={{ flex: 1 }}>
        <Text style={[type.body, { color: colors.label }]}>{title}</Text>
        {subtitle ? <Text style={[type.footnote, { color: colors.secondary }]} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {value ? <Text style={[type.body, { color: colors.secondary }]}>{value}</Text> : null}
      {right}
    </View>
  );
  return onPress ? <Pressable accessibilityRole="button" onPress={onPress}>{content}</Pressable> : content;
}

export function FieldRow({ label, labelWidth = 72, right, ...input }: TextInputProps & { label: string; labelWidth?: number; right?: ReactNode }) {
  return (
    <View style={{ height: 52, flexDirection: 'row', alignItems: 'center', gap: space.m }}>
      <Text style={[type.body, { width: labelWidth, color: colors.label }]}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.tertiary}
        style={[type.body, { flex: 1, height: 44, color: colors.label }]}
        {...input}
      />
      {right}
    </View>
  );
}

export function SearchField(props: TextInputProps) {
  return (
    <View style={{ height: 40, borderRadius: 10, backgroundColor: colors.fill, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10 }}>
      <Icon name="search" size={17} color={colors.tertiary} strokeWidth={2} />
      <TextInput placeholderTextColor={colors.tertiary} style={[type.body, { flex: 1, height: 36, color: colors.label }]} {...props} />
    </View>
  );
}

export function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <Switch
      accessibilityLabel={label}
      value={value}
      onValueChange={(v) => { tap(); onChange(v); }}
      trackColor={{ true: colors.label, false: colors.chromeLight }}
      ios_backgroundColor={colors.chromeLight}
    />
  );
}

/** Text options with an underline on the selected one (used for visibility / duration choices). */
export function Choice<T extends string>({ options, value, onChange, dark }: {
  options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; dark?: boolean;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 20 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => { tap(); onChange(o.value); }} style={{ minHeight: 44, justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: on ? (dark ? colors.white : colors.label) : 'transparent' }}>
            <Text style={[type.subhead, { color: on ? (dark ? colors.white : colors.label) : colors.secondary, fontWeight: on ? '600' : '400' }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Radio({ on }: { on: boolean }) {
  return (
    <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: on ? colors.label : colors.disabled, alignItems: 'center', justifyContent: 'center' }}>
      {on && <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: colors.label }} />}
    </View>
  );
}

export function Check({ on, round }: { on: boolean; round?: boolean }) {
  return (
    <View style={{ width: 24, height: 24, borderRadius: round ? 12 : 6, borderWidth: on ? 0 : 1.5, borderColor: '#C7C7CC', backgroundColor: on ? colors.label : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
      {on && <Icon name="check" size={14} color={colors.white} strokeWidth={2.4} />}
    </View>
  );
}

export function Divider({ label }: { label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: space.xl }}>
      <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.separator }} />
      <Text style={[type.footnote, { color: colors.secondary }]}>{label}</Text>
      <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.separator }} />
    </View>
  );
}

export function Chip({ label, on, onPress }: { label: string; on?: boolean } & Pick<PressableProps, 'onPress'>) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: !!on }} onPress={(e) => { tap(); onPress?.(e); }} style={{ height: 44, paddingHorizontal: 18, borderRadius: 22, backgroundColor: on ? colors.label : colors.card, justifyContent: 'center' }}>
      <Text style={[type.callout, { fontWeight: '500', color: on ? colors.white : colors.label }]}>{label}</Text>
    </Pressable>
  );
}

export function Tag({ label }: { label: string }) {
  return (
    <View style={{ height: 30, paddingHorizontal: 12, borderRadius: 15, backgroundColor: colors.bg, justifyContent: 'center' }}>
      <Text style={[type.subhead, { fontSize: 14 }]}>{label}</Text>
    </View>
  );
}

export function LiveDot({ color = colors.label, size = 6 }: { color?: string; size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />;
}

export function Progress({ ratio, color = colors.label, track = colors.track, dot }: { ratio: number; color?: string; track?: string; dot?: string }) {
  return (
    <View style={{ height: 12, flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ flex: ratio, height: 3, borderRadius: 2, backgroundColor: color }} />
      {dot ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: dot, marginHorizontal: -5, zIndex: 1 }} /> : null}
      <View style={{ flex: 1 - ratio, height: 3, borderRadius: 2, backgroundColor: track }} />
    </View>
  );
}
