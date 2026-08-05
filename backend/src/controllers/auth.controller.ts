import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma/client';
import { sendOtpEmail, sendResetPasswordEmail } from '../services/email.service';
import { AuthUser } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'super-refresh-secret-key-change-in-production';

function generateAccessToken(user: AuthUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '15m' });
}

function generateRefreshToken(user: AuthUser): string {
  return jwt.sign(user, JWT_REFRESH_SECRET, { expiresIn: '7d' });
}

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function register(req: Request, res: Response) {
  try {
    const { email, username, password, name } = req.body;

    if (!email || !username || !password) {
      return res.status(400).json({ error: 'Email, username, and password are required' });
    }

    const lowercaseEmail = email.toLowerCase().trim();
    const cleanUsername = username.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: lowercaseEmail }, { username: cleanUsername }],
      },
    });

    if (existingUser) {
      return res.status(409).json({ error: 'Username or email already in use' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Generate OTP
    const otp = generateOtp();
    const otpExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    // Create user and profile
    const user = await prisma.user.create({
      data: {
        email: lowercaseEmail,
        username: cleanUsername,
        passwordHash,
        name: name || null,
        otp,
        otpExpires,
        profile: {
          create: {
            bio: `Hello! I'm ${name || cleanUsername} on Campify.`,
          },
        },
      },
    });

    // Send verification email
    await sendOtpEmail(lowercaseEmail, otp);

    const hasSmtp = !!(
      process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
    );

    return res.status(201).json({
      message: 'Registration successful! Verification OTP sent to email.',
      userId: user.id,
      mockOtp: !hasSmtp ? otp : undefined,
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Internal server error during registration' });
  }
}

export async function verifyOtp(req: Request, res: Response) {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    const lowercaseEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: lowercaseEmail },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.emailVerified) {
      return res.status(400).json({ error: 'Email is already verified' });
    }

    if (!user.otp || !user.otpExpires || user.otp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP code' });
    }

    if (new Date() > user.otpExpires) {
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }

    // Update user status
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        otp: null,
        otpExpires: null,
      },
    });

    return res.status(200).json({ message: 'Email successfully verified. You can now log in.' });
  } catch (error) {
    console.error('OTP verification error:', error);
    return res.status(500).json({ error: 'Internal server error during OTP verification' });
  }
}

export async function resendOtp(req: Request, res: Response) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const lowercaseEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: lowercaseEmail },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.emailVerified) {
      return res.status(400).json({ error: 'Email is already verified' });
    }

    // Generate new OTP
    const otp = generateOtp();
    const otpExpires = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: { otp, otpExpires },
    });

    await sendOtpEmail(lowercaseEmail, otp);

    const hasSmtp = !!(
      process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
    );

    return res.status(200).json({
      message: 'A new verification OTP has been sent to your email.',
      mockOtp: !hasSmtp ? otp : undefined,
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    return res.status(500).json({ error: 'Internal server error while resending OTP' });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { identifier, password } = req.body; // identifier can be email or username

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Username/Email and password are required' });
    }

    const lowercaseId = identifier.toLowerCase().trim();

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: lowercaseId }, { username: lowercaseId }],
      },
      include: {
        profile: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid username/email or password' });
    }

    if (user.status === 'BANNED') {
      return res.status(403).json({ error: 'Access denied: This account has been banned by administrators' });
    }

    if (!user.emailVerified) {
      return res.status(403).json({ error: 'Account not verified. Please verify your email first.', verified: false });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username/email or password' });
    }

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    };

    const accessToken = generateAccessToken(authUser);
    const refreshToken = generateRefreshToken(authUser);

    return res.status(200).json({
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        role: user.role,
        verified: user.verified,
        profile: user.profile,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error during login' });
  }
}

export async function refreshToken(req: Request, res: Response) {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as AuthUser;

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user || user.status === 'BANNED') {
      return res.status(403).json({ error: 'Access token refresh denied' });
    }

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    };

    const newAccessToken = generateAccessToken(authUser);
    const newRefreshToken = generateRefreshToken(authUser);

    return res.status(200).json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
}

export async function googleLogin(req: Request, res: Response) {
  try {
    const { googleToken, email, name, avatarUrl } = req.body;

    if (!googleToken || !email) {
      return res.status(400).json({ error: 'Google OAuth credentials missing' });
    }

    const lowercaseEmail = email.toLowerCase().trim();
    let user = await prisma.user.findUnique({
      where: { email: lowercaseEmail },
      include: { profile: true },
    });

    if (!user) {
      // Create a user for social sign-in automatically
      const generatedUsername = email.split('@')[0] + Math.floor(Math.random() * 1000).toString();
      const randomPassword = Math.random().toString(36).substring(2, 15);
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(randomPassword, salt);

      user = await prisma.user.create({
        data: {
          email: lowercaseEmail,
          username: generatedUsername,
          passwordHash,
          name: name || generatedUsername,
          emailVerified: true,
          profile: {
            create: {
              bio: `Hello! I joined Campify via Google.`,
              avatarUrl: avatarUrl || null,
            },
          },
        },
        include: { profile: true },
      });
    }

    if (user.status === 'BANNED') {
      return res.status(403).json({ error: 'This account has been banned' });
    }

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    };

    const accessToken = generateAccessToken(authUser);
    const refreshToken = generateRefreshToken(authUser);

    return res.status(200).json({
      message: 'Google login successful',
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        role: user.role,
        verified: user.verified,
        profile: user.profile,
      },
    });
  } catch (error) {
    console.error('Google login error:', error);
    return res.status(500).json({ error: 'Internal server error during Google login' });
  }
}

export async function forgotPassword(req: Request, res: Response) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const lowercaseEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: lowercaseEmail },
    });

    if (!user) {
      // Return success response to prevent email harvesting/enumeration
      return res.status(200).json({ message: 'If the email exists, a password reset link has been sent.' });
    }

    // Create unique token
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1h' });

    // Save temporary token directly into user otp field (or use a dedicated table, otpExpires as expiry)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        otp: token,
        otpExpires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    await sendResetPasswordEmail(lowercaseEmail, token);

    const hasSmtp = !!(
      process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
    );
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth?tab=reset&token=${token}`;

    return res.status(200).json({
      message: 'If the email exists, a password reset link has been sent.',
      mockResetLink: !hasSmtp ? resetLink : undefined,
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function resetPassword(req: Request, res: Response) {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user || user.otp !== token || !user.otpExpires || new Date() > user.otpExpires) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        otp: null,
        otpExpires: null,
      },
    });

    return res.status(200).json({ message: 'Password reset successful. You can now log in.' });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function changePassword(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { currentPassword, newPassword } = req.body;

    if (!userId || !currentPassword || !newPassword) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid current password' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return res.status(200).json({ message: 'Password changed successfully.' });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function sendOtp(req: Request, res: Response) {
  try {
    const { email, password, username, name, flow } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const lowercaseEmail = email.toLowerCase().trim();

    // Basic email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(lowercaseEmail)) {
      return res.status(400).json({ error: 'Invalid email address format' });
    }

    const activeFlow = flow || 'login';

    if (activeFlow === 'register') {
      if (!username) {
        return res.status(400).json({ error: 'Username is required for registration' });
      }
      const cleanUsername = username.toLowerCase().trim();
      if (cleanUsername.length < 3) {
        return res.status(400).json({ error: 'Username must be at least 3 characters long' });
      }

      if (!password) {
        return res.status(400).json({ error: 'Password is required' });
      }
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long' });
      }

      // Check if username/email is already in use
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [{ email: lowercaseEmail }, { username: cleanUsername }],
        },
      });

      if (existingUser) {
        if (existingUser.emailVerified) {
          return res.status(409).json({ error: 'Username or email already in use' });
        } else {
          // Clean up the unverified user registration to avoid duplicate key conflicts
          await prisma.user.delete({
            where: { id: existingUser.id },
          });
        }
      }

      // Create unverified user profile with password hash
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      await prisma.user.create({
        data: {
          email: lowercaseEmail,
          username: cleanUsername,
          passwordHash,
          name: name || cleanUsername,
          emailVerified: false,
          verified: false,
          profile: {
            create: {
              bio: `Hello! I'm ${name || cleanUsername} on Campify.`,
            },
          },
        },
      });
    } else {
      // Flow is 'login': check if verified user exists and password is correct
      if (!password) {
        return res.status(400).json({ error: 'Password is required' });
      }

      const existingUser = await prisma.user.findUnique({
        where: { email: lowercaseEmail },
      });

      if (!existingUser) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const isMatch = await bcrypt.compare(password, existingUser.passwordHash);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
    }

    // Rate Limiting: Max 1 OTP per minute
    const existingVerif = await prisma.otpVerification.findUnique({
      where: { email: lowercaseEmail },
    });

    if (existingVerif && Date.now() - new Date(existingVerif.lastSentAt).getTime() < 60 * 1000) {
      return res.status(429).json({ error: 'Please wait 1 minute before requesting another OTP.' });
    }

    // Generate secure 6-digit random OTP
    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry

    // Save/Upsert OTP verification record
    await prisma.otpVerification.upsert({
      where: { email: lowercaseEmail },
      update: {
        otpHash,
        expiresAt,
        attempts: 0,
        verified: false,
        lastSentAt: new Date(),
      },
      create: {
        email: lowercaseEmail,
        otpHash,
        expiresAt,
        attempts: 0,
        verified: false,
        lastSentAt: new Date(),
      },
    });

    // Send OTP via Resend / NodeMailer / Console
    await sendOtpEmail(lowercaseEmail, otp);

    const hasResend = !!(process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 'mock');
    const hasSmtp = !!(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS);

    return res.status(200).json({
      message: 'OTP verification code sent successfully',
      email: lowercaseEmail,
      mockOtp: (!hasResend && !hasSmtp) ? otp : undefined,
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    return res.status(500).json({ error: 'Internal server error while sending OTP' });
  }
}

export async function verifyOtpNew(req: Request, res: Response) {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP code are required' });
    }

    const lowercaseEmail = email.toLowerCase().trim();

    // Find the OTP verification record
    const verif = await prisma.otpVerification.findUnique({
      where: { email: lowercaseEmail },
    });

    if (!verif) {
      return res.status(404).json({ error: 'No OTP request found for this email.' });
    }

    // Check expiry (5 minutes)
    if (new Date() > new Date(verif.expiresAt)) {
      return res.status(400).json({ error: 'OTP code has expired. Please request a new one.' });
    }

    // Check attempts (max 3 attempts)
    if (verif.attempts >= 3) {
      return res.status(400).json({ error: 'Maximum verification attempts exceeded. Please request a new OTP.' });
    }

    // Increment attempt count
    await prisma.otpVerification.update({
      where: { email: lowercaseEmail },
      data: { attempts: { increment: 1 } },
    });

    // Check match
    const isMatch = await bcrypt.compare(otp, verif.otpHash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid OTP code. Please try again.' });
    }

    // Mark as verified and reset attempts (prevent OTP reuse)
    await prisma.otpVerification.update({
      where: { email: lowercaseEmail },
      data: {
        verified: true,
        otpHash: 'invalidated', // prevent reuse
      },
    });

    // Find User
    let user = await prisma.user.findUnique({
      where: { email: lowercaseEmail },
      include: { profile: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User registration not found. Please register again.' });
    }

    // Verify user account
    if (!user.emailVerified) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          verified: true,
        },
        include: { profile: true },
      });
    }

    if (user.status === 'BANNED') {
      return res.status(403).json({ error: 'Access denied: This account has been banned by administrators' });
    }

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    };

    const accessToken = generateAccessToken(authUser);
    const refreshToken = generateRefreshToken(authUser);

    return res.status(200).json({
      message: 'Authentication successful',
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        role: user.role,
        verified: user.verified,
        profile: user.profile,
      },
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return res.status(500).json({ error: 'Internal server error during verification' });
  }
}
