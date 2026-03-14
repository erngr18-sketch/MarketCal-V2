# Pazaryeri Karşılaştırma

## Amaç

Karşılaştırma ekranında çoklu pazar sonuçları, badge mantığı ve AI karşılaştırma özetinin tutarlı çalıştığını doğrulamak.

## Kontrol Alanları

- Pazaryeri seçimi
- Maksimum 3 pazaryeri kuralı
- Senaryo inputları
- Sonuç kartları
- AI analiz sıralaması
- Tek seçim ve placeholder davranışı

## Senaryo 1 - Karışık 3 Pazaryeri

### Input

- 3 pazaryeri seç
- Aynı satış fiyatı ve maliyet ile bir pazarı kârlı, bir pazarı riskli, bir pazarı zarar edecek override değerleri gir

### Beklenen Hesap / Sonuç

- En kârlı pazar doğru net kâr ile öne çıkmalı
- Zarar eden pazar yanlışlıkla hedefte görünmemeli

### UI Kontrol

- Kartlarda badge sırası net olmalı
- AI analiz sırası `Kârlı`, `Zayıf`, `Zarar` mantığını korumalı

### AI Kontrol

- Her blok ilgili pazaryerini doğru anmalı
- Neden ve aksiyon bölümleri birbiriyle çelişmemeli

## Senaryo 2 - Tek Pazaryeri Seçimi

### Input

- Sadece 1 pazaryeri seç
- Temel senaryo alanlarını doldur

### Beklenen Hesap / Sonuç

- Hesap normal şekilde oluşmalı

### UI Kontrol

- Boş kalan alan add / placeholder kartı ile kötü görünmemeli
- Layout kırılmamalı

### AI Kontrol

- Tek pazaryeriyle de özet dili anlaşılır kalmalı

## Senaryo 3 - Aynı Fiyat, Farklı Komisyon / Kargo

### Input

- Aynı satış fiyatı ve maliyet
- Farklı pazarlar için sadece komisyon veya kargo değiştir

### Beklenen Hesap / Sonuç

- Net kâr farkı doğrudan bu gider farklarından oluşmalı

### UI Kontrol

- Kartların ana metriklerinde fark görünmeli

### AI Kontrol

- AI yorum neden olarak komisyon veya kargoyu öne çıkarabilmeli

## Senaryo 4 - Hedef Kâr Karşılanmayan Pazarlar

### Input

- Hedef kârı yüksek belirle
- Pazarlardan en az ikisinde net kâr hedef altında kalsın

### Beklenen Hesap / Sonuç

- Bu pazarlar `Hedefte` görünmemeli

### UI Kontrol

- Badge ile kart içeriği çelişmemeli

### AI Kontrol

- AI bu pazarları zayıf veya riskli olarak anlatmalı

## Senaryo 5 - KDV / Kampanya Etkisi

### Input

- KDV ve kampanya etkisini değiştir
- İndirim / kupon kombinasyonlarını dene

### Beklenen Hesap / Sonuç

- Hesap tutarlılığı korunmalı
- KDV veya kampanya değişince tüm kartlar güncellenmeli

### UI Kontrol

- Pasif / aktif alan davranışları doğru çalışmalı

### AI Kontrol

- AI özet, değişen senaryo sonucunu yansıtmalı
