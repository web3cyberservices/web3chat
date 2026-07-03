
'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { getIdentity, saveIdentity, saveLocalMessage, saveChat, getChats, type ChatSession } from '@/lib/db';
import { Toaster } from '@/components/ui/toaster';
import { subscribeToP2P } from '@/lib/waku-service';
import { decryptMessage } from '@/lib/crypto-utils';
import images from '@/app/lib/placeholder-images.json';

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
    if (typeof window === 'undefined') return;
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
        setIsInitializing(false);
      }
    }
    loadIdentity();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!identity) return;

    let unsubscribeFn: (() => void) | undefined;

    const setupP2P = async () => {
      try {
        const chats = await getChats();
        const groupIds = chats.filter(c => c.type === 'group').map(c => c.id);
        const myIds = [identity, ...groupIds];

        const unsub = await subscribeToP2P(myIds, async (encryptedPayload, topicId) => {
          try {
            const isForMe = topicId === identity;
            const secret = isForMe ? identity : topicId;
            const decrypted = await decryptMessage(encryptedPayload, secret);
            
            if (decrypted.startsWith('[Error')) return;

            const parsed = JSON.parse(decrypted);
            if (parsed.senderId === identity) return;

            const msgId = parsed.timestamp || Date.now();
            const chatId = isForMe ? parsed.senderId : topicId;

            const existing = await getChats();
            if (!existing.some(c => c.id === chatId)) {
              await saveChat({
                id: chatId,
                name: `User ${chatId.slice(0, 8)}`,
                type: isForMe ? 'private' : 'group',
                lastMsg: 'Encrypted message received',
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                avatar: images[Math.floor(Math.random() * 3)].url
              });
            }

            await saveLocalMessage({
              id: msgId,
              chatId: chatId,
              payload: encryptedPayload,
              sender: 'other',
              senderId: parsed.senderId,
              time: new Date(msgId).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });
          } catch (e) {}
        });

        unsubscribeFn = unsub;
      } catch (e) {
        console.error('P2P Setup Error:', e);
      }
    };

    setupP2P();
    return () => {
      if (typeof unsubscribeFn === 'function') unsubscribeFn();
    };
  }, [identity]);

  const handleIdentityCreated = async (id: string) => {
    await saveIdentity(id);
    setIdentity(id);
  };

  if (isInitializing) {
    return (
      <div className="h-screen w-full bg-background flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground animate-pulse">
          Connecting to P2P Mesh...
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
