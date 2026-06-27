'use client';

import React, { useState, useEffect } from 'react';
import { Search, Settings, MessageSquare, Users, ShieldCheck, Copy, Check, LogOut, Lock, QrCode, X, Plus, UserPlus } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import images from '@/app/lib/placeholder-images.json';
import { clearAllData, getChats, saveChat, type ChatSession } from '@/lib/db';
import { QRCodeSVG } from 'qrcode.react';

interface ChatSidebarProps {
  currentUserId: string;
  activeChatId: string | null;
  onSelectChat: (chat: ChatSession) => void;
}

export function ChatSidebar({ currentUserId, activeChatId, onSelectChat }: ChatSidebarProps) {
  const [activeChats, setActiveChats] = useState<ChatSession[]>([]);
  const [copied, setCopied] = useState(false);
  const [showSyncQR, setShowSyncQR] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState<'none' | 'private' | 'group'>('none');
  
  const [newChatId, setNewChatId] = useState('');
  const [groupName, setGroupName] = useState('');
  const [groupMembers, setGroupMembers] = useState('');

  useEffect(() => {
    async function loadChats() {
      const storedChats = await getChats();
      setActiveChats(storedChats);
    }
    loadChats();
    const interval = setInterval(loadChats, 5000);
    return () => clearInterval(interval);
  }, []);

  const copyId = () => {
    navigator.clipboard.writeText(currentUserId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
      name: `User ${newChatId.trim().slice(0, 6)}`,
      type: 'private',
      lastMsg: 'Chat created',
      time: 'Now',
      avatar: images[Math.floor(Math.random() * 3)].url
    };
    await saveChat(newSession);
    setActiveChats(prev => [newSession, ...prev]);
    onSelectChat(newSession);
    setNewChatId('');
    setShowAddMenu('none');
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) return;
    const members = groupMembers.split(',').map(m => m.trim()).filter(m => m !== '');
    const groupId = 'group-' + Math.random().toString(36).slice(2, 11);
    
    const newGroup: ChatSession = {
      id: groupId,
      name: groupName.trim(),
      type: 'group',
      members: [currentUserId, ...members],
      lastMsg: 'Group created',
      time: 'Now',
      avatar: images[Math.floor(Math.random() * 3) + 4].url
    };
    await saveChat(newGroup);
    setActiveChats(prev => [newGroup, ...prev]);
    onSelectChat(newGroup);
    setGroupName('');
    setGroupMembers('');
    setShowAddMenu('none');
  };

  const syncData = JSON.stringify({
    type: 'vortex-sync',
    id: currentUserId,
    mnemonic: "SECRET_KEY_PLACEHOLDER" 
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
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
              <Lock className="text-primary-foreground w-4 h-4" />
            </div>
            <h1 className="font-bold text-xl tracking-tight">ReguScan</h1>
          </div>
          <div className="flex gap-2">
            <QrCode onClick={() => setShowSyncQR(true)} className="w-5 h-5 text-muted-foreground cursor-pointer hover:text-primary transition-colors" />
            <LogOut onClick={handleLogout} className="w-5 h-5 text-muted-foreground cursor-pointer hover:text-destructive transition-colors" />
          </div>
        </div>

        <div className="bg-secondary/50 rounded-2xl p-3 border border-border/50">
          <div className="flex items-center justify-between gap-2 bg-background/50 p-2 rounded-xl border border-border/50">
            <code className="text-[10px] text-muted-foreground truncate font-mono">{currentUserId}</code>
            <button onClick={copyId} className="shrink-0">
              {copied ? <Check className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3 text-muted-foreground hover:text-primary transition-colors" />}
            </button>
          </div>
        </div>
      </div>
      
      <div className="p-4 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setShowAddMenu('private')} className="flex items-center justify-center gap-2 py-2 bg-primary/10 text-primary rounded-xl text-xs font-bold hover:bg-primary/20">
            <Plus className="w-4 h-4" /> Chat
          </button>
          <button onClick={() => setShowAddMenu('group')} className="flex items-center justify-center gap-2 py-2 bg-accent/10 text-accent rounded-xl text-xs font-bold hover:bg-accent/20">
            <Users className="w-4 h-4" /> Group
          </button>
        </div>
        
        {showAddMenu === 'private' && (
          <div className="p-3 bg-secondary/30 border rounded-xl animate-in slide-in-from-top-2 duration-200">
            <input value={newChatId} onChange={(e) => setNewChatId(e.target.value)} placeholder="Recipient Vortex ID..." className="w-full bg-background border rounded-lg p-2 text-[10px] outline-none mb-2" />
            <div className="flex gap-2">
              <button onClick={() => setShowAddMenu('none')} className="flex-1 py-1 text-[10px] bg-muted rounded">Cancel</button>
              <button onClick={handleAddPrivateChat} className="flex-1 py-1 text-[10px] bg-primary text-primary-foreground rounded">Add</button>
            </div>
          </div>
        )}

        {showAddMenu === 'group' && (
          <div className="p-3 bg-secondary/30 border rounded-xl animate-in slide-in-from-top-2 duration-200 space-y-2">
            <input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Group Name..." className="w-full bg-background border rounded-lg p-2 text-[10px] outline-none" />
            <textarea value={groupMembers} onChange={(e) => setGroupMembers(e.target.value)} placeholder="Member IDs (comma separated)..." className="w-full bg-background border rounded-lg p-2 text-[10px] outline-none h-16 resize-none" />
            <div className="flex gap-2">
              <button onClick={() => setShowAddMenu('none')} className="flex-1 py-1 text-[10px] bg-muted rounded">Cancel</button>
              <button onClick={handleCreateGroup} className="flex-1 py-1 text-[10px] bg-accent text-accent-foreground rounded">Create</button>
            </div>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1 px-2">
        <div className="space-y-1">
          {activeChats.map((chat) => (
            <div 
              key={chat.id} 
              onClick={() => onSelectChat(chat)}
              className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors group ${activeChatId === chat.id ? 'bg-secondary' : 'hover:bg-secondary/50'}`}
            >
              <Avatar className="w-12 h-12 border-2 border-transparent group-hover:border-primary/30 transition-all">
                <AvatarImage src={chat.avatar} />
                <AvatarFallback>{chat.name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 overflow-hidden">
                <div className="flex justify-between items-baseline">
                  <span className="font-semibold text-sm flex items-center gap-1">
                    {chat.name}
                    {chat.type === 'group' ? <Users className="w-2.5 h-2.5 text-accent" /> : <Lock className="w-2.5 h-2.5 text-primary/50" />}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{chat.time}</span>
                </div>
                <p className="text-xs text-muted-foreground truncate italic">{chat.lastMsg}</p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}