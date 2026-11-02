# music-room (iOS)

Expo SDK 57 + expo-router. Arayüz nötr (iOS sistem grileri), renk yalnızca albüm kapaklarından gelir.

## Çalıştırma

```bash
npm install
npx expo start --ios      # iOS Simülatör (Xcode gerekli)
# veya: npx expo start → iPhone'da Expo Go ile QR kodu okut
```

Kontroller:

```bash
npm run typecheck         # tsc --noEmit
npx expo-doctor           # bağımlılık / config kontrolü
```

## Backend

API (`MusicRoom.WebAPI`, bkz. `music-room-openapi.json`) varsayılan olarak `http://localhost:8085` adresinde aranır
(Android emülatöründe `10.0.2.2:8085`). Gerçek cihazda Mac'in LAN adresini ver:

```bash
echo 'EXPO_PUBLIC_API_URL=http://192.168.1.20:8085' > .env
```

- Oturum: access token bellekte, refresh token `expo-secure-store`'da; süresi dolunca otomatik döner (401 → bir kez yenile).
- Her yazma isteği `X-Client-Platform/Device/App-Version` başlıklarını taşır (API bunları zorunlu tutar).
- E-posta doğrulama / şifre sıfırlama: postadaki kod `verify` / `reset` ekranına yapıştırılır. API'de
  `VERIFICATION_LINK_BASE_URL=musicroom://verify` (ve reset için `musicroom://reset`) verilirse bağlantı uygulamayı doğrudan açar.
- Müzik kataloğu için API'de `YOUTUBE_API_KEY` tanımlı olmalı; yoksa arama/başlıklar 503 döner.

## Yapı

```
src/
  app/                    # expo-router ekranları (her dosya bir ekran)
    (auth)/               # welcome, login, signup, verify, forgot, taste
    (tabs)/               # Dinle, Jam, Listeler, Ara + mini oynatıcı + blur tab bar
    now-playing.tsx       # modal: dönen plak, kapak renginden ilerleme
    list/new.tsx          # plak dolabı: pikap + raf (V.2.3 oluşturma, görünürlük/lisans)
    list/[id].tsx         # canlı çoklu düzenleme + çakışma bildirimi (V.2.3)
    room/nearby.tsx       # mekândaki listeye katıl
    room/handover.tsx     # cihaz bazlı kontrol devri (V.2.2)
    party/index.tsx       # parti modu: dönen plak + yörüngede avatarlar
    party/vote.tsx        # canlı oy zinciri (V.2.1)
    party/rules.tsx       # görünürlük + oy lisansı (herkes / davetli / yer+saat)
    profile.tsx, friends.tsx
  components/             # Cover, Disc, Motion (Spin/Orbit), Jukebox, ui, Icon, MiniPlayer…
  data/mock.ts            # sahte veri (API gelene kadar)
  state/player.tsx        # sahte oynatıcı durumu
  api/                    # MusicRoom.WebAPI istemcisi: client.ts (tipli REST + token yenileme), types.ts, errors.ts, realtime.ts (SignalR)
  lib/                    # useAsync, usePlaylist (canlı liste), parça meta önbelleği, arama
  theme/                  # renk, tipografi, boşluk token'ları
```

## Sonraki adımlar

- `src/api/client.ts` fonksiyonlarını NestJS backend'e bağla, ekranlardaki `TODO` satırlarını değiştir.
- Oylama ve canlı liste düzenleme için WebSocket (ör. socket.io) ile oda durumunu senkronla.
- `Cover` bileşeninde SVG yerine sağlayıcıdan gelen kapak URL'sini `expo-image` ile göster; vurgu rengini görselden çıkar.
- Google / Facebook girişi: `expo-auth-session` (+ resmî buton tasarımları).
