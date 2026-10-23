'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '../store/authStore';
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
  const pathname = usePathname();
  const { user, isInitialized } = useAuthStore();
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

  // Determine whether sidebar is visible: only when initialized, user is logged in, and not on /auth
  const isAuthPage = pathname === '/auth';
  const showSidebar = isInitialized && !!user && !isAuthPage;

  return (
    <html lang="en" className="light">
      <head>
        <title>Campify : A Social Networking Platform for College Communities</title>
        <meta name="description" content="A state-of-the-art production-ready social media platform" />
        <link rel="icon" href="/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Campify" />
        <link rel="apple-touch-icon" href="/logo.svg" />
        <meta name="theme-color" content="#FF7A00" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Inter:wght@300;400;500;600;700;800&family=Manrope:wght@200..800&family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased min-h-screen bg-background bg-futuristic-grid text-foreground selection:bg-primary/30 overflow-x-hidden">
        <Providers>
          <div className="flex min-h-screen w-full relative overflow-x-hidden">
            {/* Navigation Sidebar */}
            {showSidebar && (
              <Sidebar
                isCollapsed={isSidebarCollapsed}
                onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                onSearchClick={() => setIsSearchOpen(!isSearchOpen)}
                onCreateClick={() => setIsCreateOpen(true)}
              />
            )}

            {/* Global Sliding Search Drawer */}
            <SearchDrawer isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

            {/* Global Create Post Modal */}
            <CreatePostModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} defaultTab={createTab} />

            {/* Main Workspace Frame */}
            <main
              className={`flex-1 w-full min-h-screen transition-all duration-300 ${
                showSidebar
                  ? `pb-20 md:pb-0 ${isSidebarCollapsed ? 'md:pl-20' : 'md:pl-64'}`
                  : 'pl-0'
              }`}
            >
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