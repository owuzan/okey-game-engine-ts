# Motor mimarisi

Type: grilling
Status: resolved

## Question

Motorun çekirdek biçimi ne: durum nasıl temsil edilir, hamleler nasıl uygulanır, olaylar nasıl bildirilir? Rastgelelik ve determinizm, serileştirme, tekrar oynatma ve gizli bilgi (oyuncuya özel görünüm) nasıl ele alınır? Sunucu otoriter ve istemci tahminli kullanımlar aynı çekirdekle nasıl desteklenir?

## Answer

- **Çekirdek biçim:** saf fonksiyonlar, sınıf yok. `createGame(options)` başlangıç durumunu, `apply(state, action)` yeni durumu ve olay listesini döner. Girdi durumu asla değiştirilmez.
- **Durum:** düz, JSON'a serileştirilebilir veri (`Map`/`Set`/`Date`/sınıf yok). `JSON.stringify` → `JSON.parse` sonrası aynen çalışır; ayrı serileştirici gerekmez.
- **Determinizm:** tohumlu PRNG (mulberry32); PRNG durumu oyun durumunun içindedir. Aynı seçenek + tohum + hamle dizisi her platformda aynı sonucu verir. Test ve özel dağıtım için `deck` (hazır taş sırası) da verilebilir.
- **Hamle doğrulama:** her hamle `player` taşır; motor sıra, faz ve kural kontrolünü yapar. Geçersiz hamle istisna fırlatmaz, `{ ok: false, error: { code, message } }` döner (bkz. Public API bileti).
- **Olaylar:** her başarılı hamle, arayüz/animasyon ve ağ yayını için alan olayları listesi üretir (`tileDrawn`, `tileDiscarded`, `meldsOpened`, `handEnded`...).
- **Gizli bilgi:** `getPlayerView(state, player)` başkalarının ıstakasını ve desteyi sayıya indirger; `redactEvents(events, viewer)` çekilen taşın kimliğini başkalarından gizler. Sunucu tam durumu tutar, istemcilere yalnızca görünüm + olay gönderir.
- **Tekrar oynatma:** `replay(options, actions)` hamle günlüğünden durumu yeniden kurar.
- **İstemci tahmini:** istemci tam durumu göremediği için indirgeyiciyi çalıştırmaz; kendi ıstakası üzerinde `helpers` ile (dizim, bitiş kontrolü, açma önerisi) yerel hesap yapar. Bilinçli sadelik.
- **Yasal hamle listesi:** `getAllowedActions(state, player)` hamle *türlerini* ve basit hedefleri döner; 101'de per kombinasyonlarını saymaz (üstel), onlar için çözücü yardımcıları vardır.
