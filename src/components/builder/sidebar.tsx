'use client';

import React from 'react';
import { 
  Layout, Type, CreditCard, Mail, Plus, 
  Terminal, Database, Wrench, 
  Hash, List, Zap, PanelTop, PanelBottom, HelpCircle, UserCheck, ImageIcon 
} from 'lucide-react';
import { useBuilderStore, BlockType, BuilderMode } from '@/lib/builder-store';

const TEMPLATES: Record<NonNullable<BuilderMode>, { type: BlockType; label: string; icon: any }[]> = {
  'landing': [
    { type: 'header', label: 'Header', icon: PanelTop },
    { type: 'hero', label: 'Hero Section', icon: Layout },
    { type: 'features', label: 'Features', icon: Type },
    { type: 'faq', label: 'FAQ', icon: HelpCircle },
    { type: 'testimonials', label: 'Testimonials', icon: UserCheck },
    { type: 'gallery', label: 'Image Gallery', icon: ImageIcon },
    { type: 'pricing', label: 'Pricing Table', icon: CreditCard },
    { type: 'contacts', label: 'Contact Us', icon: Mail },
    { type: 'footer', label: 'Footer', icon: PanelBottom },
  ],
  'ai-agent': [
    { type: 'system-prompt', label: 'System Prompt', icon: Terminal },
    { type: 'knowledge', label: 'Knowledge Base', icon: Database },
    { type: 'tools', label: 'Capabilities', icon: Wrench },
  ],
  'bot': [
    { type: 'command', label: 'Command (/cmd)', icon: Hash },
    { type: 'menu', label: 'Keyboard Menu', icon: List },
    { type: 'reply', label: 'Auto-Reply', icon: Zap },
  ]
};

export function BuilderSidebar() {
  const { mode, addBlock, botToken, setBotToken } = useBuilderStore();
  
  if (!mode) return null;
  const currentTemplates = TEMPLATES[mode];

  return (
    <div className="w-64 bg-card border-r flex flex-col h-full">
      <div className="p-4 border-b">
        <h2 className="font-bold text-lg">Blocks</h2>
        <p className="text-xs text-muted-foreground">Workspace: {mode.toUpperCase()}</p>
      </div>
      
      {mode === 'bot' && (
        <div className="p-4 border-b bg-primary/5">
          <label className="text-[10px] uppercase font-bold text-primary mb-2 block">Bot Token</label>
          <input 
            value={botToken}
            onChange={(e) => setBotToken(e.target.value)}
            placeholder="72841..."
            className="w-full bg-background border border-primary/20 rounded-lg p-2 text-xs outline-none"
          />
        </div>
      )}

      <div className="p-4 grid grid-cols-1 gap-3 overflow-y-auto">
        {currentTemplates.map((block) => (
          <button
            key={block.type}
            onClick={() => addBlock(block.type)}
            className="flex items-center gap-3 p-3 bg-secondary/50 rounded-xl hover:bg-primary/20 hover:text-primary transition-all group border border-transparent hover:border-primary/30 text-left"
          >
            <div className="p-2 bg-background rounded-lg group-hover:scale-110 transition-transform">
              <block.icon className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium">{block.label}</span>
            <Plus className="ml-auto w-4 h-4 opacity-0 group-hover:opacity-100" />
          </button>
        ))}
      </div>
    </div>
  );
}
