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
    <div style="font-family: 'Outfit', 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #0F172A; padding: 40px; color: #F8FAFC; text-align: center; border-radius: 24px; max-width: 500px; margin: 0 auto; border: 1px solid rgba(255, 255, 255, 0.05);">
      <div style="margin-bottom: 24px;">
        <div style="display: inline-block; padding: 12px; background: linear-gradient(135deg, #8B5CF6, #10B981); border-radius: 16px; box-shadow: 0 8px 16px rgba(139, 92, 246, 0.2);">
          <span style="font-size: 24px; color: #000;">⚡</span>
        </div>
        <h2 style="color: #FFFFFF; font-weight: 800; font-size: 24px; margin-top: 16px; margin-bottom: 4px; letter-spacing: 0.5px;">CAMPIFY</h2>
        <p style="color: #64748B; font-size: 11px; text-transform: uppercase; font-weight: 700; letter-spacing: 1.5px; margin: 0;">Student Portal Access</p>
      </div>
      
      <div style="background-color: #1E293B; border-radius: 20px; padding: 32px; border: 1px solid rgba(255, 255, 255, 0.03); margin-bottom: 24px;">
        <p style="color: #94A3B8; font-size: 13px; margin-top: 0; margin-bottom: 20px; font-weight: 500;">Use the following one-time passcode to sign in or register your account:</p>
        <div style="font-size: 36px; font-weight: 800; color: #10B981; letter-spacing: 6px; background-color: #0F172A; padding: 16px; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.05); display: inline-block; width: 80%; margin: 0 auto;">
          ${otp}
        </div>
        <p style="color: #64748B; font-size: 11px; margin-top: 20px; margin-bottom: 0;">This passcode expires in <strong style="color: #8B5CF6;">5 minutes</strong>.</p>
      </div>
      
      <p style="color: #475569; font-size: 11px; line-height: 1.6; margin: 0 16px;">If you didn't request this verification code, you can safely ignore this email. Someone else may have entered your email address by mistake.</p>
    </div>
  `;

  // Resend integration
  const resendApiKey = process.env.RESEND_API_KEY || '';
  if (resendApiKey && resendApiKey !== 'mock') {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Campify <onboarding@resend.dev>', // Resend verified sandbox sender
          to: [to],
          subject: subject,
          html: html,
        }),
      });

      if (response.ok) {
        console.log(`[PWA] Email sent successfully via Resend API to ${to}`);
        return;
      } else {
        const errorData = await response.text();
        console.error('[PWA] Resend API failed:', errorData);
      }
    } catch (err) {
      console.error('[PWA] Error calling Resend API:', err);
    }
  }

  // Fallback to SMTP if configured
  if (transporter) {
    try {
      await transporter.sendMail({
        from: `"Campify" <${process.env.SMTP_USER}>`,
        to,
        subject,
        html,
      });
      return;
    } catch (smtpErr) {
      console.error('[PWA] SMTP failed:', smtpErr);
    }
  }

  console.log(`\n==========================================`);
  console.log(`[EMAIL MOCK] To: ${to}`);
  console.log(`[EMAIL MOCK] OTP Verification Code: ${otp}`);
  console.log(`==========================================\n`);
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
