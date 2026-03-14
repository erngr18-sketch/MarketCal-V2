# Ürünler

## Amaç

Ürün portföy ekranında tablo, filtreler, varyant bazlı liste mantığı ve AI portföy analizinin doğru çalıştığını doğrulamak.

## Kontrol Alanları

- Arama
- Filtreler
- Varyant bazlı tablo
- Barkod / SKU gösterimi
- Aksiyon menüsü
- AI analiz kartı

## Senaryo 1 - Barkod Zorunlu, SKU Opsiyonel

### Input

- Barkodu dolu, SKU'su boş bir ürün satırı
- Barkodu dolu, SKU'su dolu bir ürün satırı

### Beklenen Hesap / Sonuç

- Barkod alanı boş ürün kabul edilmemeli veya mock veri buna izin vermemeli

### UI Kontrol

- SKU boşsa `-` görünmeli
- Barkod alanı belirgin görünmeli

### AI Kontrol

- AI analiz tek ürün seviyesinde yorum üretmemeli

## Senaryo 2 - Aynı Ürün Adı, Farklı Varyant

### Input

- Aynı ürün adıyla en az iki farklı varyantı kontrol et

### Beklenen Hesap / Sonuç

- Satırlar varyant bazlı ayrı görünmeli

### UI Kontrol

- Ürün adı tekrar etse de varyant ayrımı anlaşılır olmalı

### AI Kontrol

- AI kartı genel portföy dili korumalı

## Senaryo 3 - Kategori / Label Filtreleri

### Input

- Kategori ve label filtrelerini tek tek uygula

### Beklenen Hesap / Sonuç

- Liste doğru daralmalı

### UI Kontrol

- Arama ve filtre alanları birlikte çalışmalı

### AI Kontrol

- AI portföy analizi filtrelenmiş listeye göre değişmeli

## Senaryo 4 - AI Analiz Davranışı

### Input

- Filtreyi geniş ve dar sonuç kümelerinde dene

### Beklenen Hesap / Sonuç

- AI analiz, tek tek ürün yorumu değil genel portföy içgörüsü vermeli

### UI Kontrol

- Güçlü alan, risk alanı ve aksiyon önerisi bölümleri görünmeli

### AI Kontrol

- Ton yönlendirici olmalı
- Aşırı detaylı ürün bazlı anlatım olmamalı

## Senaryo 5 - Büyük Liste Mantığı

### Input

- Çok satırlı ürün listesiyle arama yap
- Ürün adı, varyant, barkod ve SKU üzerinden arama dene

### Beklenen Hesap / Sonuç

- Arama ilgili alanlarda çalışmalı

### UI Kontrol

- Tablo taşmamalı
- Aksiyon menüleri erişilebilir kalmalı

### AI Kontrol

- Sonuç kümesi küçülünce AI analiz de yeni kümeye uyum sağlamalı
