# Radyoloji Nöbet Listesi

Radyoloji ekipleri için aylık nöbet çizelgesi hazırlayan, tarayıcıda çalışan statik bir uygulama. Personel ve izin bilgileri girilir, kurallara göre çizelge üretilir; atamalar elle düzenlenebilir ve sonuçlar özet tablolarda incelenir.

Uygulama için hesap açmanız gerekmez. Sunucuya veya veritabanına veri gönderilmez; bilgiler kullandığınız tarayıcının yerel depolama alanında (`localStorage`) saklanır.

## Özellikler

- Hazır kadro ile gelir: 10 rotasyon personeli ve son çare olarak Radyoloji Sorumlusu. Kadro tamamen düzenlenebilir; **Örnek kadro** düğmesi 4 kişilik deneme kadrosu ekler, **Veriyi içe aktar** ile daha önce alınan yedek yüklenir.
- **Personel, vardiya ve modalite yetkileri** tek panelde toplanmıştır: her satırda ad, cinsiyet, **Sil** ve kişi bazında vardiya/cihaz işaretleri bulunur. Cinsiyet mamografi kuralında kullanılır; erkek personelde RÖNT-MAMO kutusu kapalıdır.
- Başlangıç ve bitiş tarihleriyle izin veya rapor kaydetme. İzin / rapor paneli çalışma saati panelinin yanında durur; aralıktaki tüm günler izinli sayılır.
- Seçilen ay için otomatik nöbet çizelgesi oluşturma; hücreleri elle değiştirme ve elle yapılan atamaları yeni çizelge oluştururken koruma.
- Çizelgedeki eksik veya kurallara uymayan atamaları uyarılarla gösterme.
- **Modalite özeti** bölümünde sabah cihaz/modalite atamalarını ve kişi başına sabah, akşam, gece ve toplam vardiya sayılarını karşılaştırma.
- **Çalışma saati** bölümünde aylık hedef, izin kredisi ve fiilî saatleri, hedef farkını görüntüleme.
- Çizelgeyi yazdırma/PDF olarak kaydetme, CSV indirme veya Google E-Tablo'ya aktarma.
- Tarayıcıdaki verileri dışa aktarıp daha sonra içe aktarma, aydınlık/gece teması seçme.
- İlk açılışta 4 adımlık tanıtım turu; **Atla** ile kapatılır, bir daha gösterilmez.

## Çizelge kuralları

- Pazartesi–Cumartesi sabah vardiyası (08:00-16:00): MR, BT, RÖNT-PORT ve RÖNT-MAMO cihazlarında birer kişi. RÖNTGEN beşinci sabah yeridir; yalnızca haftalık yükü dengelemek için doldurulur.
- Pazar sabah vardiyası (08:00-16:00): yalnızca MR cihazı için bir kişi.
- Akşam vardiyası (16:00-24:00): Pazartesi–Cumartesi iki kişi, Pazar bir kişi.
- Gece vardiyası (24:00-08:00): her gün bir kişi.
- Her cihazda günde tam bir kişi bulunur.
- RÖNT-MAMO yalnızca kadın personele verilir; erkeklere atanmaz ve kadınlar arasında eşit dağıtılır (üretim sonunda fark varsa günler taşınarak denetlenir).
- Otomatik çizelgede kişi başına haftada en fazla **altı** vardiya hedeflenir. Personel yetersizliğinde bu sınırın aşılması gerekiyorsa atama zorunlu olarak işaretlenir ve onay gerektirir.
- Otomatik atamada aynı gün birden fazla vardiya verilmez; gece veya akşam vardiyasından sonra ertesi sabah dinlenme gözetilir. Gece vardiyası aynı kişiye iki gün arka arkaya yalnız zorunluluk hâlinde verilir.
- İzin ve rapor tarih aralığındaki tüm günleri kapsar. Otomatik atamalar bu günlere yapılmaz; izin günü vardiya sayısına eklenmez.
- Vardiya ve cihaz yetkileri otomatik atamaları etkiler. Cihaz yetkileri sabah vardiyası için geçerlidir.
- Radyoloji Sorumlusu son çare jokeridir: yalnızca başka kimse uygun değilse sabah MR'a yazılır.

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

### Akış

1. Yıl ve ayı seçin, kadroyu ve izinleri kontrol edin.
2. **Liste oluştur** ile çizelgeyi üretin.
3. Gerekirse hücrelerdeki açılır listelerden atamaları değiştirin; elle yapılan atamalar korunur.
4. **E-Tablo'ya aktar** ile çizelgeyi panoya kopyalayın, **E-Tablo'yu aç** bağlantısıyla şablonu açın ve `A1` hücresine **Ctrl+Shift+V** ile yapıştırın. Panoya erişim engelliyse metin alanı gösterilir; oradan kopyalayabilirsiniz.
5. Gerekirse **CSV indir** veya **Yazdır / PDF** kullanın. Yaptığınız her değişiklik tarayıcıya anında kaydedilir; ayrı bir kaydet düğmesi yoktur.

E-Tablo aktarımı haftalık blok düzenine uyar: 9 kolon (vardiya, cihaz ve haftanın yedi günü), günler `C`–`I` aralığına denk gelir.

## Veri ve gizlilik

- Personel, izin, çizelge ve tema tercihleri kullandığınız tarayıcıda saklanır; başka cihaz veya tarayıcıya kendiliğinden aktarılmaz.
- Depoya kişisel veri işlenmez; hazır kadro yalnızca sizin tarayıcınızda tutulur.
- İçe aktarılan yedek dosyası önce doğrulanır. Dosya geçersizse hiçbir şey yazılmaz, mevcut verileriniz olduğu gibi kalır.
- Tarayıcıdaki kayıt bir sebeple okunamazsa çalışma boş kadroyla başlar ve okunamayan kayıt silinmeden `nobet-listesi-static-v1:bozuk` anahtarına yedeklenir.
- Tarayıcı verileri silinirse kayıtlar kaybolabilir. Yedeklemek için **Veriyi dışa aktar** seçeneğini kullanın; yedeği geri yüklemek için **Veriyi içe aktar** seçeneğini kullanın.
- Gizli pencere veya farklı bir tarayıcı kullanıyorsanız kayıtlı verileriniz görünmeyebilir.

## Geliştirme

- Dosyalar: `index.html` (işaretleme), `styles.css` (tema ve düzen), `app.js` (plan üretimi, doğrulama, görünüm). Bağımlılık ve derleme adımı yoktur.
- Plan üretimi `app.js` içindeki `generate()`/`choose()` zincirinde; üretilen çizelge `validate()` ile denetlenir, bulgular `renderIssues()` ile gösterilir.
- Elle yazılan hücreler `state.locks` ile korunur; `Manuel korumayı kaldır` tüm kilitleri temizler.
- Yazdırmada paneller `beforeprint` ile açılır, kontroller gizlenir.

## Yayın

GitHub Pages dağıtımı `.github/workflows/pages.yml` iş akışıyla yapılır. Etiketli kararlı sürüm: `checkpoint-2026-11-15`.

### Paylaşım önizlemesi

Bağlantı paylaşıldığında görünen kart `index.html` içindeki `og:*` ve `twitter:*` etiketlerinden gelir; görsel `assets/onizleme.png` (1200×630, kaynağı `assets/onizleme.svg`). Görseli düzenledikten sonra `rsvg-convert -w 1200 -h 630 -o assets/onizleme.png assets/onizleme.svg` ile yeniden üretin. Uygulamalar önizlemeyi önbelleğe alır; eski kart görünüyorsa bağlantıyı `?v=2` ekleyerek paylaşın.

## Lisans

[MIT](LICENSE) - izin verilen, ticari kullanıma da açık lisans. Kurumunuz farklı bir lisans istiyorsa bu dosyayı değiştirebilirsiniz.
