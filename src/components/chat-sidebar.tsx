'use client';

import React, { useState, useEffect } from 'react';
import { Search, Settings, MessageSquare, Users, ShieldCheck, Copy, Check, LogOut, Lock, QrCode, X, Plus, UserPlus, Edit3, Save } from 'lucide-react';
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

export function ChatSidebar({ currentUserId, activeChatId, onSelectChat }: ChatSidebarProps) {
  const [activeChats, setActiveChats] = useState<ChatSession[]>([]);
  const [copied, setCopied] = useState(false);
  const [showSyncQR, setShowSyncQR] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState<'none' | 'private' | 'group' | 'settings' | 'edit-contact'>('none');
  const [myProfile, setMyProfile] = useState<UserProfile | null>(null);
  const [editingChat, setEditingChat] = useState<ChatSession | null>(null);
  
  const [newChatId, setNewChatId] = useState('');
  const [groupName, setGroupName] = useState('');
  const [groupMembers, setGroupMembers] = useState('');
  
  // Settings fields
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
    const interval = setInterval(async () => {
      const stored = await getChats();
      setActiveChats(stored);
    }, 3000);
    return () => clearInterval(interval);
  }, [currentUserId]);

  const copyId = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(currentUserId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast({ title: "ID Copied" });
      } else {
        throw new Error('Clipboard API unavailable');
      }
    } catch (err) {
      toast({ 
        title: "Copy Blocked", 
        description: "Clipboard access denied by browser policy.", 
        variant: "destructive" 
      });
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
      lastMsg: 'Chat created',
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

  const syncData = JSON.stringify({
    type: 'web3chat-sync',
    id: currentUserId,
    mnemonic: "LOCAL_SYNC_DATA" 
  });

  return (
    <div className="w-80 border-r flex flex-col bg-card h-full relative">
      {showSyncQR && (
        <div className="absolute inset-0 z-50 bg-background/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
          <button onClick={() => setShowSyncQR(false)} className="absolute top-4 right-4 p-2 hover:bg-secondary rounded-full">
            <X className="w-6 h-6" />
          </button>
          <div className="bg-white p-4 rounded-2xl shadow-2xl mb-6">
            <QRCodeSVG value={syncData} size={200} level="H" />
          </div>
          <h3 className="text-lg font-bold mb-2">Sync Identity</h3>
          <p className="text-sm text-muted-foreground mb-6">Never share this QR. It allows full access to your account.</p>
        </div>
      )}

      <div className="p-4 border-b space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar className="w-8 h-8 border border-primary/20">
              <AvatarFallback className="bg-primary/20 text-primary text-[10px] font-bold">
                {myProfile?.name?.[0] || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <h1 className="font-bold text-sm tracking-tight leading-none">{myProfile?.name || 'Loading...'}</h1>
              <span className="text-[9px] text-muted-foreground mt-1 truncate max-w-[120px]">{myProfile?.status || 'Active'}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Settings onClick={() => setShowAddMenu('settings')} className="w-5 h-5 text-muted-foreground cursor-pointer hover:text-primary transition-colors" />
            <QrCode onClick={() => setShowSyncQR(true)} className="w-5 h-5 text-muted-foreground cursor-pointer hover:text-primary transition-colors" />
            <LogOut onClick={handleLogout} className="w-5 h-5 text-muted-foreground cursor-pointer hover:text-destructive transition-colors" />
          </div>
        </div>

        <div className="bg-secondary/50 rounded-2xl p-3 border border-border/50">
          <div className="flex items-center justify-between gap-2 bg-background/50 p-2 rounded-xl border border-border/50">
            <code className="text-[10px] text-muted-foreground truncate font-mono select-all">{currentUserId}</code>
            <button onClick={copyId} className="shrink-0 p-1">
              {copied ? <Check className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3 text-muted-foreground hover:text-primary transition-colors" />}
            </button>
          </div>
        </div>
      </div>
      
      <div className="p-4 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setShowAddMenu('private')} className="flex items-center justify-center gap-2 py-2 bg-primary/10 text-primary rounded-xl text-xs font-bold hover:bg-primary/20 transition-colors">
            <Plus className="w-4 h-4" /> New Chat
          </button>
          <button onClick={() => setShowAddMenu('group')} className="flex items-center justify-center gap-2 py-2 bg-accent/10 text-accent rounded-xl text-xs font-bold hover:bg-accent/20 transition-colors">
            <Users className="w-4 h-4" /> New Group
          </button>
        </div>
        
        {showAddMenu === 'settings' && (
          <div className="p-4 bg-secondary/30 border rounded-2xl animate-in slide-in-from-top-2 duration-200 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">My Profile</h3>
              <X className="w-4 h-4 cursor-pointer" onClick={() => setShowAddMenu('none')} />
            </div>
            <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Display Name" className="w-full bg-background border rounded-lg p-2 text-xs outline-none" />
            <input value={editStatus} onChange={(e) => setEditStatus(e.target.value)} placeholder="Status Message" className="w-full bg-background border rounded-lg p-2 text-xs outline-none" />
            <Button onClick={handleSaveProfile} className="w-full h-8 text-[10px] rounded-lg">Save Profile</Button>
          </div>
        )}

        {showAddMenu === 'edit-contact' && editingChat && (
          <div className="p-4 bg-secondary/30 border rounded-2xl animate-in slide-in-from-top-2 duration-200 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Edit Contact</h3>
              <X className="w-4 h-4 cursor-pointer" onClick={() => setShowAddMenu('none')} />
            </div>
            <input 
              value={editingChat.customName || ''} 
              onChange={(e) => setEditingChat({...editingChat, customName: e.target.value})} 
              placeholder="Local nickname (private)" 
              className="w-full bg-background border rounded-lg p-2 text-xs outline-none" 
            />
            <textarea 
              value={editingChat.notes || ''} 
              onChange={(e) => setEditingChat({...editingChat, notes: e.target.value})} 
              placeholder="Private notes about this person..." 
              className="w-full bg-background border rounded-lg p-2 text-xs outline-none h-20 resize-none" 
            />
            <Button onClick={handleSaveContact} variant="accent" className="w-full h-8 text-[10px] rounded-lg bg-accent text-accent-foreground hover:bg-accent/90">Save Changes</Button>
          </div>
        )}

        {showAddMenu === 'private' && (
          <div className="p-3 bg-secondary/30 border rounded-xl animate-in slide-in-from-top-2 duration-200">
            <input value={newChatId} onChange={(e) => setNewChatId(e.target.value)} placeholder="Recipient Web3 ID..." className="w-full bg-background border rounded-lg p-2 text-[10px] outline-none mb-2" />
            <div className="flex gap-2">
              <button onClick={() => setShowAddMenu('none')} className="flex-1 py-1 text-[10px] bg-muted rounded">Cancel</button>
              <button onClick={handleAddPrivateChat} className="flex-1 py-1 text-[10px] bg-primary text-primary-foreground rounded">Add</button>
            </div>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1 px-2">
        <div className="space-y-1 py-2">
          {activeChats.map((chat) => (
            <div 
              key={chat.id} 
              className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all group ${activeChatId === chat.id ? 'bg-secondary' : 'hover:bg-secondary/50'}`}
              onClick={() => onSelectChat(chat)}
            >
              <Avatar className="w-12 h-12 border-2 border-transparent group-hover:border-primary/30 transition-all">
                <AvatarImage src={chat.avatar} />
                <AvatarFallback className="bg-secondary">{chat.customName?.[0] || chat.name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 overflow-hidden">
                <div className="flex justify-between items-baseline">
                  <span className="font-semibold text-sm flex items-center gap-1 truncate">
                    {chat.customName || chat.name}
                    {chat.type === 'group' ? <Users className="w-2.5 h-2.5 text-accent" /> : <Lock className="w-2.5 h-2.5 text-primary/50" />}
                  </span>
                  <span className="text-[10px] text-muted-foreground shrink-0">{chat.time}</span>
                </div>
                <div className="flex items-center justify-between gap-1">
                  <p className="text-xs text-muted-foreground truncate italic">{chat.lastMsg}</p>
                  <Edit3 
                    className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-primary transition-all shrink-0" 
                    onClick={(e) => { e.stopPropagation(); handleEditContact(chat); }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
