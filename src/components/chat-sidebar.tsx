'use client';

import React, { useState, useEffect } from 'react';
import { Search, Settings, MessageSquare, Users, ShieldCheck, Copy, Check, LogOut, Lock, QrCode, X, Plus, UserPlus, Edit3, Save, Download, Flower2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import images from '@/app/lib/placeholder-images.json';
import { clearAllData, getChats, saveChat, getMyProfile, saveMyProfile, type ChatSession, type UserProfile } from '@/lib/db';
import { QRCodeSVG } from 'qrcode.react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

interface ChatSidebarProps {
  currentUserId: string;
  activeChatId: string | null;
  onSelectChat: (chat: ChatSession) => void;
}

// ICQ Inspired Flower Status Component
function ICQFlower({ online }: { online: boolean }) {
  return (
    <div className={`relative flex items-center justify-center transition-all duration-500 ${online ? 'text-primary scale-110 drop-shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'text-destructive grayscale opacity-50'}`}>
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M12 2L14.5 9H22L16 14L18.5 21L12 17L5.5 21L8 14L2 9H9.5L12 2Z" />
        <circle cx="12" cy="12" r="3" fill="black" fillOpacity="0.2" />
      </svg>
      {online && <div className="absolute inset-0 bg-primary/20 blur-sm rounded-full animate-pulse" />}
    </div>
  );
}

export function ChatSidebar({ currentUserId, activeChatId, onSelectChat }: ChatSidebarProps) {
  const [activeChats, setActiveChats] = useState<ChatSession[]>([]);
  const [copied, setCopied] = useState(false);
  const [showSyncQR, setShowSyncQR] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState<'none' | 'private' | 'group' | 'settings' | 'edit-contact'>('none');
  const [myProfile, setMyProfile] = useState<UserProfile | null>(null);
  const [editingChat, setEditingChat] = useState<ChatSession | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  
  const [newChatId, setNewChatId] = useState('');
  const [editName, setEditName] = useState('');
  const [editStatus, setEditStatus] = useState('');

  const { toast } = useToast();

  useEffect(() => {
    async function loadData() {
      const storedChats = await getChats();
      setActiveChats(storedChats);
      const profile = await getMyProfile();
      if (profile) {
        setMyProfile(profile);
        setEditName(profile.name);
        setEditStatus(profile.status || '');
      } else {
        const defaultName = `User ${currentUserId.slice(0, 8)}`;
        setMyProfile({ type: 'me', name: defaultName });
        setEditName(defaultName);
      }
    }
    loadData();

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const interval = setInterval(async () => {
      const stored = await getChats();
      setActiveChats(stored);
    }, 3000);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [currentUserId]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  const copyId = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(currentUserId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast({ title: "UIN Copied", description: "Your Web3 ID is ready to share." });
      }
    } catch (err) {
      toast({ title: "Copy Blocked", variant: "destructive" });
    }
  };

  const handleLogout = async () => {
    if (confirm('Are you sure? All local encrypted messages and your Identity will be permanently deleted.')) {
      await clearAllData();
      window.location.reload();
    }
  };

  const handleAddPrivateChat = async () => {
    if (!newChatId.trim()) return;
    const newSession: ChatSession = {
      id: newChatId.trim(),
      name: `User ${newChatId.trim().slice(0, 8)}`,
      type: 'private',
      lastMsg: 'Waiting for handshake...',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      avatar: images[Math.floor(Math.random() * 3)].url
    };
    await saveChat(newSession);
    setActiveChats(prev => [newSession, ...prev]);
    onSelectChat(newSession);
    setNewChatId('');
    setShowAddMenu('none');
  };

  const handleSaveProfile = async () => {
    await saveMyProfile({ name: editName, status: editStatus });
    setMyProfile({ type: 'me', name: editName, status: editStatus });
    setShowAddMenu('none');
    toast({ title: "Profile updated" });
  };

  const handleEditContact = (chat: ChatSession) => {
    setEditingChat(chat);
    setShowAddMenu('edit-contact');
  };

  const handleSaveContact = async () => {
    if (!editingChat) return;
    await saveChat(editingChat);
    setActiveChats(prev => prev.map(c => c.id === editingChat.id ? editingChat : c));
    setShowAddMenu('none');
    toast({ title: "Contact updated" });
  };

  return (
    <div className="w-80 border-r flex flex-col bg-card h-full relative bento-inner-glow">
      {showSyncQR && (
        <div className="absolute inset-0 z-50 bg-background/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
          <button onClick={() => setShowSyncQR(false)} className="absolute top-4 right-4 p-2 hover:bg-secondary rounded-full">
            <X className="w-6 h-6" />
          </button>
          <div className="bg-white p-4 rounded-2xl shadow-2xl mb-6 ring-8 ring-primary/10">
            <QRCodeSVG value={currentUserId} size={200} level="H" />
          </div>
          <h3 className="text-lg font-black uppercase tracking-widest text-primary mb-2">Sync Identity</h3>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest leading-relaxed">Secure peer-to-peer transmission. Never share this with untrusted nodes.</p>
        </div>
      )}

      <div className="p-5 border-b space-y-5 bg-black/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="w-10 h-10 border-2 border-primary/20 ring-2 ring-primary/5">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-black">
                  {myProfile?.name?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1">
                <ICQFlower online={true} />
              </div>
            </div>
            <div className="flex flex-col">
              <h1 className="font-black text-sm tracking-tighter uppercase text-gradient">{myProfile?.name || 'Loading...'}</h1>
              <span className="text-[8px] font-bold text-primary uppercase tracking-[0.2em] animate-pulse">Online</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowAddMenu('settings')} className="p-2 bg-secondary/50 rounded-xl hover:text-primary transition-all"><Settings className="w-4 h-4" /></button>
            <button onClick={() => setShowSyncQR(true)} className="p-2 bg-secondary/50 rounded-xl hover:text-primary transition-all"><QrCode className="w-4 h-4" /></button>
            <button onClick={handleLogout} className="p-2 bg-secondary/50 rounded-xl hover:text-destructive transition-all"><LogOut className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="premium-border rounded-2xl p-4 bg-background/40 shadow-inner group cursor-pointer" onClick={copyId}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <span className="text-[8px] font-black uppercase tracking-[0.3em] opacity-40">Your Web3 UIN</span>
              <code className="text-[10px] text-muted-foreground truncate font-mono select-all mt-1">{currentUserId}</code>
            </div>
            <div className={`p-2 rounded-lg transition-all ${copied ? 'bg-primary/20 text-primary' : 'bg-white/5 group-hover:bg-white/10'}`}>
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setShowAddMenu('private')} className="flex items-center justify-center gap-2 py-3 bg-primary/10 text-primary rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-primary/20 transition-all premium-border">
            <Plus className="w-3 h-3" /> New Chat
          </button>
          <button onClick={() => setShowAddMenu('group')} className="flex items-center justify-center gap-2 py-3 bg-accent/10 text-accent rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-accent/20 transition-all premium-border">
            <Users className="w-3 h-3" /> Groups
          </button>
        </div>
        
        {showAddMenu !== 'none' && (
           <div className="p-5 bg-card border rounded-[2rem] animate-in zoom-in duration-300 shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-accent to-primary animate-progress" />
             <div className="flex items-center justify-between mb-4">
                <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground">{showAddMenu.replace('-', ' ')} protocol</h3>
                <X className="w-4 h-4 cursor-pointer hover:rotate-90 transition-transform" onClick={() => setShowAddMenu('none')} />
             </div>
             
             {showAddMenu === 'settings' && (
               <div className="space-y-4">
                 <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Display Name" className="w-full bg-secondary/50 border rounded-xl p-3 text-[10px] font-bold outline-none uppercase tracking-widest focus:ring-1 focus:ring-primary/40" />
                 <input value={editStatus} onChange={(e) => setEditStatus(e.target.value)} placeholder="Status Directive" className="w-full bg-secondary/50 border rounded-xl p-3 text-[10px] font-bold outline-none uppercase tracking-widest focus:ring-1 focus:ring-primary/40" />
                 <Button onClick={handleSaveProfile} className="w-full h-10 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] premium-border">Apply Updates</Button>
               </div>
             )}

             {showAddMenu === 'private' && (
               <div className="space-y-4">
                 <input value={newChatId} onChange={(e) => setNewChatId(e.target.value)} placeholder="Recipient UIN (0x...)" className="w-full bg-secondary/50 border rounded-xl p-3 text-[10px] font-mono outline-none focus:ring-1 focus:ring-primary/40" />
                 <div className="flex gap-2">
                   <Button onClick={handleAddPrivateChat} className="flex-1 h-10 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] premium-border">Establish Link</Button>
                 </div>
               </div>
             )}

             {showAddMenu === 'edit-contact' && editingChat && (
               <div className="space-y-4">
                 <input 
                    value={editingChat.customName || ''} 
                    onChange={(e) => setEditingChat({...editingChat, customName: e.target.value})} 
                    placeholder="Local Alias" 
                    className="w-full bg-secondary/50 border rounded-xl p-3 text-[10px] font-bold outline-none uppercase tracking-widest focus:ring-1 focus:ring-primary/40" 
                 />
                 <textarea 
                    value={editingChat.notes || ''} 
                    onChange={(e) => setEditingChat({...editingChat, notes: e.target.value})} 
                    placeholder="Private Metadata..." 
                    className="w-full bg-secondary/50 border rounded-xl p-3 text-[10px] font-bold outline-none h-24 resize-none focus:ring-1 focus:ring-primary/40" 
                 />
                 <Button onClick={handleSaveContact} className="w-full h-10 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] bg-accent premium-border">Save Data</Button>
               </div>
             )}
           </div>
        )}
      </div>

      <ScrollArea className="flex-1 px-4">
        <div className="space-y-2 py-4">
          {activeChats.map((chat) => (
            <div 
              key={chat.id} 
              className={`flex items-center gap-4 p-4 rounded-[2rem] cursor-pointer transition-all duration-500 group relative overflow-hidden ${activeChatId === chat.id ? 'bg-primary/10 border-primary/20 ring-1 ring-primary/5 shadow-2xl' : 'bg-secondary/20 border border-transparent hover:bg-secondary/40 hover:border-white/5'}`}
              onClick={() => onSelectChat(chat)}
            >
              {activeChatId === chat.id && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary animate-pulse" />}
              <div className="relative shrink-0">
                <Avatar className="w-12 h-12 border-2 border-transparent transition-all group-hover:scale-105 duration-500">
                  <AvatarImage src={chat.avatar} />
                  <AvatarFallback className="bg-secondary/80 font-black text-xs">{chat.customName?.[0] || chat.name[0]}</AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5">
                  <ICQFlower online={true} />
                </div>
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="flex justify-between items-baseline mb-0.5">
                  <span className="font-black text-sm tracking-tight truncate flex items-center gap-2">
                    {chat.customName || chat.name}
                    {chat.type === 'group' ? <Users className="w-3 h-3 text-accent" /> : <Lock className="w-2.5 h-2.5 opacity-30" />}
                  </span>
                  <span className="text-[8px] font-black uppercase tracking-widest opacity-40 shrink-0">{chat.time}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] text-muted-foreground truncate opacity-60 italic">{chat.lastMsg}</p>
                  <Edit3 
                    className="w-3 h-3 text-primary opacity-0 group-hover:opacity-100 hover:scale-125 transition-all shrink-0" 
                    onClick={(e) => { e.stopPropagation(); handleEditContact(chat); }}
                  />
                </div>
              </div>
            </div>
          ))}
          {activeChats.length === 0 && (
            <div className="py-20 text-center space-y-4 opacity-20 group">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                <MessageSquare className="w-8 h-8" />
              </div>
              <p className="text-[9px] font-black uppercase tracking-[0.4em]">Mesh is empty</p>
            </div>
          )}
        </div>
      </ScrollArea>
      
      <div className="p-4 border-t bg-black/20">
        <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-[0.4em] opacity-30">
          <span>V5.0 Protocol</span>
          <div className="flex gap-1">
             <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />
             <div className="w-1 h-1 rounded-full bg-primary animate-pulse delay-75" />
             <div className="w-1 h-1 rounded-full bg-primary animate-pulse delay-150" />
          </div>
        </div>
      </div>
    </div>
  );
}
