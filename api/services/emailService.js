const nodemailer = require('nodemailer');

class mailSender {
	constructor() {
		this.transporter = nodemailer.createTransport({
			// 'service: gmail' yerine doğrudan host ayarlarını kullanıyoruz 
            // Bu, Render sunucusunun mail atarken takılmasını (ENETUNREACH) çözen tek yoldur.
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            family: 4, // Kesinlikle IPv4 zorlaması
			auth: {
				user: process.env.SMTP_USER,
				pass: process.env.SMTP_PASS
			},
            connectionTimeout: 10000 
		});
	}

	async send(targetEmail, { text, html, title }) {
		const mailOptions = {
			from: `"Game Tracker" <${process.env.SMTP_USER}>`,
			to: targetEmail,
			subject: title,
			text,
			html
		};
		
		return new Promise((resolve) => {
			this.transporter.sendMail(mailOptions, (err, data) => {
				if(err) {
					console.error("[Mail Hatası - Render'da IPv6 sorunu olabilir]: ", err.message);
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
    <div style="font-family: Arial, sans-serif; background: #09090b; color: #fff; padding: 30px; border-radius: 12px; border: 1px solid #27272a;">
      <h1 style="color: #8b5cf6;">GAMETRACKER</h1>
      <h3>${title}</h3>
      <p style="color: #a1a1aa;">${content}</p>
      <div style="background: #18181b; padding: 20px; border-radius: 8px; text-align: center; margin: 25px 0; border: 1px dashed #8b5cf6;">
        <span style="font-size: 34px; font-weight: bold; color: #a78bfa; letter-spacing: 10px;">${codeText}</span>
      </div>
    </div>
  `;
};

module.exports = { sendEmail, getEmailTemplate };
