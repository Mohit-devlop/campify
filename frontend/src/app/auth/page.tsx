'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';
import { apiFetch } from '../../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Mail, Lock, User, AtSign, Loader2, CheckCircle2,
  MessageCircle, Heart, Film, ArrowRight, ShieldCheck, HelpCircle
} from 'lucide-react';

type Tab = 'login' | 'register' | 'otp' | 'forgot' | 'reset';

function AuthPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth, isAuthenticated, isInitialized } = useAuthStore();

  const [activeTab, setActiveTab] = useState<Tab>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [mockResetLink, setMockResetLink] = useState('');

  // Sync token from search parameters (for reset password redirects)
  useEffect(() => {
    const tabParam = searchParams.get('tab') as Tab | null;
    const tokenParam = searchParams.get('token');
    
    if (tabParam === 'reset' && tokenParam) {
      setActiveTab('reset');
      setToken(tokenParam);
    }
  }, [searchParams]);

  // Redirect if already logged in
  useEffect(() => {
    if (!isInitialized) return;

    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, isInitialized, router]);

  // Reset alerts on tab change
  useEffect(() => {
    setError('');
    setSuccessMsg('');
    setMockResetLink('');
  }, [activeTab]);

  const handleResendOtp = async () => {
    setIsLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await apiFetch('/auth/resend-otp', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.mockOtp) {
          setSuccessMsg(`A new verification OTP has been sent! (Local Dev) Use OTP code: ${data.mockOtp}`);
          setOtp(data.mockOtp);
        } else {
          setSuccessMsg('A new verification OTP has been sent to your email.');
        }
      } else {
        setError(data.error || 'Failed to resend OTP');
      }
    } catch (err) {
      console.error(err);
      setError('An unexpected network error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      if (activeTab === 'login') {
        const res = await apiFetch('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ identifier: email, password }),
        });
        const data = await res.json();

        if (res.ok) {
          setAuth(data.user, data.accessToken, data.refreshToken);
          router.push('/');
        } else {
          if (data.verified === false) {
            setSuccessMsg('Account is not verified yet. Please enter your OTP code.');
            setActiveTab('otp');
          } else {
            setError(data.error || 'Authentication failed');
          }
        }
      } else if (activeTab === 'register') {
        const res = await apiFetch('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ email, username, password, name }),
        });
        const data = await res.json();

        if (res.ok) {
          if (data.mockOtp) {
            setSuccessMsg(`Registration successful! (Local Dev) Use OTP code: ${data.mockOtp}`);
            setOtp(data.mockOtp);
          } else {
            setSuccessMsg('Registration successful! Check your email for OTP verification.');
          }
          setActiveTab('otp');
        } else {
          setError(data.error || 'Registration failed');
        }
      } else if (activeTab === 'otp') {
        const res = await apiFetch('/auth/verify-otp', {
          method: 'POST',
          body: JSON.stringify({ email, otp }),
        });
        const data = await res.json();

        if (res.ok) {
          setSuccessMsg('Email verified successfully! You can now log in.');
          setActiveTab('login');
        } else {
          setError(data.error || 'Invalid OTP code');
        }
      } else if (activeTab === 'forgot') {
        const res = await apiFetch('/auth/forgot-password', {
          method: 'POST',
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        if (res.ok) {
          if (data.mockResetLink) {
            setMockResetLink(data.mockResetLink);
            setSuccessMsg('A password reset link has been generated for local development.');
          } else {
            setSuccessMsg('If the email exists, a password reset link has been sent.');
          }
        } else {
          setError(data.error || 'Failed to send reset link.');
        }
      } else if (activeTab === 'reset') {
        const res = await apiFetch('/auth/reset-password', {
          method: 'POST',
          body: JSON.stringify({ token, newPassword: password }),
        });
        const data = await res.json();

        if (res.ok) {
          setSuccessMsg('Password reset successful. Log in with your new password.');
          setActiveTab('login');
        } else {
          setError(data.error || 'Failed to reset password');
        }
      }
    } catch (err) {
      console.error(err);
      setError('An unexpected network error occurred.');
    } finally {
      setIsLoading(false);
    }
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

  return (
    <div className="min-h-screen w-full flex bg-brand-bg text-brand-text relative overflow-hidden select-none font-sans">
      
      {/* Background Animated Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-brand-orange/10 rounded-full blur-[120px] pointer-events-none animate-blob" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-brand-cyan/10 rounded-full blur-[120px] pointer-events-none animate-blob-delayed" />
      <div className="absolute top-[30%] right-[30%] w-[350px] h-[350px] bg-brand-orange/5 rounded-full blur-[120px] pointer-events-none animate-blob-fast" />

      {/* LEFT COLUMN: Visual Showcase (Campus / Hackathon Culture) */}
      <div className="hidden lg:flex lg:w-[58%] flex-col justify-between p-12 bg-gradient-to-br from-brand-bg via-brand-bg to-brand-card/40 border-r border-white/5 relative z-10">
        
        {/* Brand header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-orange to-brand-cyan flex items-center justify-center shadow-lg shadow-brand-orange/20 flex-shrink-0">
            <Sparkles className="w-5 h-5 text-black animate-pulse" />
          </div>
          <span className="font-extrabold text-xl tracking-wider bg-gradient-to-r from-white via-neutral-100 to-neutral-400 bg-clip-text text-transparent">
            CAMPIFY
          </span>
        </div>

        {/* Main Split Grid */}
        <div className="grid grid-cols-12 gap-8 my-auto items-center w-full relative">
          
          {/* Left Column: Heading, Description & Stats */}
          <div className="col-span-7 flex flex-col gap-6">
            <span className="text-xs font-black uppercase text-brand-orange tracking-widest font-outfit">Connect. Learn. Build.</span>
            <h1 className="text-3xl xl:text-4xl font-black font-outfit tracking-tight leading-tight text-white">
              India&apos;s Student <br />
              <span className="bg-gradient-to-r from-brand-orange to-brand-cyan bg-clip-text text-transparent">
                Community Platform.
              </span>
            </h1>
            <p className="text-neutral-400 text-xs leading-relaxed">
              Welcome to the central portal of college innovation. Collaborate on projects, form dynamic hackathon teams, share bite-sized learning reels, join specialized college communities, and climb the gamified leaderboard.
            </p>

            <div className="grid grid-cols-2 gap-3.5 mt-2">
              <div className="flex flex-col gap-0.5 p-4 rounded-2xl bg-brand-card/50 border border-white/5">
                <span className="text-xl font-extrabold font-outfit tracking-tight text-white">45k+</span>
                <span className="text-[9px] text-neutral-500 uppercase font-bold tracking-wider">Active Students</span>
              </div>
              <div className="flex flex-col gap-0.5 p-4 rounded-2xl bg-brand-card/50 border border-white/5">
                <span className="text-xl font-extrabold font-outfit tracking-tight text-white">250+</span>
                <span className="text-[9px] text-neutral-500 uppercase font-bold tracking-wider">Communities</span>
              </div>
              <div className="flex flex-col gap-0.5 p-4 rounded-2xl bg-brand-card/50 border border-white/5">
                <span className="text-xl font-extrabold font-outfit tracking-tight text-white">1,800+</span>
                <span className="text-[9px] text-neutral-500 uppercase font-bold tracking-wider">Projects Built</span>
              </div>
              <div className="flex flex-col gap-0.5 p-4 rounded-2xl bg-brand-card/50 border border-white/5">
                <span className="text-xl font-extrabold font-outfit tracking-tight text-white">80+</span>
                <span className="text-[9px] text-neutral-500 uppercase font-bold tracking-wider">Active Hackathons</span>
              </div>
            </div>
          </div>

          {/* Right Column: Floating Console & Teammate Card Stack */}
          <div className="col-span-5 flex flex-col gap-6 pl-4 relative">
            
            {/* Animated Console Block */}
            <motion.div 
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              className="p-4 rounded-2xl bg-brand-card/80 border border-white/10 backdrop-blur-md shadow-2xl w-full font-mono select-none"
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
🔥 Streak: Active 12 Days
🚀 Project matches found: 4`}
              </pre>
            </motion.div>

            {/* Teammate Request Card */}
            <motion.div 
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
              className="p-4 rounded-2xl bg-brand-card/90 border border-brand-cyan/20 backdrop-blur-md shadow-2xl flex flex-col gap-2 w-full"
            >
              <div className="flex items-center justify-between">
                <span className="text-[8px] font-bold text-brand-orange bg-brand-orange/10 px-2 py-0.5 rounded-md uppercase">Team Finder</span>
                <span className="text-[8px] text-neutral-500">2m ago</span>
              </div>
              <p className="text-[10px] font-bold text-white leading-normal">Need UI/UX developer for Smart Campus Hackathon! Hackers welcome.</p>
              <span className="text-[8px] text-neutral-400">Skills: Figma, TailwindCSS, React</span>
            </motion.div>

          </div>
        </div>

        {/* Footer info */}
        <div className="text-neutral-500 text-xs flex items-center gap-4">
          <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-brand-cyan" /> Campus Secured</span>
          <span>&bull;</span>
          <span>Dev Seed Node</span>
        </div>
      </div>

      {/* RIGHT COLUMN: Premium Glassmorphism Credentials Panel */}
      <div className="w-full lg:w-[42%] flex items-center justify-center p-6 relative z-10 bg-brand-bg/40">
        
        <div className="w-full max-w-[430px] bg-brand-card/65 border border-white/10 backdrop-blur-2xl rounded-[32px] p-8 flex flex-col gap-6 shadow-2xl relative z-20 glass">
          
          {/* Tabs header for Login/Register */}
          {(activeTab === 'login' || activeTab === 'register') && (
            <div className="flex bg-black/60 p-1.5 rounded-2xl border border-white/5">
              <button
                type="button"
                onClick={() => setActiveTab('login')}
                className={`flex-1 text-center py-2.5 text-xs font-bold rounded-xl transition-all relative cursor-pointer ${
                  activeTab === 'login' ? 'text-black font-extrabold animate-pulse' : 'text-neutral-500 hover:text-white'
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
                onClick={() => setActiveTab('register')}
                className={`flex-1 text-center py-2.5 text-xs font-bold rounded-xl transition-all relative cursor-pointer ${
                  activeTab === 'register' ? 'text-black font-extrabold animate-pulse' : 'text-neutral-500 hover:text-white'
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

          {/* Tab titles & Subtitles for OTP / Forgot / Reset */}
          {activeTab === 'otp' && (
            <div className="flex flex-col gap-1 text-center">
              <h2 className="text-xl font-bold font-outfit text-white">Confirm Security OTP</h2>
              <p className="text-xs text-neutral-400">Enter verification code to configure your campus session.</p>
            </div>
          )}
          {activeTab === 'forgot' && (
            <div className="flex flex-col gap-1 text-center">
              <h2 className="text-xl font-bold font-outfit text-white">Account Recovery Key</h2>
              <p className="text-xs text-neutral-400">Enter your email to generate a local password link.</p>
            </div>
          )}
          {activeTab === 'reset' && (
            <div className="flex flex-col gap-1 text-center">
              <h2 className="text-xl font-bold font-outfit text-white">Set New Password</h2>
              <p className="text-xs text-neutral-400 font-medium">Please construct a secure password key.</p>
            </div>
          )}

          {/* Notifications / Success alerts */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3.5 rounded-2xl font-medium"
              >
                {error}
              </motion.div>
            )}
            {successMsg && (
              <motion.div 
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="bg-green-500/10 border border-green-500/20 text-green-400 text-xs p-3.5 rounded-2xl flex flex-col gap-2.5 font-medium"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span>{successMsg}</span>
                </div>
                {mockResetLink && (
                  <a
                    href={mockResetLink}
                    className="text-brand-cyan hover:text-brand-cyan/80 underline font-bold break-all flex items-center gap-1 mt-1 text-[11px]"
                  >
                    Reset Password Link (Local Dev) <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form Actions */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            
            {/* Email field */}
            {(activeTab === 'login' || activeTab === 'register' || activeTab === 'otp' || activeTab === 'forgot') && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider px-1">Email / Username</label>
                <div className="relative group">
                  <Mail className="w-4.5 h-4.5 text-neutral-500 group-focus-within:text-brand-cyan absolute left-4 top-3.5 transition-colors" />
                  <input
                    type={activeTab === 'login' ? 'text' : 'email'}
                    required
                    placeholder={activeTab === 'login' ? "Enter email or username" : "student@college.edu"}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-black/40 border border-white/5 focus:border-brand-cyan/40 focus:ring-1 focus:ring-brand-cyan/20 rounded-2xl pl-12 pr-4 py-3.5 text-sm outline-none text-white transition-all placeholder:text-neutral-600 focus:bg-black/60"
                  />
                </div>
              </div>
            )}

            {/* Username field (Register only) */}
            {activeTab === 'register' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider px-1">Username</label>
                <div className="relative group">
                  <AtSign className="w-4.5 h-4.5 text-neutral-500 group-focus-within:text-brand-cyan absolute left-4 top-3.5 transition-colors" />
                  <input
                    type="text"
                    required
                    placeholder="student_handle"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-black/40 border border-white/5 focus:border-brand-cyan/40 focus:ring-1 focus:ring-brand-cyan/20 rounded-2xl pl-12 pr-4 py-3.5 text-sm outline-none text-white transition-all placeholder:text-neutral-600 focus:bg-black/60"
                  />
                </div>
              </div>
            )}

            {/* Display Name field (Register only) */}
            {activeTab === 'register' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider px-1">Display Name</label>
                <div className="relative group">
                  <User className="w-4.5 h-4.5 text-neutral-500 group-focus-within:text-brand-cyan absolute left-4 top-3.5 transition-colors" />
                  <input
                    type="text"
                    placeholder="Enter full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-black/40 border border-white/5 focus:border-brand-cyan/40 focus:ring-1 focus:ring-brand-cyan/20 rounded-2xl pl-12 pr-4 py-3.5 text-sm outline-none text-white transition-all placeholder:text-neutral-600 focus:bg-black/60"
                  />
                </div>
              </div>
            )}

            {/* OTP Code Input (OTP verification only) */}
            {activeTab === 'otp' && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider px-1">Verification Code</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="000000"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full bg-black/40 border border-white/5 focus:border-brand-cyan/40 focus:ring-1 focus:ring-brand-cyan/20 rounded-2xl py-3.5 text-center text-xl font-bold tracking-widest outline-none text-white transition-all focus:bg-black/60"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  className="text-xs font-semibold text-brand-orange hover:text-brand-orange/80 bg-transparent border-0 cursor-pointer self-center"
                >
                  Resend OTP Code
                </button>
              </div>
            )}

            {/* Password input */}
            {(activeTab === 'login' || activeTab === 'register' || activeTab === 'reset') && (
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between px-1">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                    {activeTab === 'reset' ? 'New Password' : 'Password'}
                  </label>
                  {activeTab === 'login' && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('forgot')}
                      className="text-[10px] font-bold text-brand-orange hover:text-brand-orange/80 bg-transparent border-0 cursor-pointer"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative group">
                  <Lock className="w-4.5 h-4.5 text-neutral-500 group-focus-within:text-brand-cyan absolute left-4 top-3.5 transition-colors" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-black/40 border border-white/5 focus:border-brand-cyan/40 focus:ring-1 focus:ring-brand-cyan/20 rounded-2xl pl-12 pr-4 py-3.5 text-sm outline-none text-white transition-all placeholder:text-neutral-600 focus:bg-black/60"
                  />
                </div>

                {/* Password strength meter for registration */}
                {activeTab === 'register' && password.length > 0 && (
                  <div className="flex flex-col gap-1 px-1 mt-1">
                    <div className="flex justify-between items-center text-[9px] font-bold text-neutral-500">
                      <span>Security Strength</span>
                      <span className="uppercase">{strength.label}</span>
                    </div>
                    <div className="h-1 w-full bg-black/60 rounded-full overflow-hidden flex gap-0.5">
                      <div className={`h-full flex-1 transition-all ${strength.score >= 1 ? strength.color : 'bg-transparent'}`} />
                      <div className={`h-full flex-1 transition-all ${strength.score >= 2 ? strength.color : 'bg-transparent'}`} />
                      <div className={`h-full flex-1 transition-all ${strength.score >= 3 ? strength.color : 'bg-transparent'}`} />
                      <div className={`h-full flex-1 transition-all ${strength.score >= 4 ? strength.color : 'bg-transparent'}`} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-brand-orange to-brand-cyan hover:opacity-95 text-black font-extrabold text-sm py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-brand-orange/10 active-shrink hover-scale disabled:opacity-50 mt-2 cursor-pointer border-0"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4.5 h-4.5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {activeTab === 'login' && 'Sign In to Portal'}
                  {activeTab === 'register' && 'Create Developer Account'}
                  {activeTab === 'otp' && 'Verify & Continue'}
                  {activeTab === 'forgot' && 'Send Reset Password Link'}
                  {activeTab === 'reset' && 'Reset Password'}
                </>
              )}
            </button>
          </form>

          {/* Social OAuth block */}
          {(activeTab === 'login' || activeTab === 'register') && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center my-1">
                <div className="flex-grow border-t border-white/5" />
                <span className="text-[9px] uppercase font-bold text-neutral-500 px-4 tracking-wider">Or continue with</span>
                <div className="flex-grow border-t border-white/5" />
              </div>

              <button
                onClick={simulateGoogleLogin}
                type="button"
                className="w-full bg-black/40 hover:bg-black/60 text-neutral-200 border border-white/5 py-3 rounded-2xl flex items-center justify-center gap-2.5 text-xs font-semibold active-shrink hover-scale cursor-pointer"
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

          {/* Footer Back navigation */}
          <div className="text-center text-xs text-neutral-400 font-medium">
            {activeTab === 'login' && (
              <>
                Don&apos;t have an account?{' '}
                <button 
                  onClick={() => { setActiveTab('register'); setError(''); }} 
                  className="text-brand-cyan hover:underline font-bold bg-transparent border-0 cursor-pointer"
                >
                  Create One
                </button>
              </>
            )}

            {activeTab === 'register' && (
              <>
                Already have an account?{' '}
                <button 
                  onClick={() => { setActiveTab('login'); setError(''); }} 
                  className="text-brand-cyan hover:underline font-bold bg-transparent border-0 cursor-pointer"
                >
                  Sign In
                </button>
              </>
            )}

            {(activeTab === 'otp' || activeTab === 'forgot' || activeTab === 'reset') && (
              <button 
                onClick={() => { setActiveTab('login'); setError(''); }} 
                className="text-brand-cyan hover:underline font-bold bg-transparent border-0 cursor-pointer"
              >
                Back to Sign In
              </button>
            )}
          </div>
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
