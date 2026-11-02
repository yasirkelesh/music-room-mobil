// The app's own action sheet, the same on both platforms: the record it is about at the top (sleeve
// with its disc peeking out), then one row per action with its icon. It replaces the system sheets
// (ActionSheetIOS / Alert), which looked foreign and on Android dropped every button past the third.
//
// Hosting differs per platform. iOS: a transparent <Modal>, because native modal screens (now-playing,
// list settings) sit above the React root and an overlay there would open behind them. Android: an
// overlay above the navigator; its <Modal> window sometimes stayed up when closing coincided with a
// navigation, and the menu would not go away.

import { useEffect, useRef, useState } from 'react';
import { BackHandler, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CoverSource } from '@/data/mock';
import { readable } from '@/lib/layout';
import { colors, type } from '@/theme';
import { Cover } from './Cover';
import { Disc } from './Disc';
import { Icon, IconName } from './Icon';

export type Action = { label: string; run: () => void; destructive?: boolean; icon?: IconName; hint?: string };
/** What the sheet is about: a record (cover + disc) or just a title. */
export type SheetSubject = { title: string; subtitle?: string; cover?: CoverSource };
type Sheet = { subject?: SheetSubject; actions: Action[]; dark?: boolean };

let show: ((s: Sheet | null) => void) | null = null;

export function showActions(subject: string | SheetSubject | undefined, actions: Action[], opts?: { dark?: boolean }) {
  if (actions.length === 0) return;
  Haptics.selectionAsync().catch(() => {});
  show?.({ subject: typeof subject === 'string' ? { title: subject } : subject, actions, dark: opts?.dark });
}

/** Mounted once at the root; renders whatever `showActions` asked for. */
export function ActionSheetHost() {
  const [sheet, setSheet] = useState<Sheet | null>(null);
  // the chosen action runs once the sheet is gone (iOS: after the modal is dismissed, or the next
  // screen cannot be presented over it)
  const pending = useRef<(() => void) | null>(null);
  useEffect(() => {
    show = setSheet;
    return () => { show = null; };
  }, []);
  useEffect(() => {
    if (!sheet || Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { setSheet(null); return true; });
    return () => sub.remove();
  }, [sheet]);

  const close = () => setSheet(null);
  const flush = () => { const run = pending.current; pending.current = null; run?.(); };
  const pick = (a: Action) => {
    pending.current = a.run;
    close();
    if (Platform.OS === 'android') setTimeout(flush, 0);
  };

  if (Platform.OS === 'ios') {
    return (
      <Modal visible={!!sheet} transparent animationType="none" onRequestClose={close} onDismiss={flush}>
        {sheet && <Body sheet={sheet} close={close} pick={pick} />}
      </Modal>
    );
  }
  return sheet ? <View style={StyleSheet.absoluteFill}><Body sheet={sheet} close={close} pick={pick} /></View> : null;
}

function Body({ sheet, close, pick }: { sheet: Sheet; close: () => void; pick: (a: Action) => void }) {
  const insets = useSafeAreaInsets();
  const d = sheet.dark;
  const fg = d ? colors.white : colors.label;
  const sub = d ? 'rgba(255,255,255,0.6)' : colors.secondary;
  const bg = d ? '#1C1C1E' : colors.bg;
  const card = d ? 'rgba(255,255,255,0.08)' : colors.card;
  const chip = d ? 'rgba(255,255,255,0.12)' : colors.fill;
  const line = d ? 'rgba(255,255,255,0.1)' : colors.hairline;
  const s = sheet.subject;

  return (
    <View style={{ flex: 1 }}>
      <Animated.View entering={FadeIn.duration(160)} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)' }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Kapat" style={{ flex: 1 }} onPress={close} />
      </Animated.View>
      <Animated.View entering={SlideInDown.springify().damping(20).mass(0.7)}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 16) }}>
        <View style={[readable, { paddingHorizontal: 16 }]}>
          <View style={{ alignSelf: 'center', width: 36, height: 5, borderRadius: 3, backgroundColor: chip, marginBottom: 14 }} />

          {s && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 4, marginBottom: 14 }}>
              {s.cover !== undefined && (
                <View style={{ width: 72, height: 56 }}>
                  <View style={{ position: 'absolute', left: 18, top: 1 }}>
                    <Disc cover={s.cover} size={54} finish="vinyl" label={0.42} holeColor={bg} />
                  </View>
                  <Cover cover={s.cover} size={56} radius={6} />
                </View>
              )}
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[type.headline, { color: fg }]} numberOfLines={2}>{s.title}</Text>
                {s.subtitle ? <Text style={[type.footnote, { color: sub, marginTop: 2 }]} numberOfLines={1}>{s.subtitle}</Text> : null}
              </View>
            </View>
          )}

          <View style={{ borderRadius: 20, backgroundColor: card, overflow: 'hidden' }}>
            {sheet.actions.map((a, i) => {
              const tint = a.destructive ? colors.danger : fg;
              return (
                <Pressable key={a.label} accessibilityRole="button" accessibilityHint={a.hint} onPress={() => pick(a)}
                  style={({ pressed }) => ({ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 14, paddingVertical: 8,
                    borderTopWidth: i ? StyleSheet.hairlineWidth : 0, borderTopColor: line, backgroundColor: pressed ? chip : 'transparent' })}>
                  {a.icon && (
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: chip, alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name={a.icon} size={16} color={tint} />
                    </View>
                  )}
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[type.body, { color: tint, fontWeight: '500' }]}>{a.label}</Text>
                    {a.hint ? <Text style={[type.footnote, { color: sub }]} numberOfLines={2}>{a.hint}</Text> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>

          <Pressable accessibilityRole="button" onPress={close}
            style={({ pressed }) => ({ marginTop: 10, height: 52, borderRadius: 26, backgroundColor: card, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}>
            <Text style={[type.headline, { color: fg }]}>Vazgeç</Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}
