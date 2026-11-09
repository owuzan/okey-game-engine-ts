# Taş ve per alan modeli

Type: grilling
Status: resolved

## Question

Taş kimliği nasıl modellenir (iki kopya, sahte okey)? Okey, gösterge ve sahte okey ilişkisi tipte nasıl ifade edilir? Per türleri (seri, grup, çift) ve okeyin perde hangi taşı temsil ettiği nasıl gösterilir? 13'ten 1'e dönüş geçerli mi?

## Answer

- **Taş kimliği:** `TileId` 0–105 arası tamsayı. `renk*26 + (sayı-1)*2 + kopya` (renk sırası kırmızı, sarı, mavi, siyah); 104 ve 105 sahte okeyler. İki kopya ayrı kimliktir, böylece taş korunumu ve animasyon takibi kesindir.
- **Yüz:** `tileFace(id)` → `{ kind: 'number', color, number }` veya `{ kind: 'falseJoker' }`.
- **Gösterge → okey:** okey yüzü = göstergeyle aynı renk, sayı+1; gösterge 13 ise okey 1. Gösterge sahte okey olamaz (dağıtımda yeniden çekilir).
- **Rol çözümü:** `resolveTile(id, okey)` → okey yüzlü iki taş `wild` (her taşın yerine geçer); sahte okey, okeyin yüzünü taşıyan **sabit** taştır (joker değildir); diğerleri kendi yüzü.
- **Per türleri:** `run` (seri: aynı renk ardışık, en az 3), `group` (aynı sayı farklı renkler, 3–4), `pair` (çift: aynı renk ve sayıda iki taş).
- **1'in yeri:** 1 ya en düşük (1-2-3) ya 13'ten sonra en yüksek (12-13-1); ikisi birden olmaz, 13-1-2 geçersiz. Seri en fazla 13 taş (1…13) ya da 2…13-1.
- **Okeyin temsil ettiği taş:** yerdeki perde her taşın yanında `represents` (yüz) tutulur; seride konumdan kesin, grupta eksik renklerden biri (bkz. 101 kural seti: okey alma).
- **Çiftte okey:** okey + herhangi bir taş çift sayılır; iki okey birlikte de çifttir.
- **Metin notasyonu:** `r5`, `y13`, `b1`, `k7` (kırmızı, sarı, mavi, siyah), `jk` sahte okey. Testlerde ve hata ayıklamada `parseTiles('r1 r2 r3')`; aynı yüz ikinci kez yazılırsa ikinci kopya atanır.
