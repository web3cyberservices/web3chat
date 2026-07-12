'use client';

import React from 'react';
import { BuilderSidebar } from '@/components/builder/sidebar';
import { BuilderCanvas } from '@/components/builder/canvas';
import { Button } from '@/components/ui/button';
import { Save, Eye, Globe, ArrowLeft, Layout, Cpu, MessageSquare, Sparkles, Monitor, Tablet, Smartphone } from 'lucide-react';
import Link from 'next/link';
import { useBuilderStore, type BuilderMode } from '@/lib/builder-store';
import { generateFullHTML } from '@/lib/builder-renderer';

export default function BuilderPage() {
  const { mode, setMode, blocks, reset, viewport, setViewport } = useBuilderStore();

  const handleExport = () => {
    const html = generateFullHTML(blocks);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${mode || 'project'}-export.html`;
    a.click();
  };

  if (!mode) {
    return (
      <div className="h-screen w-full bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 blur-[150px] rounded-full -z-10" />
        
        <div className="text-center mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-bold uppercase tracking-widest">
            <Sparkles className="w-3 h-3" /> Select Your Path
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight">What do you want to build?</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Choose a specialized workspace tailored to your project type.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full">
          <ModeCard 
            icon={Layout} 
            title="Landing Page" 
            desc="Responsive site with sections and visual blocks." 
            onClick={() => setMode('landing')}
            color="text-primary"
            bgColor="bg-primary/10"
          />
          <ModeCard 
            icon={Cpu} 
            title="AI Agent" 
            desc="System prompts, RAG knowledge, and tool calling." 
            onClick={() => setMode('ai-agent')}
            color="text-accent"
            bgColor="bg-accent/10"
          />
          <ModeCard 
            icon={MessageSquare} 
            title="Telegram Bot" 
            desc="Command handlers, menus, and automated flows." 
            onClick={() => setMode('bot')}
            color="text-blue-400"
            bgColor="bg-blue-400/10"
          />
        </div>

        <Link href="/" className="mt-12">
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      <header className="h-16 border-b flex items-center justify-between px-6 bg-card shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={reset}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="h-6 w-[1px] bg-border mx-2" />
          <h1 className="font-bold tracking-tight capitalize hidden md:block">
            {mode.replace('-', ' ')} 
            <span className="text-primary text-[10px] ml-2 border px-2 py-0.5 rounded-full">Pro</span>
          </h1>
        </div>

        <div className="flex items-center bg-secondary/30 rounded-full p-1 border">
          <Button 
            variant={viewport === 'desktop' ? 'secondary' : 'ghost'} 
            size="icon" 
            className="rounded-full w-8 h-8"
            onClick={() => setViewport('desktop')}
          >
            <Monitor className="w-4 h-4" />
          </Button>
          <Button 
            variant={viewport === 'tablet' ? 'secondary' : 'ghost'} 
            size="icon" 
            className="rounded-full w-8 h-8"
            onClick={() => setViewport('tablet')}
          >
            <Tablet className="w-4 h-4" />
          </Button>
          <Button 
            variant={viewport === 'mobile' ? 'secondary' : 'ghost'} 
            size="icon" 
            className="rounded-full w-8 h-8"
            onClick={() => setViewport('mobile')}
          >
            <Smartphone className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => console.log(JSON.stringify(blocks, null, 2))}>
            <Eye className="w-4 h-4 mr-2" /> Inspect
          </Button>
          <Button variant="secondary" size="sm" onClick={handleExport}>
            <Save className="w-4 h-4 mr-2" /> Export
          </Button>
          <Button size="sm" className="shadow-lg shadow-primary/20">
            <Globe className="w-4 h-4 mr-2" /> Deploy
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

function ModeCard({ icon: Icon, title, desc, onClick, color, bgColor }: any) {
  return (
    <button 
      onClick={onClick}
      className="group p-8 bg-card border rounded-3xl text-left hover:border-primary/50 transition-all hover:shadow-2xl hover:shadow-primary/10 flex flex-col items-start gap-4"
    >
      <div className={`p-4 ${bgColor} rounded-2xl group-hover:scale-110 transition-transform`}>
        <Icon className={`w-8 h-8 ${color}`} />
      </div>
      <div>
        <h3 className="text-xl font-bold">{title}</h3>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{desc}</p>
      </div>
    </button>
  );
}
