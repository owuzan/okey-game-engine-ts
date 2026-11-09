# Public API yüzeyi ve hata modeli

Type: grilling
Status: resolved
Blocked by: 05, 07, 08, 09

## Question

Dışa açılan fonksiyon ve tipler tam olarak neler? İki oyun modu ortak bir arayüzü mü paylaşır? Geçersiz hamle nasıl bildirilir? Sürümleme ve kırıcı değişiklik politikası ne?

## Answer

- **Kök giriş.** `import { classic, okey101, arrangeRuns, parseTiles } from 'okey-engine'`. Alt yollar aynı şeyleri düz adlarla verir: `okey-engine/classic`, `okey-engine/okey101`, `okey-engine/helpers`.
- **Ortak biçim, ayrı tipler.** İki mod aynı fonksiyon adlarını taşır: `createGame`, `apply`, `getPlayerView`, `redactEvents`, `getAllowedActions`, `getTimeoutAction`, `replay`, `sideOf`. Durum, hamle ve olay tipleri moda özeldir (`ClassicState` / `Okey101State` …); ortak soyut arayüz zorlanmaz, çünkü hamle kümeleri gerçekten farklı.
- **Hata modeli.** Kural ihlali istisna değildir: `apply` `{ ok: false, error: { code, message } }` döner; `code` kapalı bir `ErrorCode` birleşimidir (`NOT_YOUR_TURN`, `OPENING_TOO_LOW`, `MUST_USE_TAKEN_TILE` …), `message` İngilizce ve yalnızca hata ayıklama içindir. İstisna yalnızca programcı hatasında fırlar (geçersiz seçenek, bozuk deste, geçersiz taş kimliği, `replay` içinde yasa dışı hamle).
- **Yardımcılar.** `helpers`: taş (`tileFace`, `tileId`, `parseTiles`, `formatTiles`, `okeyFromIndicator`, `resolveTile`, `isOkey`), per (`analyzeMeld`, `extendMeld`, `meldOkeys`), çözücü (`arrangeRuns`, `arrangePairs`), ıstaka (`sortByColor`, `sortByNumber`, `layoutRack`), PRNG. Moda özel yardımcılar kendi ad alanında: klasikte `checkWinningHand`, `findWinningDiscards`, `isSingleColor`, `suggestDiscard`; 101'de `findBestOpening`, `findPairsOpening`, `findLayoffs`, `findOkeySwaps`, `isLayable`, `handPenalty`, `requiredOpening`, `sideTotals`.
- **Sürümleme.** SemVer. Durum biçimi public API'dir: alan eklemek küçük, alan silmek/anlam değiştirmek büyük sürümdür. 1.0'a kadar küçük sürümler kırıcı olabilir.
