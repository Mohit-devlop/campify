'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { 
  X, Share2, Copy, Check, QrCode, Smartphone, 
  Send, ExternalLink, Sparkles, MessageSquare, Download
} from 'lucide-react';

interface ShareAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ShareAppModal({ isOpen, onClose }: ShareAppModalProps) {
  const [appUrl, setAppUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(true);
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setAppUrl(window.location.origin);
      if (typeof navigator !== 'undefined' && !!navigator.share) {
        setCanNativeShare(true);
      }
    }
  }, []);

  if (!isOpen) return null;

  const shareTitle = 'Campify - Campus Social & Collaboration Network';
  const shareText = 'Hey! Check out Campify - The all-in-one social & collaboration platform for students. Connect, watch learning reels, find hackathon teams, and level up!';

  // Native mobile share sheet
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: appUrl,
        });
      } catch (err) {
        // User cancelled or share failed
        console.log('Share dismissed:', err);
      }
    } else {
      handleCopyLink();
    }
  };

  // Copy link
  const handleCopyLink = () => {
    if (!appUrl) return;
    navigator.clipboard.writeText(appUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Pre-configured social share links
  const socialShares = [
    {
      name: 'WhatsApp',
      icon: '💬',
      color: 'bg-[#25D366]/15 text-[#25D366] border-[#25D366]/30 hover:bg-[#25D366]/25',
      url: `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + '\n\n' + appUrl)}`,
    },
    {
      name: 'Telegram',
      icon: '✈️',
      color: 'bg-[#0088cc]/15 text-[#0088cc] border-[#0088cc]/30 hover:bg-[#0088cc]/25',
      url: `https://t.me/share/url?url=${encodeURIComponent(appUrl)}&text=${encodeURIComponent(shareText)}`,
    },
    {
      name: 'X (Twitter)',
      icon: '🐦',
      color: 'bg-white/10 text-white border-white/20 hover:bg-white/20',
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(appUrl)}`,
    },
    {
      name: 'LinkedIn',
      icon: '💼',
      color: 'bg-[#0077b5]/15 text-[#0077b5] border-[#0077b5]/30 hover:bg-[#0077b5]/25',
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(appUrl)}`,
    },
    {
      name: 'Email',
      icon: '📧',
      color: 'bg-purple-500/15 text-purple-400 border-purple-500/30 hover:bg-purple-500/25',
      url: `mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(shareText + '\n\nOpen Link: ' + appUrl)}`,
    },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4 select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
          className="w-full max-w-md bg-brand-card/95 backdrop-blur-2xl border border-brand-cyan/25 rounded-[32px] p-6 flex flex-col gap-5 shadow-[0_25px_60px_rgba(0,0,0,0.6)] text-brand-text relative overflow-hidden"
        >
          {/* Ambient Corner Glow */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-cyan/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-brand-orange/10 rounded-full blur-3xl pointer-events-none" />

          {/* Modal Header */}
          <div className="flex items-center justify-between pb-3 border-b border-brand-cyan/15 relative z-10">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-orange via-purple-600 to-brand-cyan flex items-center justify-center shadow-lg shadow-brand-orange/25">
                <Share2 className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <h3 className="text-base font-extrabold tracking-tight text-white leading-none font-outfit">
                  Share Campify Web App
                </h3>
                <span className="text-[11px] text-neutral-400 mt-1">
                  Invite friends, classmates & study groups
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-brand-bg/60 border border-brand-cyan/20 text-neutral-400 hover:text-white active-shrink cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Native Share Button (Preferred on Mobile) */}
          {canNativeShare && (
            <button
              onClick={handleNativeShare}
              className="w-full py-3 px-4 rounded-2xl btn-primary-gradient text-white font-extrabold text-sm flex items-center justify-center gap-2.5 shadow-lg active-shrink cursor-pointer hover:opacity-95 transition-all"
            >
              <Smartphone className="w-5 h-5 text-white" />
              <span>Share via Phone Apps (WhatsApp, Messages...)</span>
            </button>
          )}

          {/* Quick Copy Link Box */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
              Web App URL
            </span>
            <div className="flex items-center gap-2 bg-brand-bg/80 border border-brand-cyan/20 rounded-2xl p-2 pl-3.5 shadow-inner">
              <span className="text-xs text-neutral-300 font-mono truncate flex-1">
                {appUrl || 'https://campify.app'}
              </span>
              <button
                onClick={handleCopyLink}
                className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border-0 ${
                  copied
                    ? 'bg-emerald-500 text-white shadow-md'
                    : 'bg-gradient-to-r from-brand-orange to-brand-cyan text-white hover:opacity-90 active-shrink shadow-sm'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 1-Click Social Shares */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
              Direct Social Share
            </span>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {socialShares.map((social) => (
                <a
                  key={social.name}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border text-xs font-bold no-underline transition-all active-shrink ${social.color}`}
                >
                  <span className="text-xl mb-1">{social.icon}</span>
                  <span className="text-[10px] font-semibold">{social.name}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Interactive QR Code Card */}
          <div className="flex flex-col items-center justify-center p-4 bg-brand-bg/50 border border-brand-cyan/20 rounded-2xl gap-3">
            <div className="flex items-center justify-between w-full text-xs">
              <span className="font-bold text-neutral-300 flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-brand-cyan" />
                Scan to Open on Mobile
              </span>
              <span className="text-[10px] text-neutral-500">Camera / Scanner</span>
            </div>

            <div className="p-3 bg-white rounded-2xl shadow-lg border-2 border-brand-cyan/30 flex items-center justify-center">
              {appUrl ? (
                <QRCodeSVG
                  value={appUrl}
                  size={140}
                  level="H"
                  includeMargin={false}
                  bgColor="#FFFFFF"
                  fgColor="#000000"
                />
              ) : (
                <div className="w-[140px] h-[140px] bg-neutral-100 flex items-center justify-center text-xs text-neutral-400">
                  Loading QR...
                </div>
              )}
            </div>

            <p className="text-[10px] text-neutral-400 text-center leading-relaxed">
              Anyone next to you can scan this QR code with their mobile phone camera to open Campify instantly!
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
