# Test stratejisi

Type: grilling
Status: resolved
Blocked by: 05

## Question

Kural doğruluğu nasıl kanıtlanır? Hangi test türleri (senaryo, özellik tabanlı, çözücü çapraz doğrulama) kullanılır, kapsama hedefi ne?

## Answer

- **Çatı:** Vitest. Özellik tabanlı testler için `fast-check` (yalnızca geliştirme bağımlılığı).
- **Senaryo testleri:** taş notasyonu ve hazır deste ile her kural ve her ceza için adlandırılmış senaryo ("okey atarak bitiş 4 puan düşürür").
- **Değişmez testleri:** rastgele tohumlarla basit bir otomatik oyuncu tam el/maç oynar; her adımda 106 taş korunur, sıra tutarlıdır, durum JSON gidiş-dönüşünde aynı kalır, aynı tohum aynı sonucu verir.
- **Çözücü doğrulaması:** küçük ellerde çözücü sonucu bağımsız kaba kuvvet aramasıyla karşılaştırılır; dönen her dizim ayrıca per doğrulayıcıdan geçer.
- **Görünüm testleri:** oyuncu görünümünde başkasının taş kimliği sızmadığı doğrulanır.
- **Hedef:** kural ve çözücü modüllerinde satır kapsaması ≥ %90; CI'da zorunlu.
