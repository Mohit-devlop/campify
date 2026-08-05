'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '../../store/authStore';
import { apiFetch } from '../../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
Sparkles, Mail, Lock, User, AtSign, Loader2, CheckCircle2,
MessageCircle, Heart, Film, ArrowRight, ArrowLeft, ShieldCheck, HelpCircle, Home
} from 'lucide-react';

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
      setResendTimer(prev => prev - 1);
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
    if (fullOtp.length === 6) {
      handleSubmitOtp(fullOtp);
    }
  }, [otpValues]);

  // Helper to show device native push notification
  const showDeviceNotification = (otpCode: string) => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        if (navigator.serviceWorker && navigator.serviceWorker.ready) {
          navigator.serviceWorker.ready.then((registration) => {
            registration.showNotification('Campify Passcode', {
              body: `Your 6-digit verification code is ${otpCode}.`,
              icon: '/icons/icon-192x192.png',
              vibrate: [200, 100, 200],
              tag: 'otp-notification',
              requireInteraction: true
            } as any);
          });
        } else {
          new Notification('Campify Passcode', {
            body: `Your 6-digit verification code is ${otpCode}.`,
            icon: '/icons/icon-192x192.png',
            tag: 'otp-notification',
            requireInteraction: true
          } as any);
        }
      } catch (err) {
        console.error('Failed to show push notification:', err);
      }
    }
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    setError('');
    setSuccessMsg('');

    const targetFlow = activeTab === 'otp' ? lastTab : activeTab;

    try {
      const res = await apiFetch('/auth/otp/send', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
          username: targetFlow === 'register' ? username : undefined,
          name: targetFlow === 'register' ? name : undefined,
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
          // Trigger Instagram-style Native Push Notification Popup on device screen
          showDeviceNotification(data.mockOtp);
          
          // Auto-fill mock OTP for easier development
          const mockArray = data.mockOtp.split('');
          setOtpValues(mockArray);
        } else {
          setSuccessMsg('A secure random 6-digit OTP code has been sent to your email inbox.');
        }
        setActiveTab('otp');
        setResendTimer(60);
        setCanResend(false);
      } else {
        setError(data.error || 'Failed to send OTP. Please try again.');
      }
    } catch (err) {
      console.error(err);
      setError('A network error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitOtp = async (otpCode: string) => {
    setIsLoading(true);
    setError('');

    try {
      const res = await apiFetch('/auth/otp/verify', {
        method: 'POST',
        body: JSON.stringify({ email, otp: otpCode }),
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

  const handleOtpChange = (value: string, index: number) => {
    const newOtpValues = [...otpValues];
    const val = value.replace(/[^0-9]/g, '');
    newOtpValues[index] = val;
    setOtpValues(newOtpValues);

    if (val && index < 5) {
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
    <div className="min-h-screen w-full flex bg-brand-bg text-brand-text relative overflow-hidden select-none font-sans">
      {/* Background Animated Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-brand-orange/10 rounded-full blur-[120px] pointer-events-none animate-blob" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-brand-cyan/10 rounded-full blur-[120px] pointer-events-none animate-blob-delayed" />
      <div className="absolute top-[30%] right-[30%] w-[350px] h-[350px] bg-brand-orange/5 rounded-full blur-[120px] pointer-events-none animate-blob-fast" />

      {/* LEFT COLUMN: Visual Showcase */}
      <div className="hidden lg:flex lg:w-[58%] flex-col justify-between p-12 bg-gradient-to-br from-brand-bg via-brand-bg to-slate-100/50 dark:to-brand-card/40 border-r border-slate-200 dark:border-white/5 relative z-10">
        {/* Brand header */}
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-orange to-brand-cyan flex items-center justify-center shadow-lg shadow-brand-orange/20 flex-shrink-0">
              <Sparkles className="w-5 h-5 text-black animate-pulse" />
            </div>
            <span className="font-extrabold text-xl tracking-wider bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600 dark:from-white dark:via-neutral-100 dark:to-neutral-450 bg-clip-text text-transparent">
              CAMPIFY
            </span>
          </div>

          <Link
            href="/"
            className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white border border-slate-200 dark:border-white/5 hover:border-slate-350 dark:hover:border-white/10 px-4 py-2 rounded-xl bg-slate-50 dark:bg-black/25 transition-all no-underline active-shrink"
          >
            <Home className="w-4 h-4 text-brand-cyan" />
            Visit Homepage
          </Link>
        </div>

        {/* Main Split Grid */}
        <div className="grid grid-cols-12 gap-8 my-auto items-center w-full relative">
          <div className="col-span-7 flex flex-col gap-6">
            <span className="text-xs font-black uppercase text-brand-orange tracking-widest font-outfit">Connect. Learn. Build.</span>
            <h1 className="text-3xl xl:text-4xl font-black font-outfit tracking-tight leading-tight text-slate-900 dark:text-white">
              India&apos;s Student <br />
              <span className="bg-gradient-to-r from-brand-orange to-brand-cyan bg-clip-text text-transparent">
                Community Platform.
              </span>
            </h1>
            <p className="text-slate-650 dark:text-neutral-400 text-xs leading-relaxed">
              Welcome to the central portal of college innovation. Collaborate on projects, form dynamic hackathon teams, share bite-sized learning reels, join specialized college communities, and climb the gamified leaderboard.
            </p>

            <div className="grid grid-cols-2 gap-3.5 mt-2">
              <div className="flex flex-col gap-0.5 p-4 rounded-2xl bg-white/70 dark:bg-brand-card/50 border border-slate-100 dark:border-white/5 shadow-sm">
                <span className="text-xl font-extrabold font-outfit tracking-tight text-slate-800 dark:text-white">45k+</span>
                <span className="text-[9px] text-slate-500 dark:text-neutral-500 uppercase font-bold tracking-wider">Active Students</span>
              </div>
              <div className="flex flex-col gap-0.5 p-4 rounded-2xl bg-white/70 dark:bg-brand-card/50 border border-slate-100 dark:border-white/5 shadow-sm">
                <span className="text-xl font-extrabold font-outfit tracking-tight text-slate-800 dark:text-white">250+</span>
                <span className="text-[9px] text-slate-500 dark:text-neutral-500 uppercase font-bold tracking-wider">Communities</span>
              </div>
              <div className="flex flex-col gap-0.5 p-4 rounded-2xl bg-white/70 dark:bg-brand-card/50 border border-slate-100 dark:border-white/5 shadow-sm">
                <span className="text-xl font-extrabold font-outfit tracking-tight text-slate-800 dark:text-white">1,800+</span>
                <span className="text-[9px] text-slate-500 dark:text-neutral-500 uppercase font-bold tracking-wider">Projects Built</span>
              </div>
              <div className="flex flex-col gap-0.5 p-4 rounded-2xl bg-white/70 dark:bg-brand-card/50 border border-slate-100 dark:border-white/5 shadow-sm">
                <span className="text-xl font-extrabold font-outfit tracking-tight text-slate-800 dark:text-white">80+</span>
                <span className="text-[9px] text-slate-500 dark:text-neutral-500 uppercase font-bold tracking-wider">Active Hackathons</span>
              </div>
            </div>
          </div>

          <div className="col-span-5 flex flex-col gap-6 pl-4 relative">
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              className="p-4 rounded-2xl bg-slate-900 border border-slate-800 backdrop-blur-md shadow-2xl w-full font-mono select-none"
            >
              <div className="flex items-center gap-1.5 border-b border-white/5 pb-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span className="w-2 h-2 rounded-full bg-yellow-500" />
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-[8px] text-neutral-500 ml-2">campify_kernel.sh</span>
              </div>
              <pre className="text-[9px] text-brand-cyan leading-relaxed font-semibold">
                {`$ npx create-campify-app@latest
✔ Connected to CampusHub
✔ Hackathon Mode Enabled
✔ Streak: Active 12 Days
✔ Project matches found: 4`}
              </pre>
            </motion.div>

            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
              className="p-4 rounded-2xl bg-white dark:bg-brand-card/90 border border-brand-cyan/30 dark:border-brand-cyan/20 backdrop-blur-md shadow-lg flex flex-col gap-2 w-full"
            >
              <div className="flex items-center justify-between">
                <span className="text-[8px] font-bold text-brand-orange bg-brand-orange/10 px-2 py-0.5 rounded-md uppercase">Team Finder</span>
                <span className="text-[8px] text-slate-500">2m ago</span>
              </div>
              <p className="text-[10px] font-bold text-slate-800 dark:text-white leading-normal">Need UI/UX developer for Smart Campus Hackathon! Hackers welcome.</p>
              <span className="text-[8px] text-slate-500 dark:text-neutral-400">Skills: Figma, TailwindCSS, React</span>
            </motion.div>
          </div>
        </div>

        <div className="text-neutral-500 text-xs flex items-center gap-4">
          <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-brand-cyan" /> Campus Secured</span>
          <span>&bull;</span>
          <span>Dev Seed Node</span>
        </div>
      </div>

      {/* RIGHT COLUMN: Glassmorphism OTP Credentials Panel */}
      <div className="w-full lg:w-[42%] flex items-center justify-center p-6 relative z-10 bg-brand-bg/40">
        <div className="w-full max-w-[430px] bg-brand-card/65 border border-slate-200/50 dark:border-white/10 backdrop-blur-2xl rounded-[32px] p-8 flex flex-col gap-6 shadow-2xl relative z-20 glass">
          
          <Link
            href="/"
            className="w-full bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-neutral-200 border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 py-3.5 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold active-shrink hover-scale no-underline transition-all"
          >
            <Home className="w-4 h-4 text-brand-orange animate-pulse" />
            Back to Home Page
          </Link>

          {/* Tab selectors for Login / Register */}
          {(activeTab === 'login' || activeTab === 'register') && (
            <div className="flex bg-slate-100 dark:bg-black/60 p-1.5 rounded-2xl border border-slate-200 dark:border-white/5">
              <button
                type="button"
                onClick={() => { setActiveTab('login'); setError(''); }}
                className={`flex-1 text-center py-2.5 text-xs font-bold rounded-xl transition-all relative cursor-pointer ${
                  activeTab === 'login' ? 'text-black font-extrabold animate-pulse' : 'text-slate-500 dark:text-neutral-500 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                {activeTab === 'login' && (
                  <motion.div
                    layoutId="authTabBg"
                    className="absolute inset-0 bg-gradient-to-r from-brand-orange to-brand-cyan rounded-xl -z-10"
                    transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                  />
                )}
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('register'); setError(''); }}
                className={`flex-1 text-center py-2.5 text-xs font-bold rounded-xl transition-all relative cursor-pointer ${
                  activeTab === 'register' ? 'text-black font-extrabold animate-pulse' : 'text-slate-500 dark:text-neutral-500 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                {activeTab === 'register' && (
                  <motion.div
                    layoutId="authTabBg"
                    className="absolute inset-0 bg-gradient-to-r from-brand-orange to-brand-cyan rounded-xl -z-10"
                    transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                  />
                )}
                Sign Up
              </button>
            </div>
          )}

          {activeTab === 'login' && (
            <div className="flex flex-col gap-1 text-center">
              <h2 className="text-2xl font-extrabold font-outfit text-slate-900 dark:text-white tracking-tight">Student OTP Sign In</h2>
              <p className="text-xs text-slate-550 dark:text-neutral-400 leading-normal font-medium">Verify your email to enter the Campify network.</p>
            </div>
          )}

          {activeTab === 'register' && (
            <div className="flex flex-col gap-1 text-center">
              <h2 className="text-2xl font-extrabold font-outfit text-slate-900 dark:text-white tracking-tight">Create Account</h2>
              <p className="text-xs text-slate-550 dark:text-neutral-400 leading-normal font-medium">Register profile details to access campus innovators.</p>
            </div>
          )}

          {activeTab === 'otp' && (
            <div className="flex flex-col gap-1 text-center">
              <h2 className="text-xl font-bold font-outfit text-slate-800 dark:text-white">Confirm Security OTP</h2>
              <p className="text-xs text-slate-500 dark:text-neutral-400">Enter the 6-digit code sent to your email & device.</p>
            </div>
          )}

          {/* Notifications */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3.5 rounded-2xl font-semibold flex items-center gap-2"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}
            {successMsg && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="bg-green-500/10 border border-green-500/20 text-green-400 text-xs p-3.5 rounded-2xl font-semibold flex items-center gap-2"
              >
                <CheckCircle2 className="w-4.5 h-4.5 text-green-400 flex-shrink-0 animate-bounce" />
                <span>{successMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {(activeTab === 'login' || activeTab === 'register') ? (
            <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-wider px-1">Email Address</label>
                <div className="relative group">
                  <Mail className="w-4.5 h-4.5 text-neutral-550 group-focus-within:text-brand-cyan absolute left-4 top-3.5 transition-colors" />
                  <input
                    type="email"
                    required
                    placeholder="student@college.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/5 focus:border-brand-cyan/40 focus:ring-1 focus:ring-brand-cyan/20 rounded-2xl pl-12 pr-4 py-3.5 text-sm outline-none text-slate-800 dark:text-white transition-all placeholder:text-slate-400 dark:placeholder:text-neutral-600 focus:bg-white dark:focus:bg-black/60"
                  />
                </div>
              </div>

              {activeTab === 'register' && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-wider px-1">Username</label>
                    <div className="relative group">
                      <AtSign className="w-4.5 h-4.5 text-neutral-550 group-focus-within:text-brand-cyan absolute left-4 top-3.5 transition-colors" />
                      <input
                        type="text"
                        required
                        placeholder="student_handle"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/5 focus:border-brand-cyan/40 focus:ring-1 focus:ring-brand-cyan/20 rounded-2xl pl-12 pr-4 py-3.5 text-sm outline-none text-slate-800 dark:text-white transition-all placeholder:text-slate-400 dark:placeholder:text-neutral-600 focus:bg-white dark:focus:bg-black/60"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-wider px-1">Display Name</label>
                    <div className="relative group">
                      <User className="w-4.5 h-4.5 text-neutral-550 group-focus-within:text-brand-cyan absolute left-4 top-3.5 transition-colors" />
                      <input
                        type="text"
                        required
                        placeholder="Enter full name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/5 focus:border-brand-cyan/40 focus:ring-1 focus:ring-brand-cyan/20 rounded-2xl pl-12 pr-4 py-3.5 text-sm outline-none text-slate-800 dark:text-white transition-all placeholder:text-slate-400 dark:placeholder:text-neutral-600 focus:bg-white dark:focus:bg-black/60"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Password field */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-wider px-1">Password</label>
                <div className="relative group">
                  <Lock className="w-4.5 h-4.5 text-neutral-550 group-focus-within:text-brand-cyan absolute left-4 top-3.5 transition-colors" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/5 focus:border-brand-cyan/40 focus:ring-1 focus:ring-brand-cyan/20 rounded-2xl pl-12 pr-4 py-3.5 text-sm outline-none text-slate-800 dark:text-white transition-all placeholder:text-slate-400 dark:placeholder:text-neutral-600 focus:bg-white dark:focus:bg-black/60"
                  />
                </div>

                {/* Password strength meter for registration */}
                {activeTab === 'register' && password.length > 0 && (
                  <div className="flex flex-col gap-1 px-1 mt-1">
                    <div className="flex justify-between items-center text-[9px] font-bold text-slate-500">
                      <span>Security Strength</span>
                      <span className="uppercase">{strength.label}</span>
                    </div>
                    <div className="h-1 w-full bg-slate-200 dark:bg-black/60 rounded-full overflow-hidden flex gap-0.5">
                      <div className={`h-full flex-1 transition-all ${strength.score >= 1 ? strength.color : 'bg-transparent'}`} />
                      <div className={`h-full flex-1 transition-all ${strength.score >= 2 ? strength.color : 'bg-transparent'}`} />
                      <div className={`h-full flex-1 transition-all ${strength.score >= 3 ? strength.color : 'bg-transparent'}`} />
                      <div className={`h-full flex-1 transition-all ${strength.score >= 4 ? strength.color : 'bg-transparent'}`} />
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-brand-orange to-brand-cyan hover:opacity-95 text-black font-extrabold text-xs uppercase tracking-wider py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-brand-orange/10 active-shrink hover-scale disabled:opacity-50 mt-2 cursor-pointer border-0"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4.5 h-4.5 animate-spin" />
                    Sending code...
                  </>
                ) : (
                  <>
                    {activeTab === 'login' ? 'Sign In to Portal' : 'Create Account'}
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="flex flex-col gap-5">
              {/* 6-Digit Numeric OTP Boxes */}
              <div className="flex justify-between gap-2.5 my-2">
                {otpValues.map((val, idx) => (
                  <input
                    key={idx}
                    id={`otp-${idx}`}
                    type="text"
                    maxLength={1}
                    value={val}
                    onChange={(e) => handleOtpChange(e.target.value, idx)}
                    onKeyDown={(e) => handleOtpKeyDown(e, idx)}
                    onPaste={handleOtpPaste}
                    className="w-11 h-12 bg-slate-50 dark:bg-black/40 border border-slate-200/55 dark:border-white/10 focus:border-brand-cyan/40 focus:ring-1 focus:ring-brand-cyan/20 rounded-xl text-center text-lg font-extrabold outline-none text-slate-800 dark:text-white transition-all focus:bg-white dark:focus:bg-black/60 font-sans"
                  />
                ))}
              </div>

              <div className="flex flex-col gap-2.5 items-center">
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
                  onClick={() => { setActiveTab(lastTab); setOtpValues(['', '', '', '', '', '']); }}
                  className="text-xs font-bold text-neutral-400 hover:text-white bg-transparent border-0 cursor-pointer transition-colors"
                >
                  Change Details / Go Back
                </button>
              </div>
            </div>
          )}

          {/* Social Auth continue */}
          {(activeTab === 'login' || activeTab === 'register') && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center my-1">
                <div className="flex-grow border-t border-slate-200 dark:border-white/5" />
                <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-neutral-500 px-4 tracking-wider">Or continue with</span>
                <div className="flex-grow border-t border-slate-200 dark:border-white/5" />
              </div>

              <button
                onClick={simulateGoogleLogin}
                type="button"
                className="w-full bg-slate-50 hover:bg-slate-100 dark:bg-black/40 dark:hover:bg-black/60 text-slate-700 dark:text-neutral-200 border border-slate-200 dark:border-white/5 py-3 rounded-2xl flex items-center justify-center gap-2.5 text-xs font-semibold active-shrink hover-scale cursor-pointer"
              >
                <svg className="w-4.5 h-4.5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                Google Account Auth
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="h-screen w-full flex justify-center items-center bg-neutral-950">
        <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
      </div>
    }>
      <AuthPageContent />
    </Suspense>
  );
}