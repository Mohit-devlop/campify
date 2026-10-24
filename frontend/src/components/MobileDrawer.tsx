'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '../store/authStore';
import {
  X, Home, Compass, Film, BookOpen, Users, UserPlus,
  Calendar, Trophy, MessageCircle, Heart, Settings,
  ShieldAlert, LogOut, ChevronRight, Sparkles, Award
} from 'lucide-react';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileDrawer({ isOpen, onClose }: MobileDrawerProps) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  if (!user) return null;

  const isAdmin = user.role === 'ADMIN';

  const navGroups = [
    {
      title: 'Feed & Media',
      items: [
        { name: 'Home Feed', href: '/', icon: Home },
        { name: 'Explore & Trending', href: '/explore', icon: Compass },
        { name: 'Vertical Reels', href: '/reels', icon: Film },
        { name: 'Learning Reels', href: '/learning', icon: BookOpen },
      ],
    },
    {
      title: 'Campus & Networking',
      items: [
        { name: 'Communities & Clubs', href: '/communities', icon: Users },
        { name: 'Team Finder (Hackathons)', href: '/team-finder', icon: UserPlus },
        { name: 'Campus Events & Fests', href: '/events', icon: Calendar },
        { name: 'Leaderboard & Streaks', href: '/leaderboard', icon: Trophy },
      ],
    },
    {
      title: 'Communication & Settings',
      items: [
        { name: 'Messages & Chat', href: '/messages', icon: MessageCircle },
        { name: 'Notifications', href: '/notifications', icon: Heart },
        { name: 'Account Settings', href: '/settings', icon: Settings },
      ],
    },
  ];

  const handleLogout = () => {
    onClose();
    logout();
    window.location.href = '/auth';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity"
          />

          {/* Slide-over Drawer Panel */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="fixed top-0 right-0 bottom-0 w-[84vw] max-w-[340px] bg-brand-card/95 backdrop-blur-2xl border-l border-brand-cyan/20 z-50 flex flex-col justify-between shadow-2xl overflow-hidden text-brand-text"
          >
            {/* Header & User Profile Preview */}
            <div className="flex flex-col border-b border-brand-cyan/15 bg-brand-bg/40">
              <div className="flex items-center justify-between p-4 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                  Campify App Menu
                </span>
                <button
                  onClick={onClose}
                  aria-label="Close menu"
                  className="p-1.5 rounded-xl bg-brand-bg border border-brand-cyan/15 text-neutral-400 hover:text-brand-orange active-shrink cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* User Profile Mini Banner */}
              <Link
                href={`/${user.username}`}
                onClick={onClose}
                className="flex items-center gap-3 p-4 pt-2 hover:bg-brand-bg/60 transition-colors no-underline text-brand-text group"
              >
                {user.profile?.avatarUrl ? (
                  <img
                    src={user.profile.avatarUrl}
                    alt={user.username}
                    className="w-12 h-12 rounded-2xl object-cover border-2 border-brand-cyan/30 flex-shrink-0 group-hover:border-brand-cyan transition-colors"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-orange to-brand-cyan flex items-center justify-center text-black font-extrabold text-base flex-shrink-0 shadow-md">
                    {user.username[0].toUpperCase()}
                  </div>
                )}
                <div className="flex flex-col flex-1 overflow-hidden">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm truncate text-brand-text group-hover:text-brand-cyan transition-colors">
                      {user.name || user.username}
                    </span>
                    {user.verified && (
                      <Award className="w-4 h-4 text-brand-cyan fill-brand-cyan/20 flex-shrink-0" />
                    )}
                  </div>
                  <span className="text-xs text-neutral-400 truncate">@{user.username}</span>
                  <span className="text-[10px] text-emerald-500 font-semibold mt-0.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                    Active Student Profile
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-brand-cyan group-hover:translate-x-0.5 transition-all" />
              </Link>
            </div>

            {/* Scrollable Navigation Items */}
            <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-4 no-scrollbar">
              {navGroups.map((group, groupIdx) => (
                <div key={groupIdx} className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 px-3 py-1">
                    {group.title}
                  </span>
                  {group.items.map((item, itemIdx) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={itemIdx}
                        href={item.href}
                        onClick={onClose}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all no-underline ${
                          isActive
                            ? 'bg-brand-cyan/15 text-brand-cyan font-bold border border-brand-cyan/25 glow-cyan/10'
                            : 'text-neutral-400 hover:text-brand-orange hover:bg-brand-orange/5'
                        }`}
                      >
                        <Icon className={`w-4.5 h-4.5 flex-shrink-0 ${isActive ? 'scale-110 text-brand-cyan' : ''}`} />
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              ))}

              {isAdmin && (
                <div className="flex flex-col gap-1 pt-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-red-400 px-3 py-1">
                    Administration
                  </span>
                  <Link
                    href="/admin"
                    onClick={onClose}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all no-underline ${
                      pathname === '/admin'
                        ? 'bg-red-500/15 text-red-500 font-bold border border-red-500/30'
                        : 'text-red-400/80 hover:text-red-400 hover:bg-red-500/5'
                    }`}
                  >
                    <ShieldAlert className="w-4.5 h-4.5 flex-shrink-0" />
                    <span>Admin Governance</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Footer Sign Out & Version */}
            <div className="p-3 border-t border-brand-cyan/15 bg-brand-bg/40 flex flex-col gap-2">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 font-semibold text-xs border border-red-500/20 transition-all cursor-pointer active-shrink"
              >
                <LogOut className="w-4 h-4" />
                Sign Out from Campify
              </button>

              <div className="flex items-center justify-between px-1 text-[10px] text-neutral-400 font-mono">
                <span>Campify Mobile v2.5</span>
                <span className="text-brand-cyan">PWA & APK Ready</span>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
