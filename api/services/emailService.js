const nodemailer = require('nodemailer');
const dns = require('dns');

// IPv6 (ENETUNREACH) takılmasını önlemek için DNS önceliği
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

class mailSender {
	constructor() {
        // Şifredeki boşlukları temizleyerek alıyoruz (letf bbif -> letfbbif)
        const cleanPass = process.env.SMTP_PASS ? process.env.SMTP_PASS.replace(/\s+/g, '') : '';
        
		this.transporter = nodemailer.createTransport({
			host: 'smtp.gmail.com',
			port: 465, // Port 465 genellikle bulutlarda daha kararlıdır
			secure: true,
            family: 4, // Kesinlikle IPv4 zorlaması
			auth: {
				user: process.env.SMTP_USER,
				pass: cleanPass
			},
			tls: {
				rejectUnauthorized: false,
                servername: 'smtp.gmail.com'
			}
		});
	}

	async send(targetEmail, { text, html, title }) {
		console.log(`[Mail] Gönderiliyor: ${targetEmail}`);
		
		const mailOptions = {
			from: `"Game Tracker" <${process.env.SMTP_USER}>`,
			to: targetEmail,
			subject: title,
			text: text || '',
			html: html
		};
		
		return new Promise((resolve) => {
			this.transporter.sendMail(mailOptions, (err, data) => {
				if(err) {
					console.error("[Mail Hatası]: ", err.message);
					resolve({ status: false, error: err });
				} else {
					console.log("[Mail Başarılı]");
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
    <div style="font-family: Arial, sans-serif; background: #09090b; color: #fff; padding: 20px; border-radius: 10px; border: 1px solid #333;">
      <h2 style="color: #8b5cf6;">Game Tracker</h2>
      <p>${content}</p>
      <div style="background: #18181b; padding: 20px; border-radius: 8px; text-align: center; font-size: 30px; font-weight: bold; color: #a78bfa; letter-spacing: 5px;">
        ${codeText}
      </div>
    </div>
  `;
};

module.exports = { sendEmail, getEmailTemplate };
