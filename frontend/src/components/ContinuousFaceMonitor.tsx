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
  const [isEnabled, setIsEnabled] = useState(false);
  const [status, setStatus] = useState<'IDLE' | 'ACTIVE' | 'GRACE_PERIOD' | 'MISMATCH'>('IDLE');
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);
  const [isPrivacyShielded, setIsPrivacyShielded] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

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
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setStatus('ACTIVE');
      setAlertMessage(null);
    } catch (err) {
      console.warn('Continuous face verification camera permission denied/unavailable:', err);
      // Report benign camera issue (zero strike)
      apiFetch('/security/report-camera-issue', {
        method: 'POST',
        body: JSON.stringify({ issueType: 'PERMISSION_OR_HARDWARE', message: 'Camera disabled or unavailable' }),
      }).catch(() => {});
      setIsEnabled(false);
    }
  };

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

  // Periodic verification loop (every 12 seconds when enabled)
  useEffect(() => {
    if (!isEnabled || !isAuthenticated || status === 'MISMATCH') return;

    const interval = setInterval(async () => {
      if (!videoRef.current || !canvasRef.current || !streamRef.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video.videoWidth === 0 || video.videoHeight === 0) {
        return; // camera warming up
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const bioData = extractBiometricDescriptor(canvas);

      // Handle benign camera glitch / poor lighting
      if (!bioData) {
        setStatus('GRACE_PERIOD');
        setAlertMessage('Camera lighting low or face turned away (Grace period)');
        await apiFetch('/security/continuous-verify', {
          method: 'POST',
          body: JSON.stringify({
            isTechnicalError: true,
            technicalReason: 'Face not clearly visible or poor lighting condition',
          }),
        }).catch(() => {});
        return;
      }

      try {
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
          setConsecutiveFailures(data.consecutiveFailures || consecutiveFailures + 1);
          setAlertMessage(`Verification anomaly: Grace retry ${data.consecutiveFailures}/3`);
        } else if (res.status === 401 || res.status === 403 || data.action === 'LOCKOUT_SESSION' || data.action === 'TERMINATE_SESSION') {
          // Confirmed mismatch / lockout!
          setStatus('MISMATCH');
          setIsPrivacyShielded(true);
          stopCamera();
          alert('Security Violation: Facial identity mismatch confirmed. Terminating session to protect private student content.');
          logout();
          router.push('/auth');
        }
      } catch (err) {
        console.error('Continuous verification error:', err);
      }
    }, 12000);

    return () => clearInterval(interval);
  }, [isEnabled, isAuthenticated, consecutiveFailures, status, logout, router]);

  if (!isAuthenticated || !user) return null;

  return (
    <>
      {/* Privacy Shield Overlay if mismatch confirmed */}
      {isPrivacyShielded && (
        <div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-3xl flex flex-col items-center justify-center text-white p-6 text-center select-none">
          <ShieldAlert className="w-16 h-16 text-red-500 mb-4 animate-bounce" />
          <h1 className="text-2xl font-bold font-outfit mb-2">Private Content Shielded</h1>
          <p className="text-sm text-neutral-400 max-w-md mb-6">
            An identity mismatch was confirmed during active biometric monitoring. Your session has been safely terminated.
          </p>
        </div>
      )}

      {/* Floating Status Pill & Camera HUD in bottom right */}
      <div className="fixed bottom-20 md:bottom-6 right-4 z-40 flex flex-col items-end gap-2">
        {/* Hidden video & canvas elements */}
        <video ref={videoRef} autoPlay playsInline muted className="hidden" />
        <canvas ref={canvasRef} className="hidden" />

        {/* Indicator Pill */}
        <div className="bg-neutral-900/90 backdrop-blur-md border border-neutral-800 rounded-full py-1.5 px-3 shadow-xl flex items-center gap-2.5 transition">
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
              ? 'Security Guard: Active'
              : status === 'GRACE_PERIOD'
              ? 'Guard: Grace Window'
              : 'Guard: Mismatch'}
          </span>

          {/* Toggle Button */}
          <button
            type="button"
            onClick={toggleMonitoring}
            title={isEnabled ? 'Disable continuous camera monitoring' : 'Enable continuous camera monitoring'}
            className="p-1 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-white transition"
          >
            {isEnabled ? <Video className="w-3.5 h-3.5 text-emerald-400" /> : <VideoOff className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Warning Toast if grace period is active */}
        {alertMessage && isEnabled && (
          <div className="bg-amber-950/90 border border-amber-800/80 text-amber-200 text-[10px] font-medium py-1 px-2.5 rounded-lg max-w-[240px] shadow-lg flex items-center gap-1.5 animate-fadeIn">
            <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
            <span>{alertMessage}</span>
          </div>
        )}
      </div>
    </>
  );
}
