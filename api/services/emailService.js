const nodemailer = require('nodemailer');
const dns = require('dns');

class mailSender {
	constructor() {
		// En sade ve esnek Gmail ayarları (Port 587 / STARTTLS)
		this.transporter = nodemailer.createTransport({
			host: 'smtp.gmail.com',
			port: 587,
			secure: false, // Port 587 için false olmalı
			auth: {
				user: process.env.SMTP_USER,
				pass: process.env.SMTP_PASS
			},
			tls: {
				rejectUnauthorized: false
			}
		});
	}

	async send(targetEmail, { text, html, title }) {
		console.log(`[Mail] Gönderiliyor: ${targetEmail}`);
		
		const mailOptions = {
			from: process.env.SMTP_USER,
			to: targetEmail,
			subject: title,
			text: text || 'Game Tracker Doğrulama Kodu',
			html: html
		};
		
		return new Promise((resolve) => {
			this.transporter.sendMail(mailOptions, (err, data) => {
				if(err) {
					console.error("[Mail Hatası]: ", err.message);
					resolve({ status: false, error: err });
				} else {
					console.log("[Mail Başarılı] :)");
					resolve({ status: true, data: data });
				}
			});
		});
	}
}

const mailService = new mailSender();

const sendEmail = async (to, subject, htmlContent) => {
  return await mailService.send(to, { title: subject, html: htmlContent });
};

// İstediğin gibi çok sade bir şablon
const getEmailTemplate = (title, content, codeText = null) => {
  return `
    <div style="font-family: sans-serif; color: #333; line-height: 1.6;">
      <h2 style="color: #6633ee;">Game Tracker</h2>
      <p>${content}</p>
      ${codeText ? `
        <div style="background: #f4f4f4; padding: 15px; border: 1px solid #ddd; font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 5px;">
          ${codeText}
        </div>
      ` : ''}
      <p style="font-size: 12px; color: #999; margin-top: 20px;">
        Bu e-posta doğrulama amacıyla gönderilmiştir.
      </p>
    </div>
  `;
};

module.exports = { sendEmail, getEmailTemplate };
