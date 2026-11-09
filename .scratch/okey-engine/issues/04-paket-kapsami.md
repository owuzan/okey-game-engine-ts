# Paket kapsamı ve biçimi

Type: grilling
Status: resolved

## Question

Tek paket mi, monorepo mu? Giriş noktaları (alt yollar) nasıl bölünür? Hangi çalışma ortamları hedeflenir (Node, tarayıcı, React Native, edge)? Çalışma zamanı bağımlılığı olacak mı? Modül formatı ne?

## Answer

- **Tek paket, monorepo yok.** İki mod aynı taş/per/çözücü çekirdeğini paylaşıyor; ayrı paketler yalnızca sürüm eşleme yükü getirir.
- **Giriş noktaları:** `okey-engine` (her şey), `okey-engine/classic`, `okey-engine/okey101`, `okey-engine/helpers` (taş, per, çözücü, dizim; oyun durumu olmadan). `sideEffects: false`, ağaç sallama güvenli.
- **Çalışma ortamı:** platform API'si kullanılmaz (`crypto`, `Buffer`, `process` yok). Node ≥20, modern tarayıcılar, React Native/Hermes, edge runtime. Derleme hedefi ES2022.
- **Çalışma zamanı bağımlılığı: sıfır.** Rastgelelik için kendi tohumlu PRNG'si.
- **Modül formatı:** ESM + CJS çift çıktı, `.d.ts` ile. Metro ve eski araç zincirleri için CJS hâlâ ucuz bir sigorta.
