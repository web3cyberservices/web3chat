'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Zap, Layout, ArrowRight, MessageSquare, Lock, Globe, Cpu, ChevronRight, Star, Hexagon, Sparkles, Orbit, Layers, Terminal, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const translations = {
  en: {
    heroBadge: "Engineered for Sovereignty",
    heroTitle1: "Decentralized Future",
    heroTitle2: "in Your Hands",
    heroDesc: "The ultimate ecosystem for building high-performance landing pages, neural AI agents, and secure P2P nodes. Fusion of military-grade security and elite design.",
    ctaPrimary: "Launch Nexus",
    ctaSecondary: "Synthesis Builder",
    archTitle: "Ecosystem Core",
    archDesc: "A master-suite of decentralized tools designed for architects of the new digital age.",
    p2pTitle: "Encrypted Nexus",
    p2pDesc: "Zero-knowledge communication protocol. Pure peer-to-peer mesh encryption for absolute digital sovereignty.",
    builderTitle: "Omni-Builder IDE",
    builderDesc: "Synthesize landing pages and neural agents in a single visual workspace. Professional-grade code generation.",
    protectTitle: "Sentinel Shield",
    protectDesc: "Real-time vulnerability intelligence and automated security audits for the decentralized web.",
    launchNow: "Deploy Protocol",
  },
  ru: {
    heroBadge: "Спроектировано для суверенитета",
    heroTitle1: "Децентрализованное будущее",
    heroTitle2: "в ваших руках",
    heroDesc: "Ультимативная экосистема для создания лендингов, нейронных ИИ-агентов и узлов P2P. Слияние безопасности военного уровня и элитного дизайна.",
    ctaPrimary: "Запустить Nexus",
    ctaSecondary: "Synthesis Builder",
    archTitle: "Ядро Экосистемы",
    archDesc: "Мастер-набор децентрализованных инструментов для архитекторов новой цифровой эры.",
    p2pTitle: "Зашифрованный Nexus",
    p2pDesc: "Протокол связи с нулевым разглашением. Чистая P2P-сеть для абсолютного суверенитета.",
    builderTitle: "Omni-Builder IDE",
    builderDesc: "Синтезируйте лендинги и нейро-агентов в едином визуальном пространстве. Генерация кода профессионального уровня.",
    protectTitle: "Щит Sentinel",
    protectDesc: "Интеллектуальный поиск уязвимостей и автоматический аудит для децентрализованного веба.",
    launchNow: "Развернуть протокол",
  }
};

export default function Home() {
  const [lang, setLang] = useState<'en' | 'ru'>('en');
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) return <div className="min-h-screen bg-[#020204]" />;

  const t = translations[lang];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col overflow-x-hidden glow-mesh selection:bg-primary/30">
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary/10 blur-[180px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-600/5 blur-[180px] rounded-full" />
      </div>

      <header className="h-20 border-b border-white/5 flex items-center justify-between px-8 md:px-12 backdrop-blur-2xl sticky top-0 z-50 bg-background/40">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 glass-morphism premium-border rounded-xl flex items-center justify-center shadow-2xl shadow-primary/20 transition-transform hover:scale-105 duration-500">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <span className="font-black text-2xl tracking-tighter uppercase text-gradient">WEB3 CYBER</span>
        </div>
        
        <nav className="hidden lg:flex items-center gap-12 text-[9px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
          <a href="#architecture" className="hover:text-primary transition-all duration-500 relative group">
            Architecture
            <span className="absolute -bottom-1 left-0 w-0 h-px bg-primary transition-all duration-500 group-hover:w-full" />
          </a>
          <a href="/chat" className="hover:text-primary transition-all duration-500 relative group">
            Nexus
            <span className="absolute -bottom-1 left-0 w-0 h-px bg-primary transition-all duration-500 group-hover:w-full" />
          </a>
          <a href="/builder" className="hover:text-primary transition-all duration-500 relative group">
            Builder
            <span className="absolute -bottom-1 left-0 w-0 h-px bg-primary transition-all duration-500 group-hover:w-full" />
          </a>
        </nav>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setLang(lang === 'en' ? 'ru' : 'en')}
            className="hidden md:flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-muted-foreground hover:text-white transition-colors"
          >
            <Globe className="w-4 h-4" />
            {lang.toUpperCase()}
          </button>
          <Link href="/chat">
            <Button variant="default" className="rounded-full px-8 font-bold text-[10px] h-10 premium-border bg-primary shadow-primary/30 hover:shadow-primary/50 transition-all duration-700 uppercase tracking-widest neo-shadow">
              JOIN NETWORK
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative pt-24 pb-16 md:pt-32 md:pb-24 px-6 text-center max-w-7xl mx-auto overflow-visible">
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 glass-morphism premium-border rounded-full text-[10px] font-bold uppercase tracking-[0.4em] text-primary animate-float">
              <Sparkles className="w-3.5 h-3.5 fill-primary" /> {t.heroBadge}
            </div>
          </div>
          
          <div className="space-y-8 relative">
            <h1 className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter leading-[0.9] text-gradient">
              {t.heroTitle1} <br/>
              <span className="text-primary">{t.heroTitle2}</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed font-light tracking-wide">
              {t.heroDesc}
            </p>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-center gap-6 pt-12">
            <Link href="/chat">
              <Button size="lg" className="h-16 px-12 rounded-[1.5rem] text-lg font-bold shadow-primary/20 group hover:scale-105 transition-all duration-700 relative overflow-hidden bg-white text-black hover:bg-primary hover:text-white border-none neo-shadow">
                <span className="relative z-10 flex items-center gap-3">
                  {t.ctaPrimary} <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-700" />
                </span>
              </Button>
            </Link>
            <Link href="/builder">
              <Button variant="outline" size="lg" className="h-16 px-12 rounded-[1.5rem] text-lg font-bold glass-morphism premium-border hover:bg-white/5 transition-all duration-700 hover:scale-105">
                {t.ctaSecondary}
              </Button>
            </Link>
          </div>

          <div className="pt-24 flex flex-wrap justify-center gap-12 md:gap-20 opacity-20 grayscale hover:grayscale-0 transition-all duration-1000">
            <div className="flex items-center gap-3 font-bold tracking-[0.3em] text-[10px]"><Orbit className="w-5 h-5" /> QUANTUM</div>
            <div className="flex items-center gap-3 font-bold tracking-[0.3em] text-[10px]"><Shield className="w-5 h-5" /> ETHEREUM</div>
            <div className="flex items-center gap-3 font-bold tracking-[0.3em] text-[10px]"><Zap className="w-5 h-5" /> SOLANA</div>
            <div className="flex items-center gap-3 font-bold tracking-[0.3em] text-[10px]"><Hexagon className="w-5 h-5" /> POLYGON</div>
          </div>
        </section>

        <section id="architecture" className="py-24 md:py-32 px-6 relative bg-gradient-to-b from-transparent via-primary/5 to-transparent">
          <div className="max-w-7xl mx-auto">
            <div className="mb-20 space-y-6 text-center">
              <h2 className="text-5xl md:text-7xl font-black tracking-tighter text-gradient">{t.archTitle}</h2>
              <p className="text-muted-foreground text-xl max-w-2xl mx-auto font-light tracking-wide">{t.archDesc}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              <ProductCard 
                className="md:col-span-8 h-[450px]"
                icon={MessageSquare}
                title={t.p2pTitle}
                desc={t.p2pDesc}
                link="/chat"
                color="text-primary"
                bgColor="bg-primary/5"
                cta={t.launchNow}
              />
              <ProductCard 
                className="md:col-span-4 h-[450px]"
                icon={Layers}
                title={t.builderTitle}
                desc={t.builderDesc}
                link="/builder"
                color="text-emerald-400"
                bgColor="bg-emerald-400/5"
                cta={t.launchNow}
              />
              <ProductCard 
                className="md:col-span-5 h-[400px]"
                icon={Lock}
                title={t.protectTitle}
                desc={t.protectDesc}
                link="/protect"
                color="text-blue-400"
                bgColor="bg-blue-400/5"
                cta={t.launchNow}
              />
              
              <div className="md:col-span-7 glass-morphism premium-border rounded-[3rem] p-12 flex flex-col justify-center gap-6 group hover:border-primary/40 transition-all duration-700 bento-inner-glow">
                <div className="flex items-center justify-between">
                  <div className="w-16 h-16 bg-white/5 premium-border rounded-[1.5rem] flex items-center justify-center group-hover:scale-110 group-hover:bg-primary/10 transition-all duration-700">
                    <Terminal className="w-8 h-8 text-white group-hover:text-primary transition-colors" />
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-[9px] font-bold uppercase tracking-widest opacity-40 mb-1">Network Integrity</p>
                      <p className="text-primary font-black text-2xl">99.999%</p>
                    </div>
                    <div className="w-12 h-12 glass premium-border rounded-full flex items-center justify-center shadow-inner">
                      <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="text-3xl font-black tracking-tight">Hyper-Latency Protocol</h4>
                  <p className="text-muted-foreground text-lg leading-relaxed font-light">Global decentralized infrastructure with sub-ms synchronization and neural DDoS mitigation.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-24 border-t border-white/5 px-8 bg-[#010101]/95 backdrop-blur-3xl">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-16">
          <div className="md:col-span-5 space-y-8">
            <div className="flex items-center gap-4">
              <Shield className="w-8 h-8 text-primary" />
              <span className="font-black text-3xl tracking-tighter uppercase text-gradient">WEB3 CYBER</span>
            </div>
            <p className="text-lg text-muted-foreground max-w-sm leading-relaxed font-light">
              Pioneering the next stage of human sovereignty through advanced cryptography and distributed intelligence.
            </p>
            <div className="flex gap-6">
              <SocialIcon icon={Orbit} />
              <SocialIcon icon={Cpu} />
              <SocialIcon icon={Database} />
            </div>
          </div>
          
          <div className="md:col-span-2 space-y-8">
            <h5 className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-30">Resources</h5>
            <ul className="space-y-4 text-xs font-medium">
              <li><a href="#" className="hover:text-primary transition-all duration-300">Whitepaper</a></li>
              <li><a href="#" className="hover:text-primary transition-all duration-300">Nexus Core API</a></li>
              <li><a href="#" className="hover:text-primary transition-all duration-300">Governance</a></li>
              <li><a href="#" className="hover:text-primary transition-all duration-300">Security Audit</a></li>
            </ul>
          </div>

          <div className="md:col-span-2 space-y-8">
            <h5 className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-30">Network</h5>
            <ul className="space-y-4 text-xs font-medium">
              <li><a href="#" className="hover:text-primary transition-all duration-300">Nodes Status</a></li>
              <li><a href="#" className="hover:text-primary transition-all duration-300">Validator Staking</a></li>
              <li><a href="#" className="hover:text-primary transition-all duration-300">Legal Disclosure</a></li>
              <li><a href="#" className="hover:text-primary transition-all duration-300">Foundation</a></li>
            </ul>
          </div>

          <div className="md:col-span-3 space-y-8">
            <h5 className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-30">Relay Node</h5>
            <div className="p-6 glass-morphism premium-border rounded-[2rem] space-y-4 bento-inner-glow">
              <div className="flex items-center gap-3 text-[10px] font-bold text-primary">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                SYSTEM STATUS: OPTIMAL
              </div>
              <p className="text-[9px] opacity-40 uppercase tracking-[0.2em] leading-loose">
                Web3 Cyber Services <br/>
                Distributed Nexus V5 <br/>
                Core Identity: Sovereign
              </p>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto pt-20 text-center opacity-20 text-[9px] font-bold tracking-[0.4em] uppercase">
          &copy; 2026 WEB3 CYBER SERVICES • THE SOVEREIGN STANDARD
        </div>
      </footer>
    </div>
  );
}

function ProductCard({ icon: Icon, title, desc, link, color, bgColor, cta, className }: any) {
  return (
    <Link href={link} className={`group p-10 glass-morphism premium-border rounded-[3rem] hover:border-primary/50 transition-all duration-1000 hover:shadow-[0_40px_100px_rgba(34,197,94,0.15)] flex flex-col gap-8 bento-inner-glow ${className}`}>
      <div className={`w-14 h-14 ${bgColor} premium-border rounded-[1.25rem] flex items-center justify-center group-hover:scale-110 transition-transform duration-1000`}>
        <Icon className={`w-7 h-7 ${color}`} />
      </div>
      <div className="space-y-4">
        <h3 className="text-3xl md:text-4xl font-black tracking-tighter text-gradient">{title}</h3>
        <p className="text-muted-foreground text-base md:text-lg leading-relaxed font-light">{desc}</p>
      </div>
      <div className="mt-auto flex items-center text-[10px] font-bold gap-3 text-primary opacity-0 group-hover:opacity-100 transition-all duration-1000 translate-y-4 group-hover:translate-y-0 tracking-[0.2em] uppercase">
        {cta} <ChevronRight className="w-4 h-4" />
      </div>
    </Link>
  );
}

function SocialIcon({ icon: Icon }: any) {
  return (
    <div className="w-10 h-10 glass premium-border rounded-[0.75rem] flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all cursor-pointer group hover:scale-110 duration-500">
      <Icon className="w-5 h-5 group-hover:scale-110 transition-transform" />
    </div>
  );
}