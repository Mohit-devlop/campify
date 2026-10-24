'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../store/authStore';
import { apiFetch } from '../lib/api';
import { extractBiometricDescriptor } from '../lib/biometrics';
import { ShieldCheck, ShieldAlert, Video, VideoOff, Eye, EyeOff, AlertTriangle } from 'lucide-react';

export default function ContinuousFaceMonitor() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [isEnabled, setIsEnabled] = useState(true);
  const [status, setStatus] = useState<'IDLE' | 'ACTIVE' | 'GRACE_PERIOD' | 'MISMATCH'>('IDLE');
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);
  const [isPrivacyShielded, setIsPrivacyShielded] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isCheckingRef = useRef(false);

  // Stop camera when unmounting or disabled
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setStatus('IDLE');
    setConsecutiveFailures(0);
  };

  const startCamera = async () => {
    if (streamRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setStatus('ACTIVE');
      setAlertMessage(null);
    } catch (err) {
      console.warn('Continuous biometric guard camera unavailable or denied:', err);
      // Report benign camera issue (zero strike)
      apiFetch('/security/report-camera-issue', {
        method: 'POST',
        body: JSON.stringify({ issueType: 'PERMISSION_OR_HARDWARE', message: 'Camera disabled or unavailable' }),
      }).catch(() => {});
      setStatus('IDLE');
    }
  };

  // Automatically start camera on login
  useEffect(() => {
    if (isAuthenticated && user && isEnabled && !streamRef.current) {
      startCamera();
    } else if (!isAuthenticated || !user) {
      stopCamera();
    }
  }, [isAuthenticated, user, isEnabled]);

  const toggleMonitoring = () => {
    if (isEnabled) {
      stopCamera();
      setIsEnabled(false);
    } else {
      setIsEnabled(true);
      startCamera();
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Periodic verification loop (every 3.5 seconds)
  useEffect(() => {
    if (!isEnabled || !isAuthenticated || status === 'MISMATCH') return;

    const runVerification = async () => {
      if (isCheckingRef.current || !videoRef.current || !canvasRef.current || !streamRef.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video.videoWidth === 0 || video.videoHeight === 0) {
        return; // camera still initializing
      }

      isCheckingRef.current = true;
      try {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          isCheckingRef.current = false;
          return;
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const bioData = extractBiometricDescriptor(canvas);

        // Benign lighting / user momentarily turned away: zero strike
        if (!bioData) {
          setStatus('GRACE_PERIOD');
          setAlertMessage('Camera lighting low or face turned away (Grace period active)');
          await apiFetch('/security/continuous-verify', {
            method: 'POST',
            body: JSON.stringify({
              isTechnicalError: true,
              technicalReason: 'Face not visible or lighting low',
            }),
          }).catch(() => {});
          isCheckingRef.current = false;
          return;
        }

        const res = await apiFetch('/security/continuous-verify', {
          method: 'POST',
          body: JSON.stringify({
            faceDescriptor: bioData.descriptor,
            consecutiveFailures,
          }),
        });

        const data = await res.json();

        if (res.ok && data.status === 'VERIFIED') {
          setStatus('ACTIVE');
          setConsecutiveFailures(0);
          setAlertMessage(null);
        } else if (data.status === 'GRACE_RETRY') {
          setStatus('GRACE_PERIOD');
          setConsecutiveFailures(1);
          setAlertMessage('⚠️ Face mismatch detected! Re-verifying identity...');
        } else if (res.status === 401 || res.status === 403 || data.action === 'LOCKOUT_SESSION' || data.action === 'TERMINATE_SESSION') {
          // Confirmed mismatch (e.g. friend or unauthorized person)!
          setStatus('MISMATCH');
          setIsPrivacyShielded(true);
          stopCamera();
          logout();
          setTimeout(() => {
            window.location.href = '/auth?reason=security_mismatch';
          }, 1200);
        }
      } catch (err) {
        console.error('Continuous verification error:', err);
      } finally {
        isCheckingRef.current = false;
      }
    };

    const interval = setInterval(runVerification, 3500);

    return () => clearInterval(interval);
  }, [isEnabled, isAuthenticated, consecutiveFailures, status, logout]);

  if (!isAuthenticated || !user) return null;

  return (
    <>
      {/* Privacy Shield Overlay if mismatch confirmed */}
      {isPrivacyShielded && (
        <div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-3xl flex flex-col items-center justify-center text-white p-6 text-center select-none animate-fadeIn">
          <div className="w-20 h-20 rounded-3xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-500 mb-6 shadow-2xl shadow-red-500/30 animate-pulse">
            <ShieldAlert className="w-12 h-12" />
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold font-outfit mb-3 text-red-400">
            Unauthorized Person Detected
          </h1>
          <p className="text-xs md:text-sm text-neutral-300 max-w-md mb-6 leading-relaxed">
            Continuous Biometric Guard detected an unregistered face. Your active session has been immediately terminated to protect private student chats, posts, and media.
          </p>
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            Returning to secure login portal...
          </div>
        </div>
      )}

      {/* Floating Status Pill & Live Biometric Indicator */}
      <div className="fixed bottom-20 md:bottom-6 right-4 z-40 flex flex-col items-end gap-2">
        {/* Offscreen active video and canvas elements (NOT display:none to guarantee real frame decoding) */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="pointer-events-none opacity-0 fixed"
          style={{ width: '320px', height: '240px', top: '-9999px', left: '-9999px' }}
        />
        <canvas
          ref={canvasRef}
          className="pointer-events-none opacity-0 fixed"
          style={{ width: '320px', height: '240px', top: '-9999px', left: '-9999px' }}
        />

        {/* Warning Toast if grace window or mismatch warning is active */}
        {alertMessage && isEnabled && (
          <div className="bg-amber-950/95 border border-amber-800/90 text-amber-200 text-[11px] font-medium py-1.5 px-3 rounded-xl max-w-[280px] shadow-2xl flex items-center gap-2 animate-fadeIn">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-bounce" />
            <span>{alertMessage}</span>
          </div>
        )}

        {/* Indicator Pill */}
        <div className="bg-neutral-900/95 backdrop-blur-xl border border-neutral-800 rounded-full py-1.5 px-3.5 shadow-2xl flex items-center gap-2.5 transition">
          {/* Status Dot */}
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              !isEnabled
                ? 'bg-neutral-600'
                : status === 'ACTIVE'
                ? 'bg-emerald-500 animate-pulse'
                : status === 'GRACE_PERIOD'
                ? 'bg-amber-500 animate-ping'
                : 'bg-red-500'
            }`}
          />

          <span className="text-[11px] font-semibold text-neutral-200">
            {!isEnabled
              ? 'Biometric Guard: Off'
              : status === 'ACTIVE'
              ? 'Face Guard: Active'
              : status === 'GRACE_PERIOD'
              ? 'Guard: Checking...'
              : 'Guard: Mismatch'}
          </span>

          {/* Toggle Button */}
          <button
            type="button"
            onClick={toggleMonitoring}
            title={isEnabled ? 'Disable continuous camera guard' : 'Enable continuous camera guard'}
            className="p-1 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-white transition cursor-pointer"
          >
            {isEnabled ? <Video className="w-3.5 h-3.5 text-emerald-400" /> : <VideoOff className="w-3.5 h-3.5 text-neutral-500" />}
          </button>
        </div>
      </div>
    </>
  );
}
