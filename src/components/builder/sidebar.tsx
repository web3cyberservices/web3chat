'use client';

import React from 'react';
import { 
  Layout, Type, CreditCard, Mail, Plus, 
  Terminal, Database, Wrench, Code,
  Hash, List, Zap, PanelTop, PanelBottom, HelpCircle, UserCheck, ImageIcon, Sparkles, Cpu, Bot
} from 'lucide-react';
import { useBuilderStore, BlockType, BuilderMode } from '@/lib/builder-store';

const TEMPLATES: Record<NonNullable<BuilderMode>, { type: BlockType; label: string; icon: any; category: string }[]> = {
  'landing': [
    { type: 'header', label: 'Navigation', icon: PanelTop, category: 'Structure' },
    { type: 'hero', label: 'Hero Premium', icon: Sparkles, category: 'Structure' },
    { type: 'features', label: 'Feature Grid', icon: Type, category: 'Content' },
    { type: 'faq', label: 'Dynamic FAQ', icon: HelpCircle, category: 'Content' },
    { type: 'testimonials', label: 'Client Proof', icon: UserCheck, category: 'Social' },
    { type: 'gallery', label: 'Media Wall', icon: ImageIcon, category: 'Media' },
    { type: 'pricing', label: 'Tiers & Cards', icon: CreditCard, category: 'Commerce' },
    { type: 'contacts', label: 'Secure Form', icon: Mail, category: 'Social' },
    { type: 'footer', label: 'Site Ending', icon: PanelBottom, category: 'Structure' },
    { type: 'custom-code', label: 'Code Injection', icon: Code, category: 'Advanced' },
  ],
  'ai-agent': [
    { type: 'system-prompt', label: 'Core Identity', icon: Terminal, category: 'Brain' },
    { type: 'knowledge', label: 'Knowledge (RAG)', icon: Database, category: 'Brain' },
    { type: 'tools', label: 'Tool Function', icon: Wrench, category: 'Actions' },
  ],
  'bot': [
    { type: 'command', label: 'Slash /Cmd', icon: Hash, category: 'Logic' },
    { type: 'menu', label: 'Reply Keyboard', icon: List, category: 'UI' },
    { type: 'reply', label: 'Neural Reply', icon: Bot, category: 'AI' },
  ]
};

export function BuilderSidebar() {
  const { mode, addBlock, botToken, setBotToken } = useBuilderStore();
  
  if (!mode) return null;
  const currentTemplates = TEMPLATES[mode];

  // Group templates by category
  const categories = Array.from(new Set(currentTemplates.map(t => t.category)));

  return (
    <div className="w-72 bg-card border-r flex flex-col h-full z-40 bento-inner-glow">
      <div className="p-6 border-b space-y-2">
        <h2 className="font-black text-2xl tracking-tighter uppercase text-gradient">Components</h2>
        <div className="inline-flex items-center gap-2 px-2 py-0.5 bg-primary/10 text-primary rounded-full text-[9px] font-bold uppercase tracking-widest border border-primary/20">
          <Cpu className="w-3 h-3" /> {mode.replace('-', ' ')} workspace
        </div>
      </div>
      
      {mode === 'bot' && (
        <div className="p-6 border-b bg-primary/5 space-y-3">
          <label className="text-[10px] uppercase font-bold text-primary tracking-widest block">Environment Token</label>
          <input 
            value={botToken}
            onChange={(e) => setBotToken(e.target.value)}
            placeholder="TG-XXXXX-XXXXX"
            className="w-full bg-background border border-primary/20 rounded-xl p-3 text-[10px] font-mono outline-none focus:ring-1 focus:ring-primary/50 transition-all"
          />
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {categories.map((cat) => (
          <div key={cat} className="space-y-4">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-30 px-2">{cat}</h3>
            <div className="grid grid-cols-1 gap-2">
              {currentTemplates.filter(t => t.category === cat).map((block) => (
                <button
                  key={block.type}
                  onClick={() => addBlock(block.type)}
                  className="flex items-center gap-4 p-4 bg-secondary/30 rounded-2xl hover:bg-primary/10 hover:text-primary transition-all group border border-transparent hover:border-primary/20 text-left relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="p-3 bg-card premium-border rounded-xl group-hover:scale-110 transition-transform relative z-10 shadow-lg">
                    <block.icon className="w-5 h-5" />
                  </div>
                  <div className="relative z-10">
                    <span className="text-sm font-bold tracking-tight block">{block.label}</span>
                    <span className="text-[9px] opacity-40 uppercase tracking-widest">Component</span>
                  </div>
                  <Plus className="ml-auto w-4 h-4 opacity-0 group-hover:opacity-100 transition-all relative z-10" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      <div className="p-6 border-t bg-muted/20">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest opacity-40">
          <span>V5.0 Nexus Core</span>
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