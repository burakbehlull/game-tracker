const nodemailer = require('nodemailer');

class mailSender {
	constructor() {
		this.transporter = nodemailer.createTransport({
			service: 'gmail',
			auth: {
				user: process.env.SMTP_USER,
				pass: process.env.SMTP_PASS
			}
		});
	}

	async send(targetEmail, { text, html, title }) {
		console.log(`[KRİTİK BİLGİ]: Kod şu adrese gönderiliyor: ${targetEmail}`); // <--- Burada göreceğiz
		
		const mailOptions = {
			from: `"Game Tracker" <${process.env.GMAIL_USER || process.env.SMTP_USER}>`,
			to: targetEmail,
			subject: title,
			text,
			html
		};
		
		return new Promise((resolve) => {
			this.transporter.sendMail(mailOptions, (err, data) => {
				if(err) {
					console.error("[Mail Hatası]: ", err);
					resolve({ status: false, error: err });
				} else {
					console.log("[Mail Başarılı]: Kod gönderildi.");
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

const getEmailTemplate = (title, content, codeText = null) => {
  return `
    <div style="font-family: Arial, sans-serif; padding: 20px; background: #09090b; color: #fff; border-radius: 10px;">
      <h1 style="color: #8b5cf6;">GAME TRACKER</h1>
      <h3>${title}</h3>
      <p>${content}</p>
      <div style="background: #18181b; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0;">
        <span style="font-size: 30px; font-weight: bold; color: #a78bfa; letter-spacing: 5px;">${codeText}</span>
      </div>
    </div>
  `;
};

module.exports = { sendEmail, getEmailTemplate };
