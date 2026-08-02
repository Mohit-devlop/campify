'use client';

import { useEffect, useState } from 'react';
import { Download, X, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function PwaInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [showHelper, setShowHelper] = useState(false);

  useEffect(() => {
    // 1. Listen for the native PWA install prompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 2. Hide button if the app is successfully installed
    window.addEventListener('appinstalled', () => {
      console.log('Campify PWA installed successfully');
      setIsVisible(false);
      setDeferredPrompt(null);
    });

    // 3. For preview & testing (if not already running inside standalone app shell)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (!isStandalone) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 3000);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = () => {
    if (deferredPrompt) {
      // Trigger native browser install prompt
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted PWA installation');
        } else {
          console.log('User dismissed PWA installation');
        }
        setDeferredPrompt(null);
        setIsVisible(false);
      });
    } else {
      // Fallback helper modal for Safari/Firefox/Other browsers
      setShowHelper(true);
    }
  };

  return (
    <>
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 50 }}
            className="fixed bottom-20 md:bottom-6 right-6 z-50 flex items-center gap-2"
          >
            {/* Main Install Button */}
            <button
              onClick={handleInstallClick}
              type="button"
              className="flex items-center gap-2.5 bg-gradient-to-r from-brand-orange to-brand-cyan hover:opacity-95 text-black font-extrabold text-xs px-4 py-3 rounded-2xl shadow-xl shadow-brand-orange/20 hover-scale active-shrink border-0 cursor-pointer font-sans"
            >
              <Download className="w-4 h-4 animate-bounce" />
              Download App
            </button>

            {/* Close button to dismiss */}
            <button
              onClick={() => setIsVisible(false)}
              type="button"
              className="p-3 bg-neutral-900/90 dark:bg-black/85 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-white/5 rounded-2xl shadow-xl cursor-pointer active-shrink flex items-center justify-center"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manual Installation Instructions Helper Modal */}
      <AnimatePresence>
        {showHelper && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-neutral-900 border border-white/5 p-6 rounded-3xl max-w-sm w-full flex flex-col gap-4 text-white shadow-2xl relative font-sans"
            >
              <button
                onClick={() => setShowHelper(false)}
                type="button"
                className="absolute top-4 right-4 text-neutral-450 hover:text-white bg-transparent border-0 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-orange/10 flex items-center justify-center text-brand-orange">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-sm">How to install Campify</h3>
              </div>

              <div className="text-xs text-neutral-400 leading-relaxed flex flex-col gap-3">
                <p>To add Campify to your device home screen:</p>
                <ul className="list-decimal pl-4 flex flex-col gap-1.5 font-medium">
                  <li>Open the browser options/share menu (e.g. three dots in Chrome, Share icon <span className="inline-block px-1.5 py-0.5 bg-neutral-800 rounded font-bold">⎙</span> in Safari).</li>
                  <li>Select <span className="text-white font-bold">Add to Home screen</span> or <span className="text-white font-bold">Install App</span>.</li>
                  <li>Confirm installation to install it as a standalone app!</li>
                </ul>
              </div>

              <button
                onClick={() => setShowHelper(false)}
                type="button"
                className="w-full bg-neutral-800 hover:bg-neutral-750 text-white font-bold text-xs py-3 rounded-2xl border-0 cursor-pointer active-shrink mt-2"
              >
                Got it!
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
