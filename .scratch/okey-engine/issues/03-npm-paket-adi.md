# npm paket adı ve mevcut paket manzarası

Type: task
Status: resolved

## Question

npm'de okey motoru olarak hangi paketler var, hangi adlar boş? Paket adı ne olacak?

## Answer

- `npm view` ile kontrol edildi (2026-11-10): `okey-engine`, `okey-game-engine`, `okey-core`, `okey101`, `okeyjs` boş. `okey` dolu (ilgisiz, 2014 koa çatısı).
- Alanda tek ilgili paket `okey-solver-ts@0.3.0`: yalnızca dizim çözücü, oyun akışı ve 101 yok. Tam kural motoru boşluğu duruyor.
- **Karar: paket adı `okey-engine`.** Kısa, kapsamsız (npm org gerektirmez), iki modu da kapsar.

**Güncelleme (2026-11-10).** Kullanıcı adı `okey-game-engine-ts` olarak değiştirdi (npm'de boş, aynı gün kontrol edildi). Önceki `okey-engine` kararı geçersiz; diğer biletlerdeki `okey-engine` import yolları bu adla okunmalı.
