'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Lock, Cpu, Trash2, ChevronLeft, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { encryptMessage, decryptMessage, performPoW } from '@/lib/crypto-utils';
import { getLocalMessages, saveLocalMessage, deleteLocalMessage, getChats, type ChatSession } from '@/lib/db';
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
  
  // Реф для отслеживания текущего чата в асинхронных коллбэках без рестарта подписки
  const activeChatRef = useRef<string | null>(activeChat?.id || null);

  const { toast } = useToast();

  useEffect(() => {
    activeChatRef.current = activeChat?.id || null;
  }, [activeChat?.id]);

  // Единая стабильная подписка на P2P сеть
  useEffect(() => {
    if (!currentUserId) return;
    
    let isMounted = true;
    let unsubscribe: (() => void) | undefined;

    const setupP2P = async () => {
      try {
        setNetworkStatus('connecting');
        await initWaku(); 
        if (!isMounted) return;
        setNetworkStatus('online');

        // Подписка на личный ID и ID всех существующих чатов (для групп)
        const chats = await getChats();
        const subscribeIds = Array.from(new Set([currentUserId, ...chats.map(c => c.id)]));

        unsubscribe = await subscribeToP2P(subscribeIds, async (encryptedPayload, topicId) => {
          try {
            // Личное сообщение шифруется нашим ID, групповое - ID группы (topicId)
            const secret = topicId === currentUserId ? currentUserId : topicId;
            const decrypted = await decryptMessage(encryptedPayload, secret);
            
            if (decrypted.startsWith('[Error')) return;
            
            const parsed = JSON.parse(decrypted);
            const msgId = parsed.timestamp || Date.now();
            const time = new Date(msgId).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            // Определяем, какому чату принадлежит сообщение
            const chatId = topicId === currentUserId ? parsed.senderId : topicId;

            // Всегда сохраняем в локальную БД для истории
            await saveLocalMessage({
              id: msgId,
              chatId: chatId,
              payload: encryptedPayload,
              sender: 'other',
              senderId: parsed.senderId,
              time
            });
            
            // Если чат открыт прямо сейчас - обновляем UI мгновенно
            if (chatId === activeChatRef.current) {
              setMessages(prev => {
                if (prev.some(m => m.id === msgId)) return prev;
                const newMsgs = [...prev, { ...parsed, id: msgId, sender: 'other', time }];
                return newMsgs.sort((a, b) => a.id - b.id);
              });
            }
          } catch (e) {
            console.error('Incoming message processing error', e);
          }
        });
      } catch (e) {
        if (isMounted) {
          setNetworkStatus('error');
          console.error('Waku setup error', e);
        }
      }
    };

    setupP2P();
    
    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, [currentUserId]);

  // Загрузка истории только при смене чата
  useEffect(() => {
    if (!activeChat) return;
    
    async function loadHistory() {
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

    loadHistory();
  }, [activeChat?.id, currentUserId]);

  const handleSend = async () => {
    if (!activeChat || !input.trim()) return;
    
    const textToSend = input;
    setInput('');
    setIsProcessing(true);
    setStatusMessage("Broadcasting to P2P nodes...");
    
    try {
      const msgId = Date.now();
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const rawData = JSON.stringify({ text: textToSend, senderId: currentUserId, timestamp: msgId });

      // Proof-of-Work для защиты от спама (обязательно в Waku)
      await performPoW(rawData);
      
      // Шифруем для получателя
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
          description: "Message sent to local pool. It will propagate once peers are found." 
        });
      }
    } catch (e) {
      toast({ 
        title: "Security Context Error", 
        description: "P2P and Crypto require HTTPS. Check your connection.", 
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
      <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-background text-muted-foreground p-8">
        <div className="w-24 h-24 bg-primary/5 rounded-full flex items-center justify-center mb-6">
          <Lock className="w-10 h-10 opacity-20" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Secure Workspace</h2>
        <p className="text-sm text-center max-w-xs mt-2">Messages are encrypted locally and sent via Waku P2P network.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background relative overflow-hidden h-full">
      <div className="h-16 border-b bg-card/80 backdrop-blur-md px-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          {isMobile && <button onClick={onBack} className="p-1"><ChevronLeft /></button>}
          <Avatar className="w-10 h-10 border-2 border-primary/20">
            <AvatarImage src={activeChat.avatar} />
            <AvatarFallback>{activeChat.name[0]}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-bold text-sm truncate max-w-[150px]">{activeChat.name}</h2>
            <div className="flex items-center gap-1">
              <div className={`w-1.5 h-1.5 rounded-full ${
                networkStatus === 'online' ? 'bg-primary animate-pulse' : 
                networkStatus === 'connecting' ? 'bg-accent animate-spin' : 'bg-destructive'
              }`} />
              <span className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground">
                {networkStatus === 'online' ? 'P2P Online' : 
                 networkStatus === 'connecting' ? 'Syncing Network...' : 'Offline'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-4 items-center">
          {networkStatus === 'online' ? <Wifi className="w-4 h-4 text-primary opacity-50" /> : <WifiOff className="w-4 h-4 text-destructive animate-pulse" />}
        </div>
      </div>

      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        <div className="space-y-4 max-w-4xl mx-auto pb-8">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 relative group shadow-sm ${
                m.sender === 'me' ? 'bg-primary text-primary-foreground rounded-tr-none' : 'bg-card border rounded-tl-none'
              }`}>
                {activeChat.type === 'group' && m.sender !== 'me' && (
                  <p className="text-[8px] font-mono text-primary mb-1 opacity-70 truncate">{m.senderId}</p>
                )}
                <p className="text-sm leading-relaxed">{m.text}</p>
                <div className="flex items-center justify-between gap-4 mt-2 opacity-50">
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
        <div className="max-w-4xl mx-auto space-y-3">
          {statusMessage && (
            <div className="flex items-center gap-2 text-[10px] text-primary font-bold animate-pulse">
              <RefreshCw className="w-3 h-3 animate-spin" />
              {statusMessage}
            </div>
          )}
          <div className="flex gap-2">
            <input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              disabled={isProcessing}
              placeholder={isProcessing ? "Computing PoW..." : "Type encrypted message..."}
              className="flex-1 bg-secondary/50 rounded-2xl py-3 px-5 outline-none border border-border focus:border-primary/50 transition-all text-sm"
            />
            <button 
              onClick={handleSend}
              disabled={!input.trim() || isProcessing}
              className="p-4 bg-primary text-primary-foreground rounded-2xl disabled:opacity-50 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-primary/20"
            >
              {isProcessing ? <Cpu className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
