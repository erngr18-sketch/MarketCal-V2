# CONTROL_CHECK (MarketcalV2)

## 1) Her PR / her UI değişikliği (zorunlu)
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run controlcheck`
- Node sürümü: `v20.x` veya `v22.x` (LTS). (`v25+` için override: `CONTROLCHECK_ALLOW_UNSUPPORTED_NODE=1`)

## 2) Otomatik UI Guard (controlcheck içinde)
- `app/layout.tsx` içinde `import './globals.css'` olmalı.
- `app/globals.css` içinde `@tailwind base/components/utilities` ve `.card` tanımı olmalı.
- `tailwind.config.ts` içinde `./app/**/*` content deseni bulunmalı.
- `app/app/compare/page.tsx` dosyası mevcut olmalı.
- `app/components/sidebar.tsx` içinde compare linki yalnızca `/app/compare` olmalı.

## 3) Smoke Routes (manuel)
- `/login`: giriş ekranı açılıyor mu?
- `/app/dashboard`: shell (sidebar + topbar) düzgün mü?
- `/app/single`: form + sağ sticky KPI/AI düzeni çalışıyor mu?
- `/app/compare`: kartlar anlık güncelleniyor, duplicate marketplace engelleniyor mu?
- `/app/competition`: placeholder/sayfa render düzgün mü?

## 4) Sorun halinde
- `rm -rf .next`
- `npm run controlcheck`
- Node sürümünü kontrol et: `node -v` (öneri: `nvm use 22`)

## 5) Compare AI Kısa Test
- Kampanya kapalı + zarar: AI satırında `kupon/indirim/kampanya` kelimeleri geçmiyor.
- Kampanya açık + `discountPct > 0`: AI satırı indirim azaltma önerisi verebiliyor.
- Kampanya açık + `couponTry > 0`: AI satırı kupon azaltma önerisi verebiliyor.
- Kargo çok yüksekse (örn. 57) ilk öneri kargo optimizasyonu olmalı.
- Komisyon için `düşür/değiştir` yok; sadece `komisyon oranını panelden teyit et` önerisi var.
