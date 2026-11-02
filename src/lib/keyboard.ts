// Keeping fields above the keyboard without a native module (react-native-keyboard-controller is not in
// Expo Go). Android draws edge-to-edge, so the window no longer shrinks for the keyboard there either:
// both platforms get the same treatment — pad the end of the scroll view by the keyboard's height, then
// scroll the focused field up into the visible part.

import { RefObject, useEffect, useState } from 'react';
import { Dimensions, Keyboard, Platform, ScrollViewInstance, TextInput } from 'react-native';

const SHOW = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
const HIDE = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

/** Height the keyboard currently covers, 0 when hidden. */
export function useKeyboardHeight() {
  const [h, setH] = useState(0);
  useEffect(() => {
    const a = Keyboard.addListener(SHOW, (e) => setH(e.endCoordinates.height));
    const b = Keyboard.addListener(HIDE, () => setH(0));
    return () => { a.remove(); b.remove(); };
  }, []);
  return h;
}

/**
 * When the keyboard opens, bring the focused field near the top of the scroll view, so whatever it
 * shows below (search results, the next field, the button) is visible too.
 */
export function useRevealFocused(scroll: RefObject<ScrollViewInstance | null>, gap = 96) {
  useEffect(() => {
    const sub = Keyboard.addListener('keyboardDidShow', (e) => {
      const input = TextInput.State.currentlyFocusedInput();
      const host = scroll.current?.getInnerViewRef?.();
      if (!input || !host) return;
      // Leave fields that already sit well above the keyboard alone; move only the covered or low ones.
      // a frame later: the keyboard padding has to be laid out before there is room to scroll into
      setTimeout(() => input.measureInWindow((_x, wy, _w, wh) => {
        const room = Dimensions.get('window').height - e.endCoordinates.height - 160;
        if (wy + wh <= room) return;
        input.measureLayout(host, (_lx, y) => scroll.current?.scrollTo({ y: Math.max(0, y - gap), animated: true }), () => {});
      }), 60);
    });
    return () => sub.remove();
  }, [scroll, gap]);
}
