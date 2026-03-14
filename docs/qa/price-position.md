# Fiyat Konumu

## Amaç

Ürün bazlı rekabet analizinde pazar bandı, net kâr görünürlüğü ve AI analiz tonunun tutarlı çalıştığını doğrulamak.

## Kontrol Alanları

- Header ve senaryo alanı
- CTA durumu
- Pazar bandı segmentleri
- Net kâr ve hedef ilişkisi
- AI analiz ve AI yorum

## Senaryo 1 - Alt Bant

### Input

- Ürünün fiyatını pazarın alt bandında kalacak şekilde belirle

### Beklenen Hesap / Sonuç

- Alt bant vurgusu görünmeli

### UI Kontrol

- Segment rengi doğru olmalı
- Net kâr alanı görünür kalmalı

### AI Kontrol

- AI yorum alt bant risk / avantaj dengesini anlatmalı

## Senaryo 2 - Orta Bant

### Input

- Ürünü orta banda taşıyan fiyat gir

### Beklenen Hesap / Sonuç

- Orta bant segmenti vurgulanmalı

### UI Kontrol

- Pazar konumu ile metrik sırası çelişmemeli

### AI Kontrol

- AI yorum daha dengeli ton kullanmalı

## Senaryo 3 - Üst Bant

### Input

- Fiyatı üst bandı tetikleyecek seviyeye çıkar

### Beklenen Hesap / Sonuç

- Üst bant vurgusu görünmeli

### UI Kontrol

- Yanlışlıkla orta bant görünmemeli

### AI Kontrol

- AI yorum dönüşüm / fiyat baskısı riskini anmalı

## Senaryo 4 - Kârlı Ama Pazarın Üstünde

### Input

- Net kârı pozitif tut
- Fiyatı üst bantta bırak

### Beklenen Hesap / Sonuç

- Net kâr görünürlüğü korunmalı
- Pazar bandı üstte kalmalı

### UI Kontrol

- Kullanıcı hem kârlılığı hem konumu aynı anda anlayabilmeli

### AI Kontrol

- AI yorum güçlü marj + dönüşüm riski dengesini anlatmalı

## Senaryo 5 - Zararda Ama Fiyat Düşük

### Input

- Fiyatı alt veya orta banda yakın tut
- Giderleri yükselterek net kârı negatife çek

### Beklenen Hesap / Sonuç

- Net kâr negatif olmalı
- Pazar bandı ile zarar durumu ayrı okunmalı

### UI Kontrol

- Yanlış yönlendirici pozitif badge görünmemeli

### AI Kontrol

- AI yorum fiyat düşüklüğüne rağmen zarar sebebini açıklamalı
