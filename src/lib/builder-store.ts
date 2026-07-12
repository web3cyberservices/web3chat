import { create } from 'zustand';

export type BuilderMode = 'landing' | 'ai-agent' | 'bot' | null;
export type ViewportMode = 'desktop' | 'tablet' | 'mobile';

export type BlockType = 
  | 'header' | 'hero' | 'features' | 'pricing' | 'contacts' | 'footer' | 'faq' | 'testimonials' | 'gallery' // Landing
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
  setMode: (mode: BuilderMode) => void;
  setViewport: (viewport: ViewportMode) => void;
  setBotToken: (token: string) => void;
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
  botToken: '',
  setMode: (mode) => set({ mode, blocks: [], botToken: '' }),
  setViewport: (viewport) => set({ viewport }),
  setBotToken: (botToken) => set({ botToken }),
  reset: () => set({ mode: null, blocks: [], botToken: '' }),
  addBlock: (type) => set((state) => {
    const isHeaderFooter = type === 'header' || type === 'footer';
    const isSpecialMode = state.mode === 'ai-agent' || state.mode === 'bot';
    
    const newBlock: PageBlock = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      styles: {
        backgroundColor: isHeaderFooter ? '#1a1a24' : (state.mode === 'landing' ? '#ffffff' : '#0f172a'),
        textColor: isHeaderFooter ? '#ffffff' : (state.mode === 'landing' ? '#1e293b' : '#f8fafc'),
        padding: isHeaderFooter ? 'py-4' : (isSpecialMode ? 'p-6' : 'py-20'),
        minHeight: type === 'header' ? '4rem' : (isSpecialMode ? 'auto' : 'auto'),
        fontFamily: isSpecialMode ? 'mono' : 'sans',
        fontSize: 'normal',
        overlayOpacity: 0.4,
        backgroundOpacity: 1,
        borderRadius: isSpecialMode ? '12px' : '0px',
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

function getDefaultContent(type: BlockType, mode: BuilderMode): BlockContent {
  switch (type) {
    case 'header': return { title: 'BrandLogo', links: [{label: 'Home', url: '#'}, {label: 'Features', url: '#features'}] };
    case 'hero': return { title: 'Design Your Future', description: 'Build high-converting pages in minutes.' };
    case 'faq': return { title: 'Frequently Asked Questions', faq: [{question: 'How it works?', answer: 'It is simple...'}] };
    case 'testimonials': return { title: 'What clients say', testimonials: [{name: 'John Doe', role: 'CEO', text: 'Great service!', avatar: 'https://picsum.photos/seed/1/100/100'}] };
    case 'gallery': return { title: 'Our Work', gallery: ['https://picsum.photos/seed/g1/600/400', 'https://picsum.photos/seed/g2/600/400'] };
    case 'system-prompt': return { systemPrompt: 'You are a helpful assistant specialized in Web3...' };
    case 'knowledge': return { title: 'Knowledge Sources', knowledgeSources: ['https://docs.example.com', 'Internal Handbook v1'] };
    case 'tools': return { title: 'Enabled Tools', tools: [{name: 'getWeather', description: 'Fetch weather data', endpoint: 'https://api.weather.com'}] };
    case 'command': return { commandName: '/start', description: 'Welcome message for the user' };
    case 'menu': return { title: 'Main Menu', links: [{label: 'Pricing', url: 'action_pricing'}, {label: 'Support', url: 'action_help'}] };
    case 'reply': return { title: 'Auto Reply', description: 'Hello! How can I help you today?' };
    default: return { title: `New ${type}`, description: 'Edit this block...' };
  }
}
