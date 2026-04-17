# Admin Paneli Kullanım Kılavuzu

## Genel Bakış

Game Tracker admin paneli, sistem yöneticilerinin kullanıcıları yönetmesine, oyun oturumlarını izlemesine ve sistem istatistiklerini görüntülemesine olanak tanır.

## Özellikler

### 🔐 Güvenlik
- **Giriş Denemesi Takibi**: Her kullanıcı adı için başarısız giriş denemeleri izlenir
- **Otomatik Kilitleme**: 5 başarısız denemeden sonra hesap 10 dakika kilitlenir
- **IP Loglama**: Tüm giriş denemeleri IP adresleriyle birlikte kaydedilir
- **Rol Tabanlı Yetkilendirme**: Sadece admin rolüne sahip kullanıcılar erişebilir
- **Token Doğrulama**: JWT token'ları ile güvenli oturum yönetimi

### 📊 Dashboard
- Toplam kullanıcı sayısı
- Admin sayısı
- Toplam oyun oturumu sayısı
- En popüler oyunlar
- Son kayıt olan kullanıcılar
- Oyun istatistikleri

### 👥 Kullanıcı Yönetimi
- Tüm kullanıcıları listeleme
- Kullanıcı arama (kullanıcı adı ve e-posta)
- Kullanıcı detaylarını görüntüleme
- Rol değiştirme (user ↔ admin)
- Kullanıcı silme
- Sayfalama desteği (20 kullanıcı/sayfa)

### 🎮 Oyun Oturumu İzleme
- Tüm oyun oturumlarını listeleme
- Kullanıcı bazında oturum görüntüleme
- Oyun süresi ve tarih bilgileri
- Sayfalama desteği (50 oturum/sayfa)

## Kurulum

### 1. Admin Kullanıcısı Oluşturma

#### Yöntem 1: Script ile (Önerilen)

```bash
cd api
node scripts/createAdmin.js <kullanıcı_adı> <şifre> <email>
```

Örnek:
```bash
node scripts/createAdmin.js admin admin123 admin@gametracker.com
```

#### Yöntem 2: NPM Script ile

```bash
cd api
npm run create-admin <kullanıcı_adı> <şifre> <email>
```

#### Yöntem 3: MongoDB'de Manuel Güncelleme

Mevcut bir kullanıcıyı admin yapmak için:

```javascript
// MongoDB shell veya Compass'ta
db.users.updateOne(
  { username: "kullanıcı_adı" },
  { $set: { role: "admin" } }
)
```

### 2. Admin Paneline Erişim

Admin paneline şu URL'den erişebilirsiniz:

```
http://localhost:5173/#/admin
```

Veya production ortamında:

```
https://yourdomain.com/#/admin
```

## API Endpoints

### Admin Authentication

#### POST `/api/admin/login`
Admin girişi yapar.

**Request Body:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Success Response (200):**
```json
{
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "username": "admin",
    "email": "admin@example.com",
    "role": "admin"
  }
}
```

**Error Responses:**
- `401`: Kullanıcı adı veya şifre hatalı
- `403`: Hesap admin yetkisine sahip değil
- `429`: Çok fazla başarısız deneme (hesap kilitli)

### Dashboard Statistics

#### GET `/api/admin/stats`
Dashboard istatistiklerini getirir.

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "totalUsers": 150,
  "totalAdmins": 3,
  "totalSessions": 5420,
  "recentUsers": [...],
  "topGames": [...]
}
```

### User Management

#### GET `/api/admin/users`
Kullanıcıları listeler (sayfalama ve arama destekli).

**Query Parameters:**
- `page`: Sayfa numarası (default: 1)
- `limit`: Sayfa başına kayıt (default: 20)
- `search`: Arama terimi (opsiyonel)

**Headers:**
```
Authorization: Bearer <admin_token>
```

#### GET `/api/admin/users/:userId`
Belirli bir kullanıcının detaylarını getirir.

#### PUT `/api/admin/users/:userId/role`
Kullanıcının rolünü günceller.

**Request Body:**
```json
{
  "role": "admin" // veya "user"
}
```

#### DELETE `/api/admin/users/:userId`
Kullanıcıyı siler (kendi hesabını silemez).

### Session Management

#### GET `/api/admin/sessions`
Oyun oturumlarını listeler.

**Query Parameters:**
- `page`: Sayfa numarası (default: 1)
- `limit`: Sayfa başına kayıt (default: 50)

## Güvenlik Özellikleri

### Giriş Denemesi Takibi

Sistem, her kullanıcı adı için son 10 dakikadaki başarısız giriş denemelerini takip eder:

1. **İlk 4 Deneme**: Normal giriş izni, kalan deneme sayısı gösterilir
2. **5. Başarısız Deneme**: Hesap 10 dakika kilitlenir
3. **Kilitleme Süresi**: 10 dakika sonra otomatik olarak açılır
4. **Başarılı Giriş**: Eski başarısız denemeleri temizler

### Veri Modeli

**AdminLoginAttempt Collection:**
```javascript
{
  username: String,      // Giriş yapılmaya çalışılan kullanıcı adı
  ipAddress: String,     // İstek yapan IP adresi
  attemptTime: Date,     // Deneme zamanı (10 dk sonra otomatik silinir)
  success: Boolean       // Başarılı mı?
}
```

### Middleware Koruması

Tüm admin endpoint'leri `adminAuth` middleware ile korunur:

```javascript
// api/middleware/adminAuth.js
- JWT token doğrulama
- Token version kontrolü
- Kullanıcı varlık kontrolü
- Admin rol kontrolü
```

## Frontend Yapısı

### Sayfalar

#### AdminLogin (`/admin`)
- Kullanıcı adı ve şifre ile giriş
- Başarısız deneme sayacı
- Kilitleme durumu göstergesi
- Güvenlik uyarıları

#### AdminDashboard (`/admin/dashboard`)
- **Genel Bakış Sekmesi**: İstatistikler ve grafikler
- **Kullanıcılar Sekmesi**: Kullanıcı yönetimi tablosu
- **Oturumlar Sekmesi**: Oyun oturumları tablosu

### Bileşenler

Admin paneli mevcut UI component'lerini kullanır:
- `Card`, `CardHeader`, `CardContent`
- `Button`, `Input`, `Label`
- Lucide React icons

### State Yönetimi

```javascript
// AdminDashboard.jsx
const [stats, setStats] = useState(null);
const [users, setUsers] = useState([]);
const [sessions, setSessions] = useState([]);
const [activeTab, setActiveTab] = useState('overview');
const [currentPage, setCurrentPage] = useState(1);
const [searchQuery, setSearchQuery] = useState('');
```

## Kullanım Senaryoları

### Senaryo 1: Yeni Admin Oluşturma

```bash
# Terminal'de
cd api
node scripts/createAdmin.js johndoe SecurePass123 john@example.com

# Çıktı:
✓ Yeni admin kullanıcısı oluşturuldu: johndoe

Admin Giriş Bilgileri:
─────────────────────────
Kullanıcı Adı: johndoe
Şifre: SecurePass123
E-posta: john@example.com
─────────────────────────
```

### Senaryo 2: Kullanıcıyı Admin Yapma

1. Admin paneline giriş yap
2. "Kullanıcılar" sekmesine git
3. Kullanıcıyı ara
4. "Admin Yap" butonuna tıkla
5. Onay ver

### Senaryo 3: Kullanıcı Silme

1. Admin paneline giriş yap
2. "Kullanıcılar" sekmesine git
3. Kullanıcıyı bul
4. Çöp kutusu ikonuna tıkla
5. Onay ver
6. Kullanıcı ve tüm oyun oturumları silinir

### Senaryo 4: Başarısız Giriş Denemesi

```
1. Deneme: Hatalı şifre → "Kalan deneme hakkı: 4"
2. Deneme: Hatalı şifre → "Kalan deneme hakkı: 3"
3. Deneme: Hatalı şifre → "Kalan deneme hakkı: 2"
4. Deneme: Hatalı şifre → "Kalan deneme hakkı: 1"
5. Deneme: Hatalı şifre → "Hesap 10 dakika kilitlendi"
```

## Teknik Detaylar

### Database Schema Değişiklikleri

**User Model:**
```javascript
role: {
  type: String,
  enum: ['user', 'admin'],
  default: 'user'
}
```

### Yeni Modeller

**AdminLoginAttempt Model:**
- TTL Index: 10 dakika sonra otomatik silinir
- Compound Index: `username` + `attemptTime` (performans için)

### API Rate Limiting

Admin endpoint'leri global rate limiter'a tabidir:
- 15 dakikada maksimum 1000 istek/IP

### Token Yönetimi

Admin token'ları ayrı saklanır:
- `localStorage.getItem('adminToken')`
- Normal kullanıcı token'ından bağımsız
- Aynı JWT secret kullanır ama farklı storage

## Sorun Giderme

### Problem: Admin paneline erişilemiyor

**Çözüm:**
1. Backend'in çalıştığından emin olun
2. MongoDB bağlantısını kontrol edin
3. Admin kullanıcısının `role: 'admin'` olduğunu doğrulayın

### Problem: 5 denemeden sonra hala giriş yapabiliyor

**Çözüm:**
1. MongoDB'de `adminloginattempts` collection'ını kontrol edin
2. TTL index'in çalıştığından emin olun
3. Server'ı yeniden başlatın

### Problem: Kullanıcı silinemiyor

**Çözüm:**
1. Kendi hesabınızı silmeye çalışıyor olabilirsiniz (yasak)
2. Admin token'ının geçerli olduğunu kontrol edin
3. Console'da hata mesajlarını kontrol edin

## Best Practices

1. **Güçlü Şifreler**: Admin hesapları için en az 12 karakter, karışık karakterler
2. **Düzenli Denetim**: Login attempt loglarını düzenli kontrol edin
3. **Minimum Admin**: Sadece gerekli kişilere admin yetkisi verin
4. **Token Güvenliği**: Admin token'larını güvenli saklayın
5. **HTTPS**: Production'da mutlaka HTTPS kullanın

## Gelecek Geliştirmeler

- [ ] 2FA (Two-Factor Authentication) desteği
- [ ] Detaylı audit log sistemi
- [ ] Kullanıcı aktivite grafikleri
- [ ] Toplu kullanıcı işlemleri
- [ ] E-posta bildirimleri
- [ ] IP bazlı erişim kısıtlamaları
- [ ] Admin aktivite logu
- [ ] Gelişmiş filtreleme ve sıralama

## Lisans

Bu admin paneli Game Tracker projesinin bir parçasıdır ve aynı lisans altındadır.
