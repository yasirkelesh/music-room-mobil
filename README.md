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
  api/client.ts           # NestJS için ince istemci (EXPO_PUBLIC_API_URL)
  theme/                  # renk, tipografi, boşluk token'ları
```

## Sonraki adımlar

- `src/api/client.ts` fonksiyonlarını NestJS backend'e bağla, ekranlardaki `TODO` satırlarını değiştir.
- Oylama ve canlı liste düzenleme için WebSocket (ör. socket.io) ile oda durumunu senkronla.
- `Cover` bileşeninde SVG yerine sağlayıcıdan gelen kapak URL'sini `expo-image` ile göster; vurgu rengini görselden çıkar.
- Google / Facebook girişi: `expo-auth-session` (+ resmî buton tasarımları).
