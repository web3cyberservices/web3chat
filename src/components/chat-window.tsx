'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Lock, Trash2, ChevronLeft, RefreshCw, Wifi, WifiOff, Check, CheckCheck, Info, Flower2, Zap } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { encryptMessage, decryptMessage } from '@/lib/crypto-utils';
import { getLocalMessages, saveLocalMessage, deleteLocalMessage, saveChat, getChat, type ChatSession } from '@/lib/db';
import { sendP2PMessage, subscribeToP2P, initWaku } from '@/lib/waku-service';
import { useToast } from '@/hooks/use-toast';
import images from '@/app/lib/placeholder-images.json';

interface Message {
  id: number;
  text: string;
  sender: string;
  senderId?: string;
  time: string;
  status?: 'sending' | 'sent' | 'error';
}

function ICQFlowerSmall({ online }: { online: boolean }) {
  return (
    <div className={`transition-all duration-700 ${online ? 'text-primary scale-110 drop-shadow-[0_0_5px_rgba(34,197,94,0.4)]' : 'text-destructive grayscale'}`}>
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
        <path d="M12 2L14.5 9H22L16 14L18.5 21L12 17L5.5 21L8 14L2 9H9.5L12 2Z" />
      </svg>
    </div>
  );
}

export function ChatWindow({ currentUserId, activeChat, onBack, isMobile }: { currentUserId: string, activeChat: ChatSession | null, onBack?: () => void, isMobile?: boolean }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<'connecting' | 'online' | 'error'>('connecting');
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const activeChatRef = useRef<string | undefined>(activeChat?.id);
  useEffect(() => {
    activeChatRef.current = activeChat?.id;
  }, [activeChat?.id]);

  const processIncomingMessage = async (payload: string) => {
    try {
      const decrypted = await decryptMessage(payload, currentUserId);
      if (decrypted.startsWith('[Error')) return;
      
      const msgData = JSON.parse(decrypted);
      const msgId = Number(msgData.timestamp);
      const actualSenderId = msgData.sender; 
      const time = new Date(msgId).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      await saveLocalMessage({
        id: msgId,
        chatId: actualSenderId,
        payload: payload,
        sender: 'other',
        senderId: actualSenderId,
        time
      });

      const existingChat = await getChat(actualSenderId);
      const chatToSave: ChatSession = {
        id: actualSenderId,
        name: existingChat?.name || `User ${actualSenderId.slice(0, 8)}`,
        customName: existingChat?.customName,
        notes: existingChat?.notes,
        type: existingChat?.type || 'private',
        lastMsg: msgData.message,
        time: time,
        avatar: existingChat?.avatar || images[Math.floor(Math.random() * 3)].url
      };
      await saveChat(chatToSave);

      if (activeChatRef.current === actualSenderId) {
        setMessages(prev => {
          if (prev.some(m => m.id === msgId)) return prev;
          return [...prev, { 
            id: msgId, 
            text: msgData.message, 
            sender: 'other', 
            senderId: actualSenderId, 
            time,
            status: 'sent' as const
          }].sort((a, b) => a.id - b.id);
        });
      } else {
        toast({ 
          title: "Uh-Oh! New Message", 
          description: `Node ${chatToSave.customName || chatToSave.name.slice(0, 8)} is sending data.`,
          variant: "default"
        });
      }
    } catch (e) {
      console.error("Payload processing error:", e);
    }
  };

  const syncMissedMessages = async () => {
    if (!currentUserId) return;
    try {
      const lastLocalMsg = await getLocalMessages('__any__');
      const since = lastLocalMsg.length > 0 ? Math.max(...lastLocalMsg.map(m => m.id)) : 0;
      
      const res = await fetch(`/api/relay?targetId=${currentUserId}&since=${since}`);
      const data = await res.json();
      
      if (data.messages && data.messages.length > 0) {
        for (const msg of data.messages) {
          await processIncomingMessage(msg.payload);
        }
      }
    } catch (e) {
      console.warn('Sync failed:', e);
    }
  };

  useEffect(() => {
    if (!currentUserId) return;

    let isMounted = true;
    let subscription: any = null;
    
    async function setupNetwork() {
      try {
        setNetworkStatus('connecting');
        await initWaku();
        
        subscription = await subscribeToP2P(currentUserId, async (payload) => {
          if (isMounted) await processIncomingMessage(payload);
        });

        if (isMounted) {
          setNetworkStatus('online');
          await syncMissedMessages();
        }
      } catch (e) {
        if (isMounted) setNetworkStatus('error');
      }
    }

    setupNetwork();

    return () => {
      isMounted = false;
      if (subscription) subscription.unsubscribe();
    };
  }, [currentUserId]);

  useEffect(() => {
    if (!activeChat || !currentUserId) return;

    async function loadHistory() {
      const stored = await getLocalMessages(activeChat!.id);
      const decrypted: Message[] = [];
      for (const m of stored) {
        try {
          const secret = m.sender === 'me' ? activeChat!.id : currentUserId;
          const payloadData = await decryptMessage(m.payload, secret);
          if (!payloadData.startsWith('[Error')) {
            const msgData = JSON.parse(payloadData);
            decrypted.push({ 
              id: m.id, 
              text: msgData.message, 
              sender: m.sender, 
              senderId: m.senderId, 
              time: m.time,
              status: 'sent' as const
            });
          }
        } catch (e) {}
      }
      setMessages(decrypted.sort((a, b) => a.id - b.id));
    }

    loadHistory();
    syncMissedMessages();
  }, [activeChat?.id, currentUserId]);

  const handleSend = async () => {
    if (!input.trim() || isProcessing || !activeChat) return;

    const textToSend = input;
    setInput('');
    setIsProcessing(true);

    try {
      const msgId = Date.now();
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      const rawData = JSON.stringify({
        timestamp: msgId,
        sender: currentUserId,
        message: textToSend
      });
      
      const encrypted = await encryptMessage(rawData, activeChat.id);

      await saveLocalMessage({
        id: msgId,
        chatId: activeChat.id,
        payload: encrypted,
        sender: 'me',
        senderId: currentUserId,
        time
      });

      await saveChat({
        ...activeChat,
        lastMsg: textToSend,
        time
      });

      setMessages(prev => [...prev, { 
        id: msgId, 
        text: textToSend, 
        sender: 'me', 
        senderId: currentUserId, 
        time,
        status: 'sending' as const
      }]);

      const success = await sendP2PMessage(activeChat.id, encrypted);
      if (success) {
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, status: 'sent' as const } : m));
      } else {
        throw new Error('Network failure');
      }

    } catch (e) {
      toast({ title: "Signal Lost", description: "Packet relay failed.", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        (viewport as HTMLElement).scrollTop = (viewport as HTMLElement).scrollHeight;
      }
    }
  }, [messages]);

  if (!activeChat) {
    return (
      <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-background text-muted-foreground glow-mesh">
        <div className="relative mb-8">
           <Flower2 className="w-24 h-24 text-primary/10 animate-spin-slow" />
           <div className="absolute inset-0 flex items-center justify-center">
              <Lock className="w-8 h-8 text-primary animate-pulse" />
           </div>
        </div>
        <h2 className="text-2xl font-black tracking-[0.4em] uppercase text-gradient">Nexus Vault</h2>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] mt-4 opacity-40">Select a peer to initiate secure synthesis</p>
        
        <div className="mt-12 flex items-center gap-4 bg-card/50 px-6 py-3 rounded-full border border-white/5 bento-inner-glow">
          <div className={`w-3 h-3 rounded-full ${networkStatus === 'online' ? 'bg-primary shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-muted animate-pulse'}`} />
          <span className="text-[9px] font-black uppercase tracking-widest">{networkStatus === 'online' ? 'Relay Connection Active' : 'Establishing Secure Link...'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background relative overflow-hidden h-full">
      <header className="h-16 border-b bg-card/80 backdrop-blur-3xl px-6 flex items-center justify-between sticky top-0 z-20 bento-inner-glow">
        <div className="flex items-center gap-4">
          {isMobile && <button onClick={onBack} className="p-2 hover:bg-secondary rounded-xl"><ChevronLeft className="w-5 h-5" /></button>}
          <div className="relative group">
            <Avatar className="w-10 h-10 border-2 border-primary/20 ring-4 ring-primary/5 transition-transform group-hover:scale-110">
              <AvatarImage src={activeChat.avatar} />
              <AvatarFallback className="bg-secondary/80 font-black text-xs">{activeChat.customName?.[0] || activeChat.name[0]}</AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1">
               <ICQFlowerSmall online={networkStatus === 'online'} />
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h2 className="font-black text-sm uppercase tracking-tighter truncate max-w-[200px]">{activeChat.customName || activeChat.name}</h2>
              {activeChat.notes && (
                <div title={activeChat.notes} className="cursor-help text-accent">
                  <Info className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
               <span className="text-[8px] font-black uppercase tracking-[0.2em] text-primary">Web3 Peer Node</span>
               <div className="w-1 h-1 rounded-full bg-white/20" />
               <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-40">AES-256 Enabled</span>
            </div>
          </div>
        </div>
        <div className="hidden lg:flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-[8px] font-black uppercase tracking-[0.3em] opacity-30">Peer UIN</span>
            <span className="text-[10px] text-muted-foreground font-mono opacity-50">{activeChat.id.slice(0, 16)}...</span>
          </div>
          <div className={`p-2.5 rounded-xl border ${networkStatus === 'online' ? 'bg-primary/5 border-primary/20 text-primary' : 'bg-destructive/5 border-destructive/20 text-destructive'}`}>
             {networkStatus === 'online' ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4 animate-pulse" />}
          </div>
        </div>
      </header>

      <ScrollArea ref={scrollRef} className="flex-1 p-6 lg:p-10">
        <div className="space-y-6 max-w-5xl mx-auto">
          {messages.map((m, i) => (
            <div key={m.id} className={`flex flex-col ${m.sender === 'me' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2 duration-500`}>
              <div className={`group relative max-w-[85%] lg:max-w-[70%] p-4 lg:p-6 rounded-[2rem] shadow-2xl transition-all hover:scale-[1.01] ${
                m.sender === 'me' 
                ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-tr-none premium-border' 
                : 'bg-card/80 backdrop-blur-xl border border-white/5 rounded-tl-none bento-inner-glow'
              }`}>
                <p className="text-sm lg:text-base leading-relaxed font-medium selection:bg-white/30">{m.text}</p>
                <div className={`flex items-center justify-between gap-6 mt-3 ${m.sender === 'me' ? 'text-primary-foreground/60' : 'text-muted-foreground/50'}`}>
                  <span className="text-[9px] font-black uppercase tracking-widest">{m.time}</span>
                  <div className="flex items-center gap-2">
                    {m.sender === 'me' && (
                      m.status === 'sent' ? <CheckCheck className="w-3.5 h-3.5" /> :
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    )}
                    <button onClick={() => deleteLocalMessage(m.id).then(() => setMessages(prev => prev.filter(msg => msg.id !== m.id)))}>
                      <Trash2 className="w-3.5 h-3.5 hover:text-destructive transition-all opacity-0 group-hover:opacity-100" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="p-6 lg:p-10 border-t bg-card/40 backdrop-blur-3xl">
        <div className="max-w-5xl mx-auto relative group">
          <div className="absolute inset-0 bg-primary/5 blur-[30px] opacity-0 group-focus-within:opacity-100 transition-opacity" />
          <div className="relative flex gap-4 p-2 bg-black/40 border border-white/10 rounded-[2.5rem] shadow-2xl focus-within:border-primary/30 transition-all">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !isProcessing && handleSend()}
              disabled={isProcessing}
              placeholder={isProcessing ? "SYNTHESIZING..." : "INJECT SECURE PACKET..."}
              className="flex-1 bg-transparent px-6 py-4 text-sm font-bold uppercase tracking-widest outline-none placeholder:opacity-30"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isProcessing}
              className="px-8 bg-primary text-primary-foreground rounded-[2rem] font-black uppercase tracking-[0.3em] text-[10px] shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-30 flex items-center gap-3"
            >
              {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <>SEND <Send className="w-3.5 h-3.5" /></>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
