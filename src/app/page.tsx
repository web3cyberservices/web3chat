'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Zap, ArrowRight, Globe, ChevronRight, Sparkles, Orbit, Hexagon, Terminal, Layers, Lock, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const translations = {
  en: {
    heroBadge: "Sovereign Engineering",
    heroTitle1: "The Decentralized",
    heroTitle2: "Standard",
    heroDesc: "Professional ecosystem for building neural agents, landing pages, and secure P2P networks. Elite security fused with futuristic aesthetics.",
    ctaChat: "Enter Web3Chat",
    ctaBuilder: "Synthesis Builder",
    ctaVpn: "CyberArmor VPN",
    archTitle: "Ecosystem Core",
    archDesc: "A master-suite of decentralized tools for the next generation of digital architects.",
    p2pTitle: "Encrypted Nexus",
    p2pDesc: "Zero-knowledge protocol. Pure mesh encryption for absolute digital sovereignty.",
    builderTitle: "Omni-Builder IDE",
    builderDesc: "Synthesize high-performance nodes and neural agents in a single visual workspace.",
    vpnTitle: "Sovereign VPN",
    vpnDesc: "Next-gen encrypted tunnel. Bypass censorship and secure your node with high-performance protocols.",
    protectTitle: "Sentinel Shield",
    protectDesc: "Real-time vulnerability intelligence and automated security audits for Web3.",
    launchNow: "Deploy Protocol",
  },
  ru: {
    heroBadge: "Инженерия Суверенитета",
    heroTitle1: "Стандарт",
    heroTitle2: "Децентрализации",
    heroDesc: "Профессиональная экосистема для создания ИИ-агентов, лендингов и P2P-сетей. Элитная безопасность и футуристичный дизайн.",
    ctaChat: "Войти в Web3Chat",
    ctaBuilder: "Synthesis Builder",
    ctaVpn: "CyberArmor VPN",
    archTitle: "Ядро Экосистемы",
    archDesc: "Мастер-набор децентрализованных инструментов для архитекторов будущего.",
    p2pTitle: "Шифрованный Nexus",
    p2pDesc: "Протокол с нулевым разглашением. Чистая P2P-сеть для абсолютного суверенитета.",
    builderTitle: "Omni-Builder IDE",
    builderDesc: "Синтезируйте нейро-агентов и лендинги в едином визуальном пространстве.",
    vpnTitle: "Суверенный VPN",
    vpnDesc: "Шифрованный туннель нового поколения. Обход цензуры и защита вашего узла высокопроизводительными протоколами.",
    protectTitle: "Щит Sentinel",
    protectDesc: "Интеллектуальный поиск уязвимостей и автоматический аудит для Web3.",
    launchNow: "Развернуть протокол",
  }
};

export default function Home() {
  const [lang, setLang] = useState<'en' | 'ru'>('en');
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) return <div className="min-h-dvh bg-[#020204]" />;

  const t = translations[lang];

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col overflow-x-hidden glow-mesh selection:bg-primary/30">
      {/* Premium Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary/10 blur-[180px] rounded-full animate-pulse" />
        <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[200px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[20%] w-[30%] h-[30%] bg-emerald-500/5 blur-[150px] rounded-full" />
      </div>

      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-5xl px-4 flex-shrink-0">
        <header className="h-14 glass-morphism premium-border rounded-full flex items-center justify-between px-6 md:px-8 bg-background/40 backdrop-blur-3xl border border-white/10 ring-1 ring-primary/20 neo-shadow">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 glass-morphism premium-border rounded-lg flex items-center justify-center shadow-2xl shadow-primary/20">
              <Shield className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="font-black text-sm tracking-tighter uppercase text-gradient">Web3CyberServices</span>
          </div>
          
          <nav className="hidden lg:flex items-center gap-6 text-[9px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
            <a href="#architecture" className="hover:text-primary transition-all duration-500">Architecture</a>
            <a href="/chat" className="hover:text-primary transition-all duration-500">Nexus</a>
            <a href="/builder" className="hover:text-primary transition-all duration-500">Builder</a>
            <a href="/protect" className="hover:text-primary transition-all duration-500">Cyber Audit</a>
          </nav>

          <div className="flex items-center gap-3">
            <button onClick={() => setLang(lang === 'en' ? 'ru' : 'en')} className="hidden md:flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
              <Globe className="w-3.5 h-3.5" /> {lang.toUpperCase()}
            </button>
            <Link href="/chat">
              <Button size="sm" className="rounded-full px-5 font-bold text-[9px] h-8 bg-primary uppercase tracking-widest premium-border hover:scale-105 transition-all">
                JOIN
              </Button>
            </Link>
          </div>
        </header>
      </div>

      <main className="flex-grow flex flex-col">
        <section className="relative pt-24 pb-12 px-6 text-center max-w-7xl mx-auto min-h-[85vh] flex flex-col justify-center items-center">
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 glass-morphism premium-border rounded-full text-[10px] font-black uppercase tracking-[0.5em] text-primary animate-float shadow-2xl shadow-primary/10">
              <Sparkles className="w-3.5 h-3.5 fill-primary" /> {t.heroBadge}
            </div>
          </div>
          
          <div className="space-y-4">
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[1] text-gradient">
              {t.heroTitle1} <br/>
              <span className="text-primary">{t.heroTitle2}</span>
            </h1>
            <p className="text-[11px] md:text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed font-light tracking-widest opacity-80 uppercase">
              {t.heroDesc}
            </p>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-center gap-4 pt-10 w-full">
            <Link href="/chat" className="w-full md:w-auto">
              <Button size="lg" className="w-full h-14 px-8 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.3em] bg-primary text-primary-foreground hover:scale-105 transition-all neo-shadow group">
                {t.ctaChat} <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/builder" className="w-full md:w-auto">
              <Button variant="outline" size="lg" className="w-full h-14 px-8 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.3em] glass-morphism premium-border hover:bg-white/5 hover:scale-105 transition-all">
                {t.ctaBuilder}
              </Button>
            </Link>
            <a href="https://vpn.web3cyberservices.xyz" target="_blank" rel="noopener noreferrer" className="w-full md:w-auto">
              <Button size="lg" className="w-full h-14 px-8 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.3em] bg-blue-600 hover:bg-blue-500 text-white hover:scale-105 transition-all shadow-2xl shadow-blue-600/30 group">
                <ShieldCheck className="w-4 h-4 mr-2" /> {t.ctaVpn}
              </Button>
            </a>
          </div>
        </section>

        <section id="architecture" className="py-24 px-6 relative">
          <div className="max-w-7xl mx-auto">
            <div className="mb-16 space-y-4 text-center">
              <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-gradient">{t.archTitle}</h2>
              <div className="h-1 w-16 bg-primary mx-auto rounded-full" />
              <p className="text-muted-foreground text-[10px] md:text-xs max-w-xl mx-auto font-light tracking-[0.3em] uppercase">{t.archDesc}</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <ProductCard 
                className="h-[400px]"
                icon={Terminal}
                title={t.p2pTitle}
                desc={t.p2pDesc}
                link="/chat"
                color="text-primary"
                bgColor="bg-primary/10"
                cta={t.launchNow}
              />
              <ProductCard 
                className="h-[400px]"
                icon={Lock}
                title={t.vpnTitle}
                desc={t.vpnDesc}
                link="https://vpn.web3cyberservices.xyz"
                color="text-blue-400"
                bgColor="bg-blue-400/10"
                cta={t.launchNow}
              />
              <ProductCard 
                className="h-[400px]"
                icon={Layers}
                title={t.builderTitle}
                desc={t.builderDesc}
                link="/builder"
                color="text-emerald-400"
                bgColor="bg-emerald-400/10"
                cta={t.launchNow}
              />
            </div>
          </div>
        </section>
      </main>

      <footer className="py-12 border-t border-white/5 px-8 bg-[#010101]/95 text-center flex-shrink-0">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex items-center justify-center gap-3">
            <Shield className="w-6 h-6 text-primary" />
            <span className="font-black text-xl tracking-tighter uppercase text-gradient">Web3CyberServices</span>
          </div>
          <div className="flex justify-center gap-8 text-[9px] font-black uppercase tracking-[0.4em] text-muted-foreground/40">
            <a href="#" className="hover:text-primary transition-colors">Documentation</a>
            <a href="#" className="hover:text-primary transition-colors">Privacy</a>
            <a href="#" className="hover:text-primary transition-colors">Protocol</a>
          </div>
          <div className="opacity-20 text-[8px] font-bold tracking-[0.5em] uppercase">
            &copy; {new Date().getFullYear()} Web3CyberServices • THE SOVEREIGN STANDARD
          </div>
        </div>
      </footer>
    </div>
  );
}

function ProductCard({ icon: Icon, title, desc, link, color, bgColor, cta, className }: any) {
  const isExternal = link.startsWith('http');
  const CardWrapper = isExternal ? 'a' : Link;
  const wrapperProps = isExternal ? { href: link, target: "_blank", rel: "noopener noreferrer" } : { href: link };

  return (
    <CardWrapper {...(wrapperProps as any)} className={`group p-8 glass-morphism premium-border rounded-[3rem] hover:border-primary/50 transition-all duration-1000 flex flex-col gap-6 bento-inner-glow relative overflow-hidden ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
      <div className={`w-12 h-12 ${bgColor} premium-border rounded-[1.5rem] flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all duration-1000 shadow-2xl`}>
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
      <div className="space-y-4 text-left relative z-10">
        <h3 className="text-2xl md:text-3xl font-black tracking-tighter text-gradient leading-tight">{title}</h3>
        <p className="text-muted-foreground text-xs md:text-sm leading-relaxed font-light opacity-60">{desc}</p>
      </div>
      <div className="mt-auto flex items-center text-[10px] font-black gap-2 text-primary opacity-0 group-hover:opacity-100 transition-all duration-1000 translate-y-4 group-hover:translate-y-0 tracking-[0.3em] uppercase">
        {cta} <ChevronRight className="w-3 h-3" />
      </div>
    </CardWrapper>
  );
}
