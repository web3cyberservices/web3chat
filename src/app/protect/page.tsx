'use client';

import React from 'react';
import { Shield, Lock, EyeOff, Radio, ArrowLeft, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function ProtectPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col p-6">
      <header className="flex items-center justify-between mb-12">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold tracking-tight">Protect <span className="text-primary text-[10px] ml-2 border px-2 py-0.5 rounded-full">v1.0</span></h1>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-bold uppercase tracking-widest">
            <Radio className="w-3 h-3 animate-pulse" /> Live Security Audit
          </div>
          <h2 className="text-4xl font-extrabold leading-tight">Your Digital Shield in the Web3 Era.</h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            We monitor the P2P mesh and scan for vulnerabilities in real-time. Protect your assets and identity with automated security protocols.
          </p>
          
          <div className="grid grid-cols-1 gap-4 pt-4">
            <div className="p-4 bg-card border rounded-2xl flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Lock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-sm">Anti-Tracking</h3>
                <p className="text-xs text-muted-foreground">Automatic rotation of encryption keys for every session.</p>
              </div>
            </div>
            <div className="p-4 bg-card border rounded-2xl flex items-start gap-4">
              <div className="p-2 bg-accent/10 rounded-lg">
                <EyeOff className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h3 className="font-bold text-sm">Stealth Mode</h3>
                <p className="text-xs text-muted-foreground">Hide your presence from the mesh when you're not active.</p>
              </div>
            </div>
          </div>

          <Button size="lg" className="w-full md:w-auto px-12 py-6 rounded-2xl text-lg font-bold shadow-lg shadow-primary/20">
            Activate Shielding
          </Button>
        </div>

        <div className="relative group">
          <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full group-hover:bg-primary/30 transition-all" />
          <div className="relative bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 font-mono text-[10px] leading-relaxed shadow-2xl">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-white/5">
              <Terminal className="w-3 h-3 text-primary" />
              <span className="text-muted-foreground">security-logs.sh</span>
            </div>
            <p className="text-primary">[OK] P2P Node initialized</p>
            <p className="text-primary">[OK] AES-256-GCM Handshake established</p>
            <p className="text-primary">[OK] Zero-Knowledge Proof verified</p>
            <p className="text-accent">[SCANNING] Checking for unauthorized relays...</p>
            <p className="text-primary">[OK] 0 threats detected in last 24h</p>
            <div className="mt-4 animate-pulse">_</div>
          </div>
        </div>
      </main>

      <footer className="mt-20 text-center pb-8 opacity-40 text-[10px] uppercase tracking-[0.2em]">
        Web3 Cyber Services &copy; 2026
      </footer>
    </div>
  );
}
