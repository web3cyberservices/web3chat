import { create } from 'zustand';

export type BuilderMode = 'landing' | 'ai-agent' | 'bot' | 'whatsapp' | null;
export type ViewportMode = 'desktop' | 'tablet' | 'mobile';

export type BlockType = 
  | 'header' | 'hero' | 'features' | 'pricing' | 'contacts' | 'footer' | 'faq' | 'testimonials' | 'gallery' | 'custom-code'
  | 'web3-wallet' | 'nft-gallery' | 'on-chain-form';

export type FontFamily = 
  | 'sans' | 'serif' | 'mono' 
  | 'montserrat' | 'oswald' | 'merriweather' 
  | 'bebas' | 'dancing' | 'inter';

export interface BlockStyles {
  backgroundColor: string;
  textColor: string;
  padding: string;
  backgroundImage?: string;
  fontFamily: FontFamily;
  fontSize: 'normal' | 'large' | 'huge';
  overlayOpacity?: number;
  minHeight: string;
  backgroundOpacity?: number;
  borderRadius?: string;
  
  // Border & Glow for Block
  borderColor?: string;
  borderWidth?: string;
  borderGlow?: boolean;
  borderGlowStrength?: number;

  // Title specific
  titleColor?: string;
  titleFont?: FontFamily;
  titleSize?: 'normal' | 'large' | 'huge';
  titleOpacity?: number;
  titleX: number;
  titleY: number;
  titleBorderColor?: string;
  titleBorderWidth?: string;
  titleBorderGlow?: boolean;
  titleBorderGlowStrength?: number;
  titleShadow?: 'none' | 'soft' | 'medium' | 'hard';

  // Desc specific
  descColor?: string;
  descFont?: FontFamily;
  descSize?: 'normal' | 'large' | 'huge';
  descOpacity?: number;
  descX: number;
  descY: number;
  descBorderColor?: string;
  descBorderWidth?: string;
  descBorderGlow?: boolean;
  descBorderGlowStrength?: number;
  descShadow?: 'none' | 'soft' | 'medium' | 'hard';

  // Button specific
  btnX: number;
  btnY: number;
  buttonRadius: 'none' | 'md' | 'full';
  buttonFontFamily: FontFamily;
  buttonBgColor: string;
  buttonTextColor: string;
  buttonOpacity?: number;
  buttonBorderColor?: string;
  buttonBorderWidth?: string;
  buttonBorderGlow?: boolean;
  buttonBorderGlowStrength?: number;
  buttonShadow?: 'none' | 'soft' | 'medium' | 'hard';
  
  // Button Text specific
  buttonTextBorderColor?: string;
  buttonTextBorderWidth?: string;
  buttonTextBorderGlow?: boolean;
  buttonTextBorderGlowStrength?: number;
  buttonTextShadow?: 'none' | 'soft' | 'medium' | 'hard';

  isSticky?: boolean;
  isOverlay?: boolean;
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
  logoUrl?: string; 
  links?: BlockLink[];
  customCode?: string;
  systemPrompt?: string;
  commandName?: string;
  templates?: any[];
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
  past: PageBlock[][];
  future: PageBlock[][];
  
  setMode: (mode: BuilderMode) => void;
  setViewport: (viewport: ViewportMode) => void;
  addBlock: (type: BlockType) => void;
  removeBlock: (id: string) => void;
  updateBlock: (id: string, updates: Partial<PageBlock>) => void;
  reorderBlocks: (startIndex: number, endIndex: number) => void;
  undo: () => void;
  redo: () => void;
  reset: () => void;
}

export const useBuilderStore = create<BuilderState>((set) => ({
  mode: null,
  viewport: 'desktop',
  blocks: [],
  past: [],
  future: [],

  setMode: (mode) => set({ mode, blocks: [], past: [], future: [] }),
  setViewport: (viewport) => set({ viewport }),
  reset: () => set({ mode: null, blocks: [], past: [], future: [] }),

  undo: () => set((state) => {
    if (state.past.length === 0) return state;
    const previous = state.past[state.past.length - 1];
    const newPast = state.past.slice(0, state.past.length - 1);
    return {
      past: newPast,
      blocks: previous,
      future: [state.blocks, ...state.future]
    };
  }),

  redo: () => set((state) => {
    if (state.future.length === 0) return state;
    const next = state.future[0];
    const newFuture = state.future.slice(1);
    return {
      past: [...state.past, state.blocks],
      blocks: next,
      future: newFuture
    };
  }),

  addBlock: (type) => set((state) => {
    const isSpecialMode = ['ai-agent', 'bot', 'whatsapp'].includes(state.mode || '');
    
    const newBlock: PageBlock = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      styles: {
        backgroundColor: (type === 'header' || type === 'footer') ? '#020204' : '#ffffff',
        textColor: (type === 'header' || type === 'footer') ? '#ffffff' : '#1e293b',
        padding: isSpecialMode ? 'p-10' : 'py-32 px-10',
        minHeight: type === 'header' ? '8dvh' : (type === 'hero' ? '85dvh' : 'auto'),
        fontFamily: 'sans',
        fontSize: 'large',
        overlayOpacity: 0.5,
        backgroundOpacity: 1,
        borderRadius: '0px',
        borderColor: 'transparent',
        borderWidth: '0px',
        borderGlow: false,
        borderGlowStrength: 30,
        titleX: 0, titleY: 0,
        descX: 0, descY: 0,
        btnX: 0, btnY: 0,
        translateX: 0,
        translateY: 0,
        buttonRadius: 'full',
        buttonFontFamily: 'sans',
        buttonBgColor: '#22c55e',
        buttonTextColor: '#ffffff',
        isSticky: type === 'header',
        isOverlay: type === 'header',
        titleOpacity: 1,
        descOpacity: 1,
        buttonOpacity: 1,
        titleBorderColor: 'transparent',
        titleBorderWidth: '0px',
        titleBorderGlow: false,
        titleBorderGlowStrength: 20,
        titleShadow: 'none',
        descBorderColor: 'transparent',
        descBorderWidth: '0px',
        descBorderGlow: false,
        descBorderGlowStrength: 20,
        descShadow: 'none',
        buttonBorderColor: 'transparent',
        buttonBorderWidth: '0px',
        buttonBorderGlow: false,
        buttonBorderGlowStrength: 40,
        buttonShadow: 'medium',
        buttonTextBorderColor: 'transparent',
        buttonTextBorderWidth: '0px',
        buttonTextBorderGlow: false,
        buttonTextBorderGlowStrength: 15,
        buttonTextShadow: 'none'
      },
      content: getDefaultContent(type)
    };
    
    return { 
      past: [...state.past, state.blocks],
      blocks: [...state.blocks, newBlock],
      future: []
    };
  }),

  removeBlock: (id) => set((state) => ({
    past: [...state.past, state.blocks],
    blocks: state.blocks.filter(b => b.id !== id),
    future: []
  })),

  updateBlock: (id, updates) => set((state) => {
    const newBlocks = state.blocks.map(b => b.id === id ? { ...b, ...updates } : b);
    return { blocks: newBlocks };
  }),

  reorderBlocks: (startIndex, endIndex) => set((state) => {
    const result = Array.from(state.blocks);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return { 
      past: [...state.past, state.blocks],
      blocks: result,
      future: []
    };
  }),
}));

function getDefaultContent(type: BlockType): BlockContent {
  switch (type) {
    case 'header': return { title: 'Web3Nexus', links: [{label: 'Home', url: '#'}, {label: 'Features', url: '#features'}, {label: 'DApp', url: '#dapp'}] };
    case 'hero': return { title: 'Decentralized Future', description: 'Experience the next generation of web engineering with integrated AI and Blockchain protocol.', buttonText: 'Get Started', buttonUrl: '#' };
    case 'web3-wallet': return { title: 'Connect to Nexus', description: 'Sync your digital identity via MetaMask, Phantom or Ledger securely.', buttonText: 'Connect Wallet', buttonUrl: '#' };
    default: return { title: 'New Synthesis Block', description: 'Configure your block parameters in the sidebar.', buttonText: 'Action', buttonUrl: '#' };
  }
}
