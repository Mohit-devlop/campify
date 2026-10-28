'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '../../store/authStore';
import { apiFetch } from '../../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Mail, Lock, User, AtSign, Loader2, CheckCircle2,
  ArrowLeft, ShieldCheck, KeyRound
} from 'lucide-react';
import SpaceBackground from '../../components/SpaceBackground';

type Tab = 'login' | 'register' | 'otp';

function AuthPageContent() {
  const router = useRouter();
  const { setAuth, isAuthenticated, isInitialized } = useAuthStore();

  const [activeTab, setActiveTab] = useState<Tab>('login');
  const [lastTab, setLastTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [otpValues, setOtpValues] = useState<string[]>(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // Password strength logic
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: '', color: 'bg-neutral-800' };
    let score = 0;
    if (pass.length > 5) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    if (score <= 1) return { score, label: 'Weak', color: 'bg-red-500' };
    if (score === 2) return { score, label: 'Fair', color: 'bg-yellow-500' };
    if (score === 3) return { score, label: 'Good', color: 'bg-blue-500' };
    return { score, label: 'Strong', color: 'bg-green-500' };
  };

  const strength = getPasswordStrength(password);

  // Request native OS notification permissions on page load
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (!isInitialized) return;
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, isInitialized, router]);

  // Resend timer countdown
  useEffect(() => {
    if (activeTab !== 'otp') return;
    if (resendTimer === 0) {
      setCanResend(true);
      return;
    }
    const timer = setTimeout(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [resendTimer, activeTab]);

  // Reset alerts on tab change (excluding transitioning to otp)
  useEffect(() => {
    if (activeTab !== 'otp') {
      setError('');
      setSuccessMsg('');
    }
  }, [activeTab]);

  // Auto-submit OTP when all 6 fields are completed
  useEffect(() => {
    const fullOtp = otpValues.join('');
    if (fullOtp.length === 6 && activeTab === 'otp') {
      handleSubmitOtp(fullOtp);
    }
  }, [otpValues, activeTab]);

  // Helper to show device native push notification
  const showDeviceNotification = (otpCode: string) => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('KILOGRAM Verification Code', {
          body: `Your 6-digit verification code is ${otpCode}.`,
          icon: '/icons/icon-192x192.png',
        } as any);
      } catch (err) {
        console.error('Failed to show push notification:', err);
      }
    }
  };

  // Send OTP flow for both Login and Registration
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email or username');
      return;
    }

    if (!password.trim()) {
      setError('Please enter your password');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccessMsg('');

    const targetFlow = activeTab === 'otp' ? lastTab : activeTab;

    try {
      const res = await apiFetch('/auth/otp/send', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim(),
          password,
          username: targetFlow === 'register' ? username.trim() : undefined,
          name: targetFlow === 'register' ? name.trim() : undefined,
          flow: targetFlow,
        }),
      });
      const data = await res.json();

      if (res.ok) {
        if (targetFlow === 'register') {
          setLastTab('register');
        } else {
          setLastTab('login');
        }

        if (data.mockOtp) {
          setSuccessMsg(`OTP sent successfully! (Local Dev Mock) Code: ${data.mockOtp}`);
          showDeviceNotification(data.mockOtp);
          const mockArray = data.mockOtp.split('');
          setOtpValues(mockArray);
        } else {
          setSuccessMsg('A secure 6-digit OTP code has been sent to your email inbox.');
        }
        setActiveTab('otp');
        setResendTimer(60);
        setCanResend(false);
      } else {
        setError(data.error || 'Failed to send OTP. Please check your credentials.');
      }
    } catch (err) {
      console.error(err);
      setError('A network error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Verify 6-digit OTP and complete login
  const handleSubmitOtp = async (otpCode: string) => {
    if (!otpCode || otpCode.length !== 6) {
      setError('Please enter all 6 digits of the OTP code.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const res = await apiFetch('/auth/otp/verify', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), otp: otpCode }),
      });
      const data = await res.json();

      if (res.ok) {
        setSuccessMsg('Authentication successful! Connecting dashboard...');
        setAuth(data.user, data.accessToken, data.refreshToken);
        router.push('/');
      } else {
        setError(data.error || 'Invalid OTP code. Please try again.');
        setOtpValues(['', '', '', '', '', '']);
        const firstInput = document.getElementById('otp-0');
        if (firstInput) firstInput.focus();
      }
    } catch (err) {
      console.error(err);
      setError('A network error occurred during verification.');
    } finally {
      setIsLoading(false);
    }
  };

  // OTP input handlers
  const handleOtpChange = (val: string, index: number) => {
    const sanitized = val.replace(/[^0-9]/g, '');
    const newOtpValues = [...otpValues];
    newOtpValues[index] = sanitized.slice(-1);
    setOtpValues(newOtpValues);

    if (sanitized && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleOtpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace') {
      const newOtpValues = [...otpValues];
      if (!newOtpValues[index] && index > 0) {
        newOtpValues[index - 1] = '';
        setOtpValues(newOtpValues);
        const prevInput = document.getElementById(`otp-${index - 1}`);
        if (prevInput) prevInput.focus();
      } else {
        newOtpValues[index] = '';
        setOtpValues(newOtpValues);
      }
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
    const newOtpValues = [...otpValues];
    for (let i = 0; i < pastedData.length; i++) {
      newOtpValues[i] = pastedData[i];
    }
    setOtpValues(newOtpValues);

    const focusIndex = Math.min(pastedData.length, 5);
    const nextInput = document.getElementById(`otp-${focusIndex}`);
    if (nextInput) nextInput.focus();
  };

  // Google OAuth demo login
  const simulateGoogleLogin = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await apiFetch('/auth/google', {
        method: 'POST',
        body: JSON.stringify({
          googleToken: 'mock-google-token',
          email: 'googleuser@campify.com',
          name: 'Google User',
          avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200',
        }),
      });
      const data = await res.json();

      if (res.ok) {
        setAuth(data.user, data.accessToken, data.refreshToken);
        router.push('/');
      } else {
        setError(data.error || 'Google login failed');
      }
    } catch (err) {
      console.error(err);
      setError('Google OAuth network error.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-brand-bg text-brand-text relative overflow-hidden select-none font-sans">
      <SpaceBackground />

      {/* Background Glow Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-brand-orange/10 rounded-full blur-[120px] pointer-events-none animate-blob z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-brand-cyan/10 rounded-full blur-[120px] pointer-events-none animate-blob-delayed z-0" />

      {/* Top Navbar */}
      <header className="w-full px-6 py-5 md:px-12 md:py-6 flex justify-between items-center relative z-20">
        <Link href="/" className="flex items-center gap-3 no-underline group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-orange via-purple-600 to-brand-cyan flex items-center justify-center shadow-lg shadow-brand-orange/25 group-hover:scale-105 transition-transform">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="font-outfit font-extrabold text-2xl tracking-tight text-white">
            KILOGRAM<span className="text-brand-orange">.</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-300 bg-neutral-900/80 border border-white/10 px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            Secure Email & OTP Authentication
          </span>
        </div>
      </header>

      {/* Main Form Container */}
      <div className="flex-1 flex items-center justify-center px-4 py-8 relative z-10">
        <div className="w-full max-w-md bg-[#0f1322]/90 border border-white/10 rounded-3xl p-6 md:p-8 backdrop-blur-2xl shadow-2xl shadow-black/90 relative overflow-hidden">

          {/* Feedback Messages */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-5 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold flex items-start gap-2.5 shadow-sm"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                <span className="leading-relaxed">{error}</span>
              </motion.div>
            )}
            {successMsg && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-5 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-start gap-2.5 shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed">{successMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* OTP STEP */}
          {activeTab === 'otp' ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col gap-5"
            >
              <div className="text-center">
                <div className="w-12 h-12 rounded-2xl bg-brand-orange/10 border border-brand-orange/20 flex items-center justify-center text-brand-orange mx-auto mb-3">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold font-outfit text-white">Enter Verification Code</h2>
                <p className="text-xs text-neutral-400 mt-1">
                  We sent a 6-digit passcode to <span className="text-white font-medium">{email}</span>
                </p>
              </div>

              {/* 6-Digit Numeric Boxes */}
              <div className="flex justify-between gap-2.5 my-2">
                {otpValues.map((val, idx) => (
                  <input
                    key={idx}
                    id={`otp-${idx}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={val}
                    onChange={(e) => handleOtpChange(e.target.value, idx)}
                    onKeyDown={(e) => handleOtpKeyDown(e, idx)}
                    onPaste={handleOtpPaste}
                    className="w-11 h-14 bg-neutral-900/90 border border-neutral-700 focus:border-brand-orange focus:ring-1 focus:ring-brand-orange/40 rounded-xl text-center text-xl font-extrabold outline-none text-white transition-all font-mono"
                  />
                ))}
              </div>

              {/* Confirm Button */}
              <button
                type="button"
                onClick={() => handleSubmitOtp(otpValues.join(''))}
                disabled={isLoading || otpValues.join('').length !== 6}
                className="w-full py-4 rounded-xl btn-primary-gradient text-white font-extrabold text-xs uppercase tracking-wider shadow-lg disabled:opacity-50 transition cursor-pointer flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verifying Passcode...
                  </>
                ) : (
                  'Confirm & Continue'
                )}
              </button>

              {/* Resend and Back buttons */}
              <div className="flex flex-col gap-2.5 items-center pt-2">
                <button
                  type="button"
                  onClick={() => handleSendOtp()}
                  disabled={isLoading || !canResend}
                  className="text-xs font-bold text-brand-orange hover:text-brand-orange/80 disabled:text-neutral-500 bg-transparent border-0 cursor-pointer transition-colors"
                >
                  {canResend ? 'Resend Verification Code' : `Resend Code in ${resendTimer}s`}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab(lastTab);
                    setOtpValues(['', '', '', '', '', '']);
                    setError('');
                  }}
                  className="text-xs font-semibold text-neutral-400 hover:text-white bg-transparent border-0 cursor-pointer transition-colors flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Change Email or Password
                </button>
              </div>
            </motion.div>
          ) : (
            /* LOGIN & REGISTER FORMS */
            <div>
              {/* Tab Selector */}
              <div className="flex bg-neutral-900/90 p-1 rounded-2xl mb-6 border border-white/10">
                <button
                  type="button"
                  onClick={() => setActiveTab('login')}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition ${
                    activeTab === 'login'
                      ? 'bg-gradient-to-r from-brand-orange to-purple-600 text-white shadow-md'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('register')}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition ${
                    activeTab === 'register'
                      ? 'bg-gradient-to-r from-brand-orange to-purple-600 text-white shadow-md'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Create Account
                </button>
              </div>

              <div className="mb-5">
                <h1 className="text-xl font-bold font-outfit text-white">
                  {activeTab === 'login' ? 'Sign In to Kilogram' : 'Join Kilogram'}
                </h1>
                <p className="text-xs text-neutral-400 mt-1">
                  {activeTab === 'login'
                    ? 'Enter your credentials to receive a 6-digit login OTP code.'
                    : 'Create your account with Email, Password and OTP verification.'}
                </p>
              </div>

              <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
                {/* Registration Extra Fields */}
                {activeTab === 'register' && (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider px-1">
                        Full Name
                      </label>
                      <div className="relative">
                        <User className="w-4.5 h-4.5 text-neutral-500 absolute left-4 top-3.5" />
                        <input
                          type="text"
                          required
                          placeholder="Your Full Name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full bg-neutral-800/60 border border-neutral-700 focus:border-brand-orange rounded-xl pl-11 pr-4 py-3 text-sm outline-none text-white transition placeholder:text-neutral-500"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider px-1">
                        Username
                      </label>
                      <div className="relative">
                        <AtSign className="w-4.5 h-4.5 text-neutral-500 absolute left-4 top-3.5" />
                        <input
                          type="text"
                          required
                          placeholder="unique_username"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="w-full bg-neutral-800/60 border border-neutral-700 focus:border-brand-orange rounded-xl pl-11 pr-4 py-3 text-sm outline-none text-white transition placeholder:text-neutral-500"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Email Address / Username */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider px-1">
                    {activeTab === 'login' ? 'Email Address or Username' : 'Email Address'}
                  </label>
                  <div className="relative">
                    <Mail className="w-4.5 h-4.5 text-neutral-500 absolute left-4 top-3.5" />
                    <input
                      type={activeTab === 'login' ? 'text' : 'email'}
                      required
                      placeholder={activeTab === 'login' ? 'name@example.com or username' : 'name@example.com'}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-neutral-800/60 border border-neutral-700 focus:border-brand-orange rounded-xl pl-11 pr-4 py-3 text-sm outline-none text-white transition placeholder:text-neutral-500"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider px-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4.5 h-4.5 text-neutral-500 absolute left-4 top-3.5" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-neutral-800/60 border border-neutral-700 focus:border-brand-orange rounded-xl pl-11 pr-4 py-3 text-sm outline-none text-white transition placeholder:text-neutral-500"
                    />
                  </div>

                  {/* Password strength meter */}
                  {activeTab === 'register' && password.length > 0 && (
                    <div className="flex flex-col gap-1 px-1 mt-1">
                      <div className="flex justify-between items-center text-[9px] font-bold text-neutral-500">
                        <span>Security Strength</span>
                        <span className="uppercase">{strength.label}</span>
                      </div>
                      <div className="h-1 w-full bg-neutral-800 rounded-full overflow-hidden flex gap-0.5">
                        <div className={`h-full flex-1 transition-all ${strength.score >= 1 ? strength.color : 'bg-transparent'}`} />
                        <div className={`h-full flex-1 transition-all ${strength.score >= 2 ? strength.color : 'bg-transparent'}`} />
                        <div className={`h-full flex-1 transition-all ${strength.score >= 3 ? strength.color : 'bg-transparent'}`} />
                        <div className={`h-full flex-1 transition-all ${strength.score >= 4 ? strength.color : 'bg-transparent'}`} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 mt-2 rounded-xl btn-primary-gradient text-white font-extrabold text-xs uppercase tracking-wider shadow-lg hover:opacity-95 transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending Verification Code...
                    </>
                  ) : activeTab === 'login' ? (
                    'Sign In & Send Code'
                  ) : (
                    'Create Account & Send Code'
                  )}
                </button>
              </form>

              {/* Social Login Options */}
              <div className="flex flex-col gap-4 mt-6">
                <div className="flex items-center my-1">
                  <div className="flex-grow border-t border-white/10" />
                  <span className="text-[9px] uppercase font-bold text-neutral-500 px-4 tracking-wider">
                    Or continue with
                  </span>
                  <div className="flex-grow border-t border-white/10" />
                </div>

                <button
                  onClick={simulateGoogleLogin}
                  type="button"
                  className="w-full bg-neutral-900 hover:bg-neutral-800 text-white border border-white/10 py-3 rounded-xl flex items-center justify-center gap-2.5 text-xs font-semibold transition cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#EA4335"
                      d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.7 7.4l3.7 2.9C6.3 7.3 8.9 5 12 5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.4 14.7c-.2-.7-.4-1.5-.4-2.3 0-.8.1-1.6.4-2.3L1.7 7.2C.6 9.4 0 11.9 0 14.5s.6 5.1 1.7 7.3l3.7-2.9z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.7-2.3-6.6-5.3L1.7 16.4C3.5 20.3 7.4 23.5 12 23.5z"
                    />
                  </svg>
                  Google Account Auth
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <AuthPageContent />
    </Suspense>
  );
}