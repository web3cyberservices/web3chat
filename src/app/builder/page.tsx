
'use client';

import React, { useState } from 'react';
import { BuilderSidebar } from '@/components/builder/sidebar';
import { BuilderCanvas } from '@/components/builder/canvas';
import { Button } from '@/components/ui/button';
import { 
  Save, Eye, Globe, ArrowLeft, Layout, Cpu, MessageSquare, 
  Sparkles, Monitor, Tablet, Smartphone, Download, Code,
  Undo2, Redo2, Play, Send, Bot, User, Trash2
} from 'lucide-react';
import Link from 'next/link';
import { useBuilderStore } from '@/lib/builder-store';
import { generateFullHTML } from '@/lib/builder-renderer';
import { useToast } from '@/hooks/use-toast';
import { testAgent } from '@/ai/flows/test-agent-flow';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function BuilderPage() {
  const { mode, setMode, blocks, reset, viewport, setViewport, botToken, undo, redo, past, future } = useBuilderStore();
  const { toast } = useToast();
  const [isTestChatOpen, setIsTestChatOpen] = useState(false);
  const [testMessages, setTestMessages] = useState<{role: 'user' | 'model', content: string}[]>([]);
  const [testInput, setTestInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  const handleExport = () => {
    if (mode === 'landing') {
      const html = generateFullHTML(blocks);
      downloadFile(html, 'project.html', 'text/html');
    } else if (mode === 'ai-agent') {
      const config = {
        name: "My AI Agent",
        blocks: blocks.map(b => ({ type: b.type, content: b.content }))
      };
      downloadFile(JSON.stringify(config, null, 2), 'agent-config.json', 'application/json');
    } else if (mode === 'bot') {
      const code = generateBotCode(blocks, botToken);
      downloadFile(code, 'bot.js', 'application/javascript');
    }
    toast({ title: "Export Successful", description: `Your ${mode} has been exported.` });
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleTestChat = async () => {
    if (!testInput.trim() || isAiLoading) return;
    
    const userMsg = testInput;
    setTestInput('');
    setTestMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsAiLoading(true);

    try {
      const systemBlock = blocks.find(b => b.type === 'system-prompt');
      const systemPrompt = systemBlock?.content.systemPrompt || "You are a helpful assistant.";
      
      const response = await testAgent({
        systemPrompt,
        userMessage: userMsg,
        history: testMessages
      });

      setTestMessages(prev => [...prev, { role: 'model', content: response }]);
    } catch (e) {
      toast({ title: "Test Failed", description: "Could not connect to AI", variant: "destructive" });
    } finally {
      setIsAiLoading(false);
    }
  };

  const generateBotCode = (blocks: any[], token: string) => {
    return `
const { Telegraf } = require('telegraf');
const bot = new Telegraf('${token || 'YOUR_BOT_TOKEN'}');

${blocks.map(b => {
  if (b.type === 'command') {
    return `bot.command('${b.content.commandName.replace('/', '')}', (ctx) => ctx.reply('${b.content.description || 'Command executed'}'));`;
  }
  if (b.type === 'reply') {
    return `bot.on('message', (ctx) => ctx.reply('${b.content.description}'));`;
  }
  return '';
}).join('\n')}

bot.launch();
console.log('Bot is running...');
    `;
  };

  if (!mode) {
    return (
      <div className="h-screen w-full bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 blur-[150px] rounded-full -z-10" />
        <div className="text-center mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-bold uppercase tracking-widest">
            <Sparkles className="w-3 h-3" /> Workspace Selection
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight">What do you want to build?</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full">
          <ModeCard icon={Layout} title="Landing Page" desc="Responsive sites with visual blocks." onClick={() => setMode('landing')} color="text-primary" bgColor="bg-primary/10" />
          <ModeCard icon={Cpu} title="AI Agent" desc="System prompts and tool calling." onClick={() => setMode('ai-agent')} color="text-accent" bgColor="bg-accent/10" />
          <ModeCard icon={MessageSquare} title="Telegram Bot" desc="Command handlers and bot logic." onClick={() => setMode('bot')} color="text-blue-400" bgColor="bg-blue-400/10" />
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
      <header className="h-16 border-b flex items-center justify-between px-6 bg-card shrink-0 z-50">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={reset}><ArrowLeft className="w-5 h-5" /></Button>
          <div className="flex items-center gap-2 pr-4 border-r">
            <h1 className="font-bold tracking-tight capitalize">{mode.replace('-', ' ')} Builder</h1>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" disabled={past.length === 0} onClick={undo} title="Undo (Ctrl+Z)"><Undo2 className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" disabled={future.length === 0} onClick={redo} title="Redo (Ctrl+Y)"><Redo2 className="w-4 h-4" /></Button>
          </div>
        </div>
        
        <div className="flex items-center bg-secondary/30 rounded-full p-1 border">
          <Button variant={viewport === 'desktop' ? 'secondary' : 'ghost'} size="icon" className="rounded-full w-8 h-8" onClick={() => setViewport('desktop')}><Monitor className="w-4 h-4" /></Button>
          <Button variant={viewport === 'tablet' ? 'secondary' : 'ghost'} size="icon" className="rounded-full w-8 h-8" onClick={() => setViewport('tablet')}><Tablet className="w-4 h-4" /></Button>
          <Button variant={viewport === 'mobile' ? 'secondary' : 'ghost'} size="icon" className="rounded-full w-8 h-8" onClick={() => setViewport('mobile')}><Smartphone className="w-4 h-4" /></Button>
        </div>

        <div className="flex items-center gap-3">
          {mode === 'ai-agent' && (
            <Button variant="outline" size="sm" onClick={() => setIsTestChatOpen(!isTestChatOpen)} className={isTestChatOpen ? "bg-primary/10 text-primary border-primary" : ""}>
              <Play className="w-4 h-4 mr-2" /> Test Agent
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={handleExport}><Download className="w-4 h-4 mr-2" /> Export {mode === 'landing' ? 'HTML' : (mode === 'bot' ? 'JS' : 'JSON')}</Button>
          <Button size="sm"><Globe className="w-4 h-4 mr-2" /> Deploy</Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        <BuilderSidebar />
        <BuilderCanvas />
        
        {/* AI TEST PANEL */}
        {isTestChatOpen && mode === 'ai-agent' && (
          <div className="w-96 border-l bg-card flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-2"><Bot className="w-4 h-4 text-primary" /> Test Agent</h3>
              <Button variant="ghost" size="icon" onClick={() => setTestMessages([])}><Trash2 className="w-4 h-4" /></Button>
            </div>
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {testMessages.length === 0 && (
                  <div className="py-20 text-center opacity-30 italic text-sm">Send a message to start testing...</div>
                )}
                {testMessages.map((m, i) => (
                  <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
                      {m.content}
                    </div>
                  </div>
                ))}
                {isAiLoading && (
                  <div className="flex items-start gap-2 animate-pulse">
                    <div className="p-3 bg-secondary rounded-2xl text-xs">AI is thinking...</div>
                  </div>
                )}
              </div>
            </ScrollArea>
            <div className="p-4 border-t bg-background/50">
              <div className="flex gap-2">
                <input 
                  value={testInput} 
                  onChange={(e) => setTestInput(e.target.value)} 
                  onKeyDown={(e) => e.key === 'Enter' && handleTestChat()}
                  placeholder="Message your agent..." 
                  className="flex-1 bg-card border rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                />
                <Button size="icon" onClick={handleTestChat} disabled={isAiLoading}><Send className="w-4 h-4" /></Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ModeCard({ icon: Icon, title, desc, onClick, color, bgColor }: any) {
  return (
    <button onClick={onClick} className="group p-8 bg-card border rounded-3xl text-left hover:border-primary/50 transition-all flex flex-col items-start gap-4 shadow-sm hover:shadow-xl">
      <div className={`p-4 ${bgColor} rounded-2xl group-hover:scale-110 transition-transform`}><Icon className={`w-8 h-8 ${color}`} /></div>
      <div><h3 className="text-xl font-bold">{title}</h3><p className="text-sm text-muted-foreground mt-2">{desc}</p></div>
    </button>
  );
}
