'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Terminal, ShieldCheck, Mail, Clock, Info, ArrowLeft, Scale, Lock, EyeOff, Database, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function BotPolicyPage() {
  return (
    <div className="min-h-screen bg-[#020617] text-slate-50 font-body flex flex-col">
      <header className="border-b border-white/5 bg-[#020617]/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <Image 
              src="/logo.png" 
              alt="HumangoBot Logo" 
              width={32}
              height={32}
              className="object-contain"
            />
            <span className="font-bold text-lg tracking-tight text-white">
              HumangoBot
            </span>
          </Link>
          <Button variant="ghost" size="sm" asChild className="text-slate-400 hover:text-white">
            <Link href="/legal" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Legal Directory
            </Link>
          </Button>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-6 py-12 max-w-4xl">
        <div className="space-y-12">
          <div className="space-y-4">
            <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary text-[10px] font-bold uppercase tracking-[0.2em]">
              Transparency & GDPR Compliance
            </Badge>
            <h1 className="text-4xl font-extrabold tracking-tight text-white">
              Bot Policy & Operations
            </h1>
            <p className="text-slate-400 leading-relaxed text-lg">
              Detailed technical and legal specifications for the HumangoBot audit network, aligning with GDPR, RFC 9309, and UK legal standards.
            </p>
          </div>

          <section className="space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-3 text-white border-l-2 border-primary pl-4">
              <Info className="w-5 h-5 text-primary" /> Purpose & Operator Identity
            </h2>
            <div className="p-6 bg-white/5 rounded-2xl border border-white/5 space-y-4">
              <p className="text-slate-400 leading-relaxed">
                HumangoBot is a specialized security crawler operated by <strong>Humango Limited</strong>, a UK-based company. 
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3 text-xs text-slate-400">
                  <MapPin className="w-4 h-4 text-primary shrink-0" />
                  <span><strong>Physical Address:</strong><br />182-184 High Street North, London, England, E6 2JA</span>
                </div>
                <div className="flex items-start gap-3 text-xs text-slate-400">
                  <Terminal className="w-4 h-4 text-primary shrink-0" />
                  <span><strong>Registration:</strong><br />Company Number: 16750477</span>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-3 text-white border-l-2 border-primary pl-4">
              <ShieldCheck className="w-5 h-5 text-primary" /> Ethical Data Policy
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="bg-white/5 border-white/5 p-4">
                <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                  <EyeOff className="w-4 h-4 text-emerald-500" /> Do Not Track (DNT)
                </h3>
                <p className="text-xs text-slate-500">Every request sent by HumangoBot includes the <code>DNT: 1</code> header, signaling our commitment to user privacy.</p>
              </Card>
              <Card className="bg-white/5 border-white/5 p-4">
                <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-500" /> Right to Erasure
                </h3>
                <p className="text-xs text-slate-500">In accordance with <strong>Art. 17 GDPR</strong>, domain owners can request the deletion of all audit records via our DPO.</p>
              </Card>
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-3 text-white border-l-2 border-primary pl-4">
              <Scale className="text-primary w-5 h-5" /> Legal Basis (Art. 6(1)(f) GDPR)
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Our audit activities are conducted under the <strong>Legitimate Interest</strong> basis. This processing is necessary to identify missing legal disclosures and technical vulnerabilities that protect the overall security of the digital ecosystem and end-users.
            </p>
          </section>

          <section className="p-8 bg-primary/5 rounded-2xl border border-primary/20 space-y-4">
            <div className="flex items-center gap-3 text-white font-bold">
              <Mail className="w-5 h-5 text-primary" />
              Data Protection Officer (DPO)
            </div>
            <p className="text-sm text-slate-400">
              For Article 17 (Erasure) requests, Opt-out or DPA inquiries, please contact our DPO:
            </p>
            <a href="mailto:abuse@humango.app" className="inline-block text-primary font-bold text-lg hover:underline">
              abuse@humango.app
            </a>
          </section>
        </div>
      </main>

      <footer className="py-8 px-6 border-t border-white/5 bg-[#010413]/50">
        <div className="container mx-auto text-[9px] text-slate-500 uppercase tracking-[0.25em] font-bold text-center">
          &copy; {new Date().getFullYear()} Humango Limited • 182-184 High Street North, London • Policy v1.6
        </div>
      </footer>
    </div>
  );
}