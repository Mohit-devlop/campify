'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '../store/authStore';
import { motion } from 'framer-motion';
import { Home, Compass, Plus, Film, User } from 'lucide-react';

interface MobileBottomNavProps {
  onCreateClick: () => void;
}

export default function MobileBottomNav({ onCreateClick }: MobileBottomNavProps) {
  const pathname = usePathname();
  const { user } = useAuthStore();

  if (!user) return null;

  const profileHref = `/${user.username}`;
  const isProfileActive = pathname === profileHref;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-brand-card/92 backdrop-blur-2xl border-t border-brand-cyan/20 z-30 flex items-center justify-around px-2 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] select-none">
      {/* 1. Home Feed */}
      <Link
        href="/"
        aria-label="Home Feed"
        className={`flex flex-col items-center justify-center p-2 rounded-2xl transition-all active-shrink no-underline relative ${
          pathname === '/' ? 'text-brand-cyan' : 'text-neutral-400 hover:text-brand-orange'
        }`}
      >
        <Home className={`w-5.5 h-5.5 transition-transform ${pathname === '/' ? 'scale-110' : ''}`} />
        <span className="text-[10px] font-semibold mt-0.5">Home</span>
        {pathname === '/' && (
          <motion.div
            layoutId="mobileActiveTab"
            className="w-1.5 h-1.5 rounded-full bg-brand-cyan absolute -bottom-0.5"
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
          />
        )}
      </Link>

      {/* 2. Explore */}
      <Link
        href="/explore"
        aria-label="Explore"
        className={`flex flex-col items-center justify-center p-2 rounded-2xl transition-all active-shrink no-underline relative ${
          pathname === '/explore' ? 'text-brand-cyan' : 'text-neutral-400 hover:text-brand-orange'
        }`}
      >
        <Compass className={`w-5.5 h-5.5 transition-transform ${pathname === '/explore' ? 'scale-110' : ''}`} />
        <span className="text-[10px] font-semibold mt-0.5">Explore</span>
        {pathname === '/explore' && (
          <motion.div
            layoutId="mobileActiveTab"
            className="w-1.5 h-1.5 rounded-full bg-brand-cyan absolute -bottom-0.5"
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
          />
        )}
      </Link>

      {/* 3. Center Elevated Floating Create Button */}
      <button
        onClick={onCreateClick}
        aria-label="Create Post, Reel or Story"
        className="group relative -translate-y-4 flex flex-col items-center justify-center bg-transparent border-0 p-0 cursor-pointer active-shrink"
      >
        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-brand-orange via-purple-500 to-brand-cyan p-0.5 shadow-lg shadow-brand-cyan/30 group-hover:scale-105 transition-transform flex items-center justify-center border-3 border-brand-bg">
          <div className="w-full h-full rounded-full bg-black/90 flex items-center justify-center group-hover:bg-black/70 transition-colors">
            <Plus className="w-6 h-6 text-brand-cyan group-hover:rotate-90 transition-transform duration-300" />
          </div>
        </div>
        <span className="text-[9px] font-bold text-neutral-400 mt-1 uppercase tracking-wider">
          Create
        </span>
      </button>

      {/* 4. Reels */}
      <Link
        href="/reels"
        aria-label="Vertical Reels"
        className={`flex flex-col items-center justify-center p-2 rounded-2xl transition-all active-shrink no-underline relative ${
          pathname === '/reels' ? 'text-brand-cyan' : 'text-neutral-400 hover:text-brand-orange'
        }`}
      >
        <Film className={`w-5.5 h-5.5 transition-transform ${pathname === '/reels' ? 'scale-110' : ''}`} />
        <span className="text-[10px] font-semibold mt-0.5">Reels</span>
        {pathname === '/reels' && (
          <motion.div
            layoutId="mobileActiveTab"
            className="w-1.5 h-1.5 rounded-full bg-brand-cyan absolute -bottom-0.5"
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
          />
        )}
      </Link>

      {/* 5. User Profile */}
      <Link
        href={profileHref}
        aria-label="My Profile"
        className={`flex flex-col items-center justify-center p-2 rounded-2xl transition-all active-shrink no-underline relative ${
          isProfileActive ? 'text-brand-cyan' : 'text-neutral-400 hover:text-brand-orange'
        }`}
      >
        <div className={`w-6 h-6 rounded-full overflow-hidden border-2 transition-all ${
          isProfileActive ? 'border-brand-cyan scale-110' : 'border-transparent'
        }`}>
          {user.profile?.avatarUrl ? (
            <img src={user.profile.avatarUrl} alt={user.username} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-tr from-brand-orange to-brand-cyan flex items-center justify-center text-[10px] text-black font-extrabold">
              {user.username[0].toUpperCase()}
            </div>
          )}
        </div>
        <span className="text-[10px] font-semibold mt-0.5">Profile</span>
        {isProfileActive && (
          <motion.div
            layoutId="mobileActiveTab"
            className="w-1.5 h-1.5 rounded-full bg-brand-cyan absolute -bottom-0.5"
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
          />
        )}
      </Link>
    </nav>
  );
}
