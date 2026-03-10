# CONTROL_CHECK

## 1) Her PR / her UI değişikliği (zorunlu)
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run controlcheck` (UI guard + komut zinciri)
- Node sürümü: `v20.x` veya `v22.x` (LTS). (`v25+` dev modda UI/CSS kararsızlığı üretebilir)

## 1.1) Otomatik UI Guard (controlcheck içinde)
- `app/layout.tsx` içinde `import './globals.css'` olmalı.
- `app/globals.css` içinde `@tailwind base/components/utilities` ve `.card` tanımı olmalı.
- `tailwind.config.ts` içinde `./app/**/*` content deseni bulunmalı.
- `app/(protected)/compare/page.tsx` mevcut olmalı ve compare UI burada yaşamalı.
- `app/components/sidebar.tsx` içinde compare linki yalnızca `/compare` olmalı (eski app-prefix path kullanılmamalı).
- `app/(protected)/products/page.tsx` mevcut olmalı ve products UI burada yaşamalı.
- `app/components/sidebar.tsx` içinde products linki yalnızca `/products` olmalı (eski app-prefix path kullanılmamalı).
- `app/components/sidebar.tsx` içinde `/products/upload` ayrı bir sidebar linki olarak bulunmamalı.

## 2) Smoke Routes (manuel ~1 dk)
- `/login`: Google butonu görünüyor mu, redirect akışı doğru mu?
- `/single`: Kampanya checkbox + XOR davranışı çalışıyor mu, not metni görünüyor mu?
- `/compare`: Kartlar anlık güncelleniyor mu, duplicate marketplace eklenmiyor mu, assistant summary görünüyor mu?
- Stil kontrolü: Sayfa “default HTML” gibi görünüyorsa CSS pipeline kırılmış olabilir; önce `npm run controlcheck` çalıştır.

## 3) Compare özel senaryolar
- Global satış fiyatı değişince tüm kart sonuçları güncellenmeli.
- `discountRate > 0` ise `couponValue` disabled olmalı ve `0`'lanmalı.
- `couponValue > 0` ise `discountRate` disabled olmalı ve `0`'lanmalı.
- `Pazaryeri ekle` mevcut pazaryerini tekrar ekleyememeli.
- Eklenebilecek pazaryeri kalmadığında buton disabled olmalı ve “Tüm pazaryerleri eklendi.” notu görünmeli.

## 4) Build çıkarsa yapılacaklar
- `rm -rf .next`
- Port çakışması kontrolü: `lsof -i :3000`
- Dev sunucuyu port ile başlatma: `npm run dev -- -p 3000`
- Node sürümünü kontrol et: `node -v` (gerekirse `nvm use 22`)

## 5) Competition (Trendyol, Fake Data)
- Geçersiz URL vakaları: boş değer, trendyol dışı domain, `javascript:...`, sadece `https://www.trendyol.com` (bare domain).
- Geçerli vaka: `https://www.trendyol.com/sr?q=...`
- Analiz butonu, URL geçerli ve fiyat > 0 olmadan aktif olmamalı.
- Aynı URL + aynı mod için refresh sonrası median aynı kalmalı (deterministic).
- Query param fiyatı inputu doldurmalı: `/competition?price=118.75`
