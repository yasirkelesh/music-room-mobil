// Keeps the app playing in the background, and puts it on the lock screen.
//
// The sound comes from a YouTube player inside a WebView, which the OS does not know is "playing
// music": Android 14+ freezes a backgrounded app within seconds unless it runs a media foreground
// service, and neither platform shows lock-screen controls for it. So while a track plays, expo-audio
// loops a second of silence and claims the lock screen for it — that starts the media service on
// Android and the Now Playing card on iOS. Pausing from the lock screen pauses the silent player; we
// notice and pass it on to the real one.

import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { AudioPlayer, createAudioPlayer } from 'expo-audio';
import { CoverSource, Track } from '@/data/mock';

// Off where it does harm:
//  - Expo Go has no expo-audio media service: every call logged "Failed to start the expo-audio playback
//    service" and the lock screen could not be claimed;
//  - Android: the silent player takes audio focus, and the WebView playing the music, losing it, pauses —
//    the music stopped as soon as it started.
// So: iOS standalone/dev builds only.
const ENABLED = Platform.OS === 'ios' && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

let player: AudioPlayer | null = null;
/** What we last asked the silent player to do, to tell our own changes from the lock screen's. */
let expected = false;
let onRemote: ((play: boolean) => void) | null = null;

function ensure() {
  if (player) return player;
  player = createAudioPlayer(require('../../assets/audio/silence.wav'));
  player.loop = true;
  player.addListener('playbackStatusUpdate', (s) => {
    if (!s.isLoaded || s.playing === expected) return;
    // the lock screen / headphones changed it, not us
    expected = s.playing;
    onRemote?.(s.playing);
  });
  return player;
}

const artwork = (c: CoverSource) => (typeof c === 'object' ? c.uri : undefined);

/** Called by the player whenever what plays (or whether it plays) changes. */
export function keepAlive(track: Track | null, playing: boolean, remote: (play: boolean) => void) {
  if (!ENABLED) return;
  onRemote = remote;
  if (!track) {
    if (!player) return;
    expected = false;
    player.pause();
    player.clearLockScreenControls();
    return;
  }
  const p = ensure();
  expected = playing;
  if (playing) p.play(); else p.pause();
  p.setActiveForLockScreen(true, { title: track.title, artist: track.artist, artworkUrl: artwork(track.cover) });
}
