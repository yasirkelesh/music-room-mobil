// The page the hidden WebView loads. It owns one YouTube IFrame Player and speaks JSON with React Native:
//   RN → page: injectJavaScript("cmd({a:'load', id, at})")   (a = load | play | pause | seek | stop | mute)
//   page → RN: postMessage({t:'ready'} | {t:'state', s} | {t:'time', p, d} | {t:'error', c})
// YouTube state codes: -1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering, 5 cued.

export const youtubeHtml = /* html */ `<!doctype html>
<html><head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>html,body{margin:0;height:100%;background:#000}#p{width:100%;height:100%}</style>
</head><body><div id="p"></div>
<script src="https://www.youtube.com/iframe_api"></script>
<script>
var player, ready = false, pending = [];
window.onerror = function (m, u, l) { window.ReactNativeWebView.postMessage(JSON.stringify({ t: 'jserror', m: String(m), l: l })); };
function send(o) { window.ReactNativeWebView.postMessage(JSON.stringify(o)); }
function onYouTubeIframeAPIReady() {
  player = new YT.Player('p', {
    width: '100%', height: '100%',
    playerVars: { playsinline: 1, controls: 0, rel: 0, modestbranding: 1, disablekb: 1, fs: 0, iv_load_policy: 3, cc_load_policy: 0, origin: window.location.origin },
    events: {
      onReady: function () { ready = true; send({ t: 'ready' }); pending.splice(0).forEach(cmd); },
      onStateChange: function (e) { send({ t: 'state', s: e.data }); },
      onError: function (e) { send({ t: 'error', c: e.data }); }
    }
  });
}
function cmd(c) {
  if (!ready) { pending.push(c); return; }
  if (c.a === 'load') player.loadVideoById(c.id, c.at || 0);
  else if (c.a === 'play') player.playVideo();
  else if (c.a === 'pause') player.pauseVideo();
  else if (c.a === 'seek') player.seekTo(c.s, true);
  else if (c.a === 'stop') player.stopVideo();
  else if (c.a === 'mute') player.mute();
}
setInterval(function () {
  if (ready && player && player.getCurrentTime) send({ t: 'time', p: player.getCurrentTime(), d: player.getDuration() });
}, 500);
</script></body></html>`;
