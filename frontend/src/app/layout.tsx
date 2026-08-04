'use client';

import { useState, useEffect } from 'react';
import { Providers } from './providers';
import Sidebar from '../components/Sidebar';
import SearchDrawer from '../components/SearchDrawer';
import CreatePostModal from '../components/CreatePostModal';
import PwaInstallButton from '../components/PwaInstallButton';
import './globals.css';

export default function RootLayout({
children,
}: {
children: React.ReactNode;
}) {
const [isSearchOpen, setIsSearchOpen] = useState(false);
const [isCreateOpen, setIsCreateOpen] = useState(false);
const [createTab, setCreateTab] = useState<'post' | 'reel' | 'story'>('post');
const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

useEffect(() => {
const handleOpenCreateModal = (e: Event) => {
const customEvent = e as CustomEvent;
if (customEvent.detail?.tab) {
setCreateTab(customEvent.detail.tab);
} else {
setCreateTab('post');
}
setIsCreateOpen(true);
};
window.addEventListener('open-create-modal', handleOpenCreateModal);
return () => {
window.removeEventListener('open-create-modal', handleOpenCreateModal);
};
}, []);

return (
<html lang="en" className="light">
<head>
<title>Campify : A Social Networking Platform for College Communities</title>
<meta name="description" content="A state-of-the-art production-ready social media platform" />
<link rel="icon" href="/favicon.ico" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="Campify" />
<link rel="apple-touch-icon" href="/logo.svg" />
<meta name="theme-color" content="#FF7A00" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
</head>
<body className="antialiased min-h-screen bg-background text-foreground selection:bg-primary/30">
<Providers>
<div className="flex min-h-screen w-full relative">
{/* Navigation Sidebar */}
<Sidebar
isCollapsed={isSidebarCollapsed}
onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
onSearchClick={() => setIsSearchOpen(!isSearchOpen)}
onCreateClick={() => setIsCreateOpen(true)}
/>

{/* Global Sliding Search Drawer */}
<SearchDrawer isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

{/* Global Create Post Modal */}
<CreatePostModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} defaultTab={createTab} />

{/* Main Workspace Frame */}
<main className={`flex-1 w-full pb-16 md:pb-0 min-h-screen transition-all duration-300 ${isSidebarCollapsed ? 'md:pl-20' : 'md:pl-64'}`}>
{children}
</main>

{/* PWA Floating Install Button */}
<PwaInstallButton />
</div>
</Providers>
</body>
</html>
);
}