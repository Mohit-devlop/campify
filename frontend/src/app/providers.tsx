'use client';

import { ReactNode, useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { useSocketStore } from '../store/socketStore';

export function Providers({ children }: { children: ReactNode }) {
const [queryClient] = useState(() => new QueryClient({
defaultOptions: {
queries: {
refetchOnWindowFocus: false,
retry: false,
},
},
}));

const { initializeAuth, user, isAuthenticated } = useAuthStore();
const { connectSocket, disconnectSocket } = useSocketStore();
const [theme, setTheme] = useState<'light' | 'dark'>('light');

// Initialize auth credentials from localStorage
useEffect(() => {
initializeAuth();
}, [initializeAuth]);

// Connect socket if authenticated
useEffect(() => {
if (isAuthenticated && user?.id) {
connectSocket(user.id);
} else {
disconnectSocket();
}
}, [isAuthenticated, user, connectSocket, disconnectSocket]);

// Load and apply theme
useEffect(() => {
const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
const defaultTheme = savedTheme || 'light'; // default to premium light mode
setTheme(defaultTheme);

if (defaultTheme === 'dark') {
document.documentElement.classList.add('dark');
document.documentElement.classList.remove('light');
} else {
document.documentElement.classList.add('light');
document.documentElement.classList.remove('dark');
}
}, []);

// Register PWA Service Worker
useEffect(() => {
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
window.addEventListener('load', () => {
navigator.serviceWorker.register('/sw.js').then(
(registration) => {
console.log('[PWA] Service Worker registered with scope:', registration.scope);
},
(error) => {
console.error('[PWA] Service Worker registration failed:', error);
}
);
});
}
}, []);

const toggleTheme = () => {
const newTheme = theme === 'dark' ? 'light' : 'dark';
setTheme(newTheme);
localStorage.setItem('theme', newTheme);

if (newTheme === 'dark') {
document.documentElement.classList.add('dark');
document.documentElement.classList.remove('light');
} else {
document.documentElement.classList.add('light');
document.documentElement.classList.remove('dark');
}
};

return (
<QueryClientProvider client={queryClient}>
<ThemeContext.Provider value={{ theme, toggleTheme }}>
{children}
</ThemeContext.Provider>
</QueryClientProvider>
);
}

import { createContext, useContext } from 'react';

const ThemeContext = createContext<{
theme: 'light' | 'dark';
toggleTheme: () => void;
} | null>(null);

export function useTheme() {
const context = useContext(ThemeContext);
if (!context) {
throw new Error('useTheme must be used within ThemeProvider');
}
return context;
}