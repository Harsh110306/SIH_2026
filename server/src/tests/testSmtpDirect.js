require('dotenv').config();
const nodemailer = require('nodemailer');

console.log('Testing SMTP connection with settings:');
console.log('HOST:', process.env.EMAIL_HOST);
console.log('PORT:', process.env.EMAIL_PORT);
console.log('USER:', process.env.EMAIL_USER);
console.log('PASS:', process.env.EMAIL_PASS ? '*** (Pass set)' : 'MISSING');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: false, // port 587 uses STARTTLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

transporter.verify((err, success) => {
  if (err) {
    console.error('❌ Transporter Verify Failed:', err.message);
    process.exit(1);
  } else {
    console.log('✅ Transporter Verify Succeeded! SMTP server is ready to send emails.');
    
    // Attempt sending a real OTP email to nisargshah1109@gmail.com
    transporter.sendMail({
      from: `"Govt Museum AI Platform" <${process.env.EMAIL_USER}>`,
      to: 'nisargshah1109@gmail.com',
      subject: '[Govt Museum Platform] Real Visitor OTP Test',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background: #0b0f19; color: #fff; border-radius: 10px;">
          <h2 style="color: #10b981;">🏛️ Govt Museum & Zoo Platform</h2>
          <p>Your Visitor Login OTP Code is:</p>
          <div style="font-size: 32px; font-weight: bold; color: #34d399; letter-spacing: 6px; padding: 10px 0;">
            ${Math.floor(100000 + Math.random() * 900000)}
          </div>
          <p style="color: #94a3b8; font-size: 12px;">This is a real SMTP delivery test for qualification.</p>
        </div>
      `
    }).then(info => {
      console.log('🎉 Real OTP Email Sent Successfully!');
      console.log('Message ID:', info.messageId);
      console.log('Accepted Recipients:', info.accepted);
      process.exit(0);
    }).catch(sendErr => {
      console.error('❌ SendMail Error:', sendErr.message);
      process.exit(1);
    });
  }
});
