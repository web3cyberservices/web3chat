
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Terminal, ShieldCheck, Mail, Clock, Info, ArrowLeft, Scale } from "lucide-react";
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
              Operator Transparency
            </Badge>
            <h1 className="text-4xl font-extrabold tracking-tight text-white">
              Bot Policy & Operations
            </h1>
            <p className="text-slate-400 leading-relaxed text-lg">
              Detailed technical and legal specifications for the HumangoBot audit network.
            </p>
          </div>

          <section className="space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-3 text-white border-l-2 border-primary pl-4">
              <Info className="w-5 h-5 text-primary" /> Purpose of Activity
            </h2>
            <p className="text-slate-400 leading-relaxed">
              HumangoBot is a specialized crawler operated by <strong>Humango Limited</strong>. Its primary mission is the automated identification of technical security vulnerabilities and monitoring of GDPR compliance across the web. 
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="bg-white/5 border-white/5 p-4">
                <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" /> Authorized Audit
                </h3>
                <p className="text-xs text-slate-500">Checking SSL/TLS versions, Security Headers (CSP, HSTS), and Privacy Controls.</p>
              </Card>
              <Card className="bg-white/5 border-white/5 p-4">
                <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                  <Scale className="w-4 h-4 text-amber-500" /> GDPR Compliance
                </h3>
                <p className="text-xs text-slate-500">Detecting missing Cookie Banners, legal disclosures (Impressum), and PII leaks.</p>
              </Card>
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-3 text-white border-l-2 border-primary pl-4">
              <Clock className="w-5 h-5 text-primary" /> Data Retention & Processing
            </h2>
            <ul className="space-y-4 text-slate-400">
              <li className="flex gap-4">
                <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold text-xs">01</div>
                <div>
                  <strong className="text-white block">Retention Period</strong>
                  <p className="text-sm">Audit logs and evidence (including screenshots of violations) are stored for <strong>365 days</strong> as required for legal compliance evidence.</p>
                </div>
              </li>
              <li className="flex gap-4">
                <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold text-xs">02</div>
                <div>
                  <strong className="text-white block">PII Masking</strong>
                  <p className="text-sm">Our parser automatically ignores and masks personal identifiable information (emails, phone numbers, names).</p>
                </div>
              </li>
            </ul>
          </section>

          <section className="space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-3 text-white border-l-2 border-primary pl-4">
              <Terminal className="w-5 h-5 text-primary" /> Technical Politeness
            </h2>
            <div className="p-6 bg-black/40 rounded-2xl border border-white/5 space-y-4">
              <p className="text-sm text-slate-300">We respect <code>Retry-After</code> headers and <code>robots.txt</code> crawl-delay. If your server is under load, we will automatically stop and retry later.</p>
              <div className="flex flex-wrap gap-3">
                <Badge className="bg-white/5 text-slate-400">User-Agent: HumangoBot/1.0</Badge>
                <Badge className="bg-white/5 text-slate-400">Rate Limit: 5s per request</Badge>
                <Badge className="bg-white/5 text-slate-400">Identity: bot.humango.app</Badge>
              </div>
            </div>
          </section>

          <section className="p-8 bg-primary/5 rounded-2xl border border-primary/20 space-y-4">
            <div className="flex items-center gap-3 text-white font-bold">
              <Mail className="w-5 h-5 text-primary" />
              Opt-out & Exclusion
            </div>
            <p className="text-sm text-slate-400">
              To request a domain exclusion or manual data removal, please contact our DPO department at:
            </p>
            <a href="mailto:abuse@humango.app" className="inline-block text-primary font-bold text-lg hover:underline">
              abuse@humango.app
            </a>
          </section>
        </div>
      </main>

      <footer className="py-8 px-6 border-t border-white/5 bg-[#010413]/50">
        <div className="container mx-auto text-[9px] text-slate-500 uppercase tracking-[0.25em] font-bold text-center">
          &copy; {new Date().getFullYear()} Global Infrastructure Group • Humango Bot Policy v1.2
        </div>
      </footer>
    </div>
  );
}
