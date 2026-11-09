# Dizim yardımcıları ve çözücüler

Type: grilling
Status: resolved
Blocked by: 06

## Question

Hangi yardımcılar sunulur (seri dizim, çift dizim, iki sıralı ıstaka yerleşimi, bitiş kontrolü, 101 açma önerisi, işlenebilir taşlar)? Her birinin girdi/çıktı sözleşmesi ve optimallik garantisi ne?

## Answer

- **`arrangeRuns(tiles, okey, { objective })` (seri dizim):** eli seri/grup perlerine ayırır, kalanları döner. `objective: 'tiles'` perdeki taş sayısını (klasik), `'points'` per puanını (101) en çoklar. Kesin sonuç: ezberlemeli geri izlemeli arama.
- **`arrangePairs(tiles, okey)` (çift dizim):** en çok çifti kurar; okeyler tek kalan en yüksek taşlarla eşlenir.
- **`layoutRack(arrangement, { rows: 2, columns })` (çift sıralı ıstaka):** perleri aralarında boşlukla iki sıraya yerleştirir, kalanları sona koyar; `(TileId | null)[][]` döner. "Çift sıralı dizim" isteği hem çift dizimini hem iki sıralı yerleşimi kapsayacak şekilde yorumlandı; ikisi de var.
- **`sortByColor` / `sortByNumber`:** basit sıralamalar.
- **Klasik:** `canFinish(14 taş)`, `findWinningDiscards(15 taş)` → her bitiren atış için bitiş türü (normal, çift, okey atarak).
- **101:** `findBestOpening(tiles)` (en yüksek puanlı seri/grup açılışı ve baraja yetip yetmediği), `findPairsOpening(tiles)`, `findLayoffs(tiles, table)` (işlenebilir taşlar ve hedef perler), `handPenalty(tiles)`.
- **Per doğrulama:** `validateMeld(tiles, okey)` → tür, puan, okeylerin temsil ettiği taşlar veya hata.
- **Durum bağımsızlığı:** tüm yardımcılar yalnızca taş listesi ve okey alır; istemci kendi ıstakasında çalıştırabilir.
- **Performans bütçesi:** 22 taşlık elde tek çağrı tipik < 50 ms (orta seviye telefon). Fog'daki "çözücü algoritması" maddesi burada çözüldü.
