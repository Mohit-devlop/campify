import nodemailer from 'nodemailer';

const hasSmtp = !!(
  process.env.SMTP_HOST &&
  process.env.SMTP_PORT &&
  process.env.SMTP_USER &&
  process.env.SMTP_PASS
);

const transporter = hasSmtp
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  : null;

export async function sendOtpEmail(to: string, otp: string): Promise<void> {
  const subject = 'Verify your Campify Account';
  const html = `
    <div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #eaeaea; border-radius: 8px;">
      <h2 style="color: #000; text-align: center;">Welcome to Campify</h2>
      <p>Please verify your email address by using the OTP code below:</p>
      <div style="font-size: 24px; font-weight: bold; text-align: center; padding: 15px; background-color: #f5f5f7; border-radius: 6px; letter-spacing: 4px; margin: 20px 0;">
        ${otp}
      </div>
      <p style="color: #666; font-size: 14px;">This code is valid for 15 minutes. If you did not request this, you can ignore this email.</p>
    </div>
  `;

  if (transporter) {
    await transporter.sendMail({
      from: `"Campify" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
  } else {
    console.log(`\n==========================================`);
    console.log(`[EMAIL MOCK] To: ${to}`);
    console.log(`[EMAIL MOCK] OTP Verification Code: ${otp}`);
    console.log(`==========================================\n`);
  }
}

export async function sendResetPasswordEmail(to: string, token: string): Promise<void> {
  const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth?tab=reset&token=${token}`;
  const subject = 'Reset your Campify Password';
  const html = `
    <div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #eaeaea; border-radius: 8px;">
      <h2 style="color: #000; text-align: center;">Password Reset Request</h2>
      <p>We received a request to reset your password. Click the button below to proceed:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetLink}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a>
      </div>
      <p>Or copy and paste this link in your browser:</p>
      <p style="word-break: break-all; color: #0071e3;">${resetLink}</p>
      <p style="color: #666; font-size: 14px;">This link is valid for 1 hour. If you did not make this request, please ignore this email.</p>
    </div>
  `;

  if (transporter) {
    await transporter.sendMail({
      from: `"Campify" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
  } else {
    console.log(`\n==========================================`);
    console.log(`[EMAIL MOCK] To: ${to}`);
    console.log(`[EMAIL MOCK] Password Reset Token: ${token}`);
    console.log(`[EMAIL MOCK] Reset Password Link: ${resetLink}`);
    console.log(`==========================================\n`);
  }
}
