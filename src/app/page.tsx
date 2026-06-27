
'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { getIdentity, saveIdentity, type ChatSession } from '@/lib/db';
import { Toaster } from '@/components/ui/toaster';

// Динамический импорт без SSR для мгновенного рендеринга
const ChatSidebar = dynamic(() => import('@/components/chat-sidebar').then(m => m.ChatSidebar), { 
  ssr: false,
  loading: () => <div className="w-80 border-r bg-card animate-pulse" />
});

const ChatWindow = dynamic(() => import('@/components/chat-window').then(m => m.ChatWindow), { 
  ssr: false,
  loading: () => <div className="flex-1 bg-background flex items-center justify-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
});

const AuthScreen = dynamic(() => import('@/components/auth-screen').then(m => m.AuthScreen), { ssr: false });

export default function Home() {
  const [identity, setIdentity] = useState<string | null>(null);
  const [activeChat, setActiveChat] = useState<ChatSession | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    
    async function loadIdentity() {
      try {
        const savedId = await getIdentity();
        if (savedId) setIdentity(savedId);
      } catch (e) {
        console.error('Identity load failed', e);
      } finally {
        // Убираем экран загрузки сразу после получения данных из локальной БД
        setIsInitializing(false);
      }
    }

    // Используем requestIdleCallback для запуска тяжелых процессов после отрисовки UI
    if (window.requestIdleCallback) {
      window.requestIdleCallback(() => loadIdentity());
    } else {
      setTimeout(loadIdentity, 100);
    }

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleIdentityCreated = async (id: string) => {
    await saveIdentity(id);
    setIdentity(id);
  };

  if (isInitializing) {
    return (
      <div className="h-screen w-full bg-background flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground animate-pulse">
          Starting Secure Workspace...
        </p>
      </div>
    );
  }

  if (!identity) {
    return (
      <>
        <AuthScreen onIdentityCreated={handleIdentityCreated} />
        <Toaster />
      </>
    );
  }

  return (
    <main className="flex h-screen w-full overflow-hidden antialiased bg-background">
      <div className={`${isMobile && activeChat ? 'hidden' : 'flex'} w-full md:w-80 flex-shrink-0 border-r border-border/50`}>
        <ChatSidebar 
          currentUserId={identity} 
          activeChatId={activeChat?.id || null}
          onSelectChat={setActiveChat}
        />
      </div>
      <div className={`${isMobile && !activeChat ? 'hidden' : 'flex'} flex-1`}>
        <ChatWindow 
          currentUserId={identity} 
          activeChat={activeChat}
          onBack={() => setActiveChat(null)}
          isMobile={isMobile}
        />
      </div>
      <Toaster />
    </main>
  );
}
