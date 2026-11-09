# Maç yapısı, puan tablosu ve süre aşımı

Type: grilling
Status: resolved
Blocked by: 07, 08

## Question

El ile maç arasındaki ilişki nasıl modellenir? Dağıtıcı sırası, el sayısı, maç sonu koşulu, eşli puan toplama nasıl işler? Motor zamanı bilmezken süre aşımı ve oyuncu ayrılması nasıl desteklenir?

## Answer

- **El ve maç tek durum nesnesinde.** `phase`: `playing` → `handOver` → (`nextHand`) → `playing` … → `matchOver`. `nextHand` oyuncusuz bir hamledir; ne zaman gönderileceğine (animasyon, hazır bekleme) tüketici karar verir.
- **Dağıtıcı.** İlk dağıtıcı tohumdan (veya `firstDealer`); her el bir sonraki koltuğa geçer. 101'de iptal edilen el aynı dağıtıcıyla ve aynı el numarasıyla yeniden oynanır.
- **Klasik maç sonu.** Bir taraf 0'a inince veya `maxHands` dolunca.
- **101 maç sonu.** `hands` (varsayılan 5) puanlı el sonunda; en düşük taraf toplamı kazanır. Puan koltuk başına tutulur, eşli oyunda `sideTotals` eşleri toplar.
- **Eşitlik.** Kaynaklar kural vermiyor; `winners` dizisi eşit tarafların hepsini içerir, kırma tüketiciye kalır.
- **Süre.** Motor saat bilmez. `getTimeoutAction(state)` sıradaki oyuncu için güvenli varsayılan hamleyi döner (desteden çek, çekileni at; okey ya da işlek taş atmaz; bekleyen yandan taşı geri bırakır). Tüketici sayacı tutar ve bu hamleyi uygular; ayrılan oyuncu için de aynısı.
- **Yapay zekâ.** Kapsam dışı. Sınır: motor yalnızca "zarar vermeyen varsayılan hamle" ve çözücü yardımcıları verir; strateji tüketicinindir. Haritadaki "hamle önerisi / yapay zekâ sınırı" sisi burada çözüldü.
