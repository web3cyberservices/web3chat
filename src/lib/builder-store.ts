
import { create } from 'zustand';

export type BuilderMode = 'landing' | 'ai-agent' | 'bot' | null;
export type ViewportMode = 'desktop' | 'tablet' | 'mobile';

export type BlockType = 
  | 'header' | 'hero' | 'features' | 'pricing' | 'contacts' | 'footer' | 'faq' | 'testimonials' | 'gallery' | 'custom-code' // Landing
  | 'system-prompt' | 'knowledge' | 'tools'      // AI Agent
  | 'command' | 'menu' | 'reply';                // Bot

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

export interface FAQItem {
  question: string;
  answer: string;
}

export interface Testimonial {
  name: string;
  role: string;
  text: string;
  avatar?: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  endpoint: string;
}

export interface BlockContent {
  title?: string;
  description?: string;
  buttonText?: string;
  buttonUrl?: string;
  logoUrl?: string; 
  links?: BlockLink[];
  faq?: FAQItem[];
  testimonials?: Testimonial[];
  gallery?: string[];
  customCode?: string;
  // Agent/Bot specific
  systemPrompt?: string;
  knowledgeSources?: string[];
  tools?: ToolDefinition[];
  commandName?: string;
  botToken?: string;
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
  past: PageBlock[][];
  future: PageBlock[][];
  
  setMode: (mode: BuilderMode) => void;
  setViewport: (viewport: ViewportMode) => void;
  setBotToken: (token: string) => void;
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
  past: [],
  future: [],

  setMode: (mode) => set({ mode, blocks: [], botToken: '', past: [], future: [] }),
  setViewport: (viewport) => set({ viewport }),
  setBotToken: (botToken) => set({ botToken }),
  reset: () => set({ mode: null, blocks: [], botToken: '', past: [], future: [] }),

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
    const isHeaderFooter = type === 'header' || type === 'footer';
    const isSpecialMode = state.mode === 'ai-agent' || state.mode === 'bot';
    
    const newBlock: PageBlock = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      styles: {
        backgroundColor: isHeaderFooter ? '#1a1a24' : (state.mode === 'landing' ? '#ffffff' : '#0f172a'),
        textColor: isHeaderFooter ? '#ffffff' : (state.mode === 'landing' ? '#1e293b' : '#f8fafc'),
        padding: isHeaderFooter ? 'py-4' : (isSpecialMode ? 'p-8' : 'py-16'),
        minHeight: type === 'header' ? '4rem' : (isSpecialMode ? 'auto' : 'auto'),
        fontFamily: isSpecialMode ? 'mono' : 'sans',
        fontSize: 'normal',
        overlayOpacity: 0.4,
        backgroundOpacity: 1,
        borderRadius: isSpecialMode ? '1.5rem' : '0px',
        titleX: 0, titleY: 0,
        descX: 0, descY: 0,
        btnX: 0, btnY: 0,
        translateX: 0,
        translateY: 0,
        buttonRadius: 'full',
        buttonFontFamily: 'sans',
        buttonBgColor: '#22c55e',
        buttonTextColor: '#ffffff',
        isSticky: type === 'header' ? false : undefined,
        isOverlay: type === 'header' ? false : undefined,
      },
      content: getDefaultContent(type, state.mode)
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
    return { 
      blocks: newBlocks,
    };
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

function getDefaultContent(type: BlockType, mode: BuilderMode): BlockContent {
  switch (type) {
    case 'header': return { title: 'BrandLogo', links: [{label: 'Home', url: '#'}, {label: 'Features', url: '#features'}] };
    case 'hero': return { title: 'Design Your Future', description: 'Build high-converting pages in minutes.' };
    case 'faq': return { title: 'Frequently Asked Questions', faq: [{question: 'How it works?', answer: 'It is simple...'}] };
    case 'testimonials': return { title: 'What clients say', testimonials: [{name: 'John Doe', role: 'CEO', text: 'Great service!', avatar: 'https://picsum.photos/seed/1/100/100'}] };
    case 'gallery': return { title: 'Our Work', gallery: ['https://picsum.photos/seed/g1/600/400', 'https://picsum.photos/seed/g2/600/400'] };
    case 'custom-code': return { customCode: '<!-- Insert custom HTML here -->\n<div class="p-8 bg-primary/20 rounded-[2rem] text-center font-bold">Custom Widget Area</div>' };
    case 'system-prompt': return { systemPrompt: 'You are a helpful assistant specialized in Web3...' };
    case 'knowledge': return { title: 'Knowledge Sources', knowledgeSources: ['https://docs.example.com', 'Internal Handbook v1'] };
    case 'tools': return { title: 'Enabled Tools', tools: [{name: 'getWeather', description: 'Fetch weather data', endpoint: 'https://api.weather.com'}] };
    case 'command': return { commandName: '/start', description: 'Welcome message for the user' };
    case 'menu': return { title: 'Main Menu', links: [{label: 'Pricing', url: 'action_pricing'}, {label: 'Support', url: 'action_help'}] };
    case 'reply': return { title: 'Auto Reply', description: 'Hello! How can I help you today?' };
    default: return { title: `New ${type}`, description: 'Edit this block...' };
  }
}
