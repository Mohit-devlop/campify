'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';
import { useSocketStore } from '../../store/socketStore';
import { apiFetch } from '../../lib/api';
import { 
  Heart, MessageCircle, UserPlus, AtSign, Circle, 
  Sparkles, CheckCircle2, Loader2, Camera
} from 'lucide-react';

export default function NotificationsFeed() {
  const router = useRouter();
  const { isAuthenticated, isInitialized } = useAuthStore();
  const { socket } = useSocketStore();
  
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isInitialized) return;

    if (!isAuthenticated) {
      router.push('/auth');
    }
  }, [isAuthenticated, isInitialized, router]);

  const loadNotifications = async () => {
    try {
      const res = await apiFetch('/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data || []);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) loadNotifications();
  }, [isAuthenticated]);

  // Listen for realtime push alerts
  useEffect(() => {
    if (!socket) return;

    socket.on('new_notification', (notif: any) => {
      setNotifications((prev) => [notif, ...prev]);
    });

    return () => {
      socket.off('new_notification');
    };
  }, [socket]);

  const handleMarkAllRead = async () => {
    try {
      const res = await apiFetch('/notifications/read', { method: 'POST' });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-8 flex flex-col gap-6">
      
      {/* Title Header */}
      <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-900 pb-4">
        <div>
          <h1 className="text-xl font-extrabold font-outfit tracking-tight">Notifications</h1>
          <p className="text-neutral-500 text-[11px] font-medium">Activity updates regarding your posts and profile.</p>
        </div>

        {notifications.some((n) => !n.read) && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-900 text-black dark:text-white text-xs font-bold px-3.5 py-2 rounded-xl active-shrink hover-scale border-0 cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />
            Mark all read
          </button>
        )}
      </div>

      {/* Notifications Queue */}
      <div className="flex flex-col gap-3">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-10 text-center flex flex-col items-center gap-2 glass">
            <Sparkles className="w-9 h-9 text-purple-400" />
            <h3 className="font-bold text-sm">No activity yet</h3>
            <p className="text-neutral-500 text-xs max-w-xs">
              When other users follow you, comment, like, or tag you, the updates will stream here.
            </p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                notif.read
                  ? 'bg-white/50 border-neutral-100 dark:bg-neutral-900/10 dark:border-neutral-900'
                  : 'bg-white border-purple-500/10 dark:bg-neutral-900/50 dark:border-purple-500/10 shadow-sm'
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Icon wrapper */}
                <div className="relative">
                  {notif.sender?.profile?.avatarUrl ? (
                    <img
                      src={notif.sender.profile.avatarUrl}
                      alt="avatar"
                      className="w-10 h-10 rounded-xl object-cover border"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-purple-500 flex items-center justify-center text-white font-bold text-sm">
                      {notif.sender?.username?.[0]?.toUpperCase() || 'S'}
                    </div>
                  )}
                  {/* Notification type indicators badge */}
                  <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-white shadow shadow-black/20">
                    {notif.type === 'LIKE' && <span className="bg-red-500 p-0.5 rounded-full"><Heart className="w-3 h-3 fill-current" /></span>}
                    {notif.type === 'COMMENT' && <span className="bg-blue-500 p-0.5 rounded-full"><MessageCircle className="w-3 h-3 fill-current" /></span>}
                    {notif.type === 'FOLLOW' && <span className="bg-green-500 p-0.5 rounded-full"><UserPlus className="w-3 h-3" /></span>}
                    {notif.type === 'MENTION' && <span className="bg-purple-600 p-0.5 rounded-full"><AtSign className="w-3 h-3" /></span>}
                    {notif.type === 'SCREENSHOT' && <span className="bg-pink-600 p-0.5 rounded-full flex items-center justify-center"><Camera className="w-3 h-3 text-white" /></span>}
                  </span>
                </div>

                <div className="flex flex-col gap-0.5">
                  <p className="text-xs text-neutral-800 dark:text-neutral-200 leading-snug">
                    <span className="font-extrabold mr-1">@{notif.sender?.username || 'user'}</span>
                    {notif.type === 'FOLLOW' && 'started following you.'}
                    {notif.type === 'LIKE' && (notif.reelId ? 'liked your reel.' : 'liked your post.')}
                    {notif.type === 'COMMENT' && 'commented on your post.'}
                    {notif.type === 'MENTION' && 'mentioned you in a post.'}
                    {notif.type === 'SCREENSHOT' && 'took a screenshot of your chat.'}
                  </p>
                  <span className="text-[9px] text-neutral-400 font-semibold">
                    {new Date(notif.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}{' '}
                    at {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              {!notif.read && (
                <Circle className="w-2.5 h-2.5 fill-purple-600 text-purple-600 mr-2 animate-pulse" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
