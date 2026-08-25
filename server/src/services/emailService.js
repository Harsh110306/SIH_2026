const nodemailer = require('nodemailer');
const config = require('../config/env');

class EmailService {
  constructor() {
    this.isConfigured = Boolean(
      config.email.user && 
      config.email.pass && 
      !config.email.user.includes('placeholder')
    );

    if (this.isConfigured) {
      this.transporter = nodemailer.createTransport({
        host: config.email.host,
        port: config.email.port,
        secure: config.email.port === 465,
        auth: {
          user: config.email.user,
          pass: config.email.pass
        }
      });
    } else {
      this.transporter = null;
    }
  }

  getStatus() {
    return {
      service: 'Email & OTP Transporter',
      configured: this.isConfigured,
      host: config.email.host,
      status: this.isConfigured ? 'SMTP Active' : 'Console Fallback (Development)'
    };
  }

  /**
   * Sends a styled OTP email to the visitor
   */
  async sendOTPEmail(toEmail, otpCode, ttlMinutes = 10) {
    const subject = `[Govt Museum & Zoo Platform] Your Login OTP Code: ${otpCode}`;
    const html = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background: #0b0f19; color: #f8fafc; border-radius: 12px; border: 1px solid #10b981;">
        <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.1);">
          <h2 style="color: #10b981; margin: 0;">🏛️ Govt Museum & Zoo Platform</h2>
          <p style="color: #94a3b8; font-size: 14px; margin-top: 4px;">Visitor Assistance, Ticketing & Complaint Management</p>
        </div>
        
        <div style="padding: 24px 0; text-align: center;">
          <p style="color: #e2e8f0; font-size: 16px; margin-bottom: 20px;">Use the verification code below to log in or complete your registration:</p>
          <div style="background: rgba(16, 185, 129, 0.15); border: 2px dashed #10b981; border-radius: 12px; padding: 18px; display: inline-block; letter-spacing: 6px; font-size: 32px; font-weight: 800; color: #34d399;">
            ${otpCode}
          </div>
          <p style="color: #94a3b8; font-size: 13px; margin-top: 20px;">This code is valid for <strong>${ttlMinutes} minutes</strong> and can only be used once.</p>
        </div>

        <div style="padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 12px; color: #64748b; text-align: center;">
          <p>If you did not request this OTP, please ignore this email.</p>
          <p>© 2026 Government Museum & Zoo Platform. All rights reserved.</p>
        </div>
      </div>
    `;

    if (this.isConfigured && this.transporter) {
      try {
        await this.transporter.sendMail({
          from: `"Govt Museum AI Platform" <${config.email.user}>`,
          to: toEmail,
          subject,
          html
        });
        console.log(`[EmailService] OTP Email sent to ${toEmail} via SMTP`);
        return true;
      } catch (err) {
        console.error(`[EmailService Error] Failed to send SMTP email: ${err.message}`);
      }
    }

    // Development Console Fallback
    console.log(`\n========================================================`);
    console.log(`📧 [DEV OTP SIMULATOR] Sent to: ${toEmail}`);
    console.log(`🔑 OTP Code: ${otpCode} (Expires in ${ttlMinutes}m)`);
    console.log(`========================================================\n`);
    return true;
  }

  /**
   * Sends a styled Ticket Booking Confirmation email
   */
  async sendBookingConfirmationEmail({ email, name, bookingNumber, museumName, visitDate, totalAmount }) {
    const subject = `[Govt Museum] Booking Confirmed: ${bookingNumber} - ${museumName}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #0f172a; color: #f8fafc; border-radius: 12px; border: 1px solid #10b981;">
        <h2 style="color: #10b981; margin: 0;">🎟️ Museum Ticket Confirmation</h2>
        <p style="color: #cbd5e1;">Dear ${name}, your booking has been successfully confirmed!</p>
        <div style="background: rgba(255,255,255,0.05); padding: 16px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 4px 0;"><strong>Booking Number:</strong> ${bookingNumber}</p>
          <p style="margin: 4px 0;"><strong>Museum:</strong> ${museumName}</p>
          <p style="margin: 4px 0;"><strong>Visit Date:</strong> ${visitDate}</p>
          <p style="margin: 4px 0;"><strong>Total Paid:</strong> ₹${totalAmount}</p>
          <p style="margin: 4px 0;"><strong>Status:</strong> CONFIRMED</p>
        </div>
        <p style="color: #94a3b8; font-size: 13px;">Please present this booking confirmation upon arrival. Enjoy your visit!</p>
      </div>
    `;

    if (this.isConfigured && this.transporter) {
      try {
        await this.transporter.sendMail({
          from: `"Govt Museum AI Platform" <${config.email.user}>`,
          to: email,
          subject,
          html
        });
        console.log(`[EmailService] Booking Confirmation Email sent to ${email} via SMTP`);
        return true;
      } catch (err) {
        console.error(`[EmailService Error] Failed to send SMTP confirmation email: ${err.message}`);
      }
    }

    console.log(`\n========================================================`);
    console.log(`📧 [DEV EMAIL SIMULATOR] Booking Confirmation Sent to: ${email}`);
    console.log(`🎟️ Booking Number: ${bookingNumber} | Museum: ${museumName} | Amount: ₹${totalAmount}`);
    console.log(`========================================================\n`);
    return true;
  }
}

module.exports = new EmailService();
