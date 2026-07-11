
'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { getIdentity, saveIdentity, type ChatSession } from '@/lib/db';
import { Toaster } from '@/components/ui/toaster';

const ChatSidebar = dynamic(() => import('@/components/chat-sidebar').then(m => m.ChatSidebar), { 
  ssr: false,
  loading: () => <div className="w-80 border-r bg-card animate-pulse" />
});

const ChatWindow = dynamic(() => import('@/components/chat-window').then(m => m.ChatWindow), { 
  ssr: false,
  loading: () => <div className="flex-1 bg-background flex items-center justify-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
});

const AuthScreen = dynamic(() => import('@/components/auth-screen').then(m => m.AuthScreen), { 
  ssr: false,
  loading: () => <div className="h-screen w-full bg-background" />
});

export default function ChatPage() {
  const [identity, setIdentity] = useState<string | null>(null);
  const [activeChat, setActiveChat] = useState<ChatSession | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    setIsMobile(window.innerWidth < 768);
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    
    async function loadIdentity() {
      try {
        const identityPromise = getIdentity();
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000));
        
        const savedId = await Promise.race([identityPromise, timeoutPromise]) as string | null;
        if (savedId) setIdentity(savedId);
      } catch (e) {
        console.warn('Identity load failed or timed out');
      } finally {
        setIsInitializing(false);
      }
    }
    
    loadIdentity();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (isInitializing) {
    return (
      <div className="h-screen w-full bg-background flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground animate-pulse">
          Secure Handshake...
        </p>
      </div>
    );
  }

  if (!identity) {
    return (
      <>
        <AuthScreen onIdentityCreated={async (id) => {
          await saveIdentity(id);
          setIdentity(id);
        }} />
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
