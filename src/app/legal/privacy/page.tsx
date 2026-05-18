
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShieldCheck, ArrowLeft, Mail, MapPin, History, Scale } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function PrivacyPage() {
  const [currentYear, setCurrentYear] = useState('');

  useEffect(() => {
    setCurrentYear(new Date().getFullYear().toString());
  }, []);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-50 font-body flex flex-col">
      <header className="border-b border-white/5 bg-[#020617]/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <Image src="/logo.png" alt="Humango" width={32} height={32} className="object-contain" />
            <span className="font-bold text-lg tracking-tight text-white">Humango</span>
          </Link>
          <Button variant="ghost" size="sm" asChild className="text-slate-400 hover:text-white">
            <Link href="/"><ArrowLeft className="w-4 h-4 mr-2" /> Home</Link>
          </Button>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-6 py-12 max-w-4xl">
        <div className="space-y-12">
          <div className="space-y-4">
            <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary text-[10px] font-bold uppercase tracking-widest px-3 py-1">
              GDPR Framework v2.2
            </Badge>
            <h1 className="text-4xl font-extrabold tracking-tight text-white">Privacy Statement</h1>
          </div>

          <section className="space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-3 text-white border-l-2 border-primary pl-4">
              <History className="w-5 h-5 text-primary" /> Data Retention (Art. 13(2)(a))
            </h2>
            <p className="text-slate-400 leading-relaxed">
              In accordance with statutory requirements, we maintain strict retention schedules: 
              <strong> Audit evidence (technical screenshots and scan logs) is stored for exactly 24 months</strong> from the date of detection for verification purposes and automatically purged thereafter.
            </p>
          </section>

          <section className="space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-3 text-white border-l-2 border-primary pl-4">
              <Scale className="w-5 h-5 text-primary" /> Legal Basis
            </h2>
            <p className="text-slate-400 leading-relaxed">
              Processing is conducted under Legitimate Interest (Art. 6(1)(f) GDPR) for the purpose of identifying technical vulnerabilities.
            </p>
          </section>

          <section className="p-8 bg-white/5 rounded-2xl border border-white/5 space-y-4">
            <div className="flex items-center gap-3 text-white font-bold"><Mail className="w-5 h-5 text-primary" /> Contact</div>
            <a href="mailto:abuse@humango.app" className="text-primary font-bold hover:underline">abuse@humango.app</a>
          </section>
        </div>
      </main>

      <footer className="py-8 px-6 border-t border-white/5 bg-[#010413]/50">
        <div className="container mx-auto text-[9px] text-slate-500 uppercase tracking-widest font-bold text-center">
          &copy; {currentYear} Humango Limited • bot.humango.app
        </div>
      </footer>
    </div>
  );
}
