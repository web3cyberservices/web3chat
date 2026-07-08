'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Lock, Trash2, ChevronLeft, RefreshCw, Wifi, WifiOff, Check, CheckCheck, Info } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { encryptMessage, decryptMessage } from '@/lib/crypto-utils';
import { getLocalMessages, saveLocalMessage, deleteLocalMessage, saveChat, getChat, type ChatSession } from '@/lib/db';
import { sendP2PMessage, subscribeToP2P } from '@/lib/waku-service';
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

  useEffect(() => {
    if (!currentUserId) return;

    let isMounted = true;
    let subscription: any = null;
    
    async function setupNetwork() {
      try {
        setNetworkStatus('connecting');
        
        const subResult = await subscribeToP2P(currentUserId, async (payload) => {
          if (!isMounted) return;
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
                title: "New Message", 
                description: `From ${chatToSave.customName || chatToSave.name}: ${msgData.message.slice(0, 30)}${msgData.message.length > 30 ? '...' : ''}` 
              });
            }
          } catch (e) {
            console.error("Payload processing error:", e);
          }
        });

        if (subResult && isMounted) {
          subscription = subResult;
          setNetworkStatus('online');
        }
      } catch (e) {
        if (isMounted) setNetworkStatus('error');
      }
    }

    setupNetwork();

    return () => {
      isMounted = false;
      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
      }
    };
  }, [currentUserId, toast]);

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
      toast({ title: "Send Failed", description: "Network relay error", variant: "destructive" });
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
      <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-background text-muted-foreground">
        <Lock className="w-12 h-12 opacity-20 mb-4" />
        <h2 className="text-xl font-bold text-foreground">Secure Vault</h2>
        <p className="text-sm">Select a contact to start an encrypted session.</p>
        
        <div className="mt-8 flex items-center gap-2 text-xs">
          <div className={`w-2 h-2 rounded-full ${networkStatus === 'online' ? 'bg-primary' : 'bg-muted animate-pulse'}`} />
          {networkStatus === 'online' ? 'Connected to Relay' : 'Connecting...'}
        </div>
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
            <AvatarFallback className="bg-secondary">{activeChat.customName?.[0] || activeChat.name[0]}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm truncate max-w-[150px]">{activeChat.customName || activeChat.name}</h2>
              {activeChat.notes && (
                <div title={activeChat.notes} className="cursor-help text-accent">
                  <Info className="w-3 h-3" />
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              <div className={`w-1.5 h-1.5 rounded-full ${
                networkStatus === 'online' ? 'bg-primary' :
                networkStatus === 'connecting' ? 'bg-muted animate-pulse' : 'bg-destructive'
              }`} />
              <span className="text-[9px] uppercase tracking-widest text-muted-foreground">
                {networkStatus === 'online' ? 'Relay Active' :
                 networkStatus === 'connecting' ? 'Syncing...' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-4 items-center">
          <span className="text-[10px] text-muted-foreground font-mono hidden lg:block opacity-50">{activeChat.id.slice(0, 16)}...</span>
          {networkStatus === 'online' ? <Wifi className="w-4 h-4 text-primary opacity-50" /> : <WifiOff className="w-4 h-4 text-destructive animate-pulse" />}
        </div>
      </div>

      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        <div className="space-y-4 max-w-4xl mx-auto">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2 relative group ${
                m.sender === 'me' ? 'bg-primary text-primary-foreground rounded-tr-none' : 'bg-card border rounded-tl-none'
              }`}>
                <p className="text-sm leading-relaxed">{m.text}</p>
                <div className="flex items-center justify-between gap-4 mt-1 opacity-60">
                  <span className="text-[9px] font-mono">{m.time}</span>
                  <div className="flex items-center gap-1">
                    {m.sender === 'me' && (
                      m.status === 'sent' ? <CheckCheck className="w-3 h-3 text-primary-foreground" /> :
                      <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                    )}
                    <button onClick={() => deleteLocalMessage(m.id).then(() => setMessages(prev => prev.filter(msg => msg.id !== m.id)))}>
                      <Trash2 className="w-3 h-3 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="p-4 border-t bg-card/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !isProcessing && handleSend()}
            disabled={isProcessing}
            placeholder={isProcessing ? "Sending..." : "Type secure message..."}
            className="flex-1 bg-secondary/50 rounded-xl py-2 px-4 outline-none border border-transparent focus:border-primary/30 transition-all"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isProcessing}
            className="p-3 bg-primary text-primary-foreground rounded-xl disabled:opacity-50 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary/20"
          >
            {isProcessing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
