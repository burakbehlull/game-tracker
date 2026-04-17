# Production Deployment Guide

## Environment Variables Güvenliği

### ⚠️ ÖNEMLİ: .env Dosyası Build'e Dahil Edilmez

Güvenlik nedeniyle `.env` dosyası artık Electron build'ine dahil edilmiyor. Bu, hassas bilgilerin (JWT secret, MongoDB URI, email şifreleri) son kullanıcıya ulaşmasını engeller.

## Development vs Production

### Development (Geliştirme)
- `.env` dosyası otomatik olarak yüklenir
- Tüm ayarlar `.env` dosyasından okunur
- Hot reload desteklenir

### Production (Üretim)
- `.env` dosyası **kullanılmaz**
- Environment variable'lar sistem ortamından okunur
- Varsayılan değerler kullanılır (güvenli değil, sadece fallback)

## Production Build Hazırlığı

### 1. Environment Variables Ayarlama

Production ortamında environment variable'ları şu yöntemlerle ayarlayabilirsiniz:

#### Yöntem A: Windows Sistem Environment Variables

```powershell
# PowerShell (Admin olarak çalıştır)
[System.Environment]::SetEnvironmentVariable('MONGO_URI', 'mongodb://localhost:27017/gametracker', 'Machine')
[System.Environment]::SetEnvironmentVariable('JWT_SECRET', 'your-super-secret-key-here', 'Machine')
```

#### Yöntem B: Installer ile Birlikte

NSIS installer'a environment variable ayarlama ekleyebilirsiniz:

```nsis
; installer.nsi
WriteRegStr HKLM "SYSTEM\CurrentControlSet\Control\Session Manager\Environment" "MONGO_URI" "mongodb://localhost:27017/gametracker"
WriteRegStr HKLM "SYSTEM\CurrentControlSet\Control\Session Manager\Environment" "JWT_SECRET" "your-secret-here"
```

#### Yöntem C: Uygulama İçi Config Dosyası

Kullanıcının AppData klasöründe config dosyası oluşturabilirsiniz:

```javascript
// electron/main.js içinde
const configPath = path.join(app.getPath('userData'), 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
process.env.MONGO_URI = config.mongoUri;
process.env.JWT_SECRET = config.jwtSecret;
```

### 2. Güvenli JWT Secret Oluşturma

Production için güçlü bir JWT secret oluşturun:

```bash
# Node.js ile
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Veya OpenSSL ile
openssl rand -hex 64
```

### 3. MongoDB Bağlantısı

Production'da MongoDB bağlantı seçenekleri:

#### Lokal MongoDB
```
MONGO_URI=mongodb://localhost:27017/gametracker
```

#### MongoDB Atlas (Cloud)
```
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/gametracker?retryWrites=true&w=majority
```

#### Docker MongoDB
```
MONGO_URI=mongodb://host.docker.internal:27017/gametracker
```

## Build Süreci

### 1. Development Build Test

```bash
# .env dosyasını kontrol et
cat .env

# Build yap
npm run build:desktop

# Build'i test et
./release/win-unpacked/Game\ Tracker.exe
```

### 2. Production Build

```bash
# Environment variable'ları ayarla (yukarıdaki yöntemlerden birini kullan)

# Build yap
npm run build:desktop

# Installer'ı test et
./release/Game\ Tracker\ Setup\ 1.2.0.exe
```

### 3. Build Doğrulama

Build sonrası kontrol listesi:

- [ ] `release/win-unpacked/resources/` klasöründe `.env` dosyası **YOK**
- [ ] `release/win-unpacked/resources/app.asar` içinde `.env` dosyası **YOK**
- [ ] Uygulama başlatıldığında MongoDB'ye bağlanabiliyor
- [ ] JWT token'ları doğru çalışıyor
- [ ] Admin paneli erişilebilir

### 4. .env Dosyasını Kontrol Etme

Build'de .env olup olmadığını kontrol edin:

```bash
# Windows
cd release/win-unpacked/resources
dir /s /b | findstr ".env"

# Hiçbir sonuç dönmemeli!
```

## Güvenlik Best Practices

### 1. JWT Secret
- ✅ En az 64 karakter
- ✅ Rastgele oluşturulmuş
- ✅ Her ortam için farklı
- ❌ Asla git'e commit etmeyin
- ❌ Asla build'e dahil etmeyin

### 2. MongoDB URI
- ✅ Güçlü şifre kullanın
- ✅ IP whitelist kullanın (Atlas)
- ✅ SSL/TLS kullanın
- ❌ Varsayılan portları kullanmayın
- ❌ Root kullanıcısı kullanmayın

### 3. Email Credentials
- ✅ App-specific password kullanın
- ✅ 2FA aktif olsun
- ❌ Asla gerçek şifrenizi kullanmayın

## Varsayılan Değerler (Fallback)

Eğer environment variable'lar ayarlanmazsa, uygulama şu varsayılan değerleri kullanır:

```javascript
// electron/main.js
if (!process.env.MONGO_URI) {
  process.env.MONGO_URI = 'mongodb://localhost:27017/gametracker';
}

if (!process.env.JWT_SECRET) {
  // Rastgele secret oluşturulur (ÖNERİLMEZ!)
  log.warn('JWT_SECRET not set! Using generated secret');
  process.env.JWT_SECRET = crypto.randomBytes(64).toString('hex');
}
```

⚠️ **UYARI**: Varsayılan değerler sadece fallback içindir. Production'da mutlaka kendi değerlerinizi ayarlayın!

## Sorun Giderme

### Problem: "MongoDB connection failed"

**Çözüm:**
1. MongoDB'nin çalıştığından emin olun
2. `MONGO_URI` environment variable'ının doğru ayarlandığını kontrol edin
3. Firewall ayarlarını kontrol edin

```bash
# MongoDB durumunu kontrol et
net start | findstr MongoDB

# Environment variable'ı kontrol et
echo %MONGO_URI%
```

### Problem: "Invalid token" hatası

**Çözüm:**
1. `JWT_SECRET` environment variable'ının ayarlandığını kontrol edin
2. Her build için aynı secret kullanıldığından emin olun
3. Token'ları temizleyin ve yeniden giriş yapın

```bash
# JWT_SECRET'i kontrol et
echo %JWT_SECRET%
```

### Problem: Build'de .env dosyası görünüyor

**Çözüm:**
1. `package.json` dosyasında `extraResources` bölümünü kaldırın
2. `files` array'ine `"!**/.env"` ekleyin
3. Build cache'i temizleyin:

```bash
# Cache'i temizle
rm -rf release/
rm -rf dist/
npm run build:desktop
```

## Deployment Checklist

Production'a çıkmadan önce:

- [ ] `.env` dosyası `.gitignore`'da
- [ ] `.env.example` dosyası oluşturuldu
- [ ] Production environment variable'ları ayarlandı
- [ ] JWT_SECRET güçlü ve benzersiz
- [ ] MongoDB bağlantısı test edildi
- [ ] Build'de `.env` dosyası yok
- [ ] Admin kullanıcısı oluşturuldu
- [ ] Email servisi yapılandırıldı (opsiyonel)
- [ ] CORS ayarları doğru
- [ ] Rate limiting aktif
- [ ] HTTPS kullanılıyor (web deployment için)

## Örnek Production Setup

### 1. Sistem Environment Variables Ayarla

```powershell
# PowerShell (Admin)
[System.Environment]::SetEnvironmentVariable('MONGO_URI', 'mongodb://localhost:27017/gametracker', 'Machine')
[System.Environment]::SetEnvironmentVariable('JWT_SECRET', 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6', 'Machine')
[System.Environment]::SetEnvironmentVariable('PORT', '3000', 'Machine')
```

### 2. MongoDB Kur ve Başlat

```bash
# MongoDB Community Edition indir ve kur
# https://www.mongodb.com/try/download/community

# Servis olarak başlat
net start MongoDB
```

### 3. Admin Kullanıcısı Oluştur

```bash
# Geliştirme ortamında
cd api
node scripts/createAdmin.js admin SecurePass123! admin@company.com
```

### 4. Build ve Deploy

```bash
# Build yap
npm run build:desktop

# Installer'ı dağıt
# release/Game Tracker Setup 1.2.0.exe
```

## Güvenlik Notları

1. **Asla .env dosyasını commit etmeyin**
2. **Her ortam için farklı secret'lar kullanın**
3. **Production secret'larını güvenli bir yerde saklayın** (password manager, vault)
4. **Düzenli olarak secret'ları rotate edin**
5. **Build artifact'larını güvenli bir yerde saklayın**

## Lisans ve Dağıtım

Production build'i dağıtırken:
- Lisans dosyasını dahil edin
- Kullanım şartlarını belirtin
- Gizlilik politikasını ekleyin
- Destek bilgilerini sağlayın

---

**Son Güncelleme:** 2024
**Versiyon:** 1.2.0
