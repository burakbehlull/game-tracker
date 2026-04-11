const nodemailer = require('nodemailer');

// Kullanıcının "çalışıyor" dediği orijinal sınıf yapısı
class mailSender {
	constructor(){
		this.transporter = nodemailer.createTransport({
			service: 'gmail',
			auth: {
				user: process.env.GMAIL_USER,
				pass: process.env.GMAIL_APP_PASSWORD
			}
		})
	}

	async send(user, { text, html, title }){
		const mailOptions = {
			from: process.env.GMAIL_USER,
			to: user,
			subject: title,
			text: text || '',
			html: html
		}
		
		// Orijinal kodun callback yapısını, asenkron rotalarla uyumlu olması için 
		// bir Promise içinde sarmalıyoruz (böylece await ile beklenebilir).
		return new Promise((resolve) => {
			this.transporter.sendMail(mailOptions, (err, data) => {
				if(err) {
					console.error("[Error / mailSender]: ", err)
					resolve({ 
						status: false, 
						message: 'Mail gönderimi Başarısız',
						error: err
					});
				} else {
					console.log("[Success / mailSender]: Mail gönderildi.");
					resolve({
						status: true, 
						message: 'Mail gönderildi.',
						data: data
					});
				}
			});
		});
	}
}

const mailService = new mailSender();

// Diğer dosyaların (auth.js gibi) kullandığı yardımcı fonksiyonlar
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
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background-color: #09090b; color: #f4f4f5; border-radius: 12px; overflow: hidden; border: 1px solid #27272a; padding: 20px;">
      <h2 style="color: #8b5cf6;">${title}</h2>
      <p>${content}</p>
      ${codeText ? `
        <div style="background: #18181b; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
          <span style="font-size: 30px; font-weight: bold; color: #a78bfa; letter-spacing: 5px;">${codeText}</span>
        </div>
      ` : ''}
    </div>
  `;
};

module.exports = { sendEmail, getEmailTemplate };
