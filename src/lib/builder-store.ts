
import { create } from 'zustand';

export type BlockType = 'hero' | 'features' | 'pricing' | 'contacts';

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
}

export interface PageBlock {
  id: string;
  type: BlockType;
  content: BlockContent;
  styles: BlockStyles;
}

interface BuilderState {
  blocks: PageBlock[];
  addBlock: (type: BlockType) => void;
  removeBlock: (id: string) => void;
  updateBlock: (id: string, updates: Partial<PageBlock>) => void;
  reorderBlocks: (startIndex: number, endIndex: number) => void;
}

export const useBuilderStore = create<BuilderState>((set) => ({
  blocks: [],
  addBlock: (type) => set((state) => {
    const newBlock: PageBlock = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      styles: {
        backgroundColor: '#ffffff',
        textColor: '#000000',
        padding: 'py-20'
      },
      content: {
        title: `New ${type.charAt(0).toUpperCase() + type.slice(1)} Block`,
        description: 'Edit this text to describe your product.',
        buttonText: 'Get Started'
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
