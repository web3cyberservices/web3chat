
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Lock, Cpu, Trash2, ChevronLeft, RefreshCw, Wifi, WifiOff, Check, CheckCheck } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { encryptMessage, decryptMessage } from '@/lib/crypto-utils';
import { getLocalMessages, saveLocalMessage, deleteLocalMessage, type ChatSession } from '@/lib/db';
import { initWaku, setupReliableChannel, getChannelName, ChatDataPacket } from '@/lib/waku-service';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: number;
  text: string;
  sender: string;
  senderId?: string;
  time: string;
  status?: 'sending' | 'sent' | 'acknowledged';
}

export function ChatWindow({ currentUserId, activeChat, onBack, isMobile }: { currentUserId: string, activeChat: ChatSession | null, onBack?: () => void, isMobile?: boolean }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<'connecting' | 'online' | 'syncing' | 'error'>('connecting');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!activeChat || !currentUserId) return;

    let isMounted = true;
    
    async function setup() {
      try {
        setNetworkStatus('connecting');
        setStatusMessage("Connecting to P2P Mesh...");
        
        const node = await initWaku();
        if (!isMounted) return;

        const channelName = getChannelName(currentUserId, activeChat!.id);
        const channel = await setupReliableChannel(node, channelName, currentUserId);
        if (!isMounted) return;
        
        channelRef.current = channel;

        // Обработка входящих сообщений через Reliable Channel
        channel.addEventListener("message-received", async (event: any) => {
          const wakuMessage = event.detail;
          try {
            const encryptedPayload = new TextDecoder().decode(wakuMessage.payload);
            const decrypted = await decryptMessage(encryptedPayload, currentUserId);
            
            if (decrypted.startsWith('[Error')) return;
            
            const decodedProto = ChatDataPacket.decode(Buffer.from(decrypted, 'base64'));
            const msgData = ChatDataPacket.toObject(decodedProto);
            
            const msgId = Number(msgData.timestamp);
            const time = new Date(msgId).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            await saveLocalMessage({
              id: msgId,
              chatId: activeChat!.id,
              payload: encryptedPayload,
              sender: 'other',
              senderId: activeChat!.id,
              time
            });

            if (isMounted) {
              setMessages(prev => {
                if (prev.some(m => m.id === msgId)) return prev;
                return [...prev, { 
                  id: msgId, 
                  text: msgData.message, 
                  sender: 'other', 
                  senderId: activeChat!.id, 
                  time,
                  status: 'acknowledged'
                }].sort((a, b) => a.id - b.id);
              });
            }
          } catch (e) {
            console.error("Message processing error:", e);
          }
        });

        // Статусы отправки
        channel.addEventListener("message-sent", (event: any) => {
          const msgId = event.detail;
          setMessages(prev => prev.map(m => m.id === msgId ? { ...m, status: 'sent' } : m));
        });

        channel.addEventListener("message-acknowledged", (event: any) => {
          const msgId = event.detail;
          setMessages(prev => prev.map(m => m.id === msgId ? { ...m, status: 'acknowledged' } : m));
        });

        // Статус синхронизации
        channel.syncStatus.addEventListener("synced", () => {
          setNetworkStatus('online');
          setStatusMessage(null);
        });

        channel.syncStatus.addEventListener("syncing", (event: any) => {
          setNetworkStatus('syncing');
          setStatusMessage(`Syncing ${event.detail.missing} messages...`);
        });

      } catch (e) {
        console.error("Channel setup failure:", e);
        if (isMounted) setNetworkStatus('error');
      }
    }

    // Загрузка локальной истории
    async function loadHistory() {
      const stored = await getLocalMessages(activeChat!.id);
      const decrypted: Message[] = [];
      for (const m of stored) {
        try {
          const secret = m.sender === 'me' ? activeChat!.id : currentUserId;
          const payload = await decryptMessage(m.payload, secret);
          if (!payload.startsWith('[Error')) {
            const decodedProto = ChatDataPacket.decode(Buffer.from(payload, 'base64'));
            const msgData = ChatDataPacket.toObject(decodedProto);
            decrypted.push({ 
              id: m.id, 
              text: msgData.message, 
              sender: m.sender, 
              senderId: m.senderId, 
              time: m.time,
              status: 'acknowledged'
            });
          }
        } catch (e) {}
      }
      if (isMounted) setMessages(decrypted.sort((a, b) => a.id - b.id));
    }

    loadHistory();
    setup();

    return () => {
      isMounted = false;
      channelRef.current = null;
    };
  }, [activeChat?.id, currentUserId]);

  const handleSend = async () => {
    if (!channelRef.current || !input.trim()) return;

    const textToSend = input;
    setInput('');
    setIsProcessing(true);
    setStatusMessage("Sealing message...");

    try {
      const msgId = Date.now();
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      // 1. Кодируем в Protobuf
      const protoMsg = ChatDataPacket.create({
        timestamp: msgId,
        sender: currentUserId,
        message: textToSend
      });
      const encodedProto = ChatDataPacket.encode(protoMsg).finish();
      
      // 2. Шифруем (как Base64 для передачи через ReliableChannel)
      const binaryString = Array.from(encodedProto).map(b => String.fromCharCode(b)).join('');
      const base64Proto = btoa(binaryString);
      const encrypted = await encryptMessage(base64Proto, activeChat!.id);

      // 3. Сохраняем локально
      await saveLocalMessage({
        id: msgId,
        chatId: activeChat!.id,
        payload: encrypted,
        sender: 'me',
        senderId: currentUserId,
        time
      });

      setMessages(prev => [...prev, { 
        id: msgId, 
        text: textToSend, 
        sender: 'me', 
        senderId: currentUserId, 
        time,
        status: 'sending'
      }]);

      // 4. Отправляем через Reliable Channel
      const payloadBytes = new TextEncoder().encode(encrypted);
      channelRef.current.send(payloadBytes);

    } catch (e) {
      toast({ title: "Security Violation", description: "Encryption failed", variant: "destructive" });
    } finally {
      setIsProcessing(false);
      setStatusMessage(null);
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
                networkStatus === 'online' ? 'bg-primary' :
                networkStatus === 'syncing' ? 'bg-accent animate-pulse' :
                networkStatus === 'connecting' ? 'bg-muted animate-pulse' : 'bg-destructive'
              }`} />
              <span className="text-[9px] uppercase tracking-widest text-muted-foreground">
                {networkStatus === 'online' ? 'Mesh Active' :
                 networkStatus === 'syncing' ? 'Syncing SDS...' :
                 networkStatus === 'connecting' ? 'Initializing...' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-4 items-center">
          {networkStatus !== 'error' ? <Wifi className="w-4 h-4 text-primary opacity-50" /> : <WifiOff className="w-4 h-4 text-destructive animate-pulse" />}
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
                      m.status === 'acknowledged' ? <CheckCheck className="w-3 h-3 text-primary-foreground" /> :
                      m.status === 'sent' ? <Check className="w-3 h-3 text-primary-foreground/70" /> :
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
        <div className="max-w-4xl mx-auto space-y-2">
          {statusMessage && (
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
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
              placeholder={isProcessing ? "Crypting..." : "Type secure message..."}
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
