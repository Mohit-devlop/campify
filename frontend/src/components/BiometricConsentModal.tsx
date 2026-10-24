'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Eye, Lock, CheckCircle2, AlertCircle } from 'lucide-react';

interface BiometricConsentModalProps {
  isOpen: boolean;
  studentName?: string;
  enrollmentId?: string;
  onConsentGiven: () => void;
  onDecline: () => void;
}

export default function BiometricConsentModal({
  isOpen,
  studentName,
  enrollmentId,
  onConsentGiven,
  onDecline,
}: BiometricConsentModalProps) {
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleProceed = () => {
    if (!agreed) {
      setError('You must confirm your informed consent by checking the box before proceeding.');
      return;
    }
    setError('');
    onConsentGiven();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl p-6 md:p-8 shadow-2xl text-white relative overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-2xl bg-brand-orange/20 border border-brand-orange/30 flex items-center justify-center text-brand-orange">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-outfit text-white">Informed Biometric Consent</h2>
              <p className="text-xs text-neutral-400">College Security & Facial Verification Protocol</p>
            </div>
          </div>

          {/* Student metadata banner */}
          {(studentName || enrollmentId) && (
            <div className="bg-neutral-800/60 border border-neutral-700/60 rounded-xl p-3 mb-5 flex justify-between items-center text-xs">
              <div>
                <span className="text-neutral-400">Student: </span>
                <span className="font-semibold text-white">{studentName || 'College Student'}</span>
              </div>
              <div>
                <span className="text-neutral-400">Enrollment ID: </span>
                <span className="font-mono font-bold text-brand-orange">{enrollmentId || 'N/A'}</span>
              </div>
            </div>
          )}

          {/* Disclosures */}
          <div className="space-y-3 text-xs text-neutral-300 leading-relaxed max-h-60 overflow-y-auto pr-2 custom-scrollbar">
            <div className="flex gap-2.5 items-start">
              <Eye className="w-4 h-4 text-brand-cyan shrink-0 mt-0.5" />
              <p>
                <strong>Facial Verification Purpose:</strong> Facial scans are used exclusively to protect your collegiate identity, prevent account impersonation, and enable verified campus logins.
              </p>
            </div>
            <div className="flex gap-2.5 items-start">
              <Lock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <p>
                <strong>Template Security:</strong> Your raw face images and video feeds are <em>never stored or transmitted</em>. Only a mathematical 128-dimensional biometric descriptor vector is securely hashed and stored.
              </p>
            </div>
            <div className="flex gap-2.5 items-start">
              <ShieldCheck className="w-4 h-4 text-brand-orange shrink-0 mt-0.5" />
              <p>
                <strong>Three-Strike Policy:</strong> Repeated unverified identity mismatches will trigger security strikes. Strike 3 locks the account until college administrators verify your student identity. Your posts, reels, and data are never deleted.
              </p>
            </div>
          </div>

          {/* Agreement Checkbox */}
          <div className="mt-6 pt-4 border-t border-neutral-800">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => {
                  setAgreed(e.target.checked);
                  if (e.target.checked) setError('');
                }}
                className="mt-1 w-4 h-4 rounded border-neutral-700 text-brand-orange focus:ring-brand-orange bg-neutral-800 cursor-pointer"
              />
              <span className="text-xs text-neutral-300">
                I hereby grant informed consent for KILOGRAM college security to generate and store my biometric facial descriptor vector for session authentication.
              </span>
            </label>
          </div>

          {error && (
            <div className="mt-3 flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-2.5 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={onDecline}
              className="flex-1 py-3 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition"
            >
              Decline & Cancel
            </button>
            <button
              type="button"
              onClick={handleProceed}
              disabled={!agreed}
              className={`flex-1 py-3 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition ${
                agreed
                  ? 'bg-gradient-to-r from-brand-orange to-red-500 text-white shadow-lg shadow-brand-orange/20 cursor-pointer'
                  : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              Consent & Continue
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
