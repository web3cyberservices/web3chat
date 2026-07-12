import { create } from 'zustand';

export type BuilderMode = 'landing' | 'ai-agent' | 'bot' | null;
export type ViewportMode = 'desktop' | 'tablet' | 'mobile';

export type BlockType = 
  | 'header' | 'hero' | 'features' | 'pricing' | 'contacts' | 'footer' // Landing
  | 'system-prompt' | 'knowledge' | 'tools'      // AI Agent
  | 'command' | 'menu' | 'reply';                // Bot

export interface BlockStyles {
  backgroundColor: string;
  textColor: string;
  padding: string;
  backgroundImage?: string;
  fontFamily: 'sans' | 'serif' | 'mono';
  fontSize: 'normal' | 'large' | 'huge';
  overlayOpacity?: number;
  minHeight: string;
  // Positioning for elements
  titleX: number;
  titleY: number;
  descX: number;
  descY: number;
  btnX: number;
  btnY: number;
  // Button specific styles
  buttonRadius: 'none' | 'md' | 'full';
  buttonFontFamily: 'sans' | 'serif' | 'mono';
  buttonBgColor: string;
  buttonTextColor: string;
  // Legacy
  translateX: number;
  translateY: number;
}

export interface BlockLink {
  label: string;
  url: string;
}

export interface BlockContent {
  title?: string;
  description?: string;
  buttonText?: string;
  buttonUrl?: string;
  items?: string[];
  imageUrl?: string;
  logoUrl?: string; // New field for custom logo
  code?: string;
  links?: BlockLink[];
}

export interface PageBlock {
  id: string;
  type: BlockType;
  content: BlockContent;
  styles: BlockStyles;
}

interface BuilderState {
  mode: BuilderMode;
  viewport: ViewportMode;
  blocks: PageBlock[];
  setMode: (mode: BuilderMode) => void;
  setViewport: (viewport: ViewportMode) => void;
  addBlock: (type: BlockType) => void;
  removeBlock: (id: string) => void;
  updateBlock: (id: string, updates: Partial<PageBlock>) => void;
  reorderBlocks: (startIndex: number, endIndex: number) => void;
  reset: () => void;
}

export const useBuilderStore = create<BuilderState>((set) => ({
  mode: null,
  viewport: 'desktop',
  blocks: [],
  setMode: (mode) => set({ mode, blocks: [] }),
  setViewport: (viewport) => set({ viewport }),
  reset: () => set({ mode: null, blocks: [] }),
  addBlock: (type) => set((state) => {
    const newBlock: PageBlock = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      styles: {
        backgroundColor: (type === 'header' || type === 'footer') ? '#1a1a24' : (state.mode === 'landing' ? '#ffffff' : '#1a1a24'),
        textColor: (type === 'header' || type === 'footer') ? '#ffffff' : (state.mode === 'landing' ? '#000000' : '#ffffff'),
        padding: (type === 'header' || type === 'footer') ? 'py-4' : 'py-20',
        minHeight: 'auto',
        fontFamily: 'sans',
        fontSize: 'normal',
        overlayOpacity: 0.4,
        titleX: 0, titleY: 0,
        descX: 0, descY: 0,
        btnX: 0, btnY: 0,
        translateX: 0,
        translateY: 0,
        buttonRadius: 'full',
        buttonFontFamily: 'sans',
        buttonBgColor: '#22c55e',
        buttonTextColor: '#ffffff'
      },
      content: {
        title: getDefaultTitle(type),
        description: getDefaultDescription(type),
        buttonText: state.mode === 'landing' && !['header', 'footer', 'contacts'].includes(type) ? 'Get Started' : undefined,
        buttonUrl: '#',
        logoUrl: '', // Default empty logo URL
        links: (type === 'header' || type === 'footer') ? [
          { label: 'Home', url: '#' },
          { label: 'About', url: '#' },
          { label: 'Services', url: '#' }
        ] : undefined
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
    case 'header': return 'BrandLogo';
    case 'hero': return 'Design Your Future';
    case 'features': return 'Why Choose Us';
    case 'pricing': return 'Simple Pricing';
    case 'footer': return '© 2026 Web3 Services';
    default: return `New ${type.charAt(0).toUpperCase() + type.slice(1)}`;
  }
}

function getDefaultDescription(type: BlockType) {
  switch (type) {
    case 'header': return '';
    case 'hero': return 'Build beautiful high-converting landing pages in minutes with our no-code interface.';
    case 'features': return 'Describe the core benefits of your product and why users should love it.';
    case 'footer': return 'The ultimate decentralized experience.';
    default: return 'Configure the logic and content for this element.';
  }
}
