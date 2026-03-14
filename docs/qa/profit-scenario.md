# Kâr Senaryosu

## Amaç

Tek ürün kârlılık ekranında hesaplama, sonuç karuseli ve AI analiz tonunun birlikte doğru çalıştığını doğrulamak.

## Kontrol Alanları

- Ürün senaryosu inputları
- KDV preset ve özel KDV davranışı
- Kampanya alanı XOR mantığı
- Net kâr, badge ve karusel kartları
- Gider dağılımı, başabaş ve adet bazlı kâr
- AI analiz tonu

## Senaryo 1 - Karlı Senaryo

### Input

- Satış Fiyatı: `120`
- Maliyet: `60`
- Komisyon: `20`
- Kargo: `10`
- Reklam: `10`
- Hedef Kâr: `15`
- KDV: `%20`
- Kampanya: `Kapalı`

### Beklenen Hesap / Sonuç

- Net kâr pozitif olmalı
- Net kâr hedef kârı karşılıyorsa badge `Kârda` olmalı
- Gider dağılımında maliyet en büyük kalemlerden biri görünmeli
- Adet bazlı kâr değerleri pozitif olmalı

### UI Kontrol

- İlk karusel kartında büyük net kâr görünmeli
- İkinci karttaki gider listesi tutarlı sıralanmalı
- Üçüncü kartta başabaş noktası `adet satış` ifadesiyle görünmeli

### AI Kontrol

- AI analiz sakin ve güven verici ton kullanmalı
- Alarm dili olmamalı

## Senaryo 2 - Sınırda Senaryo

### Input

- Satış Fiyatı: `110`
- Maliyet: `60`
- Komisyon: `20`
- Kargo: `10`
- Reklam: `10`
- Hedef Kâr: `20`
- KDV: `%20`
- Kampanya: `Kapalı`

### Beklenen Hesap / Sonuç

- Net kâr pozitif olmalı
- Net kâr hedef kârın altında kalmalı
- Badge `Sınırda` olmalı

### UI Kontrol

- İlk kartta `Kârda` veya hedefte benzeri aşırı olumlu badge görünmemeli
- Başabaş bilgisi hâlâ hesaplanabiliyorsa adet değeri görünmeli

### AI Kontrol

- AI yorum uyarıcı ama sakin olmalı
- Küçük sapmaların izlenmesi önerilmeli

## Senaryo 3 - Zararda Senaryo

### Input

- Satış Fiyatı: `90`
- Maliyet: `60`
- Komisyon: `20`
- Kargo: `15`
- Reklam: `15`
- Hedef Kâr: `15`
- KDV: `%20`
- Kampanya: `Kapalı`

### Beklenen Hesap / Sonuç

- Net kâr negatif olmalı
- Badge `Zarar` olmalı
- Başabaş kartında `Bu fiyatla başabaşa ulaşılamaz` görünmeli
- 50 / 100 / 250 adet sonuçları negatif olmalı

### UI Kontrol

- Negatif rakamlar doğru para formatında görünmeli
- İlk kartta yanlış pozitif insight oluşmamalı

### AI Kontrol

- AI analiz zarar diline geçmeli
- Kontrol satırı daha doğrulayıcı ve neden arayan tonda olmalı

## Senaryo 4 - Komisyon Baskın Senaryo

### Input

- Satış Fiyatı: `150`
- Maliyet: `50`
- Komisyon: `35`
- Kargo: `5`
- Reklam: `5`
- Hedef Kâr: `20`
- KDV: `%20`
- Kampanya: `Kapalı`

### Beklenen Hesap / Sonuç

- Komisyonun parasal karşılığı belirgin biçimde artmalı
- Gider dağılımında komisyon üst sıralarda görünmeli

### UI Kontrol

- İkinci karusel kartında komisyon kalemi doğru TL değeriyle görünmeli
- Öne çıkanlarda komisyon baskısı doğru yansıyorsa not edilmeli

### AI Kontrol

- AI yorumunda gider baskısı veya marj daralması vurgulanmalı

## Senaryo 5 - Kargo / Reklam Etkisi

### Input

- Satış Fiyatı: `130`
- Maliyet: `55`
- Komisyon: `18`
- Kargo: `22`
- Reklam: `18`
- Hedef Kâr: `18`
- KDV: `%20`
- Kampanya: `Kapalı`

### Beklenen Hesap / Sonuç

- Net kâr belirgin şekilde düşmeli
- Kargo veya reklam, gider dağılımında öne çıkmalı

### UI Kontrol

- Gider dağılımı pastası ve alt liste aynı büyüklük sırasını vermeli
- İlk karttaki öne çıkanlar kargo veya reklam baskısını yansıtmalı

### AI Kontrol

- AI yorum bu maliyetlerin marjı erittiğini söylemeli
- Hesapla çelişen aşırı pozitif ton olmamalı
