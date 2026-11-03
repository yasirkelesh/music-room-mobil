# Jam senkronu: API'ye eklenecekler

Amaç: partinin hoparlörü olan cihaz (kurucu) bir şarkı çalarken, **uzaktaki** misafirlerin telefonunda aynı
şarkı aynı saniyede çalsın. Aynı ortamdaki misafirler sessiz kalır. Bu karar tamamen mobilde verilir, API'nin
bilmesine gerek yok.

Mobil taraf hazır ve geriye uyumlu: aşağıdakiler yokken misafir şarkıyı `NowPlayingChanged` gelince baştan
çalar, sonradan katılan biri bir sonraki şarkıyı bekler.

## 1. Partinin çalan oturumu

```
GET /api/v1/events/{eventId}/playback-session
```

- Yetki: `GET /playback-sessions/{sessionId}` ile aynı. Etkinliği görebilen herkes okuyabilir.
- 200: `PlaybackSessionDetail` (aşağıdaki yeni alanlarla). ETag yine `version`.
- 404: canlı oturum yok, ya da çağıran etkinliği göremiyor.
- Bir etkinlikte birden fazla canlı oturum varsa en son başlatılanı döndür.

Neden gerekli: misafir oturum id'sini şu an yalnızca bir sonraki `NowPlayingChanged` olayıyla öğrenebiliyor.
`devices/{id}/playback-session` endpoint'i ise yalnızca kendi cihazları için çalışıyor.

## 2. `PlaybackSessionDetail` yeni alanları

| Alan | Tip | Anlamı |
|---|---|---|
| `nowPlayingStartedAtUtc` | `date-time \| null` | `nowPlayingId` her değiştiğinde (start, advance, jump) sunucu saatiyle damgalanır. |
| `positionMs` | `int \| null` | Çalan cihazın son bildirdiği konum. `nowPlayingId` değişince `null` yapılır. |
| `positionAtUtc` | `date-time \| null` | `positionMs`'in alındığı an (sunucu saati). |
| `paused` | `bool \| null` | Son bildirimde duraklatılmış mıydı. |

Misafir beklenen konumu şöyle hesaplar: `paused ? positionMs : positionMs + (şimdi − positionAtUtc)`.
`positionMs` yoksa `nowPlayingStartedAtUtc` kullanılır.

## 3. Konum bildirimi

```
PUT /api/v1/playback-sessions/{sessionId}/position
{ "positionMs": 83500, "paused": false }
```

- Yetki: oturumun cihazının sahibi ya da kontrolü devralan kişi (`PATCH` jump ile aynı kural).
- 204. Oturum bitmişse ya da yetki yoksa 404.
- Sunucu `positionAtUtc = now` yazar ve olayı yayınlar (aşağıda).
- Çalan cihaz bunu çalma, duraklatma ve sarma anlarında, çalarken de 15 saniyede bir gönderir. Saniyede birden fazla
  istek gelirse sunucu sessizce yok sayabilir (rate limit).

Endpoint 404 veya 405 dönerse mobil, oda açık kaldığı sürece bir daha göndermez. Yani endpoint yokken sorun çıkmaz.

## 4. Hub olayları (`/hubs/events`, etkinlik grubu)

Yeni olay:

```
PlaybackPositionChanged {
  sourceId, sessionId, nowPlayingId,
  positionMs, positionAtUtc, paused
}
```

Mevcut olaya ek alan:

```
NowPlayingChanged { sourceId, sessionId, nowPlayingId, nowPlayingStartedAtUtc }
```

## Bilinen sınır

Cihaz saati ile sunucu saati arasındaki fark doğrudan kaymaya eklenir. Mobil 2,5 saniyeden küçük kaymaları düzeltmez.
Daha sıkı senkron istenirse yanıtlara bir `serverNowUtc` alanı eklenebilir, mobil de saat farkını buna göre düzeltir.
