# Rekabet Analizi

## Amaç

Kategori linki, manuel fiyat modu, pazar bandı ve kârlılık sonuçlarının doğru çalıştığını doğrulamak.

## Kontrol Alanları

- Kategori linki doğrulama
- Manuel fiyat modu
- CTA state davranışı
- Pazar bandı
- Net kâr / hedef kâr ilişkisi
- AI analiz ve AI yorum metinleri

## Senaryo 1 - Geçerli Kategori Linki

### Input

- Geçerli bir kategori linki gir
- Senaryo alanlarını doldur

### Beklenen Hesap / Sonuç

- Link doğrulama mesajı başarılı olmalı
- Analiz tetiklenebilmeli

### UI Kontrol

- CTA aktif olmalı
- Link alanında kaynak tipine uygun mesaj görünmeli

### AI Kontrol

- AI analiz sonuçla uyumlu olmalı

## Senaryo 2 - Geçersiz veya Ürün Detay Linki

### Input

- Ürün detay linki veya hatalı link gir

### Beklenen Hesap / Sonuç

- Analiz tetiklenmemeli

### UI Kontrol

- Hata mesajı kategori linki beklendiğini açıkça söylemeli

### AI Kontrol

- Sağ panel yanlış veriyle değişmemeli

## Senaryo 3 - Manuel Fiyat Modu

### Input

- Manuel fiyat modunu aç
- Ortalama fiyat alanlarını doldur

### Beklenen Hesap / Sonuç

- URL ile çakışma olmamalı
- Manuel modda link alanı pasif veya ikincil davranmalı

### UI Kontrol

- Yardımcı metin manuel mod akışını açıklamalı

### AI Kontrol

- AI analiz manuel verilere göre üretilmeli

## Senaryo 4 - Target Gap Negatif Senaryo

### Input

- Net kâr pozitif, hedef kâr farkı negatif olacak bir senaryo kur

### Beklenen Hesap / Sonuç

- Badge `Hedefte` olmamalı
- `Sınırda` mantığı korunmalı

### UI Kontrol

- Hedefe kalan / hedefin üzerinde metni mantıklı görünmeli

### AI Kontrol

- AI yorum aşırı olumlu olmamalı

## Senaryo 5 - Pazar Bandı

### Input

- Ayrı ayrı alt bant, orta bant ve üst bant senaryoları dene

### Beklenen Hesap / Sonuç

- Segment vurgusu doğru olmalı

### UI Kontrol

- Yanlış segment renklendirmesi olmamalı
- Pazar konumu kartı ve AI yorum tutarlı kalmalı

### AI Kontrol

- Kısa AI yorum pazar bandını doğru anlatmalı
