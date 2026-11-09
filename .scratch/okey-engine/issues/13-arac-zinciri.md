# Araç zinciri ve yayın

Type: grilling
Status: resolved
Blocked by: 03, 04

## Question

Derleme, lint, test, sürümleme ve CI için hangi araçlar kullanılır? Desteklenen Node sürümleri, lisans, yayın akışı ne?

## Answer

- **Paket yöneticisi:** pnpm. **Dil:** TypeScript strict (`noUncheckedIndexedAccess` açık).
- **Derleme:** tsup, ESM + CJS + `.d.ts`, dört giriş noktası.
- **Kalite:** Biome (lint + biçim), `tsc --noEmit`, Vitest (+ kapsama).
- **CI:** GitHub Actions; Node 20, 22, 24 matrisinde lint, tip kontrolü, test, derleme.
- **Yayın:** `npm version` + `npm publish --provenance` (etiketle tetiklenen iş akışı). Changesets tek paket için gereksiz tören.
- **Lisans:** MIT. **Sürüm:** 0.1.0 ile başlar; 1.0'a kadar küçük sürümler kırıcı olabilir.

**Uygulama notu (2026-11-10).** tsup 9'un tip üretimi TypeScript 7'nin derleyici API'si olmadığı için çalışmıyor; `typescript` 6.x'e sabitlendi.
