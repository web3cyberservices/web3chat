'use client';

import React, { useState } from 'react';
import { Shield, Lock, EyeOff, Radio, ArrowLeft, Terminal, Search, AlertTriangle, CheckCircle, Cpu, Activity, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { analyzeSite } from '@/ai/flows/site-audit-flow';
import { useToast } from '@/hooks/use-toast';

export default function ProtectPage() {
  const [domain, setDomain] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [report, setReport] = useState<any>(null);
  const { toast } = useToast();

  const handleScan = async () => {
    if (!domain.trim()) {
      toast({ title: "Ошибка", description: "Введите корректный домен или URL", variant: "destructive" });
      return;
    }

    setIsAnalyzing(true);
    setReport(null);
    
    try {
      const result = await analyzeSite({ url: domain });
      setReport(result);
    } catch (e) {
      toast({ title: "Сбой сканирования", description: "Не удалось подключиться к анализатору", variant: "destructive" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col p-6">
      <header className="flex items-center justify-between mb-12">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold tracking-tight">Cyber Protect <span className="text-primary text-[10px] ml-2 border px-2 py-0.5 rounded-full">AI PRO</span></h1>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full flex flex-col gap-12">
        {/* Hero Section with Input */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-bold uppercase tracking-widest">
              <Radio className="w-3 h-3 animate-pulse" /> Live Security & SEO Audit
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tighter">Your Digital Shield <br/>in the Web3 Era.</h2>
            <p className="text-muted-foreground text-lg leading-relaxed max-w-lg">
              Проанализируйте ваш сайт на наличие уязвимостей, SEO-ошибок и проблем производительности с помощью нашего ИИ-сканера.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 p-2 bg-card border rounded-3xl shadow-2xl">
              <div className="flex-1 flex items-center px-4 gap-3">
                <Search className="w-5 h-5 text-muted-foreground" />
                <input 
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="domain.com or https://..."
                  className="bg-transparent border-none outline-none w-full text-sm font-medium"
                />
              </div>
              <Button 
                onClick={handleScan}
                disabled={isAnalyzing}
                className="rounded-2xl h-12 px-8 font-bold shadow-lg shadow-primary/20"
              >
                {isAnalyzing ? <Activity className="w-4 h-4 animate-spin mr-2" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                {isAnalyzing ? "Scanning..." : "Start AI Audit"}
              </Button>
            </div>
          </div>

          <div className="relative group">
            <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full group-hover:bg-primary/30 transition-all" />
            <div className="relative bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 font-mono text-[11px] leading-relaxed shadow-2xl min-h-[300px] flex flex-col justify-center">
              {!report && !isAnalyzing && (
                <div className="text-center space-y-4 opacity-50">
                  <Cpu className="w-12 h-12 mx-auto animate-pulse" />
                  <p>Ready to analyze. Waiting for domain input...</p>
                </div>
              )}
              
              {isAnalyzing && (
                <div className="space-y-2">
                  <p className="text-primary animate-pulse">[SCANNING] Initializing P2P probes...</p>
                  <p className="text-primary">[OK] Deep scan engine active</p>
                  <p className="text-accent">[INFO] Inspecting headers and SSL...</p>
                  <p className="text-accent">[INFO] Crawling SEO structure...</p>
                  <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-primary animate-progress w-2/3" />
                  </div>
                </div>
              )}

              {report && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/5">
                    <Terminal className="w-3 h-3 text-primary" />
                    <span className="text-muted-foreground">audit-report_{domain}.log</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-primary/5 rounded-xl border border-primary/20">
                      <p className="text-[9px] uppercase font-bold text-primary mb-1">Security Score</p>
                      <p className="text-2xl font-black">{report.securityScore}%</p>
                    </div>
                    <div className="p-3 bg-accent/5 rounded-xl border border-accent/20">
                      <p className="text-[9px] uppercase font-bold text-accent mb-1">SEO Score</p>
                      <p className="text-2xl font-black">{report.seoScore}%</p>
                    </div>
                  </div>
                  <p className="text-xs italic text-muted-foreground">{report.summary}</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Detailed Results Section */}
        {report && (
          <section className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-20 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <ResultCard 
              icon={AlertTriangle} 
              title="Vulnerabilities" 
              items={report.vulnerabilities} 
              color="text-red-400" 
              bgColor="bg-red-400/10" 
            />
            <ResultCard 
              icon={CheckCircle} 
              title="SEO Analysis" 
              items={report.seoIssues} 
              color="text-accent" 
              bgColor="bg-accent/10" 
            />
            <ResultCard 
              icon={Shield} 
              title="Recommendations" 
              items={report.recommendations} 
              color="text-primary" 
              bgColor="bg-primary/10" 
            />
          </section>
        )}
      </main>

      <footer className="mt-auto text-center pb-8 opacity-40 text-[10px] uppercase tracking-[0.2em]">
        Web3 Cyber Services &copy; 2026 • AI Audit Powered by Genkit
      </footer>
    </div>
  );
}

function ResultCard({ icon: Icon, title, items, color, bgColor }: any) {
  return (
    <div className="bg-card border border-white/5 rounded-[2rem] p-6 flex flex-col gap-4">
      <div className={`w-10 h-10 ${bgColor} rounded-xl flex items-center justify-center`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <h3 className="text-lg font-bold">{title}</h3>
      <ul className="space-y-2">
        {items.map((item: string, idx: number) => (
          <li key={idx} className="text-xs text-muted-foreground leading-relaxed flex items-start gap-2">
            <span className={`mt-1.5 w-1 h-1 rounded-full shrink-0 ${color.replace('text-', 'bg-')}`} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
