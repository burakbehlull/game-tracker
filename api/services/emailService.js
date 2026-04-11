const nodemailer = require('nodemailer');
const dns = require('dns');

// DNS seviyesinde IPv4 önceliği (Global Fix)
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

/**
 * Lazy-loading Transporter
 * Sunucu her mail atmak istediğinde güncel ENV değerlerini kontrol eder.
 */
const getTransporter = () => {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // Port 465 için true
    family: 4,    // IPv4 Force
    tls: {
      rejectUnauthorized: false,
      minVersion: 'TLSv1.2'
    },
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS?.replace(/\s+/g, '') // Boşlukları otomatik temizle
    },
    connectionTimeout: 10000, // 10 saniye zaman aşımı
    greetingTimeout: 5000,
    socketTimeout: 15000
  });
};

const sendEmail = async (to, subject, htmlContent) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn(`[Mail Simulation] Kimlik bilgileri eksik! Mailler gönderilmeyecek.`);
    return true;
  }

  const transporter = getTransporter();
  
  try {
    console.log(`[EmailService] Gönderim başlatılıyor: ${to}`);
    const info = await transporter.sendMail({
      from: `"Game Tracker" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html: htmlContent
    });
    console.log(`[EmailService] BAŞARILI: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`[EmailService] KRİTİK HATA:`, {
      message: error.message,
      code: error.code,
      command: error.command,
      address: error.address,
      port: error.port
    });
    throw error; // Üst katmana hatayı fırlat ki API bilsin
  }
};

const getEmailTemplate = (title, content, codeText = null) => {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background-color: #09090b; color: #f4f4f5; border-radius: 12px; overflow: hidden; border: 1px solid #27272a;">
      <div style="background: linear-gradient(to right, #8b5cf6, #3b82f6); padding: 24px; text-align: center;">
        <h1 style="margin: 0; color: #ffffff; font-size: 28px;">GAME TRACKER</h1>
      </div>
      <div style="padding: 32px;">
        <h2 style="color: #e4e4e7;">${title}</h2>
        <p style="color: #a1a1aa; line-height: 1.6;">${content}</p>
        ${codeText ? `
        <div style="margin: 32px 0; text-align: center;">
          <div style="background-color: #18181b; border: 2px dashed #8b5cf6; padding: 16px; border-radius: 8px; display: inline-block;">
            <span style="font-size: 32px; font-weight: 700; color: #a78bfa; letter-spacing: 8px;">${codeText}</span>
          </div>
        </div>
        ` : ''}
      </div>
    </div>
  `;
};

module.exports = { sendEmail, getEmailTemplate };
