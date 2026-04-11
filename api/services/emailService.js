const nodemailer = require('nodemailer');
const dns = require('dns');

// Render.com IPv6 bug fix
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

class mailSender {
	constructor() {
		// Transporter'ı senin istediğin yapıda ama bulut sunucuda en kararlı çalışan ayarlarla kuruyoruz
		this.transporter = nodemailer.createTransport({
			host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            family: 4, // Zorla IPv4 (ENETUNREACH hatasını bitirir)
			auth: {
				user: process.env.SMTP_USER,
				pass: process.env.SMTP_PASS
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
		
		return new Promise((resolve) => {
            this.transporter.sendMail(mailOptions, (err, data) => {
                if (err) {
                    console.error("[Error / mailSender]: ", err);
                    resolve({ status: false, message: 'Mail gönderimi Başarısız', error: err });
                } else {
                    console.log("[Success / mailSender]: Mail gönderildi.");
                    resolve({ status: true, message: 'Mail gönderildi.', data: data });
                }
            });
        });
	}
}

const mailService = new mailSender();

const sendEmail = async (to, subject, htmlContent) => {
  const result = await mailService.send(to, { title: subject, html: htmlContent });
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
