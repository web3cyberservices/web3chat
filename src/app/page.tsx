'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Zap, ArrowRight, Globe, ChevronRight, Sparkles, Orbit, Hexagon, Terminal, Layers, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const translations = {
  en: {
    heroBadge: "Sovereign Engineering",
    heroTitle1: "The Decentralized",
    heroTitle2: "Standard",
    heroDesc: "Professional ecosystem for building neural agents, landing pages, and secure P2P networks. Elite security fused with futuristic aesthetics.",
    ctaPrimary: "Enter Nexus",
    ctaSecondary: "Synthesis Builder",
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
    ctaPrimary: "Войти в Nexus",
    ctaSecondary: "Synthesis Builder",
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
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary/10 blur-[180px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-600/5 blur-[180px] rounded-full" />
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
          </nav>

          <div className="flex items-center gap-3">
            <button onClick={() => setLang(lang === 'en' ? 'ru' : 'en')} className="hidden md:flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
              <Globe className="w-3.5 h-3.5" /> {lang.toUpperCase()}
            </button>
            <Link href="/chat">
              <Button size="sm" className="rounded-full px-5 font-bold text-[9px] h-8 bg-primary uppercase tracking-widest premium-border">
                JOIN
              </Button>
            </Link>
          </div>
        </header>
      </div>

      <main className="flex-grow flex flex-col justify-center">
        <section className="relative pt-32 pb-16 px-6 text-center max-w-7xl mx-auto min-h-[90vh] flex flex-col justify-center">
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 glass-morphism premium-border rounded-full text-[9px] font-bold uppercase tracking-[0.4em] text-primary animate-float">
              <Sparkles className="w-3 h-3 fill-primary" /> {t.heroBadge}
            </div>
          </div>
          
          <div className="space-y-6">
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[1] text-gradient">
              {t.heroTitle1} <br/>
              <span className="text-primary">{t.heroTitle2}</span>
            </h1>
            <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed font-light tracking-wide opacity-80">
              {t.heroDesc}
            </p>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-center gap-6 pt-12">
            <Link href="/chat">
              <Button size="lg" className="h-14 px-10 rounded-[2rem] text-sm font-bold bg-white text-black hover:bg-primary hover:text-white border-none neo-shadow group">
                {t.ctaPrimary} <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/builder">
              <Button variant="outline" size="lg" className="h-14 px-10 rounded-[2rem] text-sm font-bold glass-morphism premium-border hover:bg-white/5">
                {t.ctaSecondary}
              </Button>
            </Link>
          </div>

          <div className="flex justify-center pt-20">
            <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-30 grayscale hover:grayscale-0 transition-all duration-1000">
              <BrandLogo icon={Orbit} label="QUANTUM" />
              <BrandLogo icon={Shield} label="ETHEREUM" />
              <BrandLogo icon={Zap} label="SOLANA" />
              <BrandLogo icon={Hexagon} label="POLYGON" />
            </div>
          </div>
        </section>

        <section id="architecture" className="py-24 px-6 relative">
          <div className="max-w-7xl mx-auto">
            <div className="mb-20 space-y-4 text-center">
              <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-gradient">{t.archTitle}</h2>
              <p className="text-muted-foreground text-sm max-w-xl mx-auto font-light tracking-wide">{t.archDesc}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <ProductCard 
                className="h-[400px]"
                icon={Terminal}
                title={t.p2pTitle}
                desc={t.p2pDesc}
                link="/chat"
                color="text-primary"
                bgColor="bg-primary/5"
                cta={t.launchNow}
              />
              <ProductCard 
                className="h-[400px]"
                icon={Lock}
                title={t.vpnTitle}
                desc={t.vpnDesc}
                link="https://vpn.web3cyberservices.xyz"
                color="text-blue-400"
                bgColor="bg-blue-400/5"
                cta={t.launchNow}
              />
              <ProductCard 
                className="h-[400px]"
                icon={Layers}
                title={t.builderTitle}
                desc={t.builderDesc}
                link="/builder"
                color="text-emerald-400"
                bgColor="bg-emerald-400/5"
                cta={t.launchNow}
              />
            </div>
          </div>
        </section>
      </main>

      <footer className="py-16 border-t border-white/5 px-8 bg-[#010101]/95 text-center flex-shrink-0">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex items-center justify-center gap-3">
            <Shield className="w-6 h-6 text-primary" />
            <span className="font-black text-2xl tracking-tighter uppercase text-gradient">Web3CyberServices</span>
          </div>
          <div className="opacity-20 text-[9px] font-bold tracking-[0.4em] uppercase">
            &copy; {new Date().getFullYear()} Web3CyberServices • THE SOVEREIGN STANDARD
          </div>
        </div>
      </footer>
    </div>
  );
}

function BrandLogo({ icon: Icon, label }: any) {
  return (
    <div className="flex items-center gap-3 font-black tracking-[0.4em] text-[10px]">
      <Icon className="w-5 h-5 text-white/50" />
      <span>{label}</span>
    </div>
  );
}

function ProductCard({ icon: Icon, title, desc, link, color, bgColor, cta, className }: any) {
  const isExternal = link.startsWith('http');
  const CardWrapper = isExternal ? 'a' : Link;
  const wrapperProps = isExternal ? { href: link, target: "_blank", rel: "noopener noreferrer" } : { href: link };

  return (
    <CardWrapper {...(wrapperProps as any)} className={`group p-8 glass-morphism premium-border rounded-[4.5rem] hover:border-primary/50 transition-all duration-1000 flex flex-col gap-6 bento-inner-glow ${className}`}>
      <div className={`w-14 h-14 ${bgColor} premium-border rounded-[2rem] flex items-center justify-center group-hover:scale-110 transition-transform duration-1000`}>
        <Icon className={`w-7 h-7 ${color}`} />
      </div>
      <div className="space-y-4 text-left">
        <h3 className="text-2xl md:text-3xl font-black tracking-tighter text-gradient">{title}</h3>
        <p className="text-muted-foreground text-sm md:text-base leading-relaxed font-light">{desc}</p>
      </div>
      <div className="mt-auto flex items-center text-[10px] font-bold gap-2 text-primary opacity-0 group-hover:opacity-100 transition-all duration-1000 translate-y-2 group-hover:translate-y-0 tracking-[0.3em] uppercase">
        {cta} <ChevronRight className="w-4 h-4" />
      </div>
    </CardWrapper>
  );
}
