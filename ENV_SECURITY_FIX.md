# 🔒 .env Güvenlik Düzeltmesi

## Problem

`.env` dosyası Electron build'ine dahil ediliyordu (`extraResources` ile). Bu, hassas bilgilerin (JWT secret, MongoDB şifresi, email credentials) son kullanıcıya ulaşmasına neden oluyordu.

**Önceki Durum:**
```
release/win-unpacked/resources/.env  ❌ (Hassas bilgiler açıkta!)
```

## Çözüm

### 1. Build Yapılandırması Güncellendi

**package.json:**
```json
{
  "build": {
    "files": [
      "!**/.env",      // ✅ .env dosyalarını hariç tut
      "!**/.env.*"     // ✅ Tüm .env.* dosyalarını hariç tut
    ]
    // "extraResources" kaldırıldı ❌
  }
}
```

### 2. Electron Main Process Güncellendi

**electron/main.js:**
```javascript
// Development: .env dosyasını yükle
if (isDev) {
  require('dotenv').config({ path: '.env' });
}

// Production: Sistem environment variable'larını kullan
else {
  // Varsayılan değerler (fallback)
  if (!process.env.MONGO_URI) {
    process.env.MONGO_URI = 'mongodb://localhost:27017/gametracker';
  }
  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = crypto.randomBytes(64).toString('hex');
  }
}
```

### 3. Güvenlik Kontrol Scripti Eklendi

**scripts/check-build-security.js:**
- Build sonrası otomatik güvenlik kontrolü
- .env dosyasının build'de olup olmadığını kontrol eder
- package.json yapılandırmasını doğrular
- .gitignore kontrolü yapar

**Kullanım:**
```bash
npm run build:desktop
npm run build:check
```

### 4. Dokümantasyon Oluşturuldu

- ✅ `docs/production-deployment.md` - Production deployment rehberi
- ✅ `.env.example` - Örnek environment variables
- ✅ `ENV_SECURITY_FIX.md` - Bu dosya
- ✅ `README.md` - Güvenlik bölümü eklendi

## Değişiklikler

### Dosya Değişiklikleri

| Dosya | Değişiklik | Durum |
|-------|-----------|-------|
| `package.json` | `extraResources` kaldırıldı, `!**/.env` eklendi | ✅ |
| `electron/main.js` | Production'da .env yükleme kaldırıldı | ✅ |
| `.gitignore` | Build artifact'ları eklendi | ✅ |
| `.env.example` | Yeni oluşturuldu | ✅ |
| `scripts/check-build-security.js` | Yeni oluşturuldu | ✅ |
| `docs/production-deployment.md` | Yeni oluşturuldu | ✅ |

### Yeni NPM Scripts

```json
{
  "scripts": {
    "build:check": "node scripts/check-build-security.js"
  }
}
```

## Production Deployment

### Yöntem 1: Sistem Environment Variables (Önerilen)

```powershell
# PowerShell (Admin)
[System.Environment]::SetEnvironmentVariable('MONGO_URI', 'mongodb://localhost:27017/gametracker', 'Machine')
[System.Environment]::SetEnvironmentVariable('JWT_SECRET', 'your-secret-here', 'Machine')
```

### Yöntem 2: Config Dosyası

```javascript
// AppData/Roaming/Game Tracker/config.json
{
  "mongoUri": "mongodb://localhost:27017/gametracker",
  "jwtSecret": "your-secret-here"
}
```

### Yöntem 3: Installer ile

NSIS installer'a environment variable ayarlama ekleyin.

## Test Etme

### 1. Development Test

```bash
# .env dosyası var mı?
ls -la .env

# Uygulama çalışıyor mu?
npm run dev
```

### 2. Build Test

```bash
# Build yap
npm run build:desktop

# Güvenlik kontrolü
npm run build:check

# Manuel kontrol
cd release/win-unpacked/resources
ls -la | grep .env  # Hiçbir sonuç dönmemeli!
```

### 3. Production Test

```bash
# Environment variable'ları ayarla
export MONGO_URI="mongodb://localhost:27017/gametracker"
export JWT_SECRET="test-secret"

# Build'i çalıştır
./release/win-unpacked/Game\ Tracker.exe

# Logları kontrol et
# AppData/Roaming/Game Tracker/logs/
```

## Güvenlik Kontrol Listesi

Build öncesi:
- [ ] `.env` dosyası `.gitignore`'da
- [ ] `.env.example` oluşturuldu
- [ ] `package.json`'da `extraResources` yok
- [ ] `package.json`'da `!**/.env` var

Build sonrası:
- [ ] `npm run build:check` başarılı
- [ ] `release/win-unpacked/resources/` klasöründe `.env` yok
- [ ] `app.asar` içinde `.env` yok
- [ ] Uygulama çalışıyor

Production:
- [ ] Environment variable'lar ayarlandı
- [ ] MongoDB bağlantısı test edildi
- [ ] JWT token'ları çalışıyor
- [ ] Admin paneli erişilebilir

## Önceki Build'leri Temizleme

Eğer önceki build'lerinizde .env varsa:

```bash
# Build klasörünü temizle
rm -rf release/
rm -rf dist/

# Yeniden build yap
npm run build:desktop

# Kontrol et
npm run build:check
```

## Sorun Giderme

### "MongoDB connection failed" (Production)

**Neden:** Environment variable ayarlanmamış

**Çözüm:**
```powershell
[System.Environment]::SetEnvironmentVariable('MONGO_URI', 'mongodb://localhost:27017/gametracker', 'Machine')
```

### "Invalid token" hatası

**Neden:** JWT_SECRET ayarlanmamış veya her build'de değişiyor

**Çözüm:**
```powershell
[System.Environment]::SetEnvironmentVariable('JWT_SECRET', 'sabit-bir-secret', 'Machine')
```

### Build'de hala .env görünüyor

**Çözüm:**
1. Cache'i temizle: `rm -rf release/ dist/`
2. `package.json`'ı kontrol et
3. Yeniden build yap
4. `npm run build:check` çalıştır

## Güvenlik İyileştirmeleri

### Yapıldı ✅

- [x] .env dosyası build'den çıkarıldı
- [x] Production için environment variable sistemi
- [x] Otomatik güvenlik kontrolü
- [x] Detaylı dokümantasyon
- [x] .env.example oluşturuldu
- [x] .gitignore güncellendi

### Gelecek İyileştirmeler 🔮

- [ ] Encrypted config file desteği
- [ ] GUI ile environment variable ayarlama
- [ ] Installer'da environment variable setup
- [ ] Config migration tool
- [ ] Vault integration (HashiCorp Vault, AWS Secrets Manager)

## Önemli Notlar

1. **Development'ta .env kullanılır** - Sorun yok
2. **Production'da .env KULLANILMAZ** - Sistem env var'ları kullanılır
3. **Asla .env'yi commit etmeyin** - .gitignore'da olduğundan emin olun
4. **Her build sonrası kontrol edin** - `npm run build:check`
5. **Production secret'ları güçlü tutun** - En az 64 karakter

## Sonuç

✅ .env dosyası artık build'e dahil edilmiyor
✅ Hassas bilgiler korunuyor
✅ Production deployment güvenli
✅ Otomatik kontrol mekanizması var
✅ Detaylı dokümantasyon mevcut

**Güvenlik seviyesi:** 🔒🔒🔒🔒🔒 (5/5)

---

**Tarih:** 2024
**Versiyon:** 1.2.0
**Durum:** ✅ Tamamlandı
