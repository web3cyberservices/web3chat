
'use client';

import React from 'react';
import { Shield, Zap, Layout, ArrowRight, MessageSquare, Globe, Cpu, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col overflow-x-hidden">
      {/* Background Decor */}
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
          <a href="#products" className="hover:text-primary transition-colors">Products</a>
          <a href="#security" className="hover:text-primary transition-colors">Security</a>
          <a href="#about" className="hover:text-primary transition-colors">About</a>
        </nav>
        <Link href="/builder">
          <Button variant="default" className="rounded-full px-6">Get Started</Button>
        </Link>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-24 md:py-40 px-6 text-center max-w-5xl mx-auto space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-bold uppercase tracking-widest animate-in fade-in slide-in-from-bottom-2 duration-700">
            <Zap className="w-3 h-3" /> The Future of Digital Sovereignty
          </div>
          <h1 className="text-5xl md:text-8xl font-black tracking-tighter leading-[0.9] animate-in fade-in slide-in-from-bottom-4 duration-1000">
            Building the Infrastructure for <span className="text-primary">Next Web</span>.
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-200">
            Decentralized tools, encrypted communication, and no-code builders designed for privacy-first businesses and individuals.
          </p>
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 pt-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
            <Link href="https://chat.web3cyberservices.xyz">
              <Button size="lg" className="h-16 px-10 rounded-2xl text-lg font-bold shadow-2xl shadow-primary/20 group">
                Open Messenger <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="https://build.web3cyberservices.xyz">
              <Button variant="outline" size="lg" className="h-16 px-10 rounded-2xl text-lg font-bold border-white/10 hover:bg-white/5">
                Launch Builder
              </Button>
            </Link>
          </div>
        </section>

        {/* Products Section */}
        <section id="products" className="py-24 px-6 bg-white/[0.02] border-y border-white/5">
          <div className="max-w-7xl mx-auto">
            <div className="mb-16 space-y-4">
              <h2 className="text-3xl font-bold">Our Ecosystem</h2>
              <p className="text-muted-foreground">Specialized tools for the Web3 era.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <ProductCard 
                icon={MessageSquare}
                title="P2P Chat"
                desc="End-to-end encrypted messaging with zero server-side storage. Your identity is your private key."
                link="https://chat.web3cyberservices.xyz"
                color="text-primary"
                bgColor="bg-primary/10"
              />
              <ProductCard 
                icon={Layout}
                title="No-Code Builder"
                desc="Create landing pages, AI agents, and Telegram bots in minutes. Export as standalone HTML/JS."
                link="https://build.web3cyberservices.xyz"
                color="text-accent"
                bgColor="bg-accent/10"
              />
              <ProductCard 
                icon={Lock}
                title="Cyber Protect"
                desc="Real-time security audits and vulnerability scanning for decentralized nodes and dApps."
                link="/protect"
                color="text-blue-400"
                bgColor="bg-blue-400/10"
              />
            </div>
          </div>
        </section>

        {/* Features / Why us */}
        <section id="security" className="py-32 px-6">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-20 items-center">
            <div className="space-y-6">
              <h2 className="text-4xl md:text-5xl font-black tracking-tight">Security by Design. <br/> Not as an Afterthought.</h2>
              <p className="text-muted-foreground text-lg leading-relaxed">
                We believe that privacy is a fundamental human right. Our platform utilizes advanced cryptography (AES-256-GCM) and decentralized protocols to ensure your data never touches a central server.
              </p>
              <div className="grid grid-cols-2 gap-6 pt-6">
                <div className="space-y-2">
                  <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
                    <Globe className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-bold">Decentralized</h3>
                  <p className="text-xs text-muted-foreground">P2P mesh network delivery.</p>
                </div>
                <div className="space-y-2">
                  <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
                    <Cpu className="w-5 h-5 text-accent" />
                  </div>
                  <h3 className="font-bold">Encrypted</h3>
                  <p className="text-xs text-muted-foreground">Military-grade standards.</p>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-[120px] rounded-full" />
              <div className="relative bg-card border border-white/10 rounded-[3rem] p-8 aspect-square flex flex-col items-center justify-center text-center space-y-4">
                 <Shield className="w-24 h-24 text-primary animate-pulse" />
                 <h4 className="text-2xl font-bold">100% Anonymous</h4>
                 <p className="text-sm text-muted-foreground max-w-[200px]">No phone numbers. No emails. No tracking.</p>
              </div>
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
          <div className="flex gap-8 text-[10px] uppercase tracking-[0.2em] font-bold opacity-40">
            <Link href="https://chat.web3cyberservices.xyz" className="hover:opacity-100">Chat</Link>
            <Link href="https://build.web3cyberservices.xyz" className="hover:opacity-100">Build</Link>
            <Link href="/protect" className="hover:opacity-100">Protect</Link>
          </div>
          <p className="text-[10px] opacity-40 uppercase tracking-widest font-mono">
            &copy; 2026 Web3 Cyber Services
          </p>
        </div>
      </footer>
    </div>
  );
}

function ProductCard({ icon: Icon, title, desc, link, color, bgColor }: any) {
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
        Launch Platform <ArrowRight className="w-4 h-4" />
      </div>
    </Link>
  );
}
