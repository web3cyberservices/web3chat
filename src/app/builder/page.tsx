'use client';

import React, { useState, useEffect } from 'react';
import { BuilderSidebar } from '@/components/builder/sidebar';
import { BuilderCanvas } from '@/components/builder/canvas';
import { Button } from '@/components/ui/button';
import { 
  Save, Eye, Globe, ArrowLeft, Layout, Cpu, MessageSquare, 
  Sparkles, Monitor, Tablet, Smartphone, Download, Wand2, Plus, 
  Code, Rocket, Zap, Shield
} from 'lucide-react';
import { useBuilderStore } from '@/lib/builder-store';
import { generateFullHTML } from '@/lib/builder-renderer';
import { useToast } from '@/hooks/use-toast';
import { generateBlockContent } from '@/ai/flows/block-generator-flow';

export default function BuilderPage() {
  const { mode, setMode, blocks, reset, viewport, setViewport, undo, redo, past, future, addBlock } = useBuilderStore();
  const { toast } = useToast();
  const [hasMounted, setHasMounted] = useState(false);
  const [isMagicLoading, setIsMagicLoading] = useState(false);
  const [magicPrompt, setMagicPrompt] = useState('');

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const handlePreview = () => {
    const html = generateFullHTML(blocks);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    toast({ title: "Предпросмотр открыт в новом окне" });
  };

  const handleExport = () => {
    const html = generateFullHTML(blocks);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'web3-project.html';
    a.click();
    toast({ title: "Проект успешно экспортирован" });
  };

  const handleMagicGenerate = async () => {
    if (!magicPrompt) return;
    setIsMagicLoading(true);
    try {
      const content = await generateBlockContent({ 
        type: mode === 'landing' ? 'hero' : 'system-prompt', 
        context: magicPrompt 
      });
      // В реальном приложении мы бы создавали полноценный проект, 
      // здесь добавим сгенерированный блок
      addBlock(mode === 'landing' ? 'hero' : 'system-prompt');
      toast({ title: "AI сгенерировал новый блок на основе вашего запроса" });
      setMagicPrompt('');
    } catch (e) {
      toast({ title: "Ошибка AI генерации", variant: "destructive" });
    } finally {
      setIsMagicLoading(false);
    }
  };

  if (!hasMounted) return <div className="h-screen bg-[#020204]" />;

  if (!mode) {
    return (
      <div className="h-screen w-full bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 blur-[200px] rounded-full -z-10" />
        <div className="text-center mb-16 space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 glass-morphism premium-border rounded-full text-[10px] font-black uppercase tracking-[0.4em] text-primary animate-float mb-4">
            <Sparkles className="w-3 h-3 fill-primary" /> Synthesis Engine v8
          </div>
          <h1 className="text-6xl font-black tracking-tighter text-gradient leading-none">Создайте Будущее.</h1>
          <p className="text-muted-foreground uppercase text-[10px] tracking-[0.5em] font-bold">Выберите рабочее пространство</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-7xl w-full px-6">
          <ModeCard icon={Layout} title="Сайт / Web3" desc="DApps и лендинги нового поколения." onClick={() => setMode('landing')} color="text-primary" />
          <ModeCard icon={Cpu} title="AI Агент" desc="Нейронный мозг для вашего бизнеса." onClick={() => setMode('ai-agent')} color="text-emerald-400" />
          <ModeCard icon={MessageSquare} title="TG Бот" desc="Web3 боты с полной автоматизацией." onClick={() => setMode('bot')} color="text-blue-400" />
          <ModeCard icon={Zap} title="WhatsApp API" desc="Официальный бизнес-канал Meta." onClick={() => setMode('whatsapp')} color="text-green-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      <header className="h-16 border-b flex items-center justify-between px-8 bg-card/80 backdrop-blur-3xl shrink-0 z-50 premium-border">
        <div className="flex items-center gap-8">
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl hover:bg-white/5" onClick={reset}><ArrowLeft className="w-5 h-5" /></Button>
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <h1 className="font-black text-[10px] uppercase tracking-[0.4em] text-primary">{mode.replace('-', ' ')}</h1>
              <span className="text-[8px] font-bold opacity-30 uppercase tracking-widest mt-0.5">Active Session</span>
            </div>
            <div className="h-6 w-px bg-white/10" />
            <div className="flex items-center gap-2 bg-secondary/50 rounded-2xl p-1 border">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" disabled={past.length === 0} onClick={undo}><ArrowLeft className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl rotate-180" disabled={future.length === 0} onClick={redo}><ArrowLeft className="w-4 h-4" /></Button>
            </div>
          </div>
        </div>
        
        <div className="flex items-center bg-secondary/50 rounded-[1.5rem] p-1.5 border shadow-inner">
          <Button variant={viewport === 'desktop' ? 'secondary' : 'ghost'} size="icon" className="rounded-xl h-9 w-9" onClick={() => setViewport('desktop')}><Monitor className="w-4 h-4" /></Button>
          <Button variant={viewport === 'tablet' ? 'secondary' : 'ghost'} size="icon" className="rounded-xl h-9 w-9" onClick={() => setViewport('tablet')}><Tablet className="w-4 h-4" /></Button>
          <Button variant={viewport === 'mobile' ? 'secondary' : 'ghost'} size="icon" className="rounded-xl h-9 w-9" onClick={() => setViewport('mobile')}><Smartphone className="w-4 h-4" /></Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden lg:flex items-center gap-2 px-3 py-2 bg-black/40 border rounded-2xl focus-within:border-primary/50 transition-all">
            <Wand2 className="w-4 h-4 text-primary" />
            <input 
              value={magicPrompt}
              onChange={(e) => setMagicPrompt(e.target.value)}
              placeholder="Magic Prompt..."
              className="bg-transparent border-none text-[10px] font-bold uppercase tracking-widest outline-none w-40"
              onKeyDown={(e) => e.key === 'Enter' && handleMagicGenerate()}
            />
            <Button size="sm" variant="ghost" className="h-6 px-2 text-[8px]" onClick={handleMagicGenerate} disabled={isMagicLoading}>
              {isMagicLoading ? "..." : "GEN"}
            </Button>
          </div>
          <Button variant="outline" size="sm" className="h-10 px-6 text-[10px] font-black uppercase tracking-[0.3em] rounded-2xl glass-morphism" onClick={handlePreview}>
            <Eye className="w-4 h-4 mr-2" /> Предпросмотр
          </Button>
          <Button size="sm" className="h-10 px-8 text-[10px] font-black uppercase tracking-[0.3em] rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" /> Экспорт
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <BuilderSidebar />
        <BuilderCanvas />
      </div>
    </div>
  );
}

function ModeCard({ icon: Icon, title, desc, onClick, color }: any) {
  return (
    <button onClick={onClick} className="group p-10 bg-card/60 backdrop-blur-xl border rounded-[4rem] text-left hover:border-primary/50 transition-all flex flex-col items-start gap-6 shadow-2xl relative overflow-hidden bento-inner-glow premium-border">
      <div className={`p-5 bg-white/5 rounded-[2rem] group-hover:scale-110 group-hover:rotate-6 transition-all duration-700 ${color}`}>
        <Icon className="w-8 h-8" />
      </div>
      <div>
        <h3 className="text-2xl font-black tracking-tighter">{title}</h3>
        <p className="text-[10px] text-muted-foreground mt-3 opacity-60 leading-relaxed uppercase tracking-[0.3em] font-bold">{desc}</p>
      </div>
      <div className="mt-auto pt-8 opacity-0 group-hover:opacity-100 transition-all flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-primary">
        Initialize Workspace <Zap className="w-3 h-3 fill-primary" />
      </div>
    </button>
  );
}
