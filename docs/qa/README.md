# QA Senaryoları

## Amaç

Bu klasör, canlıya çıkış öncesi sayfa bazlı manuel ve yarı-manuel doğrulama senaryolarını toplar. Hedef; hesaplama doğruluğunu, alan davranışlarını, durum badge mantığını ve AI yorum tutarlılığını merge öncesi görünür hale getirmektir.

## Nasıl Kullanılır

1. İlgili feature veya UI değişikliği hangi sayfayı etkiliyorsa o sayfanın `.md` dosyasını aç.
2. Senaryolardaki input değerlerini sırayla uygula.
3. Hesap sonucu, UI görünümü, badge ve helper text davranışını kontrol et.
4. AI yorumunun hesap sonucu ile çelişmediğini doğrula.
5. Edge case maddelerini ayrıca gözden geçir.

## Control Check'ten Farkı

`CONTROL_CHECK.md` daha çok genel build, route ve smoke kontrol katmanıdır. `docs/qa` ise sayfa bazlı ürün davranışını doğrulayan daha detaylı release provası dokümantasyonudur.

## Sayfa Bazlı Test Mantığı

Her dosya aynı iskeleti kullanır:

- `Amaç`
- `Kontrol Alanları`
- `Senaryo`
- `Input`
- `Beklenen Hesap / Sonuç`
- `UI Kontrol`
- `AI Kontrol`

## Her Senaryoda Kontrol Edilecek Ana Alanlar

- Input davranışı doğru mu
- Hesap sonucu beklenen mantıkla uyuşuyor mu
- Durum badge doğru label ile görünüyor mu
- AI yorum hesapla çelişmeden aynı tonu koruyor mu
- Edge case durumlarında yanlış yönlendirme oluşuyor mu

## Öneri

Merge öncesi en az 1 kârlı, 1 sınırda ve 1 zararda senaryo manuel gözden geçirilmeli.
