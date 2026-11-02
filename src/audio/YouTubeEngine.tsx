import { ComponentType, forwardRef, Ref, useCallback, useImperativeHandle, useRef } from 'react';
import { View } from 'react-native';
import { WebView as RNWebView, WebViewMessageEvent, WebViewProps } from 'react-native-webview';
import { devlog } from '@/lib/devlog';
import { youtubeHtml } from './youtubeHtml';

// webview 14's class typing defaults its generic to `undefined`, which collapses the props to `never`
// under the strict RN 0.88 types. Same component, typed by the props and the commands we actually use.
type WebHandle = { injectJavaScript: (js: string) => void };
const WebView = RNWebView as unknown as ComponentType<WebViewProps & { ref?: Ref<WebHandle> }>;

// The YouTube player pauses itself when its page reports "hidden" — which is what happens the moment
// the app goes to the background. Tell every frame (the player is an iframe inside our page) that it is
// always visible. Injecting into iframes works on iOS only; on Android the player resumes it instead.
const alwaysVisible = `(function () {
  try {
    Object.defineProperty(document, 'hidden', { get: function () { return false; } });
    Object.defineProperty(document, 'visibilityState', { get: function () { return 'visible'; } });
    Object.defineProperty(document, 'webkitHidden', { get: function () { return false; } });
    ['visibilitychange', 'webkitvisibilitychange', 'pagehide', 'blur', 'freeze'].forEach(function (e) {
      window.addEventListener(e, function (ev) { ev.stopImmediatePropagation(); }, true);
      document.addEventListener(e, function (ev) { ev.stopImmediatePropagation(); }, true);
    });
  } catch (e) {}
})(); true;`;

export type EngineState = 'unstarted' | 'ended' | 'playing' | 'paused' | 'buffering' | 'cued';
const states: Record<number, EngineState> = { [-1]: 'unstarted', 0: 'ended', 1: 'playing', 2: 'paused', 3: 'buffering', 5: 'cued' };

export type EngineHandle = {
  load: (videoId: string, startSeconds?: number) => void;
  play: () => void;
  pause: () => void;
  seek: (seconds: number) => void;
  stop: () => void;
};

type Props = {
  onReady?: () => void;
  onState: (s: EngineState) => void;
  onTime: (position: number, duration: number) => void;
  /** YouTube error code: 2 bad id · 5 html5 · 100 not found/private · 101/150 embedding off · 153 no referrer. */
  onError: (code: number) => void;
};

/**
 * Audio engine: a 1×1 WebView running the YouTube IFrame Player. It must stay mounted (and in the view
 * hierarchy) for as long as anything may play — mount it once, high in the tree.
 */
export const YouTubeEngine = forwardRef<EngineHandle, Props>(function YouTubeEngine({ onReady, onState, onTime, onError }, ref) {
  const web = useRef<WebHandle>(null);
  const lastLogged = useRef(-1);

  const run = useCallback((c: object) => {
    web.current?.injectJavaScript(`cmd(${JSON.stringify(c)});true;`);
  }, []);

  useImperativeHandle(ref, () => ({
    load: (id, at = 0) => { devlog('[yt] load', id); run({ a: 'load', id, at }); },
    play: () => run({ a: 'play' }),
    pause: () => run({ a: 'pause' }),
    seek: (s) => run({ a: 'seek', s }),
    stop: () => run({ a: 'stop' }),
  }), [run]);

  const onMessage = (e: WebViewMessageEvent) => {
    let m: { t: string; s?: number; p?: number; d?: number; c?: number };
    try { m = JSON.parse(e.nativeEvent.data); } catch { return; }
    if (m.t !== 'time') devlog('[yt]', m);
    if (m.t === 'ready') onReady?.();
    else if (m.t === 'state' && m.s !== undefined && states[m.s]) onState(states[m.s]);
    else if (m.t === 'time') {
      if (Math.floor(m.p ?? 0) % 5 === 0 && Math.floor(m.p ?? 0) !== lastLogged.current) { lastLogged.current = Math.floor(m.p ?? 0); devlog('[yt] time', Math.round(m.p ?? 0), '/', Math.round(m.d ?? 0)); }
      onTime(m.p ?? 0, m.d ?? 0);
    }
    else if (m.t === 'error') onError(m.c ?? 0);
  };

  // RN WebView puts `style` on the inner web view but wraps it in a flex:1 container, which would take half
  // the screen from its siblings. The wrapper below is what actually pins the engine to a 2×2 dot.
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, bottom: 0, width: 2, height: 2, opacity: 0.01, overflow: 'hidden' }}>
    <WebView
      ref={web}
      containerStyle={{ width: 2, height: 2, flex: 0 }}
      // The page's origin matters: with https://www.youtube.com (or no origin) YouTube answers error 152/153
      // and refuses to play. Any other https origin works; origin is passed to the player from location.origin.
      source={{ html: youtubeHtml, baseUrl: 'https://music-room.app' }}
      originWhitelist={['*']}
      javaScriptEnabled
      injectedJavaScriptBeforeContentLoaded={alwaysVisible}
      injectedJavaScriptBeforeContentLoadedForMainFrameOnly={false}
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      allowsFullscreenVideo={false}
      onMessage={onMessage}
      onLoadEnd={() => devlog('[yt] webview loaded')}
      onError={(e) => devlog('[yt] webview error', e.nativeEvent)}
      onHttpError={(e) => devlog('[yt] http error', e.nativeEvent.statusCode, e.nativeEvent.url)}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: 2, height: 2 }}
    />
    </View>
  );
});
