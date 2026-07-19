'use client';

import React from 'react';
import { 
  Layout, Type, CreditCard, Mail, Plus, 
  Terminal, Database, Wrench, Code,
  Hash, List, Zap, PanelTop, PanelBottom, 
  HelpCircle, UserCheck, ImageIcon, Sparkles, 
  Cpu, Bot, MessageSquare, Wallet, Image, 
  Layers, Lock, Globe, Settings2, FileCode, Users
} from 'lucide-react';
import { useBuilderStore, BlockType, BuilderMode } from '@/lib/builder-store';

const TEMPLATES: Record<NonNullable<BuilderMode>, { type: BlockType; label: string; icon: any; category: string }[]> = {
  'landing': [
    { type: 'header', label: 'Шапка (Nav)', icon: PanelTop, category: 'Структура' },
    { type: 'hero', label: 'Главный экран', icon: Sparkles, category: 'Структура' },
    { type: 'web3-wallet', label: 'Wallet Connect', icon: Wallet, category: 'Web3 Core' },
    { type: 'nft-gallery', label: 'NFT Галерея', icon: Image, category: 'Web3 Core' },
    { type: 'on-chain-form', label: 'On-chain Форма', icon: Lock, category: 'Web3 Core' },
    { type: 'features', label: 'Преимущества', icon: Type, category: 'Контент' },
    { type: 'pricing', label: 'Тарифы', icon: CreditCard, category: 'Контент' },
    { type: 'testimonials', label: 'Отзывы', icon: Users, category: 'Контент' },
    { type: 'faq', label: 'Вопросы', icon: HelpCircle, category: 'Контент' },
    { type: 'custom-code', label: 'Свой код (JSX)', icon: Code, category: 'Developer' },
    { type: 'footer', label: 'Подвал', icon: PanelBottom, category: 'Структура' },
  ],
  'ai-agent': [
    { type: 'system-prompt', label: 'Identity (Prompt)', icon: Terminal, category: 'Intelligence' },
    { type: 'knowledge', label: 'Knowledge (RAG)', icon: Database, category: 'Intelligence' },
    { type: 'tools', label: 'Action Tools', icon: Wrench, category: 'Actions' },
    { type: 'reply', label: 'Output Format', icon: Bot, category: 'Actions' },
  ],
  'bot': [
    { type: 'command', label: 'Command /cmd', icon: Hash, category: 'Interface' },
    { type: 'menu', label: 'Interactive Menu', icon: List, category: 'Interface' },
    { type: 'reply', label: 'Neural Reply', icon: Bot, category: 'Intelligence' },
  ],
  'whatsapp': [
    { type: 'wa-config', label: 'Cloud API Config', icon: Settings2, category: 'System' },
    { type: 'wa-template', label: 'Meta Template', icon: MessageSquare, category: 'Messaging' },
  ]
};

export function BuilderSidebar() {
  const { mode, addBlock } = useBuilderStore();
  
  if (!mode) return null;
  const currentTemplates = TEMPLATES[mode];
  const categories = Array.from(new Set(currentTemplates.map(t => t.category)));

  return (
    <div className="w-80 bg-card/40 border-r flex flex-col h-full z-40 bento-inner-glow backdrop-blur-3xl overflow-hidden">
      <div className="p-8 border-b bg-black/20">
        <h2 className="font-black text-2xl tracking-tighter uppercase text-gradient">Synthesis</h2>
        <div className="flex items-center gap-2 mt-2">
           <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
           <span className="text-[8px] font-black text-primary uppercase tracking-[0.4em]">{mode} NODE ACTIVE</span>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 space-y-10 custom-scrollbar">
        {categories.map((cat) => (
          <div key={cat} className="space-y-4">
            <h3 className="text-[9px] font-black uppercase tracking-[0.5em] opacity-30 px-3 flex items-center justify-between">
              {cat}
              <Plus className="w-3 h-3" />
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {currentTemplates.filter(t => t.category === cat).map((block) => (
                <button
                  key={block.type}
                  onClick={() => addBlock(block.type)}
                  className="flex items-center gap-4 p-4 bg-secondary/30 rounded-[1.5rem] hover:bg-primary/10 hover:text-primary transition-all group border border-transparent hover:border-primary/20 text-left relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="p-3 bg-card border border-white/5 rounded-2xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 relative z-10 shadow-lg">
                    <block.icon className="w-4 h-4" />
                  </div>
                  <div className="relative z-10">
                    <span className="text-[11px] font-black uppercase tracking-widest block">{block.label}</span>
                  </div>
                  <Zap className="ml-auto w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:animate-pulse transition-all relative z-10" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      <div className="p-6 border-t bg-black/40">
        <div className="bg-primary/5 premium-border rounded-2xl p-4 flex flex-col gap-3">
           <div className="flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-widest text-primary">Engine Load</span>
              <span className="text-[9px] font-black uppercase tracking-widest text-primary">82%</span>
           </div>
           <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-primary w-[82%] animate-pulse" />
           </div>
        </div>
      </div>
    </div>
  );
}
