
import { create } from 'zustand';

export type BuilderMode = 'landing' | 'ai-agent' | 'bot' | null;

export type BlockType = 
  | 'hero' | 'features' | 'pricing' | 'contacts' // Landing
  | 'system-prompt' | 'knowledge' | 'tools'      // AI Agent
  | 'command' | 'menu' | 'reply';                // Bot

export interface BlockStyles {
  backgroundColor: string;
  textColor: string;
  padding: string;
}

export interface BlockContent {
  title?: string;
  description?: string;
  buttonText?: string;
  items?: string[];
  imageUrl?: string;
  code?: string; // For technical configurations
}

export interface PageBlock {
  id: string;
  type: BlockType;
  content: BlockContent;
  styles: BlockStyles;
}

interface BuilderState {
  mode: BuilderMode;
  blocks: PageBlock[];
  setMode: (mode: BuilderMode) => void;
  addBlock: (type: BlockType) => void;
  removeBlock: (id: string) => void;
  updateBlock: (id: string, updates: Partial<PageBlock>) => void;
  reorderBlocks: (startIndex: number, endIndex: number) => void;
  reset: () => void;
}

export const useBuilderStore = create<BuilderState>((set) => ({
  mode: null,
  blocks: [],
  setMode: (mode) => set({ mode, blocks: [] }),
  reset: () => set({ mode: null, blocks: [] }),
  addBlock: (type) => set((state) => {
    const newBlock: PageBlock = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      styles: {
        backgroundColor: state.mode === 'landing' ? '#ffffff' : '#1a1a24',
        textColor: state.mode === 'landing' ? '#000000' : '#ffffff',
        padding: 'py-12'
      },
      content: {
        title: getDefaultTitle(type),
        description: getDefaultDescription(type),
        buttonText: state.mode === 'landing' ? 'Action' : undefined
      }
    };
    return { blocks: [...state.blocks, newBlock] };
  }),
  removeBlock: (id) => set((state) => ({
    blocks: state.blocks.filter(b => b.id !== id)
  })),
  updateBlock: (id, updates) => set((state) => ({
    blocks: state.blocks.map(b => b.id === id ? { ...b, ...updates } : b)
  })),
  reorderBlocks: (startIndex, endIndex) => set((state) => {
    const result = Array.from(state.blocks);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return { blocks: result };
  }),
}));

function getDefaultTitle(type: BlockType) {
  switch (type) {
    case 'system-prompt': return 'System Personality';
    case 'knowledge': return 'Knowledge Base (PDF/Doc)';
    case 'tools': return 'Connected APIs';
    case 'command': return '/start Command';
    case 'menu': return 'Main Menu Buttons';
    case 'reply': return 'Auto-Response Logic';
    default: return `New ${type.charAt(0).toUpperCase() + type.slice(1)}`;
  }
}

function getDefaultDescription(type: BlockType) {
  switch (type) {
    case 'system-prompt': return 'Describe how the AI should behave and its core constraints.';
    case 'knowledge': return 'Upload documents that the agent will use as a reference.';
    case 'command': return 'Configure what happens when a user starts the bot.';
    default: return 'Configure the logic and content for this element.';
  }
}
