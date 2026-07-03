'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Lock, Trash2, ChevronLeft, Wifi, RefreshCw } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { encryptMessage, decryptMessage, performPoW } from '@/lib/crypto-utils';
import { getLocalMessages, saveLocalMessage, deleteLocalMessage, getChats, type ChatSession } from '@/lib/db';
import { sendP2PMessage, subscribeToP2P, initWaku } from '@/lib/waku-service';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: number;
  text: string;
  sender: 'me' | 'other';
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
  const activeChatRef = useRef<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    activeChatRef.current = activeChat?.id || null;
  }, [activeChat?.id]);

  // Подписка на входящие сообщения с динамическим обновлением списка прослушиваемых ID
  useEffect(() => {
    if (!currentUserId) return;
    
    let isMounted = true;
    let unsubscribe: (() => void) | undefined;

    const setupTransport = async () => {
      try {
        setNetworkStatus('connecting');
        await initWaku(); 
        if (!isMounted) return;
        setNetworkStatus('online');

        const chats = await getChats();
        // Слушаем свой ID и ID всех существующих чатов (для групп и лички)
        const myListeningIds = Array.from(new Set([currentUserId, ...chats.map(c => c.id)]));

        unsubscribe = await subscribeToP2P(myListeningIds, async (encryptedPayload, targetId) => {
          try {
            const secret = targetId === currentUserId ? currentUserId : targetId;
            const decrypted = await decryptMessage(encryptedPayload, secret);
            
            if (decrypted.startsWith('[Error')) return;
            
            const parsed = JSON.parse(decrypted);
            const msgId = parsed.timestamp || Date.now();
            const time = new Date(msgId).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            const chatId = targetId === currentUserId ? parsed.senderId : targetId;

            // Сохраняем во внутреннюю БД
            await saveLocalMessage({
              id: msgId,
              chatId: chatId,
              payload: encryptedPayload,
              sender: 'other',
              senderId: parsed.senderId,
              time
            });
            
            // Если этот чат сейчас открыт — обновляем UI
            if (chatId === activeChatRef.current) {
              setMessages(prev => {
                if (prev.some(m => m.id === msgId)) return prev;
                return [...prev, { ...parsed, id: msgId, sender: 'other', time }].sort((a, b) => a.id - b.id);
              });
            }
          } catch (e) {
            console.error('Incoming message error:', e);
          }
        });
      } catch (e) {
        if (isMounted) setNetworkStatus('error');
      }
    };

    setupTransport();
    
    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, [currentUserId, activeChat?.id]); // Переподписываемся при смене активного чата для надежности

  // Загрузка истории
  useEffect(() => {
    if (!activeChat) {
      setMessages([]);
      return;
    }
    
    async function loadHistory() {
      const stored = await getLocalMessages(activeChat!.id);
      const decrypted: Message[] = [];
      
      for (const m of stored) {
        try {
          const secret = m.sender === 'me' ? activeChat!.id : currentUserId;
          const payload = await decryptMessage(m.payload, secret);
          
          if (!payload.startsWith('[Error')) {
            const parsed = JSON.parse(payload);
            decrypted.push({ ...parsed, id: m.id, sender: m.sender as 'me' | 'other', time: m.time });
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
    setStatusMessage("Securing Message...");
    
    try {
      const msgId = Date.now();
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const rawData = JSON.stringify({ text: textToSend, senderId: currentUserId, timestamp: msgId });

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

      // Отправляем в общую шину
      await sendP2PMessage(activeChat.id, encrypted);
      
    } catch (e) {
      toast({ title: "Encryption Error", description: "Hardware key access denied.", variant: "destructive" });
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
        <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6 shadow-2xl shadow-primary/20">
          <Lock className="w-10 h-10 text-primary opacity-50" />
        </div>
        <h2 className="text-xl font-bold text-foreground tracking-tight">Zero-Knowledge Workspace</h2>
        <p className="text-sm text-center max-w-xs mt-3 leading-relaxed">
          Select a contact to start an end-to-end encrypted session.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background relative h-full">
      <div className="h-16 border-b bg-card/80 backdrop-blur-xl px-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          {isMobile && <button onClick={onBack} className="p-2 hover:bg-secondary rounded-xl"><ChevronLeft className="w-5 h-5" /></button>}
          <Avatar className="w-10 h-10 border-2 border-primary/20">
            <AvatarImage src={activeChat.avatar} />
            <AvatarFallback className="bg-primary/10 text-primary font-bold">{activeChat.name[0]}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-bold text-sm truncate max-w-[150px]">{activeChat.name}</h2>
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${
                networkStatus === 'online' ? 'bg-primary animate-pulse' : 'bg-destructive'
              }`} />
              <span className="text-[10px] font-bold text-muted-foreground uppercase">
                {networkStatus === 'online' ? 'Mesh Online' : 'Offline'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        <div className="space-y-4 max-w-4xl mx-auto pb-10">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-3 relative group shadow-sm ${
                m.sender === 'me' ? 'bg-primary text-primary-foreground rounded-tr-none' : 'bg-card border rounded-tl-none'
              }`}>
                {activeChat.type === 'group' && m.sender !== 'me' && (
                  <p className="text-[8px] font-mono text-primary mb-1 opacity-80 truncate">{m.senderId}</p>
                )}
                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{m.text}</p>
                <div className="flex items-center justify-between gap-4 mt-2 opacity-40">
                  <span className="text-[9px] font-mono tracking-tighter">{m.time}</span>
                  <button onClick={() => deleteLocalMessage(m.id).then(() => setMessages(prev => prev.filter(msg => msg.id !== m.id)))}>
                    <Trash2 className="w-3 h-3 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="p-4 border-t bg-card/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto space-y-3">
          {statusMessage && (
            <div className="flex items-center gap-2 text-[10px] text-primary font-bold">
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
              placeholder={isProcessing ? "Encrypting..." : "Type a secure message..."}
              className="flex-1 bg-secondary/50 rounded-2xl py-3.5 px-5 outline-none border border-border/50 focus:border-primary/50 text-sm"
            />
            <button 
              onClick={handleSend}
              disabled={!input.trim() || isProcessing}
              className="p-4 bg-primary text-primary-foreground rounded-2xl disabled:opacity-50 transition-transform active:scale-95"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}