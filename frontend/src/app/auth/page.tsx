'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '../../store/authStore';
import { apiFetch } from '../../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Mail, Lock, User, AtSign, Loader2, CheckCircle2,
  ArrowLeft, ShieldCheck, ShieldAlert, GraduationCap, AlertTriangle, RefreshCw
} from 'lucide-react';
import SpaceBackground from '../../components/SpaceBackground';
import BiometricConsentModal from '../../components/BiometricConsentModal';
import FaceCaptureCamera from '../../components/FaceCaptureCamera';
import { FaceBiometricData } from '../../lib/biometrics';

type Tab = 'login' | 'register' | 'otp' | 'face-enroll' | 'face-verify' | 'locked';

function AuthPageContent() {
  const router = useRouter();
  const { setAuth, isAuthenticated, isInitialized } = useAuthStore();

  const [activeTab, setActiveTab] = useState<Tab>('login');
  const [lastTab, setLastTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [enrollmentId, setEnrollmentId] = useState('');
  const [enrollmentVerified, setEnrollmentVerified] = useState(false);
  const [enrollmentStudentName, setEnrollmentStudentName] = useState('');
  const [isValidatingEnrollment, setIsValidatingEnrollment] = useState(false);

  const [otpValues, setOtpValues] = useState<string[]>(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // Biometrics & Consent state
  const [isConsentModalOpen, setIsConsentModalOpen] = useState(false);
  const [userIdForBiometrics, setUserIdForBiometrics] = useState<string>('');
  const [strikeWarning, setStrikeWarning] = useState<string | null>(null);

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
    if (typeof window !== 'undefined') {
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
      const params = new URLSearchParams(window.location.search);
      if (params.get('reason') === 'security_mismatch') {
        setError('Security Alert: Live face mismatch detected during active session. Your session was automatically terminated to protect your private account.');
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
    if (activeTab !== 'otp' && activeTab !== 'locked') {
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
        new Notification('KILOGRAM Security Passcode', {
          body: `Your 6-digit verification code is ${otpCode}.`,
          icon: '/icons/icon-192x192.png',
        } as any);
      } catch (err) {
        console.error('Failed to show push notification:', err);
      }
    }
  };

  // Authoritative College Enrollment ID verification
  const handleVerifyEnrollmentId = async () => {
    if (!enrollmentId.trim()) {
      setError('Please enter your college enrollment ID');
      return;
    }
    if (!email.trim()) {
      setError('Please enter your institutional email to verify registry match');
      return;
    }

    setIsValidatingEnrollment(true);
    setError('');

    try {
      const res = await apiFetch('/security/enrollment/validate', {
        method: 'POST',
        body: JSON.stringify({
          enrollmentId: enrollmentId.trim().toUpperCase(),
          email: email.trim().toLowerCase(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setEnrollmentVerified(true);
        setEnrollmentStudentName(data.studentName || '');
        if (!name && data.studentName) {
          setName(data.studentName);
        }
        setSuccessMsg(`Authoritative Match: Verified student '${data.studentName}' (${data.department || 'College'})`);
      } else {
        setEnrollmentVerified(false);
        setError(data.error || 'Enrollment ID could not be validated against the college registry.');
      }
    } catch (err) {
      console.error(err);
      setError('Connection error verifying enrollment ID with college registry.');
    } finally {
      setIsValidatingEnrollment(false);
    }
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email.trim()) return;

    // In registration mode, enforce authoritative enrollment check first
    if (activeTab === 'register' && !enrollmentVerified) {
      setError('Please click "Verify ID" to validate your enrollment against the college student registry first.');
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
          email,
          password,
          username: targetFlow === 'register' ? username : undefined,
          name: targetFlow === 'register' ? name : undefined,
          enrollmentId: targetFlow === 'register' ? enrollmentId.trim().toUpperCase() : undefined,
          flow: targetFlow,
        }),
      });
      const data = await res.json();

      if (res.status === 403 && data.securityLocked) {
        setActiveTab('locked');
        return;
      }

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
          setSuccessMsg('A secure random 6-digit OTP code has been sent to your college email inbox.');
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

  // Direct Student Sign In (Password + Face Match Verification)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email or username and password');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccessMsg('');
    setStrikeWarning(null);

    try {
      const res = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          identifier: email.trim(),
          password,
        }),
      });

      const data = await res.json();

      if (res.status === 403 && data.securityLocked) {
        setActiveTab('locked');
        return;
      }

      if (!res.ok) {
        setError(data.error || 'Invalid username/email or password');
        return;
      }

      // Step 1: User has enrolled face -> Open Face Verification Camera!
      if (data.requiresFaceVerification) {
        setEmail(data.email || email);
        setUserIdForBiometrics(data.userId);
        setSuccessMsg('Password verified! Look at the camera to match your face with your signup profile.');
        setActiveTab('face-verify');
        return;
      }

      // Step 2: User doesn't have face enrolled yet -> Require face enrollment!
      if (data.requiresFaceEnrollment) {
        setEmail(data.email || email);
        setUserIdForBiometrics(data.userId);
        setIsConsentModalOpen(true);
        return;
      }

      // Direct authentication (admin or completed)
      setSuccessMsg('Authentication successful! Connecting dashboard...');
      setAuth(data.user, data.accessToken, data.refreshToken);
      router.push('/');
    } catch (err) {
      console.error(err);
      setError('Network error during login. Please try again.');
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

      if (res.status === 403 && data.securityLocked) {
        setActiveTab('locked');
        return;
      }

      if (res.ok) {
        // Step A: New registration requiring informed biometric consent & face enrollment
        if (data.requiresFaceEnrollment) {
          setUserIdForBiometrics(data.userId);
          setIsConsentModalOpen(true);
          return;
        }

        // Step B: Account with enrolled face requiring facial verification at login
        if (data.requiresFaceVerification) {
          setSuccessMsg('OTP verified! Proceed with face biometric verification.');
          setActiveTab('face-verify');
          return;
        }

        // Step C: Complete direct authentication (if no biometrics required)
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

  // Callback when informed consent is confirmed
  const handleConsentConfirmed = () => {
    setIsConsentModalOpen(false);
    setActiveTab('face-enroll');
  };

  // Callback when face is captured during signup enrollment
  const handleFaceEnrollmentCapture = async (bioData: FaceBiometricData) => {
    setIsLoading(true);
    setError('');

    try {
      const res = await apiFetch('/security/face/enroll', {
        method: 'POST',
        body: JSON.stringify({
          userId: userIdForBiometrics,
          faceDescriptor: bioData.descriptor,
          consentGiven: true,
          livenessScore: bioData.livenessScore,
          landmarks: bioData.landmarks,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        if (data.accessToken && data.user) {
          setSuccessMsg('Face biometric registered and verified successfully! Connecting dashboard...');
          setAuth(data.user, data.accessToken, data.refreshToken);
          router.push('/');
        } else {
          setSuccessMsg('Facial biometric enrolled and saved successfully! Please sign in with your credentials and face match.');
          setActiveTab('login');
          setPassword('');
        }
      } else {
        setError(data.error || 'Failed to complete facial biometric enrollment.');
      }
    } catch (err) {
      console.error(err);
      setError('Network error saving facial enrollment.');
    } finally {
      setIsLoading(false);
    }
  };

  // Callback when face is captured during login verification
  const handleFaceVerifyCapture = async (bioData: FaceBiometricData) => {
    setIsLoading(true);
    setError('');

    try {
      const res = await apiFetch('/security/face/verify-login', {
        method: 'POST',
        body: JSON.stringify({
          email,
          faceDescriptor: bioData.descriptor,
          livenessPassed: true,
          livenessScore: bioData.livenessScore,
        }),
      });

      const data = await res.json();

      if (res.status === 403 && data.securityLocked) {
        // Third strike lockout!
        setActiveTab('locked');
        return;
      }

      if (res.ok) {
        setSuccessMsg('Face matched with your enrolled signup profile! Access Granted.');
        setAuth(data.user, data.accessToken, data.refreshToken);
        router.push('/');
      } else {
        const warning = data.error || (data.strikeCount
          ? `Face mismatch! Scanned face does not match your enrolled face from signup. Strike ${data.strikeCount}/3 recorded.`
          : 'Verification failed. Please try again.');
        setError(warning);
        setStrikeWarning(warning);
      }
    } catch (err) {
      console.error(err);
      setError('Network error verifying biometric face.');
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

  return (
    <div className="min-h-screen w-full flex flex-col bg-brand-bg text-brand-text relative overflow-hidden select-none font-sans">
      <SpaceBackground />

      {/* Background Animated Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-brand-orange/10 rounded-full blur-[120px] pointer-events-none animate-blob z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-brand-cyan/10 rounded-full blur-[120px] pointer-events-none animate-blob-delayed z-0" />

      {/* Global Top Navbar */}
      <header className="w-full px-6 py-5 md:px-12 md:py-6 flex justify-between items-center relative z-20">
        <Link href="/" className="flex items-center gap-3 no-underline">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-orange to-red-500 flex items-center justify-center shadow-lg shadow-brand-orange/20">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <span className="font-outfit font-extrabold text-2xl tracking-tight text-brand-text">
            KILOGRAM<span className="text-brand-orange">.</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 bg-neutral-900/60 border border-neutral-800 px-3 py-1.5 rounded-full flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Verified College Security
          </span>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex items-center justify-center px-4 py-8 relative z-10">
        <div className="w-full max-w-md bg-neutral-900/90 border border-neutral-800/80 rounded-3xl p-6 md:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">

          {/* ======================================================== */}
          {/* TAB: SECURITY LOCKED NOTICE (SECTION 6 REQUIREMENT)       */}
          {/* ======================================================== */}
          {activeTab === 'locked' ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center text-center py-4"
            >
              <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-5 shadow-lg shadow-red-500/10">
                <ShieldAlert className="w-9 h-9" />
              </div>

              <h2 className="text-xl font-bold font-outfit text-white mb-3">Account Security Locked</h2>

              {/* Exact Mandated User Facing Lock Message */}
              <div className="bg-red-950/40 border border-red-900/60 rounded-2xl p-4 mb-6 text-left">
                <p className="text-xs text-red-200 leading-relaxed font-medium">
                  &ldquo;Your account has been temporarily locked after repeated security verification failures. Contact your college KILOGRAM administrator for identity review. Your account data has not been deleted.&rdquo;
                </p>
              </div>

              <div className="space-y-2 text-xs text-neutral-400 mb-6 text-left w-full bg-neutral-800/40 p-3.5 rounded-xl border border-neutral-800">
                <p className="flex items-center gap-2 font-medium text-neutral-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  All posts, reels, messages, and profiles remain intact.
                </p>
                <p className="flex items-center gap-2 font-medium text-neutral-300">
                  <ShieldCheck className="w-4 h-4 text-brand-orange shrink-0" />
                  Self-service unlocking is disabled per college policy.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('login');
                  setError('');
                }}
                className="w-full py-3.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition"
              >
                Return to Sign In Portal
              </button>
            </motion.div>
          ) : activeTab === 'face-enroll' ? (
            /* ======================================================== */
            /* TAB: FACE BIOMETRIC ENROLLMENT                            */
            /* ======================================================== */
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center"
            >
              <h2 className="text-lg font-bold font-outfit text-white mb-1">Face Biometric Enrollment</h2>
              <p className="text-xs text-neutral-400 text-center mb-6">
                Register your verified collegiate facial template for secure logins.
              </p>

              {error && (
                <div className="w-full mb-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <FaceCaptureCamera
                mode="ENROLL"
                onCaptureComplete={handleFaceEnrollmentCapture}
                onCancel={() => setActiveTab('register')}
                isLoading={isLoading}
              />
            </motion.div>
          ) : activeTab === 'face-verify' ? (
            /* ======================================================== */
            /* TAB: FACE BIOMETRIC VERIFICATION (LOGIN STEP 3)           */
            /* ======================================================== */
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center"
            >
              <h2 className="text-lg font-bold font-outfit text-white mb-1">Face Identity Verification</h2>
              <p className="text-xs text-neutral-400 text-center mb-4">
                Verify identity against your enrolled college account template.
              </p>

              {strikeWarning && (
                <div className="w-full mb-4 bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs p-3 rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{strikeWarning}</span>
                </div>
              )}

              <FaceCaptureCamera
                mode="VERIFY"
                onCaptureComplete={handleFaceVerifyCapture}
                onCancel={() => {
                  setActiveTab('login');
                  setError('');
                  setStrikeWarning(null);
                }}
                isLoading={isLoading}
                errorMessage={error}
              />
            </motion.div>
          ) : activeTab === 'otp' ? (
            /* ======================================================== */
            /* TAB: 6-DIGIT OTP VERIFICATION                           */
            /* ======================================================== */
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-5"
            >
              <div className="flex items-center gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setActiveTab(lastTab)}
                  className="p-1 rounded-lg text-neutral-400 hover:text-white transition"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="text-lg font-bold font-outfit text-white">Email Verification Code</h2>
                  <p className="text-xs text-neutral-400">Sent to {email}</p>
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl">
                  {error}
                </div>
              )}

              {successMsg && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs p-3 rounded-xl">
                  {successMsg}
                </div>
              )}

              {/* 6 Digit Numeric Inputs */}
              <div className="flex justify-between gap-2 my-2">
                {otpValues.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`otp-${idx}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(e.target.value, idx)}
                    onKeyDown={(e) => handleOtpKeyDown(e, idx)}
                    onPaste={handleOtpPaste}
                    className="w-12 h-14 bg-neutral-800/80 border border-neutral-700 focus:border-brand-orange focus:ring-1 focus:ring-brand-orange rounded-xl text-center text-xl font-bold font-mono text-white outline-none transition"
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={() => handleSubmitOtp(otpValues.join(''))}
                disabled={isLoading || otpValues.join('').length !== 6}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-brand-orange to-red-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-brand-orange/20 disabled:opacity-50 transition cursor-pointer"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verifying Passcode...
                  </span>
                ) : (
                  'Verify & Proceed'
                )}
              </button>

              <div className="text-center text-xs text-neutral-400">
                {canResend ? (
                  <button
                    type="button"
                    onClick={() => handleSendOtp()}
                    className="text-brand-orange hover:underline font-semibold"
                  >
                    Resend Verification Code
                  </button>
                ) : (
                  <span>Resend code in {resendTimer}s</span>
                )}
              </div>
            </motion.div>
          ) : (
            /* ======================================================== */
            /* TAB: LOGIN & REGISTRATION FORMS                         */
            /* ======================================================== */
            <div>
              {/* Tab Selector */}
              <div className="flex bg-neutral-800/70 p-1 rounded-2xl mb-6 border border-neutral-800">
                <button
                  type="button"
                  onClick={() => setActiveTab('login')}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition ${
                    activeTab === 'login'
                      ? 'bg-neutral-900 text-white shadow-md'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Student Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('register')}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition ${
                    activeTab === 'register'
                      ? 'bg-neutral-900 text-white shadow-md'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  New Enrollment
                </button>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl mb-4">
                  {error}
                </div>
              )}

              {successMsg && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs p-3 rounded-xl mb-4">
                  {successMsg}
                </div>
              )}

              <form onSubmit={activeTab === 'login' ? handleLogin : handleSendOtp} className="space-y-4">
                {/* 1. College Enrollment ID (Required for registration) */}
                {activeTab === 'register' && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider px-1">
                      College Enrollment ID
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <GraduationCap className="w-4.5 h-4.5 text-neutral-500 absolute left-4 top-3.5" />
                        <input
                          type="text"
                          required
                          placeholder="e.g. KIL2024CS001"
                          value={enrollmentId}
                          onChange={(e) => {
                            setEnrollmentId(e.target.value.toUpperCase());
                            setEnrollmentVerified(false);
                          }}
                          className={`w-full bg-neutral-800/60 border rounded-xl pl-11 pr-3 py-3 text-sm outline-none text-white font-mono uppercase transition ${
                            enrollmentVerified ? 'border-emerald-500/70 text-emerald-300' : 'border-neutral-700'
                          }`}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleVerifyEnrollmentId}
                        disabled={isValidatingEnrollment || !enrollmentId.trim() || !email.trim()}
                        className={`px-4 py-3 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                          enrollmentVerified
                            ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                            : 'bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700'
                        }`}
                      >
                        {isValidatingEnrollment ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : enrollmentVerified ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          'Verify ID'
                        )}
                        {enrollmentVerified ? 'Verified' : 'Verify'}
                      </button>
                    </div>
                    {enrollmentStudentName && (
                      <span className="text-[11px] text-emerald-400 px-1 font-medium">
                        Registry Match: {enrollmentStudentName}
                      </span>
                    )}
                  </div>
                )}

                {/* Email Address / Username */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider px-1">
                    {activeTab === 'login' ? 'Institutional Email or Username' : 'Institutional Email Address'}
                  </label>
                  <div className="relative">
                    <Mail className="w-4.5 h-4.5 text-neutral-500 absolute left-4 top-3.5" />
                    <input
                      type={activeTab === 'login' ? 'text' : 'email'}
                      required
                      placeholder={activeTab === 'login' ? 'student@college.edu or handle' : 'student@college.edu'}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-neutral-800/60 border border-neutral-700 focus:border-brand-orange rounded-xl pl-11 pr-4 py-3 text-sm outline-none text-white transition"
                    />
                  </div>
                </div>

                {/* Registration Extra Fields */}
                {activeTab === 'register' && (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider px-1">
                        Username
                      </label>
                      <div className="relative">
                        <AtSign className="w-4.5 h-4.5 text-neutral-500 absolute left-4 top-3.5" />
                        <input
                          type="text"
                          required
                          placeholder="student_handle"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="w-full bg-neutral-800/60 border border-neutral-700 focus:border-brand-orange rounded-xl pl-11 pr-4 py-3 text-sm outline-none text-white transition"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider px-1">
                        Student Full Name
                      </label>
                      <div className="relative">
                        <User className="w-4.5 h-4.5 text-neutral-500 absolute left-4 top-3.5" />
                        <input
                          type="text"
                          required
                          placeholder="Your Name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full bg-neutral-800/60 border border-neutral-700 focus:border-brand-orange rounded-xl pl-11 pr-4 py-3 text-sm outline-none text-white transition"
                        />
                      </div>
                    </div>
                  </>
                )}

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
                      className="w-full bg-neutral-800/60 border border-neutral-700 focus:border-brand-orange rounded-xl pl-11 pr-4 py-3 text-sm outline-none text-white transition"
                    />
                  </div>

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

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 mt-2 rounded-xl bg-gradient-to-r from-brand-orange to-red-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-brand-orange/20 hover:opacity-95 transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {activeTab === 'login' ? 'Authenticating Credentials...' : 'Sending Security Passcode...'}
                    </>
                  ) : activeTab === 'login' ? (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      Sign In with Face Verification
                    </>
                  ) : (
                    <>
                      <GraduationCap className="w-4 h-4" />
                      Verify Enrollment & Continue
                    </>
                  )}
                </button>

                {activeTab === 'login' && (
                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => handleSendOtp()}
                      className="text-[11px] text-neutral-400 hover:text-brand-orange transition underline underline-offset-4 cursor-pointer"
                    >
                      Prefer Email OTP? Click here to sign in with 6-digit code
                    </button>
                  </div>
                )}
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Informed Biometric Consent Modal */}
      <BiometricConsentModal
        isOpen={isConsentModalOpen}
        studentName={name || enrollmentStudentName}
        enrollmentId={enrollmentId}
        onConsentGiven={handleConsentConfirmed}
        onDecline={() => {
          setIsConsentModalOpen(false);
          setActiveTab('register');
        }}
      />
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