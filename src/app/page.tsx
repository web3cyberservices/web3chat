'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Zap, Layout, ArrowRight, MessageSquare, Lock, Globe, Cpu, ChevronRight, Star, Hexagon, Sparkles, Orbit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const translations = {
  en: {
    products: "Ecosystem",
    security: "Identity",
    getStarted: "Join Network",
    heroBadge: "The Sovereign Web Standard",
    heroTitle1: "Decentralized Power",
    heroTitle2: "for Digital Architects",
    heroDesc: "The all-in-one infrastructure to deploy high-performance landing pages, autonomous AI agents, and secure communication nodes. Military-grade privacy meets fluid design.",
    openMessenger: "Enter Nexus",
    launchBuilder: "Start Creation",
    ecosystemTitle: "Advanced Architecture",
    ecosystemDesc: "A modular intelligence suite engineered for those who build the future.",
    p2pTitle: "Encrypted Nexus",
    p2pDesc: "Absolute digital sovereignty. Zero logs, zero servers, full P2P mesh encryption for the ultimate communication experience.",
    builderTitle: "Omni-Channel Builder",
    builderDesc: "A visual workspace to synthesize landing pages, neural agents, and bot interfaces. Seamless export to production-ready code.",
    protectTitle: "Sentinel Shield",
    protectDesc: "Real-time vulnerability intelligence and automated security audits for decentralized systems and nodes.",
    launchPlatform: "Deploy Now",
  },
  ru: {
    products: "Экосистема",
    security: "Identity",
    getStarted: "Присоединиться",
    heroBadge: "Стандарт суверенного веба",
    heroTitle1: "Децентрализованная мощь",
    heroTitle2: "для цифровых архитекторов",
    heroDesc: "Единая инфраструктура для развертывания лендингов, автономных ИИ-агентов и узлов связи. Приватность военного уровня и безупречный дизайн.",
    openMessenger: "Войти в Nexus",
    launchBuilder: "Начать создание",
    ecosystemTitle: "Передовая архитектура",
    ecosystemDesc: "Модульный набор инструментов, созданный для архитекторов цифрового будущего.",
    p2pTitle: "Зашифрованный Nexus",
    p2pDesc: "Абсолютный цифровой суверенитет. Без серверов и логов — только чистая P2P децентрализация.",
    builderTitle: "Omni-Конструктор",
    builderDesc: "Визуальная среда для синтеза лендингов, нейро-агентов и интерфейсов ботов. Мгновенный экспорт в готовый код.",
    protectTitle: "Щит Sentinel",
    protectDesc: "Интеллектуальный поиск уязвимостей и автоматический аудит безопасности для децентрализованных систем.",
    launchPlatform: "Развернуть сейчас",
  }
};

export default function Home() {
  const [lang, setLang] = useState<'en' | 'ru'>('en');
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return <div className="min-h-screen bg-[#020203]" />;
  }

  const t = translations[lang];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col overflow-x-hidden glow-mesh">
      {/* BACKGROUND ELEMENTS */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full" />
      </div>

      <header className="h-20 border-b border-white/5 flex items-center justify-between px-6 md:px-12 backdrop-blur-3xl sticky top-0 z-50 bg-background/50">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 glass-morphism premium-border rounded-xl flex items-center justify-center shadow-2xl shadow-primary/20">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <span className="font-black text-2xl tracking-tighter uppercase text-gradient">WEB3 CYBER</span>
        </div>
        
        <nav className="hidden lg:flex items-center gap-12 text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
          <a href="#products" className="hover:text-primary transition-all duration-300">Architecture</a>
          <a href="#" className="hover:text-primary transition-all duration-300">Nexus</a>
          <a href="#" className="hover:text-primary transition-all duration-300">Governance</a>
        </nav>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setLang(lang === 'en' ? 'ru' : 'en')}
            className="hidden md:flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-white transition-colors"
          >
            <Globe className="w-4 h-4" />
            {lang === 'en' ? 'RU' : 'EN'}
          </button>
          <Link href="/chat">
            <Button variant="default" className="rounded-full px-8 font-bold text-[11px] h-11 premium-border bg-primary/90 hover:bg-primary shadow-[0_0_30px_rgba(34,197,94,0.3)] transition-all duration-500 uppercase tracking-widest">
              {t.getStarted}
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-6 text-center max-w-7xl mx-auto">
          <div className="flex justify-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 glass-morphism premium-border rounded-full text-[10px] font-bold uppercase tracking-[0.4em] text-primary animate-float">
              <Sparkles className="w-3 h-3 fill-primary" /> {t.heroBadge}
            </div>
          </div>
          
          <div className="space-y-8 relative">
            <h1 className="text-6xl md:text-[120px] font-black tracking-tighter leading-[0.85] text-gradient">
              {t.heroTitle1} <br/>
              <span className="text-primary">{t.heroTitle2}</span>
            </h1>
            <p className="text-lg md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed font-medium">
              {t.heroDesc}
            </p>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-center gap-8 pt-16">
            <Link href="/chat">
              <Button size="lg" className="h-16 px-14 rounded-2xl text-lg font-bold shadow-2xl shadow-primary/30 group hover:scale-105 transition-all duration-500 relative overflow-hidden bg-white text-black hover:bg-primary hover:text-white border-none">
                <span className="relative z-10 flex items-center gap-3">
                  {t.openMessenger} <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-500" />
                </span>
              </Button>
            </Link>
            <Link href="/builder">
              <Button variant="outline" size="lg" className="h-16 px-14 rounded-2xl text-lg font-bold glass-morphism premium-border hover:bg-white/5 transition-all duration-500">
                {t.launchBuilder}
              </Button>
            </Link>
          </div>

          <div className="pt-32 flex flex-wrap justify-center gap-16 md:gap-24 opacity-30 grayscale hover:grayscale-0 transition-all duration-1000">
            <div className="flex items-center gap-3 font-bold tracking-widest text-[11px]"><Orbit className="w-4 h-4" /> QUANTUM</div>
            <div className="flex items-center gap-3 font-bold tracking-widest text-[11px]"><Shield className="w-4 h-4" /> ETHEREUM</div>
            <div className="flex items-center gap-3 font-bold tracking-widest text-[11px]"><Zap className="w-4 h-4" /> SOLANA</div>
            <div className="flex items-center gap-3 font-bold tracking-widest text-[11px]"><Hexagon className="w-4 h-4" /> POLYGON</div>
          </div>
        </section>

        {/* BENTO ARCHITECTURE */}
        <section id="products" className="py-40 px-6 relative">
          <div className="max-w-7xl mx-auto">
            <div className="mb-24 space-y-6 text-center">
              <h2 className="text-5xl md:text-7xl font-black tracking-tighter text-gradient">{t.ecosystemTitle}</h2>
              <p className="text-muted-foreground text-xl max-w-2xl mx-auto font-medium">{t.ecosystemDesc}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 h-auto">
              <ProductCard 
                className="md:col-span-8 h-[500px]"
                icon={MessageSquare}
                title={t.p2pTitle}
                desc={t.p2pDesc}
                link="/chat"
                color="text-primary"
                bgColor="bg-primary/5"
                cta={t.launchPlatform}
              />
              <ProductCard 
                className="md:col-span-4 h-[500px]"
                icon={Layout}
                title={t.builderTitle}
                desc={t.builderDesc}
                link="/builder"
                color="text-emerald-400"
                bgColor="bg-emerald-400/5"
                cta={t.launchPlatform}
              />
              <ProductCard 
                className="md:col-span-5 h-[400px]"
                icon={Lock}
                title={t.protectTitle}
                desc={t.protectDesc}
                link="/protect"
                color="text-blue-400"
                bgColor="bg-blue-400/5"
                cta={t.launchPlatform}
              />
              <div className="md:col-span-7 glass-morphism premium-border rounded-[3rem] p-12 flex flex-col justify-center gap-6 group hover:border-primary/40 transition-all duration-700">
                <div className="flex items-center justify-between">
                  <div className="w-16 h-16 bg-white/5 rounded-[1.5rem] flex items-center justify-center group-hover:scale-110 group-hover:bg-primary/10 transition-all duration-700">
                    <Globe className="w-8 h-8 text-white group-hover:text-primary transition-colors" />
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">Uptime Status</p>
                      <p className="text-primary font-black text-xl">99.99%</p>
                    </div>
                    <div className="w-12 h-12 glass premium-border rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="text-3xl font-black tracking-tight">Hyper-Latency Nodes</h4>
                  <p className="text-muted-foreground text-lg leading-relaxed">Deployed across 60 global regions with real-time state synchronization and military-grade DDoS protection.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-32 border-t border-white/5 px-6 bg-[#010101]/80 backdrop-blur-3xl">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-20">
          <div className="md:col-span-5 space-y-10">
            <div className="flex items-center gap-4">
              <Shield className="w-8 h-8 text-primary" />
              <span className="font-black text-3xl tracking-tighter uppercase text-gradient">WEB3 CYBER</span>
            </div>
            <p className="text-lg text-muted-foreground max-w-sm leading-relaxed font-medium">
              Architecting the next generation of digital sovereignty through advanced cryptography and distributed intelligence.
            </p>
            <div className="flex gap-6">
              <SocialIcon icon={Orbit} />
              <SocialIcon icon={Cpu} />
              <SocialIcon icon={Zap} />
            </div>
          </div>
          
          <div className="md:col-span-2 space-y-8">
            <h5 className="text-[11px] font-bold uppercase tracking-[0.3em] opacity-30">Resources</h5>
            <ul className="space-y-4 text-sm font-semibold">
              <li><a href="#" className="hover:text-primary transition-all">Documentation</a></li>
              <li><a href="#" className="hover:text-primary transition-all">Nexus Core</a></li>
              <li><a href="#" className="hover:text-primary transition-all">Whitepaper</a></li>
              <li><a href="#" className="hover:text-primary transition-all">API Access</a></li>
            </ul>
          </div>

          <div className="md:col-span-2 space-y-8">
            <h5 className="text-[11px] font-bold uppercase tracking-[0.3em] opacity-30">Network</h5>
            <ul className="space-y-4 text-sm font-semibold">
              <li><a href="#" className="hover:text-primary transition-all">Nodes Status</a></li>
              <li><a href="#" className="hover:text-primary transition-all">Validator Info</a></li>
              <li><a href="#" className="hover:text-primary transition-all">Governance</a></li>
              <li><a href="#" className="hover:text-primary transition-all">Foundation</a></li>
            </ul>
          </div>

          <div className="md:col-span-3 space-y-8">
            <h5 className="text-[11px] font-bold uppercase tracking-[0.3em] opacity-30">Connectivity</h5>
            <div className="p-6 glass-morphism premium-border rounded-[2rem] space-y-4">
              <div className="flex items-center gap-3 text-xs font-bold text-primary">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                RELAY: ACTIVE
              </div>
              <p className="text-[10px] opacity-40 uppercase tracking-[0.2em] leading-loose">
                Web3 Cyber Services <br/>
                Distributed Nexus Core <br/>
                Est. 2026
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function ProductCard({ icon: Icon, title, desc, link, color, bgColor, cta, className }: any) {
  return (
    <Link href={link} className={`group p-12 glass-morphism premium-border rounded-[3.5rem] hover:border-primary/40 transition-all duration-700 hover:shadow-[0_40px_120px_rgba(34,197,94,0.15)] flex flex-col gap-8 ${className}`}>
      <div className={`w-16 h-16 ${bgColor} premium-border rounded-[1.5rem] flex items-center justify-center group-hover:scale-110 transition-transform duration-700`}>
        <Icon className={`w-8 h-8 ${color}`} />
      </div>
      <div className="space-y-4">
        <h3 className="text-4xl font-black tracking-tighter text-gradient">{title}</h3>
        <p className="text-muted-foreground text-lg leading-relaxed font-medium">{desc}</p>
      </div>
      <div className="mt-auto flex items-center text-xs font-bold gap-3 text-primary opacity-0 group-hover:opacity-100 transition-all duration-700 translate-y-4 group-hover:translate-y-0 tracking-widest uppercase">
        {cta} <ChevronRight className="w-4 h-4" />
      </div>
    </Link>
  );
}

function SocialIcon({ icon: Icon }: any) {
  return (
    <div className="w-12 h-12 glass premium-border rounded-2xl flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all cursor-pointer group">
      <Icon className="w-5 h-5 group-hover:scale-110 transition-transform" />
    </div>
  );
}
