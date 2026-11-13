# Nöbet Listesi (statik)

Radyoloji nöbet çizelgesi üretici. Giriş, sunucu ve veritabanı yok; tüm veri tarayıcının yerel depolamasında (`localStorage`) kalır.

Yayın: GitHub Pages → workflow `.github/workflows/pages.yml`.

## Kurallar

- Pzt–Cmt: 08:00–16:00 için 4 kişi (MR, BT, RÖNT-PORT, RÖNT-MAMO — cihaz başına 1), 16:00–24:00 için 2 kişi, 24:00–08:00 için 1 kişi.
- Pazar: sabah 1 (MR), akşam 1, gece 1.
- Mamografi (RÖNT-MAMO) yalnızca kadın personele verilir.
- Kişi başı haftada en fazla 5 vardiya (Pazartesi başlangıçlı takvim haftası).
- Aynı gün çift vardiya yok; gece veya akşam sonrası ertesi gün dinlenme.
- İzin/rapor asla ihlal edilmez; yeterli personel yoksa haftalık sınır esnetilir ve atama "zorunlu" işaretlenir.
- Kişi bazlı yetki matrisi: işareti kaldırılan vardiya veya cihazda o kişiye otomatik atama yapılmaz; cihaz yetkileri sabah vardiyası için geçerlidir.

## Yerel kullanım

`index.html` dosyasını tarayıcıda aç. Derleme adımı yok.

## Sınırlar

- Veri cihaz bazlıdır; tarayıcı verisi silinirse kaybolur. Yedek için "Veriyi dışa aktar".
- Tema seçimi (aydınlık/gece) de tarayıcıda saklanır.
