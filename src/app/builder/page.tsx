
'use client';

import React, { useState, useEffect } from 'react';
import { BuilderSidebar } from '@/components/builder/sidebar';
import { BuilderCanvas } from '@/components/builder/canvas';
import { Button } from '@/components/ui/button';
import { 
  Save, Eye, Globe, ArrowLeft, Layout, Cpu, MessageSquare, 
  Sparkles, Monitor, Tablet, Smartphone, Download, Copy, Check, Play, Send, Bot, Trash2
} from 'lucide-react';
import Link from 'next/link';
import { useBuilderStore } from '@/lib/builder-store';
import { generateFullHTML } from '@/lib/builder-renderer';
import { useToast } from '@/hooks/use-toast';

export default function BuilderPage() {
  const { mode, setMode, blocks, reset, viewport, setViewport, undo, redo, past, future } = useBuilderStore();
  const { toast } = useToast();
  const [hasMounted, setHasMounted] = useState(false);

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
    toast({ title: "Проект скачан" });
  };

  if (!hasMounted) return <div className="h-screen bg-[#020204]" />;

  if (!mode) {
    return (
      <div className="h-screen w-full bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 blur-[150px] rounded-full -z-10" />
        <div className="text-center mb-12 space-y-4">
          <h1 className="text-4xl font-extrabold tracking-tight text-gradient">Что создаем сегодня?</h1>
          <p className="text-muted-foreground uppercase text-[10px] tracking-[0.4em]">Выберите рабочее пространство</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-6xl w-full px-6">
          <ModeCard icon={Layout} title="Сайт / Landing" desc="Web3 лендинги с кошельком." onClick={() => setMode('landing')} color="text-primary" />
          <ModeCard icon={Cpu} title="AI Агент" desc="Нейронные инструкции и RAG." onClick={() => setMode('ai-agent')} color="text-emerald-400" />
          <ModeCard icon={MessageSquare} title="Telegram Бот" desc="Логика и команды Telegraf." onClick={() => setMode('bot')} color="text-blue-400" />
          <ModeCard icon={MessageSquare} title="WhatsApp Бот" desc="Официальный Business API." onClick={() => setMode('whatsapp')} color="text-green-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      <header className="h-14 border-b flex items-center justify-between px-6 bg-card shrink-0 z-50">
        <div className="flex items-center gap-6">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={reset}><ArrowLeft className="w-4 h-4" /></Button>
          <div className="flex items-center gap-4">
            <h1 className="font-black text-[10px] uppercase tracking-widest text-primary">{mode.replace('-', ' ')}</h1>
            <div className="h-4 w-px bg-white/10" />
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" disabled={past.length === 0} onClick={undo}><ArrowLeft className="w-3 h-3" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 rotate-180" disabled={future.length === 0} onClick={redo}><ArrowLeft className="w-3 h-3" /></Button>
            </div>
          </div>
        </div>
        
        <div className="flex items-center bg-secondary/30 rounded-full p-1 border h-10">
          <Button variant={viewport === 'desktop' ? 'secondary' : 'ghost'} size="icon" className="rounded-full h-8 w-8" onClick={() => setViewport('desktop')}><Monitor className="w-4 h-4" /></Button>
          <Button variant={viewport === 'tablet' ? 'secondary' : 'ghost'} size="icon" className="rounded-full h-8 w-8" onClick={() => setViewport('tablet')}><Tablet className="w-4 h-4" /></Button>
          <Button variant={viewport === 'mobile' ? 'secondary' : 'ghost'} size="icon" className="rounded-full h-8 w-8" onClick={() => setViewport('mobile')}><Smartphone className="w-4 h-4" /></Button>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="h-9 px-4 text-[10px] font-bold uppercase tracking-widest rounded-xl" onClick={handlePreview}>
            <Eye className="w-3.5 h-3.5 mr-2" /> Предпросмотр
          </Button>
          <Button variant="secondary" size="sm" className="h-9 px-4 text-[10px] font-bold uppercase tracking-widest rounded-xl" onClick={handleExport}>
            <Download className="w-3.5 h-3.5 mr-2" /> Скачать
          </Button>
          <Button size="sm" className="h-9 px-6 text-[10px] font-bold uppercase tracking-widest rounded-xl bg-primary">Опубликовать</Button>
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
    <button onClick={onClick} className="group p-8 bg-card border rounded-[3rem] text-left hover:border-primary/50 transition-all flex flex-col items-start gap-4 shadow-xl relative overflow-hidden bento-inner-glow">
      <div className={`p-4 bg-white/5 rounded-2xl group-hover:scale-110 transition-transform ${color}`}><Icon className="w-6 h-6" /></div>
      <div>
        <h3 className="text-xl font-bold tracking-tight">{title}</h3>
        <p className="text-[10px] text-muted-foreground mt-2 opacity-60 leading-relaxed uppercase tracking-widest">{desc}</p>
      </div>
    </button>
  );
}
