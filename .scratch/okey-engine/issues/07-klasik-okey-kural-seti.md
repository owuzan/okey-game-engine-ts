# Klasik Okey kural seti ve seçenekleri

Type: grilling
Status: resolved
Blocked by: 01, 05, 06

## Question

Klasik Okey modunun durum makinesi, hamle listesi, bitiş türleri ve puanlaması tam olarak nedir? Hangi kurallar seçenek olur, varsayılanları ne olur (eşli/eşsiz, katlamalı, gösterge gösterme, çifte bitme, başlangıç puanı)?

## Answer

**Akış.** Dağıtıcının sağındaki (bir sonraki koltuk) 15 taşla başlar ve çekmeden atar. Sonraki her tur: desteden çek **veya** önceki oyuncunun son attığını al, sonra bir taş at. Per açılmaz; el yalnızca bitişte gösterilir.

**Hamleler.** `draw {from: 'pile' | 'discard'}`, `discard {tile}`, `finish {tile}` (taşı atıp kalan 14'ü gösterir; motor çözücüyle doğrular, oyuncu dizim göndermez), `showIndicator`, `pass`, `nextHand`.

**Bitiş.** 14 taş tamamen seri/grup **veya** tam yedi çift. İkisi de mümkünse çift sayılır (daha değerli). Bitiş taşı gerçek okeyse "okey atarak bitiş"; sahte okey atmak bonus vermez.

**Puan (varsayılan `deduct`).** Herkes 20 ile başlar. Kazanan dışındaki her taraf `winPoints` (2) × çarpanlar kadar kaybeder. Çarpanlar çarpılır: okey atarak ×2, çift ×2 (ikisi birden 8), tek renk el ×`singleColorMultiplier` (varsayılan 1 = kapalı).

**Gösterge gösterme.** Göstergenin eşini tutan oyuncu, bu eldeki ilk hamlesinden önce (sırası gelmeden de) gösterebilir; diğer taraflar `indicatorPoints` (1) kaybeder, puan anında işlenir. 0 = kapalı.

**Deste biterse.** Sıradaki oyuncu son atılan taşı yalnızca bitmek için alabilir (motor bitiş mümkün değilse reddeder, aldıysa `finish` zorunlu); yoksa `pass` ile el berabere biter, puan değişmez.

**Seçenekler ve varsayılanlar.**

| Seçenek | Varsayılan | Anlam |
|---|---|---|
| `players` | 4 | 2, 3 veya 4 |
| `teams` (eşli) | false | 0-2'ye karşı 1-3; taraf başına tek puan; kazananın eşi puan kaybetmez |
| `scoring` | `deduct` | `countdown` = düşme: kazanan kendi puanından düşer, 0'a ilk inen kazanır |
| `startingScore` | 20 | |
| `winPoints` | 2 | |
| `okeyFinishMultiplier` | 2 | |
| `pairsFinishMultiplier` | 2 | |
| `singleColorMultiplier` | 1 | 2 = tek renk el iki katı |
| `allowPairs` | true | çifte bitiş |
| `indicatorPoints` | 1 | 0 = gösterge gösterme yok |
| `indicatorDrawable` | false | true = gösterge destenin son taşı |
| `maxHands` | null | el sayısı sınırı |

**Maç sonu.** Bir tarafın puanı 0 veya altına inince (ya da `maxHands` dolunca). `deduct`: en yüksek puan kazanır; `countdown`: en düşük. Eşitlikte birden fazla kazanan döner.

**"Katlamalı" klasik okeyde yok.** Araştırma bu adı yalnızca 101 için buldu; klasik okeydeki "katlama"lar yukarıdaki çarpanlardır.

**Desteklenmeyen ev kuralları (kanıtı zayıf).** Çift okey dönme, göstergeyi çifte bağlama, sıralı renkle maçı bitirme, renkli/sayılı okey, eleme, çanak.
