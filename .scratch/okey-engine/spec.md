# okey-game-engine-ts spesifikasyonu

Klasik Okey ve Okey 101 için TypeScript kural motoru. Bu belge haritadaki kararların derlenmiş hâlidir; her bölüm ayrıntısını tutan bilete bağlanır. Terimler kök `GLOSSARY.md` dosyasındadır.

Durum: **uygulandı** (2026-11-10). 137 test geçiyor, satır kapsaması %99.

## 1. Paket

- Ad `okey-game-engine-ts`, tek paket, sıfır çalışma zamanı bağımlılığı, MIT. ([npm paket adı](issues/03-npm-paket-adi.md), [Paket kapsamı](issues/04-paket-kapsami.md))
- Giriş noktaları: `okey-game-engine-ts` (ad alanları `classic`, `okey101` + düz yardımcılar), `okey-game-engine-ts/classic`, `okey-game-engine-ts/okey101`, `okey-game-engine-ts/helpers`.
- ESM + CJS + `.d.ts`; hedef ES2022; Node ≥20, tarayıcı, React Native, edge.
- Araçlar: pnpm, TypeScript 6 strict, tsup, Vitest + fast-check, Biome, GitHub Actions. ([Araç zinciri](issues/13-arac-zinciri.md))

## 2. Mimari

([Motor mimarisi](issues/05-motor-mimarisi.md), [Public API](issues/11-public-api.md))

- Saf indirgeyici: `apply(state, action)` → `{ ok: true, state, events }` veya `{ ok: false, error: { code, message } }`. Girdi değişmez, kural ihlali istisna fırlatmaz.
- Durum düz JSON'dur; PRNG durumu (mulberry32) içindedir. Aynı seçenek + tohum + hamleler = aynı oyun.
- Her mod aynı sekiz fonksiyonu verir: `createGame`, `apply`, `getPlayerView`, `redactEvents`, `getAllowedActions`, `getTimeoutAction`, `replay`, `sideOf`.
- Gizli bilgi: sunucu tam durumu tutar; istemciye `getPlayerView` + `redactEvents` gider.

```
src/
  core/      tiles, rng, melds, solver, layout, game (dağıtım, hata tipleri)
  classic/   types, engine, helpers
  okey101/   types, engine, helpers
  helpers.ts durumsuz yardımcıların giriş noktası
  index.ts   kök giriş
```

## 3. Alan modeli

([Taş ve per alan modeli](issues/06-tas-ve-per-modeli.md))

- Taş = 0–105 tamsayı; `renk*26 + (sayı-1)*2 + kopya`; 104–105 sahte okey.
- Okey = gösterge + 1 (13 → 1), joker. Sahte okey joker değildir, okeyin yüzüdür.
- Perler: seri (≥3 ardışık, tek renk), grup (3–4, farklı renk), çift (aynı yüz).
- Yüksek 1 (12-13-1): klasikte var, 101'de yok (`highOne` kuralı).
- Notasyon: `r5 y13 b1 k7 jk`.

## 4. Klasik Okey

([Klasik Okey kural seti](issues/07-klasik-okey-kural-seti.md), kaynak: [araştırma](research/klasik-okey-kurallari.md))

Hamleler `draw`, `discard`, `finish`, `showIndicator`, `pass`, `nextHand`. 14 taş (başlayan 15). Bitiş: seri/grup veya yedi çift. Varsayılan puan: 20'den düşme, normal 2, okey atarak ×2, çift ×2, gösterge 1. Seçenekler: `players`, `teams`, `scoring`, `startingScore`, `winPoints`, `okeyFinishMultiplier`, `pairsFinishMultiplier`, `singleColorMultiplier`, `allowPairs`, `indicatorPoints`, `indicatorDrawable`, `maxHands`.

## 5. Okey 101

([Okey 101 kural seti](issues/08-okey-101-kural-seti.md), kaynak: [araştırma](research/okey-101-kurallari.md))

Hamleler `draw`, `returnDiscard`, `meld`, `layOff`, `swapOkey`, `discard`, `pass`, `nextHand`. 21 taş (başlayan 22). Açma: 101 puan veya 5 çift. Katlamalı = `escalation` (yükselen baraj). Cezalar 101. El puanı: kazanan −101, açan el toplamı, çift açan ×2, açmayan 202; okey atarak / çiftten / elden bitiş her biri ×2. Seçenekler bilette listeli (19 adet).

## 6. Maç ve süre

([Maç yapısı](issues/10-mac-yapisi.md))

`phase`: `playing` → `handOver` → `matchOver`. Dağıtıcı her el bir sonraki koltuğa geçer. Klasik: puan 0'a inince biter; 101: `hands` el sonunda en düşük toplam kazanır. Motor saat bilmez; `getTimeoutAction` güvenli varsayılan hamleyi verir.

## 7. Yardımcılar

([Dizim yardımcıları](issues/09-dizim-yardimcilari.md))

`arrangeRuns` (seri dizim, kesin arama, amaç `tiles` | `points`), `arrangePairs` (çift dizim), `layoutRack` (iki sıralı ıstaka), `sortByColor`, `sortByNumber`, `analyzeMeld`, `extendMeld`. Klasik: `checkWinningHand`, `findWinningDiscards`, `suggestDiscard`. 101: `findBestOpening`, `findPairsOpening`, `findLayoffs`, `findOkeySwaps`, `isLayable`, `handPenalty`, `requiredOpening`.

## 8. Test

([Test stratejisi](issues/12-test-stratejisi.md))

Notasyonlu senaryo testleri (her kural ve ceza), rastgele tam maçlarda değişmezler (106 taş korunumu, JSON gidiş-dönüş, `replay` eşitliği), çözücünün kaba kuvvetle karşılaştırılması. Kapsama eşiği %90 satır.

## 9. Kapsam dışı

Arayüz, ağ, kalıcılık, bot, çip/çanak, eleme ve kanıtı zayıf ev kuralları. Tam liste haritanın "Out of scope" bölümünde.

## 10. Açık riskler

- Büyük platformların (Okey Plus, 101 Okey Plus, Mynet) uygulama içi kuralları araştırmada okunamadı; varsayılanlar pagat, Wikipedia ve küçük platformların kural sayfalarına dayanıyor. Bir platformla birebir uyum gerekiyorsa o platformun yardım ekranıyla karşılaştırılmalı.
- Kaynakların ayrıştığı noktalarda seçilen varsayılanlar biletlerde gerekçesiyle yazılı; çoğu seçenekle değiştirilebilir.
