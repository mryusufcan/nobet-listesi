# Radyoloji Nöbet Listesi

Radyoloji ekipleri için aylık nöbet çizelgesi hazırlayan, tarayıcıda çalışan statik bir uygulama. Personel ve izin bilgilerini girerek kurallara göre çizelge oluşturabilir, atamaları elle düzenleyebilir ve sonuçları özet tablolarında inceleyebilirsiniz.

Uygulama için hesap açmanız gerekmez. Sunucuya veya veritabanına veri gönderilmez; bilgiler kullandığınız tarayıcının yerel depolama alanında (`localStorage`) saklanır.

## Özellikler

- Personel ekleme, çıkarma ve kişi bazında vardiya/cihaz yetkilerini belirleme.
- Başlangıç ve bitiş tarihleriyle izin veya rapor kaydetme.
- Seçilen ay için otomatik nöbet çizelgesi oluşturma; hücreleri elle değiştirme ve elle yapılan atamaları yeni çizelge oluştururken koruma.
- Çizelgedeki eksik veya kurallara uymayan atamaları uyarılarla gösterme.
- **Modalite özeti** bölümünde sabah cihaz/modalite atamalarını ve aynı satırda sabah toplamı, akşam, gece ve toplam vardiya sayılarını karşılaştırma.
- **Çalışma saati** bölümünde aylık hedef, vardiya ve izin kredisi üzerinden hesaplanan saatleri ve hedef farkını görüntüleme.
- Çizelgeyi yazdırma/PDF olarak kaydetme, CSV indirme veya elektronik tabloya aktarma.
- Tarayıcıdaki verileri dışa aktarıp daha sonra içe aktarma ve aydınlık/gece temasını seçme.

## Çizelge kuralları

- Pazartesi–Cumartesi sabah vardiyası (08:00–16:00): MR, BT, RÖNT-PORT ve RÖNT-MAMO cihazlarında birer kişi. RÖNTGEN, aylık hedef saatin altında kalan personele uygunluk koşulları sağlandığında eklenebilir.
- Pazar sabah vardiyası (08:00–16:00): yalnızca MR cihazı için bir kişi.
- Akşam vardiyası (16:00–24:00): Pazartesi–Cumartesi iki kişi, Pazar bir kişi.
- Gece vardiyası (24:00–08:00): her gün bir kişi.
- RÖNT-MAMO ataması kadın personelle sınırlıdır.
- Otomatik çizelgede kişi başına haftada en fazla beş vardiya hedeflenir. Personel yetersizliğinde bu sınırın aşılması gerekiyorsa atama zorunlu olarak işaretlenir ve onay gerektirir.
- Otomatik atamada aynı gün birden fazla vardiya verilmez; gece veya akşam vardiyasından sonra ertesi sabah dinlenme gözetilir.
- İzin ve rapor tarih aralığındaki tüm günleri kapsar. Otomatik atamalar bu günlere yapılmaz.
- Vardiya ve cihaz yetkileri otomatik atamaları etkiler. Cihaz yetkileri sabah vardiyası için geçerlidir.

Elle yapılan değişiklikler çizelge doğrulamasında denetlenir; kuralları ihlal eden bir atama varsa uyarı gösterilir.

## Kullanım

### İnternetten

Uygulamayı GitHub Pages üzerinden açın: **[Nöbet Listesi](https://mryusufcan.github.io/nobet-listesi/)**.

### Bilgisayarınızda

1. Depoyu bilgisayarınıza indirin veya klonlayın.
2. `index.html` dosyasını tarayıcıda açın. Derleme ya da bağımlılık yükleme adımı gerekmez.

İsterseniz depo klasöründe yerel web sunucusu da başlatabilirsiniz:

```bash
python3 -m http.server 8000
```

Ardından tarayıcıda `http://localhost:8000` adresini açın.

## Veri ve gizlilik

- Personel, izin, çizelge ve tema tercihleri kullandığınız tarayıcıda saklanır; başka cihaz veya tarayıcıya kendiliğinden aktarılmaz.
- Tarayıcı verileri silinirse kayıtlar kaybolabilir. Yedeklemek için **Veriyi dışa aktar** seçeneğini kullanın; yedeği geri yüklemek için **Veriyi içe aktar** seçeneğini kullanın.
- Gizli pencere veya farklı bir tarayıcı kullanıyorsanız kayıtlı verileriniz görünmeyebilir.

## Yayın

GitHub Pages dağıtımı `.github/workflows/pages.yml` iş akışıyla yapılır.
