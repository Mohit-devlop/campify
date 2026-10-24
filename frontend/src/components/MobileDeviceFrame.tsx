'use client';

import React, { useState, useEffect } from 'react';
import { Smartphone, Monitor, Wifi, BatteryMedium, Signal, RotateCcw, Check, Sparkles, X } from 'lucide-react';

interface MobileDeviceFrameProps {
  children: React.ReactNode;
}

export default function MobileDeviceFrame({ children }: MobileDeviceFrameProps) {
  // Mobile frame simulator mode state (saved in localStorage)
  const [isMobileMode, setIsMobileMode] = useState(false);
  const [deviceModel, setDeviceModel] = useState<'iphone' | 'samsung' | 'pixel'>('iphone');
  const [currentTime, setCurrentTime] = useState('09:41');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('campify_mobile_simulator');
    if (saved !== null) {
      setIsMobileMode(saved === 'true');
    }

    // Update real clock in Dynamic Island
    const updateClock = () => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      setCurrentTime(`${hours}:${minutes}`);
    };
    updateClock();
    const timer = setInterval(updateClock, 30000);
    return () => clearInterval(timer);
  }, []);

  const toggleMobileMode = (val: boolean) => {
    setIsMobileMode(val);
    localStorage.setItem('campify_mobile_simulator', String(val));
  };

  // Device dimension profiles
  const deviceWidth = {
    iphone: 'w-[410px]',
    samsung: 'w-[425px]',
    pixel: 'w-[400px]',
  }[deviceModel];

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <>
      {/* Floating Mode Toggle Control (Visible only on desktop screens >= 768px) */}
      <div className="hidden md:flex fixed bottom-5 right-5 z-50 items-center gap-2 bg-brand-card/90 backdrop-blur-2xl border border-brand-cyan/30 rounded-2xl p-1.5 shadow-2xl transition-all select-none">
        <button
          onClick={() => toggleMobileMode(!isMobileMode)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer border-0 ${
            isMobileMode
              ? 'bg-gradient-to-r from-brand-orange via-purple-600 to-brand-cyan text-white font-black shadow-lg shadow-brand-cyan/25'
              : 'bg-neutral-900/90 text-neutral-300 hover:text-white'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>{isMobileMode ? 'Mobile View: ON' : 'Mobile View: OFF'}</span>
        </button>

        {isMobileMode && (
          <div className="flex items-center gap-1 border-l border-brand-cyan/20 pl-2">
            <select
              value={deviceModel}
              onChange={(e) => setDeviceModel(e.target.value as any)}
              className="bg-brand-bg border border-brand-cyan/20 text-brand-text text-[11px] font-semibold rounded-lg px-2 py-1 outline-none cursor-pointer"
            >
              <option value="iphone">iPhone 16 Pro</option>
              <option value="samsung">Galaxy S24</option>
              <option value="pixel">Pixel 9</option>
            </select>
          </div>
        )}
      </div>

      {/* Render Condition: Mobile Simulator Frame (on Desktop when enabled) */}
      {isMobileMode ? (
        <div className="hidden md:flex min-h-screen w-full bg-[#070b09] items-center justify-center py-6 px-4 relative overflow-x-hidden selection:bg-brand-cyan/30">
          {/* Ambient Studio Lighting Backdrop */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-brand-cyan/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-brand-orange/5 rounded-full blur-3xl pointer-events-none" />

          {/* Top Banner Bar for the Simulator */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-neutral-900/80 backdrop-blur-xl border border-white/10 px-4 py-1.5 rounded-full text-xs text-neutral-400 font-medium z-40">
            <span className="flex items-center gap-1.5 text-brand-cyan font-bold">
              <span className="w-2 h-2 rounded-full bg-brand-cyan animate-ping" />
              Campify Mobile App Simulator
            </span>
            <span>•</span>
            <span>{deviceModel === 'iphone' ? 'Apple iPhone 16 Pro' : deviceModel === 'samsung' ? 'Samsung Galaxy S24' : 'Google Pixel 9'}</span>
            <span>•</span>
            <button
              onClick={() => toggleMobileMode(false)}
              className="text-neutral-400 hover:text-white flex items-center gap-1 bg-transparent border-0 cursor-pointer ml-1"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Full Desktop</span>
            </button>
          </div>

          {/* Physical Phone Chassis Container */}
          <div
            className={`relative ${deviceWidth} h-[870px] bg-black rounded-[54px] p-3 shadow-[0_25px_80px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.12)] border-[4px] border-neutral-800 transition-all duration-300 flex flex-col z-30`}
          >
            {/* Realistic Physical Buttons on Sides */}
            {/* Left side: Action Button & Volume */}
            <div className="absolute -left-[7px] top-[115px] w-[3px] h-[28px] bg-neutral-700 rounded-l-md shadow-inner" />
            <div className="absolute -left-[7px] top-[160px] w-[3px] h-[50px] bg-neutral-700 rounded-l-md shadow-inner" />
            <div className="absolute -left-[7px] top-[220px] w-[3px] h-[50px] bg-neutral-700 rounded-l-md shadow-inner" />
            {/* Right side: Power Button */}
            <div className="absolute -right-[7px] top-[170px] w-[3px] h-[75px] bg-neutral-700 rounded-r-md shadow-inner" />

            {/* Phone Screen Glass Inner Container */}
            <div className="relative w-full h-full bg-brand-bg rounded-[44px] overflow-hidden flex flex-col border border-black/40">
              
              {/* Dynamic Island & Status Bar */}
              <div className="absolute top-0 left-0 right-0 h-11 bg-transparent z-40 flex items-center justify-between px-6 select-none pointer-events-none">
                {/* Clock */}
                <span className="text-xs font-bold text-brand-text tracking-tight pl-1">
                  {currentTime}
                </span>

                {/* Dynamic Island Capsule */}
                <div className="w-[115px] h-[28px] bg-black rounded-full flex items-center justify-between px-2.5 shadow-md -translate-y-0.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center">
                    <div className="w-1 h-1 rounded-full bg-blue-900/60" />
                  </div>
                  <div className="flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5 text-brand-cyan animate-pulse" />
                    <span className="text-[9px] font-bold text-brand-cyan tracking-wider">CAMPIFY</span>
                  </div>
                  <div className="w-2.5 h-2.5 rounded-full bg-neutral-900 border border-neutral-800" />
                </div>

                {/* Status Icons: Signal, Wifi, Battery */}
                <div className="flex items-center gap-1.5 text-brand-text pr-1">
                  <Signal className="w-3.5 h-3.5" />
                  <Wifi className="w-3.5 h-3.5" />
                  <BatteryMedium className="w-4 h-4 text-emerald-500" />
                </div>
              </div>

              {/* Scrollable Mobile Screen App Viewport */}
              <div className="flex-1 w-full overflow-y-auto no-scrollbar pt-11 relative">
                {children}
              </div>

              {/* Bottom Home Indicator Bar */}
              <div className="absolute bottom-1.5 left-0 right-0 flex justify-center pointer-events-none z-40">
                <div className="w-32 h-1 bg-neutral-400/50 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Standard View (Edge-to-edge Native responsive mobile on phones, regular layout on desktop)
        <>{children}</>
      )}
    </>
  );
}
