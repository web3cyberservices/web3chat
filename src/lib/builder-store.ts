
import { create } from 'zustand';

export type BuilderMode = 'landing' | 'ai-agent' | 'bot' | 'whatsapp' | null;
export type ViewportMode = 'desktop' | 'tablet' | 'mobile';

export type BlockType = 
  | 'header' | 'hero' | 'features' | 'pricing' | 'contacts' | 'footer' | 'faq' | 'testimonials' | 'gallery' | 'custom-code'
  | 'web3-wallet' | 'nft-gallery' | 'on-chain-form' // Web3 Blocks
  | 'system-prompt' | 'knowledge' | 'tools'      // AI Agent
  | 'command' | 'menu' | 'reply'                // Bot
  | 'wa-template' | 'wa-config';                // WhatsApp

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
  titleX: number;
  titleY: number;
  descX: number;
  descY: number;
  btnX: number;
  btnY: number;
  buttonRadius: 'none' | 'md' | 'full';
  buttonFontFamily: FontFamily;
  buttonBgColor: string;
  buttonTextColor: string;
  isSticky?: boolean;
  isOverlay?: boolean;
  translateX: number;
  translateY: number;
}

export interface BlockLink {
  label: string;
  url: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  endpoint: string;
}

export interface WATemplate {
  name: string;
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  text: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface BlockContent {
  title?: string;
  description?: string;
  buttonText?: string;
  buttonUrl?: string;
  logoUrl?: string; 
  links?: BlockLink[];
  customCode?: string;
  // Agent/Bot/WA specific
  systemPrompt?: string;
  knowledgeSources?: string[];
  tools?: ToolDefinition[];
  commandName?: string;
  botToken?: string;
  waPhoneId?: string;
  waToken?: string;
  templates?: WATemplate[];
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
  botToken: string;
  waToken: string;
  past: PageBlock[][];
  future: PageBlock[][];
  
  setMode: (mode: BuilderMode) => void;
  setViewport: (viewport: ViewportMode) => void;
  setBotToken: (token: string) => void;
  setWaToken: (token: string) => void;
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
  botToken: '',
  waToken: '',
  past: [],
  future: [],

  setMode: (mode) => set({ mode, blocks: [], botToken: '', waToken: '', past: [], future: [] }),
  setViewport: (viewport) => set({ viewport }),
  setBotToken: (botToken) => set({ botToken }),
  setWaToken: (waToken) => set({ waToken }),
  reset: () => set({ mode: null, blocks: [], botToken: '', waToken: '', past: [], future: [] }),

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
        backgroundColor: (type === 'header' || type === 'footer') ? '#020204' : (state.mode === 'landing' ? '#ffffff' : '#0f172a'),
        textColor: (type === 'header' || type === 'footer') ? '#ffffff' : (state.mode === 'landing' ? '#1e293b' : '#f8fafc'),
        padding: isSpecialMode ? 'p-8' : 'py-20',
        minHeight: type === 'header' ? '5rem' : 'auto',
        fontFamily: isSpecialMode ? 'mono' : 'sans',
        fontSize: 'normal',
        overlayOpacity: 0.4,
        backgroundOpacity: 1,
        borderRadius: isSpecialMode ? '2rem' : '0px',
        titleX: 0, titleY: 0,
        descX: 0, descY: 0,
        btnX: 0, btnY: 0,
        translateX: 0,
        translateY: 0,
        buttonRadius: 'full',
        buttonFontFamily: 'sans',
        buttonBgColor: '#22c55e',
        buttonTextColor: '#ffffff',
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
    case 'header': return { title: 'Web3Brand', links: [{label: 'Главная', url: '#'}, {label: 'Сервисы', url: '#services'}] };
    case 'hero': return { title: 'Будущее уже здесь', description: 'Создавайте Web3 сайты и AI агентов без единой строчки кода.' };
    case 'web3-wallet': return { title: 'Подключите Кошелек', description: 'Интеграция с MetaMask, WalletConnect и Phantom.', buttonText: 'Connect Wallet' };
    case 'wa-template': return { templates: [{ name: 'welcome_msg', category: 'UTILITY', text: 'Добро пожаловать в наш сервис!', status: 'APPROVED' }] };
    case 'system-prompt': return { systemPrompt: 'Ты - профессиональный AI ассистент...' };
    case 'command': return { commandName: '/start', description: 'Приветственное сообщение бота' };
    default: return { title: 'Новый блок', description: 'Опишите ваш контент здесь...' };
  }
}
