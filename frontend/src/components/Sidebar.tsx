'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../app/providers';
import { useSocketStore } from '../store/socketStore';
import { apiFetch } from '../lib/api';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
Home, Search, Compass, Film, MessageCircle, Heart, PlusSquare, User,
ShieldAlert, LogOut, Sun, Moon, Sparkles, ChevronLeft, ChevronRight,
Users, Trophy, BookOpen, UserPlus, Settings
} from 'lucide-react';

interface SidebarProps {
isCollapsed: boolean;
onToggleCollapse: () => void;
onSearchClick: () => void;
onCreateClick: () => void;
}

export default function Sidebar({
isCollapsed,
onToggleCollapse,
onSearchClick,
onCreateClick
}: SidebarProps) {
const pathname = usePathname();
const { user, logout } = useAuthStore();
const { theme, toggleTheme } = useTheme();
const { socket } = useSocketStore();

const [unreadCount, setUnreadCount] = useState(0);

// Fetch unread notifications on mount
useEffect(() => {
if (!user) return;
async function fetchUnreadCount() {
try {
const res = await apiFetch('/notifications');
if (res.ok) {
const data = await res.json();
const unread = data.filter((n: any) => !n.read).length;
setUnreadCount(unread);
}
} catch (err) {
console.error('Failed to fetch unread count:', err);
}
}
fetchUnreadCount();
}, [user]);

// Listen for real-time notification socket push
useEffect(() => {
if (!socket) return;
const handleNewNotif = () => {
setUnreadCount((prev) => prev + 1);
};
socket.on('new_notification', handleNewNotif);
return () => {
socket.off('new_notification', handleNewNotif);
};
}, [socket]);

// Reset badge when viewing notifications tab
useEffect(() => {
if (pathname === '/notifications') {
setUnreadCount(0);
}
}, [pathname]);

if (!user) return null;

const isAdmin = user.role === 'ADMIN';

const menuItems = [
{ name: 'Dashboard', href: '/', icon: Home },
{ name: 'Search', onClick: onSearchClick, icon: Search },
{ name: 'Feed', href: '/explore', icon: Compass },
{ name: 'Reels', href: '/reels', icon: Film },
{ name: 'Learning Reels', href: '/learning', icon: BookOpen },
{ name: 'Communities', href: '/communities', icon: Users },
{ name: 'Team Finder', href: '/team-finder', icon: UserPlus },
{ name: 'Leaderboard', href: '/leaderboard', icon: Trophy },
{ name: 'Messages', href: '/messages', icon: MessageCircle },
{ name: 'Notifications', href: '/notifications', icon: Heart },
{ name: 'Create', onClick: onCreateClick, icon: PlusSquare },
{ name: 'Profile', href: `/${user.username}`, icon: User },
{ name: 'Settings', href: '/settings', icon: Settings },
];

const handleLogout = () => {
logout();
window.location.href = '/auth';
};

return (
<>
{/* Desktop Sidebar */}
<motion.aside
animate={{ width: isCollapsed ? 80 : 256 }}
transition={{ type: 'spring', stiffness: 300, damping: 30 }}
className="hidden md:flex flex-col fixed left-0 top-0 h-screen border-r border-slate-200 dark:border-slate-800/80 bg-white/90 dark:bg-slate-950/85 backdrop-blur-xl p-4 z-30 justify-between select-none shadow-sm"
>
<div className="flex flex-col gap-6 w-full relative">

{/* Collapse Toggle Button */}
<button
onClick={onToggleCollapse}
className="absolute -right-7 top-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-brand-orange dark:text-slate-400 dark:hover:text-brand-cyan p-1 rounded-full shadow-md z-40 active-shrink cursor-pointer"
>
{isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
</button>

{/* Logo */}
<Link href="/" className="flex items-center gap-2.5 px-2.5 py-2 overflow-hidden">
<div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-orange to-brand-cyan flex items-center justify-center shadow-lg shadow-brand-orange/20 active-shrink flex-shrink-0">
<Sparkles className="w-5 h-5 text-black animate-pulse" />
</div>
{!isCollapsed && (
<motion.span
initial={{ opacity: 0, x: -10 }}
animate={{ opacity: 1, x: 0 }}
exit={{ opacity: 0, x: -10 }}
className="font-extrabold text-lg tracking-wider bg-gradient-to-r from-brand-orange to-brand-cyan bg-clip-text text-transparent"
>
CAMPIFY
</motion.span>
)}
</Link>

{/* Navigation Links */}
<nav className="flex flex-col gap-1.5 mt-2">
{menuItems.map((item, index) => {
const Icon = item.icon;
const isActive = item.href ? pathname === item.href : false;

const content = (
<div
className={`flex items-center gap-4 px-3.5 py-3 rounded-2xl cursor-pointer transition-all duration-200 relative ${
isActive
? 'text-brand-orange font-bold'
: 'text-slate-650 dark:text-slate-400 hover:text-brand-cyan dark:hover:text-brand-cyan hover:bg-brand-cyan/5'
}`}
>
{/* Sliding active indicator */}
{isActive && (
<motion.div
layoutId="activeIndicator"
className="absolute inset-0 bg-brand-orange/10 rounded-2xl -z-10 border border-brand-orange/20"
transition={{ type: 'spring', stiffness: 380, damping: 30 }}
/>
)}
<div className="relative flex items-center justify-center">
<Icon className={`w-5 h-5 flex-shrink-0 transition-transform ${isActive ? 'scale-110' : ''}`} />
{item.name === 'Notifications' && unreadCount > 0 && (
<span className="absolute -top-1.5 -right-1.5 bg-brand-orange text-black text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-md animate-pulse">
{unreadCount}
</span>
)}
</div>
{!isCollapsed && (
<motion.span
initial={{ opacity: 0 }}
animate={{ opacity: 1 }}
className="text-[14px]"
>
{item.name}
</motion.span>
)}
</div>
);

if (item.href) {
return (
<Link key={index} href={item.href} className="no-underline">
{content}
</Link>
);
}

return (
<button key={index} onClick={item.onClick} className="w-full text-left bg-transparent border-0 p-0">
{content}
</button>
);
})}

{isAdmin && (
<Link href="/admin" className="no-underline">
<div
className={`flex items-center gap-4 px-3.5 py-3 rounded-2xl cursor-pointer transition-all duration-200 relative ${
pathname === '/admin'
? 'text-red-500 font-bold'
: 'text-red-500/70 hover:text-red-500 hover:bg-red-500/5'
}`}
>
{pathname === '/admin' && (
<motion.div
layoutId="activeIndicator"
className="absolute inset-0 bg-red-500/10 rounded-2xl -z-10 border border-red-500/20"
transition={{ type: 'spring', stiffness: 380, damping: 30 }}
/>
)}
<ShieldAlert className="w-5 h-5 flex-shrink-0" />
{!isCollapsed && (
<motion.span
initial={{ opacity: 0 }}
animate={{ opacity: 1 }}
className="text-[14px]"
>
Admin Panel
</motion.span>
)}
</div>
</Link>
)}
</nav>
</div>

{/* Footer Actions */}
<div className="flex flex-col gap-1.5 border-t border-slate-200 dark:border-slate-800/80 pt-4">
{/* Theme Switcher */}
<button
onClick={toggleTheme}
className="flex items-center gap-4 px-3.5 py-3 rounded-2xl cursor-pointer text-slate-650 dark:text-slate-400 hover:bg-brand-cyan/5 hover:text-brand-cyan transition-all duration-200 w-full text-left bg-transparent border-0 active-shrink"
>
{theme === 'dark' ? <Sun className="w-5 h-5 text-yellow-500 flex-shrink-0" /> : <Moon className="w-5 h-5 text-indigo-500 flex-shrink-0" />}
{!isCollapsed && (
<motion.span
initial={{ opacity: 0 }}
animate={{ opacity: 1 }}
className="text-[14px] font-medium"
>
{theme === 'dark' ? 'Light Theme' : 'Dark Theme'}
</motion.span>
)}
</button>

{/* User Profile Card / Dropdown */}
<div className="flex items-center gap-3 p-2 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/60 overflow-hidden">
{user.profile?.avatarUrl ? (
<img
src={user.profile.avatarUrl}
alt="avatar"
className="w-8 h-8 rounded-xl object-cover flex-shrink-0 border border-slate-200 dark:border-slate-700"
/>
) : (
<div className="w-8 h-8 rounded-xl bg-brand-orange flex items-center justify-center text-black font-bold text-xs flex-shrink-0">
{user.username[0].toUpperCase()}
</div>
)}
{!isCollapsed && (
<motion.div
initial={{ opacity: 0 }}
animate={{ opacity: 1 }}
className="flex flex-col flex-1 overflow-hidden"
>
<span className="font-bold text-xs text-slate-800 dark:text-white truncate">{user.username}</span>
<span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{user.email}</span>
</motion.div>
)}
{!isCollapsed && (
<button
onClick={handleLogout}
title="Sign Out"
className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-red-500 rounded-lg bg-transparent border-0 cursor-pointer active-shrink"
>
<LogOut className="w-4 h-4" />
</button>
)}
</div>
</div>
</motion.aside>

{/* Mobile Bottom Navigation */}
<nav className="md:hidden fixed bottom-0 left-0 w-full h-16 border-t border-slate-200 dark:border-slate-800/80 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl flex items-center justify-around px-4 z-30 shadow-lg">
{menuItems
.filter((item) => ['Dashboard', 'Feed', 'Create', 'Messages', 'Profile'].includes(item.name))
.map((item, index) => {
const Icon = item.icon;
const isActive = item.href ? pathname === item.href : false;
const isCreate = item.name === 'Create';

const content = isCreate ? (
<div className="p-3 rounded-full bg-gradient-to-tr from-brand-orange to-brand-cyan text-black shadow-lg hover-scale active-shrink -translate-y-4 border-4 border-brand-bg relative flex items-center justify-center">
<Icon className="w-5.5 h-5.5 text-black" />
</div>
) : (
<div
className={`p-2.5 rounded-xl transition-all active-shrink relative ${
isActive ? 'text-brand-orange scale-110' : 'text-slate-500 hover:text-brand-cyan dark:text-slate-400 dark:hover:text-brand-cyan'
}`}
>
<Icon className="w-5.5 h-5.5" />
{item.name === 'Notifications' && unreadCount > 0 && (
<span className="absolute top-1 right-1 bg-brand-orange text-black text-[8px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center shadow-md animate-pulse">
{unreadCount}
</span>
)}
</div>
);

if (item.href) {
return (
<Link key={index} href={item.href}>
{content}
</Link>
);
}

return (
<button key={index} onClick={item.onClick} className="bg-transparent border-0 p-0 cursor-pointer">
{content}
</button>
);
})}
</nav>
</>
);
}