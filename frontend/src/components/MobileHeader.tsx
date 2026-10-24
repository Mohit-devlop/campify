'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '../store/authStore';
import { useSocketStore } from '../store/socketStore';
import { apiFetch } from '../lib/api';
import { 
  Sparkles, Search, Heart, MessageCircle, Menu, 
  PlusSquare, Bell, Flame
} from 'lucide-react';

interface MobileHeaderProps {
  onSearchClick: () => void;
  onMenuClick: () => void;
  onCreateClick: () => void;
}

export default function MobileHeader({
  onSearchClick,
  onMenuClick,
  onCreateClick
}: MobileHeaderProps) {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { socket } = useSocketStore();
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  // Fetch unread notifications
  useEffect(() => {
    if (!user) return;
    async function fetchUnread() {
      try {
        const res = await apiFetch('/notifications');
        if (res.ok) {
          const data = await res.json();
          const unread = data.filter((n: any) => !n.read).length;
          setUnreadNotifCount(unread);
        }
      } catch (err) {
        console.error('Failed to fetch unread notif count:', err);
      }
    }
    fetchUnread();
  }, [user]);

  // Listen for real-time notification push
  useEffect(() => {
    if (!socket) return;
    const handleNewNotif = () => setUnreadNotifCount((prev) => prev + 1);
    socket.on('new_notification', handleNewNotif);
    return () => {
      socket.off('new_notification', handleNewNotif);
    };
  }, [socket]);

  // Reset count when viewing notifications
  useEffect(() => {
    if (pathname === '/notifications') {
      setUnreadNotifCount(0);
    }
  }, [pathname]);

  if (!user) return null;

  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-brand-card/90 backdrop-blur-xl border-b border-brand-cyan/15 z-30 flex items-center justify-between px-3 sm:px-4 select-none shadow-sm">
      {/* Brand Logo & Name */}
      <Link href="/" className="flex items-center gap-2 no-underline group active-shrink">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-orange to-brand-cyan flex items-center justify-center shadow-md shadow-brand-orange/20 flex-shrink-0">
          <Sparkles className="w-4.5 h-4.5 text-black animate-pulse" />
        </div>
        <div className="flex flex-col">
          <span className="font-extrabold text-base tracking-wider bg-gradient-to-r from-brand-orange to-brand-cyan bg-clip-text text-transparent leading-none">
            CAMPIFY
          </span>
          <span className="text-[9px] font-semibold text-neutral-400 tracking-tight flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
            CAMPUS LIVE
          </span>
        </div>
      </Link>

      {/* Action Buttons */}
      <div className="flex items-center gap-1 sm:gap-1.5">
        {/* Search */}
        <button
          onClick={onSearchClick}
          aria-label="Search"
          className="p-2 rounded-xl text-neutral-400 hover:text-brand-cyan hover:bg-white/5 active-shrink transition-colors bg-transparent border-0 cursor-pointer"
        >
          <Search className="w-5 h-5" />
        </button>

        {/* Notifications */}
        <Link
          href="/notifications"
          aria-label="Notifications"
          className="p-2 rounded-xl text-neutral-400 hover:text-brand-orange hover:bg-white/5 active-shrink transition-colors relative no-underline flex items-center justify-center"
        >
          <Heart className={`w-5 h-5 ${pathname === '/notifications' ? 'text-brand-orange fill-brand-orange' : ''}`} />
          {unreadNotifCount > 0 && (
            <span className="absolute top-1 right-1 bg-brand-orange text-black text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-md animate-pulse">
              {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
            </span>
          )}
        </Link>

        {/* Messages */}
        <Link
          href="/messages"
          aria-label="Direct Messages"
          className="p-2 rounded-xl text-neutral-400 hover:text-brand-cyan hover:bg-white/5 active-shrink transition-colors relative no-underline flex items-center justify-center"
        >
          <MessageCircle className={`w-5 h-5 ${pathname === '/messages' ? 'text-brand-cyan fill-brand-cyan/20' : ''}`} />
        </Link>

        {/* Drawer Hamburger Menu */}
        <button
          onClick={onMenuClick}
          aria-label="Open App Menu"
          className="p-2 rounded-xl text-brand-text hover:text-brand-cyan hover:bg-white/5 active-shrink transition-colors bg-transparent border-0 cursor-pointer flex items-center justify-center"
        >
          <Menu className="w-5.5 h-5.5" />
        </button>
      </div>
    </header>
  );
}
