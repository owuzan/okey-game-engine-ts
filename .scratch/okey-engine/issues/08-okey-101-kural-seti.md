# Okey 101 kural seti ve seçenekleri

Type: grilling
Status: resolved
Blocked by: 02, 05, 06

## Question

Okey 101 modunun durum makinesi, hamle listesi, el açma ve işleme kuralları, cezaları ve puanlaması tam olarak nedir? Hangi kurallar seçenek olur, varsayılanları ne olur (eşli/eşsiz, katlamalı, el sayısı, açma barajı, çift açma, elden bitme)?

## Answer

**Akış.** 21'er taş, başlayana 22, destede 20. Tur: çek (desteden veya yandan), istediğin kadar yere in (`meld`, `layOff`, `swapOkey`), bir taş at. Son taşını atan biter. Seride 13'ten sonra 1 gelmez.

**El açma (`meld`).** Açmamış oyuncunun ilk `meld` hamlesi açılıştır. Tüm perler iki taşlıysa çift açılışı (en az `minPairs` = 5 çift), değilse seri/grup açılışı (toplam en az `openingThreshold` = 101; okey temsil ettiği taş kadar sayılır). Açtıktan sonra aynı turda işleme ve yeni per serbest.

**Çift açan.** Yalnızca yeni çift açabilir; başkalarının seri/gruplarına işleyebilir. Seri açan, masada çift açan biri varsa çift de açabilir (`pairsAfterPairsOpener`). Herkes çift açarsa el iptal, aynı dağıtıcı yeniden dağıtır.

**Yandan taş alma.** Alınan taş "bekleyen" olur: aynı yüzlü bir taş (kendisi veya eldeki eşi) yere inmeden atış yapılamaz ve ilk yere iniş onu içermek zorundadır; açmamış oyuncu için bu açılış demektir. Kullanamayan `returnDiscard` ile geri bırakır, motor otomatik desteden çektirir (varsayılan cezasız).

**İşleme (`layOff`).** Yalnızca açmış oyuncu; herhangi bir seri/gruba, serinin iki ucuna veya grubun 4. rengine. Çifte işlenmez. Perler bölünüp yeniden düzenlenemez. Elde atacak bir taş kalmalıdır.

**Yerden okey alma (`swapOkey`).** Açmış oyuncu, okeyin temsil ettiği gerçek taşı koyup okeyi alır. Yalnızca kimliği kesin olan okey: seride her zaman, grupta yalnızca 4 taşlıysa. Çiftteki okey alınmaz. `okeySwap: false` ile kapanır (pagat kuralı).

**Cezalar (her biri `penaltyPoints` = 101, el puanına eklenir, çarpılmaz).** İşlek taş atmak (açmamış olsa da; bitiş taşı hariç), okey atmak (bitiş hariç). Seçenekle: geçersiz açılış, yandan alıp geri bırakma, atılan taş alınınca atana taş×çarpan.

**Bitiş ve el puanı.** Çarpan = 2^(okey atarak + çiftten + elden). Kazanan −101×çarpan; açan: eldeki taş toplamı×çarpan (okey 101 sayılır); çift açan: iki katı; açmayan: 202×çarpan. Eşli oyunda kazananın eşi 0 alır (cezaları kalır).

**Elden bitme.** Açmamış oyuncu tek hamlede bir taş hariç hepsini kendi perleri olarak açarsa baraj aranmaz ve ×2. Varsayılan olarak masada başka açan olmamalı (`eldenNeedsClosedTable`).

**Katlamalı (`escalation`).** `off`: baraj sabit. `all`: her açılış bir öncekinin toplamını 1 geçmeli (çiftte bir çift fazla); puan ve çift barajı ayrı izlenir. `opponents`: yalnızca rakip takımın açılışları barajı yükseltir. Her el sıfırlanır; elden bitiş barajı yükseltmez.

**Deste biterse.** Sıradaki `pass` der (veya yandan alıp kullanır). `pileExhausted: 'score'` (varsayılan): kazanansız normal puanlama; `'void'`: el iptal, yalnızca eldeki okeyler 101 ve oyun içi cezalar yazılır, el yeniden oynanır.

**Seçenekler.** `players` (4), `teams` (false), `hands` (5), `escalation` (`off`), `openingThreshold` (101), `minPairs` (5), `okeySwap` (true), `pairsAfterPairsOpener` (true), `eldenNeedsClosedTable` (true), `penaltyPoints` (101), `penalizeInvalidOpening` (false: yalnızca reddedilir), `penalizeLayableDiscard` (true), `penalizeOkeyDiscard` (true), `penalizeReturnedDiscard` (false), `takenDiscardFactor` (0; kahvehane kuralı 10), `winBonus` (101), `unopenedPenalty` (202), `okeyInHandPoints` (101), `pileExhausted` (`score`).

**Kaynaklar ayrışınca seçilenler.** Elde kalan okey yüz değeri yerine 101 sayılır ve çarpana girer. Çift + okey bitişte açmayan 808 alır (saf çarpım). Geçersiz açılış varsayılan olarak cezasız reddedilir (yazılım davranışı).

**Desteklenmeyen (kanıtı zayıf).** Riziko, göstergeyi çiftte kullanma, tur başına 2 taş işleme sınırı, alınan okey için koyan oyuncuya ceza, çanak.

Haritadaki "101'de işleme ve okey alma uç durumları" sisi bu biletle çözüldü.
