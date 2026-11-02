// The music video of what is playing, for the player screen. The sound keeps coming from the hidden
// audio engine (it lives at the root and survives screens, background, the queue); this is a second,
// muted YouTube player that only follows it — same video, same play/pause, re-seeked when it drifts.
//
// It is a picture, not an embedded YouTube: it takes no touches (play, pause and seeking live in our own
// controls), the player is taller than the frame so YouTube's title/share bar falls outside it, and
// whenever the video is not running — loading, paused, between tracks — the record's cover sits on
// top, so YouTube's "more videos" panel never shows.

import { ComponentType, Ref, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, View } from 'react-native';
import { WebView as RNWebView, WebViewMessageEvent, WebViewProps } from 'react-native-webview';
import { thumbnail } from '@/lib/tracks';
import { colors } from '@/theme';
import { youtubeHtml } from './youtubeHtml';

type WebHandle = { injectJavaScript: (js: string) => void };
const WebView = RNWebView as unknown as ComponentType<WebViewProps & { ref?: Ref<WebHandle> }>;

/** Further apart than this (seconds) and the video jumps to the sound. */
const DRIFT = 1.2;

export function ClipView({ videoId, position, playing, width }: { videoId: string; position: number; playing: boolean; width: number }) {
  const web = useRef<WebHandle>(null);
  const [ready, setReady] = useState(false);
  const [shown, setShown] = useState(false);
  const clipAt = useRef(0);
  const lastSeek = useRef(0);
  // the latest values, for the message handler and effects that should not re-run on every tick
  const live = useRef({ position, playing });
  useEffect(() => { live.current = { position, playing }; });

  const run = (c: object) => web.current?.injectJavaScript(`cmd(${JSON.stringify(c)});true;`);

  // a new track: load it where the sound is
  useEffect(() => {
    if (!ready) return;
    run({ a: 'load', id: videoId, at: live.current.position });
    if (!live.current.playing) setTimeout(() => run({ a: 'pause' }), 300);
  }, [ready, videoId]);

  useEffect(() => {
    if (ready) run({ a: playing ? 'play' : 'pause' });
  }, [ready, playing]);

  // keep the picture on the sound
  useEffect(() => {
    if (!ready || Date.now() - lastSeek.current < 2500) return;
    if (Math.abs(clipAt.current - position) > DRIFT) {
      lastSeek.current = Date.now();
      run({ a: 'seek', s: position });
    }
  }, [ready, position]);

  const onMessage = (e: WebViewMessageEvent) => {
    let m: { t: string; p?: number; s?: number };
    try { m = JSON.parse(e.nativeEvent.data); } catch { return; }
    if (m.t === 'ready') { run({ a: 'mute' }); setReady(true); }
    else if (m.t === 'time') clipAt.current = m.p ?? 0;
    else if (m.t === 'state' && m.s === 1) setShown(true);
  };

  const height = Math.round((width * 9) / 16);
  // the video stays 16:9 in the middle of a taller player; the bars above and below, where YouTube
  // draws its overlays, are cut off by the frame
  const crop = Math.round(height * 0.3);
  const covered = !shown || !playing;
  return (
    <View accessible accessibilityRole="image" accessibilityLabel="Şarkının klibi"
      style={{ width, height, borderRadius: 16, overflow: 'hidden', backgroundColor: colors.black }}>
      <View pointerEvents="none" style={{ width, height: height + crop * 2, marginTop: -crop }}>
      <WebView
        ref={web}
        source={{ html: youtubeHtml, baseUrl: 'https://music-room.app' }}
        originWhitelist={['*']}
        javaScriptEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        allowsFullscreenVideo={false}
        scrollEnabled={false}
        onMessage={onMessage}
        style={{ width, height: height + crop * 2, backgroundColor: colors.black, opacity: shown ? 1 : 0 }}
      />
      </View>
      {covered && (
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
          <Image source={{ uri: thumbnail(videoId) }} resizeMode="cover" style={{ position: 'absolute', width, height }} />
          <View style={{ position: 'absolute', width, height, backgroundColor: 'rgba(0,0,0,0.35)' }} />
          {!shown && <ActivityIndicator color={colors.white} />}
        </View>
      )}
    </View>
  );
}
