'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Zap, Layout, ArrowRight, MessageSquare, Lock, Languages, Globe, Cpu, ChevronRight, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const translations = {
  en: {
    products: "Ecosystem",
    security: "Whitepaper",
    getStarted: "Get Started",
    heroBadge: "Web3 Infrastructure 2.0",
    heroTitle1: "Decentralized Services",
    heroTitle2: "for the Sovereign Web",
    heroDesc: "Deploy high-performance landing pages, AI agents, and encrypted communication channels in seconds. No-code power meets military-grade privacy.",
    openMessenger: "Enter App",
    launchBuilder: "Start Building",
    ecosystemTitle: "Advanced Ecosystem",
    ecosystemDesc: "A modular suite of tools designed for the next generation of digital builders.",
    p2pTitle: "Encrypted P2P Mesh",
    p2pDesc: "Absolute privacy with end-to-end encryption. No central servers, no logs, just pure decentralized communication.",
    builderTitle: "Universal Builder",
    builderDesc: "Visual IDE for landing pages, autonomous AI agents, and complex Telegram bots. Professional export included.",
    protectTitle: "Cyber Guard",
    protectDesc: "Automated vulnerability scanning and security audits for Web3 nodes and decentralized applications.",
    launchPlatform: "Launch",
  },
  ru: {
    products: "Экосистема",
    security: "Whitepaper",
    getStarted: "Начать работу",
    heroBadge: "Инфраструктура Web3 2.0",
    heroTitle1: "Децентрализованные сервисы",
    heroTitle2: "для свободного интернета",
    heroDesc: "Разворачивайте лендинги, ИИ-агентов и зашифрованные чаты за считанные секунды. Мощь No-code инструментов и безопасность военного уровня.",
    openMessenger: "Войти в приложение",
    launchBuilder: "Открыть конструктор",
    ecosystemTitle: "Передовая экосистема",
    ecosystemDesc: "Модульный набор инструментов, созданный для следующего поколения цифровых творцов.",
    p2pTitle: "P2P Мессенджер",
    p2pDesc: "Абсолютная приватность со сквозным шифрованием. Без центральных серверов и логов — только децентрализация.",
    builderTitle: "Универсальный Конструктор",
    builderDesc: "Визуальная среда для лендингов, автономных ИИ-агентов и Telegram-ботов. Профессиональный экспорт.",
    protectTitle: "Кибер Защита",
    protectDesc: "Автоматическое сканирование уязвимостей и аудит безопасности для Web3 нод и dApps.",
    launchPlatform: "Запустить",
  }
};

export default function Home() {
  const [lang, setLang] = useState<'en' | 'ru'>('en');
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return <div className="min-h-screen bg-[#060606]" />;
  }

  const t = translations[lang];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col overflow-x-hidden glow-mesh">
      <header className="h-20 border-b border-white/5 flex items-center justify-between px-6 md:px-12 backdrop-blur-2xl sticky top-0 z-50 bg-background/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(34,197,94,0.3)]">
            <Shield className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="font-black text-2xl tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-white/50">WEB3 CYBER</span>
        </div>
        
        <nav className="hidden lg:flex items-center gap-10 text-[11px] font-bold uppercase tracking-[0.2em] opacity-60">
          <a href="#products" className="hover:text-primary hover:opacity-100 transition-all">{t.products}</a>
          <a href="#" className="hover:text-primary hover:opacity-100 transition-all">{t.security}</a>
          <a href="#" className="hover:text-primary hover:opacity-100 transition-all">Governance</a>
        </nav>

        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setLang(lang === 'en' ? 'ru' : 'en')}
            className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest hover:bg-white/5"
          >
            <Globe className="w-4 h-4" />
            {lang === 'en' ? 'RU' : 'EN'}
          </Button>
          <Link href="/chat">
            <Button variant="default" className="rounded-full px-8 font-bold text-xs h-10 shadow-[0_0_20px_rgba(34,197,94,0.2)]">{t.getStarted}</Button>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* HERO */}
        <section className="relative py-24 md:py-48 px-6 text-center max-w-6xl mx-auto space-y-12">
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 glass rounded-full text-[10px] font-bold uppercase tracking-[0.3em] text-primary">
              <Star className="w-3 h-3 fill-primary" /> {t.heroBadge}
            </div>
          </div>
          
          <div className="space-y-6">
            <h1 className="text-6xl md:text-[110px] font-black tracking-tighter leading-[0.85] bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-white/30">
              {t.heroTitle1} <br/>
              <span className="text-primary">{t.heroTitle2}</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed font-medium">
              {t.heroDesc}
            </p>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-center gap-6 pt-6">
            <Link href="/chat">
              <Button size="lg" className="h-16 px-12 rounded-2xl text-lg font-bold shadow-2xl shadow-primary/20 group hover:scale-105 transition-all">
                {t.openMessenger} <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/builder">
              <Button variant="outline" size="lg" className="h-16 px-12 rounded-2xl text-lg font-bold border-white/10 hover:bg-white/5 glass hover:scale-105 transition-all">
                {t.launchBuilder}
              </Button>
            </Link>
          </div>

          <div className="pt-20 opacity-30 flex justify-center gap-12 grayscale hover:grayscale-0 transition-all duration-700">
            <div className="flex items-center gap-2 font-bold tracking-widest text-xs"><Cpu className="w-4 h-4" /> NVIDIA</div>
            <div className="flex items-center gap-2 font-bold tracking-widest text-xs"><Shield className="w-4 h-4" /> ETHEREUM</div>
            <div className="flex items-center gap-2 font-bold tracking-widest text-xs"><Zap className="w-4 h-4" /> SOLANA</div>
          </div>
        </section>

        {/* BENTO PRODUCTS */}
        <section id="products" className="py-32 px-6 relative">
          <div className="max-w-7xl mx-auto">
            <div className="mb-20 space-y-4 text-center">
              <h2 className="text-4xl md:text-5xl font-black tracking-tighter">{t.ecosystemTitle}</h2>
              <p className="text-muted-foreground text-lg max-w-xl mx-auto">{t.ecosystemDesc}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-auto md:h-[600px]">
              <ProductCard 
                className="md:col-span-8 md:row-span-1"
                icon={MessageSquare}
                title={t.p2pTitle}
                desc={t.p2pDesc}
                link="/chat"
                color="text-primary"
                bgColor="bg-primary/10"
                cta={t.launchPlatform}
              />
              <ProductCard 
                className="md:col-span-4 md:row-span-2"
                icon={Layout}
                title={t.builderTitle}
                desc={t.builderDesc}
                link="/builder"
                color="text-emerald-400"
                bgColor="bg-emerald-400/10"
                cta={t.launchPlatform}
              />
              <ProductCard 
                className="md:col-span-4 md:row-span-1"
                icon={Lock}
                title={t.protectTitle}
                desc={t.protectDesc}
                link="/protect"
                color="text-blue-400"
                bgColor="bg-blue-400/10"
                cta={t.launchPlatform}
              />
              <div className="md:col-span-4 glass rounded-[2.5rem] p-10 flex flex-col justify-center items-center text-center gap-4 group hover:border-primary/50 transition-all">
                <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Globe className="w-8 h-8 text-white" />
                </div>
                <h4 className="text-xl font-bold">Global Nodes</h4>
                <p className="text-xs text-muted-foreground">Available in 42 regions worldwide with <span className="text-primary">99.9% uptime</span>.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-20 border-t border-white/5 px-6 bg-black/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="md:col-span-2 space-y-6">
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-primary" />
              <span className="font-black text-xl tracking-tighter uppercase">Web3Cyber</span>
            </div>
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
              Empowering digital sovereignty through advanced cryptography and decentralized infrastructure.
            </p>
          </div>
          
          <div className="space-y-4">
            <h5 className="text-[10px] font-bold uppercase tracking-widest opacity-40">Resources</h5>
            <ul className="space-y-2 text-sm font-medium">
              <li><a href="#" className="hover:text-primary transition-colors">Documentation</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Github</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">API Reference</a></li>
            </ul>
          </div>

          <div className="space-y-4">
            <h5 className="text-[10px] font-bold uppercase tracking-widest opacity-40">Status</h5>
            <div className="flex items-center gap-2 text-xs font-bold text-primary">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Network Healthy
            </div>
            <p className="text-[10px] opacity-40 uppercase tracking-widest font-mono mt-8">
              &copy; 2026 Web3 Cyber Services
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function ProductCard({ icon: Icon, title, desc, link, color, bgColor, cta, className }: any) {
  return (
    <Link href={link} className={`group p-10 glass rounded-[2.5rem] hover:border-primary/50 transition-all hover:shadow-[0_20px_80px_rgba(34,197,94,0.1)] flex flex-col gap-6 ${className}`}>
      <div className={`w-14 h-14 ${bgColor} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500`}>
        <Icon className={`w-7 h-7 ${color}`} />
      </div>
      <div className="space-y-3">
        <h3 className="text-2xl font-black tracking-tight">{title}</h3>
        <p className="text-muted-foreground text-sm leading-relaxed font-medium">{desc}</p>
      </div>
      <div className="mt-auto flex items-center text-xs font-bold gap-2 text-primary opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
        {cta} <ChevronRight className="w-4 h-4" />
      </div>
    </Link>
  );
}