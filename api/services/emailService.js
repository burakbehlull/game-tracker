const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const sendEmail = async (to, subject, htmlContent) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn(`[Mail Simulation] Gönderici ayarları yok. E-posta simulasyonu:`);
    console.warn(`To: ${to}\nSubject: ${subject}\n\n`);
    return true;
  }

  try {
    const info = await transporter.sendMail({
      from: `"Game Tracker" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html: htmlContent
    });
    return info;
  } catch (error) {
    console.error('[Email Error]', error);
    throw new Error('E-posta gönderilemedi.');
  }
};

const getEmailTemplate = (title, content, codeText = null) => {
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #09090b; color: #f4f4f5; border-radius: 12px; overflow: hidden; border: 1px solid #27272a;">
      <div style="background: linear-gradient(to right, #8b5cf6, #3b82f6); padding: 24px; text-align: center;">
        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 900; letter-spacing: 2px;">GAME TRACKER</h1>
      </div>
      <div style="padding: 32px;">
        <h2 style="color: #e4e4e7; margin-top: 0;">${title}</h2>
        <p style="color: #a1a1aa; line-height: 1.6; font-size: 16px;">
          ${content}
        </p>
        ${codeText ? `
        <div style="margin: 32px 0; text-align: center;">
          <div style="background-color: #18181b; border: 2px dashed #8b5cf6; padding: 16px; border-radius: 8px; display: inline-block;">
            <span style="font-size: 32px; font-weight: 700; color: #a78bfa; letter-spacing: 8px;">${codeText}</span>
          </div>
        </div>
        ` : ''}
        <p style="color: #71717a; font-size: 14px; margin-top: 32px; border-top: 1px solid #27272a; padding-top: 16px;">
          Eğer bu işlemi siz yapmadıysanız lütfen bu e-postayı dikkate almayınız.
        </p>
      </div>
    </div>
  `;
};

module.exports = {
  sendEmail,
  getEmailTemplate
};
