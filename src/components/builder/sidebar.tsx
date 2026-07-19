
'use client';

import React from 'react';
import { 
  Layout, Type, CreditCard, Mail, Plus, 
  Terminal, Database, Wrench, Code,
  Hash, List, Zap, PanelTop, PanelBottom, HelpCircle, UserCheck, ImageIcon, Sparkles, Cpu, Bot, MessageSquare, Wallet, Image
} from 'lucide-react';
import { useBuilderStore, BlockType, BuilderMode } from '@/lib/builder-store';

const TEMPLATES: Record<NonNullable<BuilderMode>, { type: BlockType; label: string; icon: any; category: string }[]> = {
  'landing': [
    { type: 'header', label: 'Шапка', icon: PanelTop, category: 'Структура' },
    { type: 'hero', label: 'Главный экран', icon: Sparkles, category: 'Структура' },
    { type: 'web3-wallet', label: 'Wallet Connect', icon: Wallet, category: 'Web3' },
    { type: 'nft-gallery', label: 'NFT Галерея', icon: Image, category: 'Web3' },
    { type: 'features', label: 'Преимущества', icon: Type, category: 'Контент' },
    { type: 'pricing', label: 'Тарифы', icon: CreditCard, category: 'Контент' },
    { type: 'footer', label: 'Подвал', icon: PanelBottom, category: 'Структура' },
  ],
  'ai-agent': [
    { type: 'system-prompt', label: 'Личность (Prompt)', icon: Terminal, category: 'Мозг' },
    { type: 'knowledge', label: 'Знания (RAG)', icon: Database, category: 'Мозг' },
    { type: 'tools', label: 'Инструменты', icon: Wrench, category: 'Действия' },
  ],
  'bot': [
    { type: 'command', label: 'Команда /cmd', icon: Hash, category: 'Логика' },
    { type: 'reply', label: 'AI Ответ', icon: Bot, category: 'AI' },
  ],
  'whatsapp': [
    { type: 'wa-config', label: 'Настройка API', icon: Settings2, category: 'Система' },
    { type: 'wa-template', label: 'Шаблон Meta', icon: MessageSquare, category: 'Сообщения' },
  ]
};

import { Settings2 } from 'lucide-react';

export function BuilderSidebar() {
  const { mode, addBlock } = useBuilderStore();
  
  if (!mode) return null;
  const currentTemplates = TEMPLATES[mode];
  const categories = Array.from(new Set(currentTemplates.map(t => t.category)));

  return (
    <div className="w-72 bg-card border-r flex flex-col h-full z-40 bento-inner-glow">
      <div className="p-6 border-b">
        <h2 className="font-black text-2xl tracking-tighter uppercase text-gradient">Блоки</h2>
        <span className="text-[8px] font-bold text-primary uppercase tracking-[0.3em] mt-1 block">{mode} WORKSPACE</span>
      </div>
      
      <div className="flex-1 overflow-y-auto p-5 space-y-8">
        {categories.map((cat) => (
          <div key={cat} className="space-y-3">
            <h3 className="text-[9px] font-black uppercase tracking-[0.4em] opacity-30 px-2">{cat}</h3>
            <div className="grid grid-cols-1 gap-1.5">
              {currentTemplates.filter(t => t.category === cat).map((block) => (
                <button
                  key={block.type}
                  onClick={() => addBlock(block.type)}
                  className="flex items-center gap-4 p-4 bg-secondary/20 rounded-2xl hover:bg-primary/10 hover:text-primary transition-all group border border-transparent hover:border-primary/20 text-left"
                >
                  <div className="p-2.5 bg-card border rounded-xl group-hover:scale-110 transition-transform">
                    <block.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold block">{block.label}</span>
                  </div>
                  <Plus className="ml-auto w-3 h-3 opacity-30 group-hover:opacity-100" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      <div className="p-5 border-t bg-muted/10 text-[8px] font-black uppercase tracking-[0.4em] opacity-30 text-center">
        v8.0 Nexus Engine
      </div>
    </div>
  );
}
