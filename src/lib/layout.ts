// Tablets: content keeps a phone-to-small-tablet measure, centred, instead of stretching edge to edge.

import { useWindowDimensions } from 'react-native';

export const READABLE_WIDTH = 680;

/** Spread into a scroll view's contentContainerStyle (or a screen's root) to centre it at a readable width. */
export const readable = { width: '100%', maxWidth: READABLE_WIDTH, alignSelf: 'center' } as const;

/** Window width, capped to the readable measure: what layouts sized "from the screen" should use. */
export function useContentWidth() {
  return Math.min(useWindowDimensions().width, READABLE_WIDTH);
}
