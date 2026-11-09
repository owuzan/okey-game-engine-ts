# Harita: Okey & Okey 101 TypeScript oyun motoru

Label: wayfinder:map

## Destination

`.scratch/okey-engine/spec.md`: Klasik Okey ve Okey 101 için tek bir npm paketi olarak yayınlanacak TypeScript oyun motorunun **uygulamaya hazır spesifikasyonu**. Spesifikasyon okunduğunda kural, API, mimari, test ve yayın konusunda karar verilecek hiçbir şey kalmamalı; bir sonraki adım doğrudan kodlamadır.

## Notes

- Alan: Türk okey ailesi taş oyunları (Klasik Okey, Okey 101). Kural motoru; arayüz değil.
- Kullanıcı tüm kararları ajana devretti: grilling biletlerinde ajan iki tarafı da konuşur, kullanıcıya soru sorulmaz. Bu yüzden "oturum başına tek bilet" kuralı bu haritada askıda. Kullanıcı ayrıca motorun aynı oturumda kodlanmasını istedi; harita kararla bitmez, uygulamayla biter.
- Her oturum `domain-modeling` becerisine başvurur; terimler kök `GLOSSARY.md` dosyasına yazılır.
- Kod tanımlayıcıları İngilizce, alan terimlerinin Türkçe karşılıkları sözlükte. Belgeler Türkçe.
- Kural kaynağı çatışırsa: önce araştırma dosyaları (`research/`), sonra yaygın çevrimiçi okey uygulamalarındaki davranış; her çatışan kural bir **seçenek** olur, varsayılanı en yaygın davranıştır.

## Decisions so far
- [npm paket adı ve mevcut paket manzarası](issues/03-npm-paket-adi.md): Ad `okey-game-engine-ts` (kullanıcı kararı; npm'de boş); tek rakip yalnızca çözücü olan `okey-solver-ts`.
- [Paket kapsamı ve biçimi](issues/04-paket-kapsami.md): Tek paket, sıfır bağımlılık, ESM+CJS; alt yollar `/classic`, `/okey101`, `/helpers`; Node ≥20, tarayıcı, React Native, edge.
- [Motor mimarisi](issues/05-motor-mimarisi.md): Saf indirgeyici: `apply(state, action) → {ok, state, events} | {ok:false, error}`; durum düz JSON, tohumlu PRNG, oyuncuya özel görünüm, sınıf yok.
- [Taş ve per alan modeli](issues/06-tas-ve-per-modeli.md): Taş = 0–105 tamsayı kimlik; okey gösterge+1 (13→1), sahte okey okeyin yüzünü taşıyan sabit taş; perler seri/grup/çift; 12-13-1 geçerli, 13-1-2 geçersiz.
- [Test stratejisi](issues/12-test-stratejisi.md): Vitest + fast-check: notasyonlu senaryo testleri, rastgele tam oyun değişmezleri, çözücünün kaba kuvvetle çapraz doğrulaması.
- [Araç zinciri ve yayın](issues/13-arac-zinciri.md): pnpm, TypeScript strict, tsup (ESM+CJS+d.ts), Vitest, Biome, GitHub Actions; MIT; Node ≥20.
- [Dizim yardımcıları ve çözücüler](issues/09-dizim-yardimcilari.md): Seri dizim, çift dizim, iki sıralı ıstaka yerleşimi, bitiş kontrolü, bitiren atışlar, 101 açma ve işleme önerileri; hepsi kesin (optimal) arama.
- [Klasik Okey kuralları ve varyantları](issues/01-klasik-okey-kurallari.md): 106 taş, 14/15 dağıtım, 12-13-1 geçerli; 20'den düşme, 2/4/4/1 puanları; klasik okeyde "katlamalı" modu yok. Ayrıntı: research/klasik-okey-kurallari.md
- [Okey 101 kuralları ve varyantları](issues/02-okey-101-kurallari.md): 21/22 dağıtım, 101 baraj veya 5 çift, 13-1 dönüşü yok, işlek/okey atma 101 ceza, bitiş çarpanları x2 yığılır; "katlamalı" = yükselen açma barajı. Ayrıntı: research/okey-101-kurallari.md
- [Klasik Okey kural seti ve seçenekleri](issues/07-klasik-okey-kural-seti.md): Hamleler: draw, discard, finish, showIndicator, pass, nextHand. Varsayılan 20'den düşme 2/x2/x2/1; eşli, düşme, tek renk, çiftsiz, gösterge çekilebilir, el sınırı seçenek.
- [Okey 101 kural seti ve seçenekleri](issues/08-okey-101-kural-seti.md): Hamleler: draw, returnDiscard, meld, layOff, swapOkey, discard, pass, nextHand. Baraj 101/5 çift; katlamalı = `escalation`; cezalar 101; bitiş çarpanları x2 yığılır; 16 seçenek.
- [Maç yapısı, puan tablosu ve süre aşımı](issues/10-mac-yapisi.md): Maç = ardışık eller; dağıtıcı her el bir sonraki koltuğa geçer. Klasik: puan 0'a inince; 101: sabit el sayısı (5), en düşük toplam. Süre aşımı: `getTimeoutAction`; bot yok.
- [Public API yüzeyi ve hata modeli](issues/11-public-api.md): Kök: `classic` ve `okey101` ad alanları + düz yardımcılar. İki mod aynı yedi fonksiyon adını paylaşır; hata = `{ok:false, error:{code,message}}`.
- [Spesifikasyonu derle](issues/14-spesifikasyonu-derle.md): spec.md yazıldı; motor aynı oturumda uygulandı ve doğrulandı (137 test, %99 satır kapsaması, ESM+CJS derleme).

## Not yet specified

Sis kalmadı: dört madde de biletlere dönüşüp çözüldü (101 uç durumları → Okey 101 kural seti; çözücü → Dizim yardımcıları; notasyon → Taş ve per alan modeli; yapay zekâ sınırı → Maç yapısı).

## Out of scope

- Arayüz bileşenleri, animasyon, ses: paket yalnızca kural ve durum motorudur.
- Ağ katmanı, oda/eşleştirme sunucusu, kalıcı depolama: motor taşınabilir durum üretir, taşıma tüketicinin işidir.
- Çip/para ekonomisi, sıralama (ELO), turnuva yönetimi.
- Okey ailesi dışındaki oyunlar (Remi, Rummikub, 51).
- Bot / strateji yapay zekâsı: motor yalnızca süre aşımı için varsayılan hamle verir.
- Kanıtı zayıf ev kuralları: klasikte çift okey dönme, göstergeyi çifte bağlama, sıralı renk, renkli/sayılı okey, eleme; 101de riziko, göstergeyi çiftte kullanma, 2 taş işleme sınırı.
