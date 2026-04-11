const nodemailer = require('nodemailer');
const dns = require('dns');

class mailSender {
	constructor() {
		this.transporter = null;
        this.gmailUser = process.env.SMTP_USER;
        this.gmailPass = process.env.SMTP_PASS;
	}

    // Gmail'in o anki IPv4 adresini manuel olarak çözen zeki fonksiyon
    async resolveIPv4(host) {
        return new Promise((resolve) => {
            dns.lookup(host, { family: 4 }, (err, address) => {
                if (err) {
                    console.error("[DNS Hatası]: IPv4 çözülemedi, isme geri dönülüyor.");
                    resolve(host); // Hata varsa isme dön (fallback)
                } else {
                    console.log(`[DNS Başarılı]: Gmail IPv4 adresi bulundu: ${address}`);
                    resolve(address);
                }
            });
        });
    }

    async initTransporter() {
        const ipv4Host = await this.resolveIPv4('smtp.gmail.com');
        
        this.transporter = nodemailer.createTransport({
            host: ipv4Host, // İsmi değil, doğrudan çözülen IP'yi kullanıyoruz!
            port: 465,
            secure: true,
            auth: {
                user: this.gmailUser,
                pass: this.gmailPass
            },
            tls: {
                // IP kullandığımız için sertifika ismini manuel belirtiyoruz
                servername: 'smtp.gmail.com',
                rejectUnauthorized: false
            },
            connectionTimeout: 10000
        });
    }

	async send(targetEmail, { text, html, title }) {
        // İlk gönderimde veya her seferinde transporter'ı IPv4 ile tazele
        if (!this.transporter) {
            await this.initTransporter();
        }

		console.log(`[KRİTİK BİLGİ]: Kod şu adrese gönderiliyor: ${targetEmail}`);
		
		const mailOptions = {
			from: `"Game Tracker" <${this.gmailUser}>`,
			to: targetEmail,
			subject: title,
			text,
			html
		};
		
		return new Promise((resolve) => {
			this.transporter.sendMail(mailOptions, (err, data) => {
				if(err) {
					console.error("[Mail Hatası]: ", err.message);
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
      ${codeText ? `
      <div style="background: #18181b; padding: 20px; border-radius: 8px; text-align: center; margin: 25px 0; border: 1px dashed #8b5cf6;">
        <span style="font-size: 34px; font-weight: bold; color: #a78bfa; letter-spacing: 10px;">${codeText}</span>
      </div>
      ` : ''}
    </div>
  `;
};

module.exports = { sendEmail, getEmailTemplate };
