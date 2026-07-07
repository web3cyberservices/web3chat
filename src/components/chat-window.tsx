
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Lock, Cpu, Trash2, ChevronLeft, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { encryptMessage, decryptMessage, performPoW } from '@/lib/crypto-utils';
import { getLocalMessages, saveLocalMessage, deleteLocalMessage, type ChatSession } from '@/lib/db';
import { sendP2PMessage, subscribeToP2P, initWaku } from '@/lib/waku-service';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: number;
  text: string;
  sender: string;
  senderId?: string;
  time: string;
}

export function ChatWindow({ currentUserId, activeChat, onBack, isMobile }: { currentUserId: string, activeChat: ChatSession | null, onBack?: () => void, isMobile?: boolean }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<'connecting' | 'online' | 'error'>('connecting');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const activeChatRef = useRef(activeChat?.id);

  useEffect(() => {
    activeChatRef.current = activeChat?.id;
  }, [activeChat?.id]);

  useEffect(() => {
    if (!currentUserId) return;
    
    let isMounted = true;
    let subscription: any = null;

    const handleIncoming = async (encryptedPayload: string) => {
      try {
        const decrypted = await decryptMessage(encryptedPayload, currentUserId);
        if (decrypted.startsWith('[Error')) return;
        
        const parsed = JSON.parse(decrypted);
        const msgId = parsed.timestamp || Date.now();
        const time = new Date(msgId).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        await saveLocalMessage({
          id: msgId,
          chatId: parsed.senderId,
          payload: encryptedPayload,
          sender: 'other',
          senderId: parsed.senderId,
          time
        });

        if (activeChatRef.current === parsed.senderId) {
          setMessages(prev => {
            if (prev.some(m => m.id === msgId)) return prev;
            return [...prev, { ...parsed, id: msgId, sender: 'other', time }].sort((a, b) => a.id - b.id);
          });
        } else {
          toast({ 
            title: "Secure Message Received", 
            description: `From User ${parsed.senderId?.slice(0, 8)}...` 
          });
        }
      } catch (e) {
        console.error("Incoming message error:", e);
      }
    };

    const setup = async () => {
      try {
        if (isMounted) {
          setNetworkStatus('connecting');
          setStatusMessage("Connecting to P2P Mesh...");
        }
        
        await initWaku();
        
        if (!isMounted) return;
        
        // Оформляем подписку и сохраняем её для очистки
        subscription = await subscribeToP2P(currentUserId, handleIncoming);
        
        if (isMounted && subscription) {
          setNetworkStatus('online');
          setStatusMessage(null);
        }
      } catch (e) {
        console.error('[Waku] Network setup failure:', e);
        if (isMounted) {
          setNetworkStatus('error');
          setStatusMessage("P2P Mesh Discovery slow. Retrying...");
          // Повторная попытка через 5 секунд при ошибке (например, таймауте поиска пиров)
          setTimeout(() => {
            if (isMounted) setup();
          }, 5000);
        }
      }
    };

    setup();

    return () => {
      isMounted = false;
      // Очистка подписки при размонтировании (Предотвращение утечек ОЗУ и зомби-процессов)
      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
      }
    };
  }, [currentUserId, toast]);

  useEffect(() => {
    if (!activeChat) return;
    async function load() {
      const stored = await getLocalMessages(activeChat!.id);
      const decrypted: Message[] = [];
      for (const m of stored) {
        try {
          const secret = m.sender === 'me' ? activeChat!.id : currentUserId;
          const payload = await decryptMessage(m.payload, secret);
          if (!payload.startsWith('[Error')) {
            const parsed = JSON.parse(payload);
            decrypted.push({ ...parsed, id: m.id, sender: m.sender, time: m.time });
          }
        } catch (e) {}
      }
      setMessages(decrypted.sort((a, b) => a.id - b.id));
    }
    load();
  }, [activeChat?.id, currentUserId]);

  const handleSend = async () => {
    if (!activeChat || !input.trim()) return;

    const textToSend = input;
    setInput('');
    setIsProcessing(true);
    setStatusMessage("Sealing cryptographic packet...");

    try {
      const msgId = Date.now();
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const rawData = JSON.stringify({ text: textToSend, senderId: currentUserId, timestamp: msgId });

      await performPoW(rawData);
      
      const encrypted = await encryptMessage(rawData, activeChat.id);

      await saveLocalMessage({
        id: msgId,
        chatId: activeChat.id,
        payload: encrypted,
        sender: 'me',
        senderId: currentUserId,
        time
      });

      setMessages(prev => [...prev, { id: msgId, text: textToSend, sender: 'me', senderId: currentUserId, time }]);

      const success = await sendP2PMessage(activeChat.id, encrypted);
      if (!success) {
        toast({
          title: "Network Latency",
          description: "Message queued locally. Peer discovery in progress...",
          variant: "destructive"
        });
      }
    } catch (e) {
      toast({
        title: "Security Violation",
        description: "Cryptographic context failed.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      setStatusMessage(null);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) viewport.scrollTop = viewport.scrollHeight;
    }
  }, [messages]);

  if (!activeChat) {
    return (
      <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-background text-muted-foreground">
        <Lock className="w-12 h-12 opacity-20 mb-4" />
        <h2 className="text-xl font-bold text-foreground">Secure Vault</h2>
        <p className="text-sm">Initiate an encrypted P2P session.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background relative overflow-hidden h-full">
      <div className="h-16 border-b bg-card/80 backdrop-blur-md px-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          {isMobile && <button onClick={onBack} className="p-1"><ChevronLeft /></button>}
          <Avatar className="w-10 h-10">
            <AvatarImage src={activeChat.avatar} />
            <AvatarFallback>{activeChat.name[0]}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-bold text-sm truncate">{activeChat.name}</h2>
            <div className="flex items-center gap-1">
              <div className={`w-1.5 h-1.5 rounded-full ${
                networkStatus === 'online' ? 'bg-primary animate-pulse' :
                networkStatus === 'connecting' ? 'bg-accent animate-spin' : 'bg-destructive'
              }`} />
              <span className="text-[9px] uppercase tracking-widest text-muted-foreground">
                {networkStatus === 'online' ? 'P2P Mesh Active' :
                 networkStatus === 'connecting' ? 'Syncing...' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-4 items-center">
          {networkStatus === 'online' ? <Wifi className="w-4 h-4 text-primary opacity-50" /> : <WifiOff className="w-4 h-4 text-destructive animate-pulse" />}
        </div>
      </div>

      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        <div className="space-y-4 max-w-4xl mx-auto">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2 relative group ${
                m.sender === 'me' ? 'bg-primary text-primary-foreground rounded-tr-none shadow-lg shadow-primary/10' : 'bg-card border rounded-tl-none shadow-sm'
              }`}>
                <p className="text-sm leading-relaxed">{m.text}</p>
                <div className="flex items-center justify-between gap-4 mt-1 opacity-50">
                  <span className="text-[9px] font-mono">{m.time}</span>
                  <button onClick={() => deleteLocalMessage(m.id).then(() => setMessages(prev => prev.filter(msg => msg.id !== m.id)))}>
                    <Trash2 className="w-3 h-3 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="p-4 border-t bg-card/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto space-y-2">
          {statusMessage && (
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground animate-pulse">
              <RefreshCw className="w-3 h-3 animate-spin" />
              {statusMessage}
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !isProcessing && handleSend()}
              disabled={isProcessing}
              placeholder={isProcessing ? "Processing..." : "Type encrypted message..."}
              className="flex-1 bg-secondary/50 rounded-xl py-2 px-4 outline-none border border-transparent focus:border-primary/30 transition-all"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isProcessing}
              className="p-3 bg-primary text-primary-foreground rounded-xl disabled:opacity-50 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary/20"
            >
              {isProcessing ? <Cpu className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
