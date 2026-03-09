# MarketcalV2 Manuel Test Checklist

Bu doküman, kritik akışları düzenli ve tekrar edilebilir şekilde test etmek için hazırlanmıştır.

## 1) Single (Tek Ürün Analizi)

### Temel hesaplama
- [ ] `Satış Fiyatı`, `Maliyet`, `Komisyon`, `Kargo`, `Reklam` girildiğinde net kâr anlık hesaplanıyor.
- [ ] `Hedef Kâr` girildiğinde durum badge doğru değişiyor: `Hedef Altı` / `Hedefte` / `Hedef Üstü`.
- [ ] Hedefe göre fark satırı doğru görünüyor (`X altında`, `X üstünde`, `hedefte`).

### Önerilen fiyat
- [ ] Önerilen satış fiyatı hesaplanıyor.
- [ ] `Satış fiyatını önerilen tutarla güncelle` butonu çalışıyor.
- [ ] Satış fiyatı zaten önerilen değerle eşitse buton pasif.

### AI davranışı
- [ ] Kampanya kapalıyken AI metni kampanya/kupon önerisi vermiyor.
- [ ] Reklam `0` iken AI reklam optimizasyonu önermiyor.

### KDV davranışı
- [ ] KDV selector görünüyor: `%20 / %10 / %1 / Diğer`.
- [ ] Default KDV `%20`.
- [ ] `%20`, `%10`, `%1` ve `Diğer` değişiminde net kâr değişiyor.
- [ ] Net kâr KDV hariç satış üzerinden hesaplanıyor.

Örnek veri:
- Satış: `2000`
- Maliyet: `600`
- Komisyon: `20`
- Kargo: `40`
- Reklam: `30`
- Hedef Kâr: `500`
- KDV: `%20` sonra `%10` (sonuç farkı gözlemlenmeli)

## 2) Compare (Karşılaştırma)

### Temel karşılaştırma
- [ ] Global `Satış Fiyatı` ve `Maliyet` girildiğinde pazaryerleri net kârları hesaplanıyor.
- [ ] Pazaryeri kartları arasında sıralama ve en kârlı badge doğru.

### KDV davranışı
- [ ] KDV selector görünüyor.
- [ ] KDV değişince tüm pazaryeri net kârları anlık güncelleniyor.
- [ ] KDV değişince toplam/ortalama net kâr da güncelleniyor.

### AI ve UI
- [ ] AI yorumları sonuçlarla tutarlı kalıyor.
- [ ] Layout bozulmadan (overflow olmadan) çalışıyor.

Örnek veri:
- Satış: `2000`
- Maliyet: `600`
- Varsayılan Reklam: `50`
- Hedef Kâr: `300`
- Trendyol komisyon: `20`, Hepsiburada komisyon: `18`
- KDV: `%20` -> `%1` (rank değişimi varsa doğru yansıtılmalı)

## 3) Competition / Fiyat Analizi

### Form ve validasyon
- [ ] Sayfa ilk açılışta `Analizi Başlat` butonu disabled.
- [ ] URL boşken kırmızı validation görünmüyor.
- [ ] Geçerli Trendyol kategori linkinde buton aktif olabiliyor.
- [ ] Trendyol ürün linki (`-p-`) girilince geçersiz uyarısı çıkıyor.
- [ ] Hepsiburada/Amazon/Etsy linkinde kaynak algılanıyor ve destek dışı mesajı görünüyor.
- [ ] Sort mode label’ları Türkçe görünüyor.

### Analiz sonrası kartlar
- [ ] API başarılı dönünce `AI Analiz` kartı doluyor.
- [ ] `Kategori Özeti` kartı istatistiklerle doluyor.
- [ ] `Senin Konumun` kartı otomatik hesaplanıyor.
- [ ] `partial` durumda uyarı satırı görünüyor.
- [ ] Teknik hata mesajları kullanıcı dostu metne mapleniyor.

### KDV davranışı
- [ ] KDV selector görünüyor ve çalışıyor.
- [ ] Pazar fiyatları (min/ortalama/max/segment) KDV değişiminden etkilenmiyor.
- [ ] Kullanıcının net kârı KDV değişiminden etkileniyor.

Örnek Trendyol link:
- `https://www.trendyol.com/kadin-kazak-x-g1-c1092?sst=BEST_SELLER`

## 4) Competition / Ürün Analizi

### Akış
- [ ] Ürün linki validasyonu çalışıyor.
- [ ] `Analizi Başlat` sonrası sonuç kartları doluyor.

### KDV davranışı
- [ ] KDV selector görünüyor.
- [ ] Rakip fiyatları/dağılımı KDV değişiminden etkilenmiyor.
- [ ] Kullanıcı net kârı KDV ile doğru değişiyor.
- [ ] Önerilen satış fiyatı varsa KDV etkisiyle doğru hesaplanıyor.

### AI
- [ ] AI panel sonuçlara göre anlamlı yorum üretiyor.

## 5) Category Analysis API

### Temel endpoint kontrolleri
- [ ] Geçerli Trendyol kategori linki ile `ok: true` dönüyor.
- [ ] `normalizedUrl` doğru dönüyor.
- [ ] `partial` true/false mantığı beklenen gibi.
- [ ] `products` listesi dolu geliyor.
- [ ] `price_try = 0` ürünler response’ta yok.
- [ ] `statistics` min/max ürün listesiyle tutarlı.
- [ ] `summary` alanları Türkçe.

### Hata durumları
- [ ] 404 sayfa durumunda uygun hata reason dönüyor.
- [ ] 403 blocked/rate-limit durumunda uygun hata reason dönüyor.

Örnek curl:

```bash
curl -X POST "http://localhost:3001/api/category-analysis" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.trendyol.com/sr?qt=kazak&st=kazak",
    "sortMode": "BEST_SELLER",
    "productLimit": 20
  }'
```

## 6) KDV Ortak Checklist

- [ ] Default KDV her ilgili sayfada `%20`.
- [ ] `%10` seçildiğinde sonuçlar değişiyor.
- [ ] `%1` seçildiğinde sonuçlar değişiyor.
- [ ] `Diğer` alanı aktif/pasif davranışı doğru.
- [ ] KDV değişiminde hesaplar anlık güncelleniyor (reload yok).
- [ ] Satış fiyatı KDV dahil varsayımı korunuyor.
- [ ] Net kâr KDV hariç satış üzerinden hesaplanıyor.

## 7) AI Ortak Checklist

- [ ] AI panel sağ kolonda.
- [ ] Başlık `AI Analiz`.
- [ ] Kampanya yokken kampanya önerisi verilmemeli.
- [ ] Reklam `0` iken reklam önerisi verilmemeli.
- [ ] Hata durumunda teknik ham reason yerine kullanıcı dostu metin gösteriliyor.
- [ ] Boş state metinleri anlaşılır.

## 8) URL Validation Ortak Checklist

- [ ] Trendyol `/sr` linki geçerli.
- [ ] Trendyol `-x-` kategori linki geçerli.
- [ ] Trendyol `-p-` ürün linki geçersiz.
- [ ] Hepsiburada algılanıyor, destek dışı mesajı gösteriliyor.
- [ ] Etsy algılanıyor, destek dışı mesajı gösteriliyor.
- [ ] Custom store algılanıyor, destek dışı mesajı gösteriliyor.
- [ ] Geçersiz string (`abc`) için `Kaynak algılanamadı` mesajı gösteriliyor.

---

Bu checklist her büyük UI veya hesaplama revizyonundan sonra tekrar çalıştırılmalıdır.
