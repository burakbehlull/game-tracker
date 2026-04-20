/**
 * Admin kullanıcısı oluşturma scripti
 * Kullanım: node api/scripts/createAdmin.js <username> <password> <email>
 * Örnek: node api/scripts/createAdmin.js admin admin123 admin@gametracker.com
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const createAdmin = async (username, password, email) => {
  try {
    // MongoDB'ye bağlan
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/gametracker';
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB bağlantısı başarılı');

    // Kullanıcı zaten var mı kontrol et
    const existingUser = await User.findOne({ 
      $or: [{ username }, { email }] 
    });

    if (existingUser) {
      if (existingUser.roles && existingUser.roles.includes('admin')) {
        console.log(`✓ ${username} zaten admin rolüne sahip`);
      } else {
        // Mevcut kullanıcıyı admin yap
        if (!existingUser.roles) existingUser.roles = ['user'];
        if (!existingUser.roles.includes('admin')) {
          existingUser.roles.push('admin');
        }
        await existingUser.save();
        console.log(`✓ ${username} kullanıcısı admin rolüne yükseltildi`);
      }
    } else {
      // Yeni admin kullanıcısı oluştur
      const admin = new User({
        username,
        password,
        email,
        roles: ['user', 'admin'],
        isVerified: true
      });
      await admin.save();
      console.log(`✓ Yeni admin kullanıcısı oluşturuldu: ${username}`);
    }

    console.log('\nAdmin Giriş Bilgileri:');
    console.log('─────────────────────────');
    console.log(`Kullanıcı Adı: ${username}`);
    console.log(`Şifre: ${password}`);
    console.log(`E-posta: ${email}`);
    console.log('─────────────────────────');
    console.log('\nAdmin paneline erişmek için: http://localhost:5173/#/admin');

    process.exit(0);
  } catch (error) {
    console.error('Hata:', error.message);
    process.exit(1);
  }
};

// Komut satırı argümanlarını al
const args = process.argv.slice(2);

if (args.length < 3) {
  console.log('Kullanım: node api/scripts/createAdmin.js <username> <password> <email>');
  console.log('Örnek: node api/scripts/createAdmin.js admin admin123 admin@gametracker.com');
  process.exit(1);
}

const [username, password, email] = args;

// Validasyon
if (username.length < 3 || username.length > 20) {
  console.error('Hata: Kullanıcı adı 3-20 karakter arasında olmalıdır');
  process.exit(1);
}

if (password.length < 6) {
  console.error('Hata: Şifre en az 6 karakter olmalıdır');
  process.exit(1);
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  console.error('Hata: Geçerli bir e-posta adresi giriniz');
  process.exit(1);
}

createAdmin(username, password, email);
