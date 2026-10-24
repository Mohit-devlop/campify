'use client';

import { useState, useRef, useEffect } from 'react';
import { Camera, CheckCircle2, RefreshCw, AlertTriangle, ShieldCheck, Loader2 } from 'lucide-react';
import { extractBiometricDescriptor, FaceBiometricData } from '../lib/biometrics';

interface FaceCaptureCameraProps {
  mode: 'ENROLL' | 'VERIFY';
  onCaptureComplete: (data: FaceBiometricData) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

export default function FaceCaptureCamera({
  mode,
  onCaptureComplete,
  onCancel,
  isLoading = false,
}: FaceCaptureCameraProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [livenessStage, setLivenessStage] = useState<'ALIGN' | 'BLINK' | 'READY'>('ALIGN');
  const [qualityFeedback, setQualityFeedback] = useState<string>('Align your face inside the circle');
  const [capturedData, setCapturedData] = useState<FaceBiometricData | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    let active = true;

    async function initCamera() {
      try {
        setCameraError(null);
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user',
          },
          audio: false,
        });

        if (!active) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }

        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err: any) {
        console.error('Camera access error:', err);
        setCameraError(
          err.name === 'NotAllowedError'
            ? 'Camera permission denied. Please allow camera access in your browser to verify identity.'
            : 'Unable to access camera hardware. Please check your webcam connection.'
        );
      }
    }

    initCamera();

    return () => {
      active = false;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Periodic frame analysis for liveness feedback
  useEffect(() => {
    if (!stream || !videoRef.current || capturedData) return;

    const interval = setInterval(() => {
      if (!videoRef.current || !canvasRef.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video.videoWidth > 0 && video.videoHeight > 0) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const bio = extractBiometricDescriptor(canvas);

          if (!bio) {
            setQualityFeedback('Position your face clearly in good lighting');
            setLivenessStage('ALIGN');
          } else {
            if (bio.qualityScore < 0.3) {
              setQualityFeedback('Lighting is too low. Move to a brighter area.');
            } else {
              setQualityFeedback('Face detected! Keep steady to capture biometric scan');
              setLivenessStage('READY');
            }
          }
        }
      }
    }, 600);

    return () => clearInterval(interval);
  }, [stream, capturedData]);

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsScanning(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setIsScanning(false);
      return;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const bioData = extractBiometricDescriptor(canvas);

    if (!bioData) {
      setQualityFeedback('No face detected. Please face the camera directly in good lighting.');
      setIsScanning(false);
      return;
    }

    setCapturedData(bioData);
    setIsScanning(false);
    onCaptureComplete(bioData);
  };

  const handleRetake = () => {
    setCapturedData(null);
    setLivenessStage('ALIGN');
  };

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto text-white">
      {/* Viewport Frame */}
      <div className="relative w-full aspect-square max-w-[340px] bg-neutral-950 rounded-3xl overflow-hidden border-2 border-neutral-800 shadow-2xl flex items-center justify-center">
        {/* Hidden internal canvas for frame analysis */}
        <canvas ref={canvasRef} className="hidden" />

        {cameraError ? (
          <div className="p-6 text-center text-xs flex flex-col items-center gap-3">
            <AlertTriangle className="w-10 h-10 text-amber-500" />
            <p className="text-neutral-300">{cameraError}</p>
            <p className="text-neutral-500 text-[11px]">
              Camera verification is mandatory for verified college accounts.
            </p>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform -scale-x-100"
            />

            {/* Futuristic Biometric Scanning Oval HUD */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div
                className={`w-[72%] h-[80%] rounded-[50%] border-2 transition-all duration-300 ${
                  livenessStage === 'READY'
                    ? 'border-emerald-500 shadow-[0_0_25px_rgba(16,185,129,0.4)]'
                    : 'border-brand-orange/60 shadow-[0_0_15px_rgba(255,107,0,0.2)]'
                }`}
              />

              {/* Scanning laser animation during capture */}
              {isScanning && (
                <div className="absolute inset-x-8 top-12 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse" />
              )}
            </div>

            {/* Status chip */}
            <div className="absolute top-3 left-3 bg-neutral-900/80 backdrop-blur-md border border-neutral-700/60 px-3 py-1 rounded-full flex items-center gap-2 text-[11px]">
              <span
                className={`w-2 h-2 rounded-full ${
                  livenessStage === 'READY' ? 'bg-emerald-500 animate-ping' : 'bg-brand-orange'
                }`}
              />
              <span className="font-medium text-neutral-200">
                {mode === 'ENROLL' ? 'Face Enrollment' : 'Identity Verification'}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Guidance Message */}
      <div className="mt-4 text-center px-4">
        <p className="text-xs font-medium text-neutral-300">{qualityFeedback}</p>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex gap-3 w-full max-w-[340px]">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading || isScanning}
            className="flex-1 py-3 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition"
          >
            Cancel
          </button>
        )}

        {capturedData ? (
          <button
            type="button"
            onClick={handleRetake}
            disabled={isLoading}
            className="flex-1 py-3 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold flex items-center justify-center gap-2 transition"
          >
            <RefreshCw className="w-4 h-4" />
            Retake Scan
          </button>
        ) : (
          <button
            type="button"
            onClick={handleCapture}
            disabled={isLoading || isScanning || !!cameraError}
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-brand-orange to-red-500 hover:from-brand-orange/90 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-brand-orange/20 cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading || isScanning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing Vector...
              </>
            ) : (
              <>
                <Camera className="w-4 h-4" />
                Capture & Verify
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
