# 🚀 Admin Paneli - Hızlı Başlangıç

## 3 Adımda Admin Paneline Başla

### 1️⃣ Admin Kullanıcısı Oluştur

Terminal'i aç ve şu komutu çalıştır:

```bash
cd api
node scripts/createAdmin.js admin admin123 admin@gametracker.com
```

**Çıktı:**
```
MongoDB bağlantısı başarılı
✓ Yeni admin kullanıcısı oluşturuldu: admin

Admin Giriş Bilgileri:
─────────────────────────
Kullanıcı Adı: admin
Şifre: admin123
E-posta: admin@gametracker.com
─────────────────────────

Admin paneline erişmek için: http://localhost:5173/#/admin
```

### 2️⃣ Uygulamayı Başlat

**Backend:**
```bash
cd api
npm start
```

**Frontend:**
```bash
npm run dev
```

### 3️⃣ Admin Paneline Giriş Yap

1. Tarayıcıda aç: `http://localhost:5173/#/admin`
2. Giriş bilgilerini gir:
   - **Kullanıcı Adı:** `admin`
   - **Şifre:** `admin123`
3. "Admin Girişi" butonuna tıkla
4. Dashboard'a yönlendirileceksin! 🎉

## 📋 Ne Yapabilirsin?

### Dashboard (Genel Bakış)
- ✅ Toplam kullanıcı sayısını gör
- ✅ Admin sayısını kontrol et
- ✅ Oyun oturumu istatistiklerini incele
- ✅ En popüler oyunları keşfet
- ✅ Son kayıt olan kullanıcıları gör

### Kullanıcı Yönetimi
- ✅ Tüm kullanıcıları listele
- ✅ Kullanıcı ara (isim veya email)
- ✅ Kullanıcıları admin yap veya user'a düşür
- ✅ Kullanıcıları sil

### Oyun Oturumları
- ✅ Tüm oyun oturumlarını izle
- ✅ Hangi kullanıcı ne kadar oynadı gör
- ✅ Oyun istatistiklerini analiz et

## 🔐 Güvenlik Özellikleri

- **5 Deneme Hakkı:** Yanlış şifre girişinde 5 deneme hakkın var
- **Otomatik Kilitleme:** 5 başarısız denemeden sonra hesap 10 dakika kilitlenir
- **IP Takibi:** Tüm giriş denemeleri IP adresiyle kaydedilir
- **Güvenli Token:** JWT ile şifreli oturum yönetimi

## 💡 İpuçları

1. **Güçlü Şifre Kullan:** Production'da mutlaka güçlü şifre belirle
2. **Admin Sayısını Sınırla:** Sadece güvendiğin kişilere admin yetkisi ver
3. **Düzenli Kontrol:** Kullanıcı aktivitelerini düzenli kontrol et
4. **Yedekleme:** Önemli işlemlerden önce veritabanını yedekle

## 🆘 Sorun mu Yaşıyorsun?

### "MongoDB bağlantısı başarısız"
- MongoDB'nin çalıştığından emin ol
- `.env` dosyasında `MONGO_URI` ayarını kontrol et

### "Admin paneline erişilemiyor"
- Backend'in çalıştığından emin ol (`npm start`)
- Frontend'in çalıştığından emin ol (`npm run dev`)
- Doğru URL'yi kullandığından emin ol

### "Giriş yapamıyorum"
- Kullanıcı adı ve şifreyi doğru girdiğinden emin ol
- MongoDB'de kullanıcının `role: 'admin'` olduğunu kontrol et
- 5 deneme sonrası kilitlenmişsen 10 dakika bekle

## 📚 Daha Fazla Bilgi

Detaylı kullanım kılavuzu için:
```
docs/admin-panel-guide.md
```

Teknik detaylar için:
```
ADMIN_PANEL_SUMMARY.md
```

## 🎯 Sonraki Adımlar

1. ✅ Admin kullanıcısı oluştur
2. ✅ Admin paneline giriş yap
3. ✅ Dashboard'u keşfet
4. ✅ İlk kullanıcını yönet
5. ✅ Oyun oturumlarını incele

**Başarılar! 🚀**
