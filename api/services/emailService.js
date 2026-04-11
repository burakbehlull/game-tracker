const nodemailer = require('nodemailer');
const dns = require('dns');

// Render.com'un IPv6 (ENETUNREACH) hatası vermemesi için IPv4 önceliğini koruyoruz.
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

class mailSender {
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER, // Senin Render'daki SMTP_USER değişkenin
        pass: process.env.SMTP_PASS  // Senin Render'daki SMTP_PASS değişkenin
      }
    });
  }

  async send(user, { text, html, title }) {
    const mailOptions = {
      from: `"Game Tracker" <${process.env.SMTP_USER}>`,
      to: user,
      subject: title,
      text: text || '',
      html: html
    };

    try {
      // Nodemailer sendMail fonksiyonunu Promise dönmesi için await ile kullanıyoruz
      const data = await this.transporter.sendMail(mailOptions);
      console.log("[Success / mailSender]: Mail gönderildi.");
      return {
        status: true,
        message: 'Mail gönderildi.',
        data: data
      };
    } catch (err) {
      console.error("[Error / mailSender]: ", err);
      return {
        status: false,
        message: 'Mail gönderimi Başarısız',
        error: err
      };
    }
  }
}

// Servisimizi başlatalım
const mailService = new mailSender();

/**
 * Mevcut auth.js uyumluluğu için kilit fonksiyonlar
 */
const sendEmail = async (to, subject, htmlContent) => {
  const result = await mailService.send(to, {
    title: subject,
    html: htmlContent
  });
  
  if (!result.status) {
    throw new Error(result.message);
  }
  return result;
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
