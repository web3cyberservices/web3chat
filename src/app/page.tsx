'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Zap, Layout, ArrowRight, MessageSquare, Lock, Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const translations = {
  en: {
    products: "Products",
    security: "Security",
    about: "About",
    getStarted: "Get Started",
    heroBadge: "The Future of Digital Sovereignty",
    heroTitle1: "Building the Infrastructure for",
    heroTitle2: "Next Web",
    heroDesc: "Decentralized tools, encrypted communication, and no-code builders designed for privacy-first businesses and individuals.",
    openMessenger: "Open Messenger",
    launchBuilder: "Launch Builder",
    ecosystemTitle: "Our Ecosystem",
    ecosystemDesc: "Specialized tools for the Web3 era.",
    p2pTitle: "P2P Chat",
    p2pDesc: "End-to-end encrypted messaging with zero server-side storage. Your identity is your private key.",
    builderTitle: "No-Code Builder",
    builderDesc: "Create landing pages, AI agents, and Telegram bots in minutes. Export as standalone HTML/JS.",
    protectTitle: "Cyber Protect",
    protectDesc: "Real-time security audits and vulnerability scanning for decentralized nodes and dApps.",
    securityTitle: "Security by Design. Not as an Afterthought.",
    securityDesc: "We believe that privacy is a fundamental human right. Our platform utilizes advanced cryptography (AES-256-GCM) and decentralized protocols to ensure your data never touches a central server.",
    decentralized: "Decentralized",
    decentralizedDesc: "P2P mesh network delivery.",
    encrypted: "Encrypted",
    encryptedDesc: "Military-grade standards.",
    anonymous: "100% Anonymous",
    anonymousDesc: "No phone numbers. No emails. No tracking.",
    launchPlatform: "Launch Platform",
  },
  ru: {
    products: "Продукты",
    security: "Безопасность",
    about: "О нас",
    getStarted: "Начать",
    heroBadge: "Будущее цифрового суверенитета",
    heroTitle1: "Создаем инфраструктуру для",
    heroTitle2: "Веб 3.0",
    heroDesc: "Децентрализованные инструменты, зашифрованная связь и no-code конструкторы для приватного бизнеса и частных лиц.",
    openMessenger: "Открыть мессенджер",
    launchBuilder: "Запустить конструктор",
    ecosystemTitle: "Наша экосистема",
    ecosystemDesc: "Специализированные инструменты для эры Web3.",
    p2pTitle: "P2P Чат",
    p2pDesc: "Сквозное шифрование сообщений без серверного хранения. Ваша личность — ваш приватный ключ.",
    builderTitle: "No-Code Конструктор",
    builderDesc: "Создавайте лендинги, ИИ-агентов и Telegram-ботов за считанные минуты. Экспорт в HTML/JS.",
    protectTitle: "Кибер Защита",
    protectDesc: "Аудит безопасности в реальном времени и сканирование уязвимостей для нод и dApps.",
    securityTitle: "Безопасность по умолчанию. А не как дополнение.",
    securityDesc: "Мы верим, что приватность — это фундаментальное право человека. Наша платформа использует AES-256-GCM и P2P протоколы.",
    decentralized: "Децентрализация",
    decentralizedDesc: "Доставка через P2P сеть.",
    encrypted: "Шифрование",
    encryptedDesc: "Военные стандарты защиты.",
    anonymous: "100% Анонимность",
    anonymousDesc: "Без номеров. Без почты. Без слежки.",
    launchPlatform: "Запустить платформу",
  }
};

export default function Home() {
  const [lang, setLang] = useState<'en' | 'ru'>('en');
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return <div className="min-h-screen bg-[#0d0d12]" />;
  }

  const t = translations[lang];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/10 blur-[150px] rounded-full" />
      </div>

      <header className="h-20 border-b border-white/5 flex items-center justify-between px-6 md:px-12 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-black text-xl tracking-tighter">Web3CyberServices</span>
        </div>
        
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium opacity-70">
          <a href="#products" className="hover:text-primary transition-colors">{t.products}</a>
          <a href="#security" className="hover:text-primary transition-colors">{t.security}</a>
        </nav>

        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setLang(lang === 'en' ? 'ru' : 'en')}
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest"
          >
            <Languages className="w-4 h-4" />
            {lang === 'en' ? 'RU' : 'EN'}
          </Button>
          <Link href="/chat">
            <Button variant="default" className="rounded-full px-6">{t.getStarted}</Button>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="py-24 md:py-40 px-6 text-center max-w-5xl mx-auto space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-bold uppercase tracking-widest">
            <Zap className="w-3 h-3" /> {t.heroBadge}
          </div>
          <h1 className="text-5xl md:text-8xl font-black tracking-tighter leading-[0.9]">
            {t.heroTitle1} <span className="text-primary">{t.heroTitle2}</span>.
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {t.heroDesc}
          </p>
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 pt-8">
            <Link href="/chat">
              <Button size="lg" className="h-16 px-10 rounded-2xl text-lg font-bold shadow-2xl shadow-primary/20 group">
                {t.openMessenger} <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/builder">
              <Button variant="outline" size="lg" className="h-16 px-10 rounded-2xl text-lg font-bold border-white/10 hover:bg-white/5">
                {t.launchBuilder}
              </Button>
            </Link>
          </div>
        </section>

        <section id="products" className="py-24 px-6 bg-white/[0.02] border-y border-white/5">
          <div className="max-w-7xl mx-auto">
            <div className="mb-16 space-y-4 text-center md:text-left">
              <h2 className="text-3xl font-bold">{t.ecosystemTitle}</h2>
              <p className="text-muted-foreground">{t.ecosystemDesc}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <ProductCard 
                icon={MessageSquare}
                title={t.p2pTitle}
                desc={t.p2pDesc}
                link="/chat"
                color="text-primary"
                bgColor="bg-primary/10"
                cta={t.launchPlatform}
              />
              <ProductCard 
                icon={Layout}
                title={t.builderTitle}
                desc={t.builderDesc}
                link="/builder"
                color="text-accent"
                bgColor="bg-accent/10"
                cta={t.launchPlatform}
              />
              <ProductCard 
                icon={Lock}
                title={t.protectTitle}
                desc={t.protectDesc}
                link="/protect"
                color="text-blue-400"
                bgColor="bg-blue-400/10"
                cta={t.launchPlatform}
              />
            </div>
          </div>
        </section>
      </main>

      <footer className="py-12 border-t border-white/5 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-bold text-sm tracking-widest uppercase">Web3CyberServices</span>
          </div>
          <p className="text-[10px] opacity-40 uppercase tracking-widest font-mono">
            &copy; 2026 Web3 Cyber Services
          </p>
        </div>
      </footer>
    </div>
  );
}

function ProductCard({ icon: Icon, title, desc, link, color, bgColor, cta }: any) {
  return (
    <Link href={link} className="group p-10 bg-card border border-white/5 rounded-[2.5rem] hover:border-primary/50 transition-all hover:shadow-2xl hover:shadow-primary/5 flex flex-col gap-6">
      <div className={`w-14 h-14 ${bgColor} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
        <Icon className={`w-7 h-7 ${color}`} />
      </div>
      <div className="space-y-3">
        <h3 className="text-2xl font-bold">{title}</h3>
        <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
      </div>
      <div className="mt-auto flex items-center text-sm font-bold gap-2 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
        {cta} <ArrowRight className="w-4 h-4" />
      </div>
    </Link>
  );
}
