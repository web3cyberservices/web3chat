'use client';

import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Lock, Info, Mail, Globe, CheckCircle2, Terminal, Scale, EyeOff, Clock } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#020617] text-slate-50 font-body overflow-x-hidden flex flex-col">
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[30%] bg-indigo-500/10 blur-[100px] rounded-full" />
      </div>

      <header className="border-b border-white/5 bg-[#020617]/50 backdrop-blur-xl shrink-0 sticky top-0 z-50">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary p-1.5 rounded-lg shadow-lg shadow-primary/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-normal">bot.humango.app</span>
          </div>
          <nav className="flex items-center gap-6">
            <Badge variant="outline" className="hidden sm:flex border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-[10px] font-bold tracking-widest px-2 py-0">
              V1.0.2 STABLE
            </Badge>
            <Link href="/admin">
              <Button size="sm" className="bg-white/5 hover:bg-white/10 text-white border border-white/10 h-8 rounded-full text-xs font-semibold tracking-normal transition-all">
                Admin Portal
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-6 py-8 grid lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Mission & Compliance */}
        <div className="lg:col-span-7 space-y-8">
          <div className="space-y-6">
            <Badge variant="outline" className="py-1 px-3 border-primary/20 bg-primary/5 text-primary text-[10px] font-bold uppercase tracking-[0.15em]">
              Official Identity Page
            </Badge>
            <h1 className="text-4xl md:text-5xl xl:text-6xl font-extrabold tracking-tight leading-tight py-2 text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400">
              HumangoBot Verification Portal
            </h1>
            <p className="text-base md:text-lg text-slate-400 max-w-xl font-normal leading-relaxed tracking-normal">
              HumangoBot is a specialized security agent. Our mission is to enhance global web safety by auditing infrastructure for <span className="text-white font-medium">GDPR compliance</span> and <span className="text-white font-medium">SSL/TLS vulnerabilities</span>.
            </p>
          </div>

          {/* GDPR & Safety Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-white/[0.02] border-white/5 shadow-none p-5 space-y-3">
              <div className="bg-emerald-500/10 w-8 h-8 rounded-lg flex items-center justify-center">
                <Scale className="w-4 h-4 text-emerald-400" />
              </div>
              <h3 className="text-sm font-bold tracking-normal">GDPR Compliance</h3>
              <p className="text-xs text-slate-400 leading-relaxed tracking-normal">
                Strict adherence to Data Minimization. We do not scrape, store, or process Personally Identifiable Information (PII).
              </p>
            </Card>
            <Card className="bg-white/[0.02] border-white/5 shadow-none p-5 space-y-3">
              <div className="bg-primary/10 w-8 h-8 rounded-lg flex items-center justify-center">
                <EyeOff className="w-4 h-4 text-primary" />
              </div>
              <h3 className="text-sm font-bold tracking-normal">Privacy by Design</h3>
              <p className="text-xs text-slate-400 leading-relaxed tracking-normal">
                Audits are limited to technical headers and public security configurations (RFC 9309).
              </p>
            </Card>
            <Card className="bg-white/[0.02] border-white/5 shadow-none p-5 space-y-3">
              <div className="bg-amber-500/10 w-8 h-8 rounded-lg flex items-center justify-center">
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <h3 className="text-sm font-bold tracking-normal">Politeness Policy</h3>
              <p className="text-xs text-slate-400 leading-relaxed tracking-normal">
                Automatic rate-limiting and adherence to <code className="text-amber-400">Crawl-delay</code> instructions in robots.txt.
              </p>
            </Card>
            <Card className="bg-white/[0.02] border-white/5 shadow-none p-5 space-y-3">
              <div className="bg-blue-500/10 w-8 h-8 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-blue-400" />
              </div>
              <h3 className="text-sm font-bold tracking-normal">Verified Origin</h3>
              <p className="text-xs text-slate-400 leading-relaxed tracking-normal">
                All requests originate from our verified and static infrastructure for easy identification.
              </p>
            </Card>
          </div>

          <div className="p-6 bg-gradient-to-r from-primary/10 to-transparent rounded-2xl border-l-2 border-primary shadow-inner">
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2 tracking-normal">
              <Info className="w-4 h-4 text-primary" /> Cloudflare Verification Note
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed tracking-normal">
              This page serves as the authoritative source for HumangoBot identification. If you are a network administrator or automated verification system, please refer to the technical specs on the right.
            </p>
          </div>
        </div>

        {/* Right Column: Technical Specs & Opt-out */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="bg-white/[0.03] border-white/10 backdrop-blur-md shadow-2xl border-t-white/20 transition-all overflow-hidden">
            <CardHeader className="pb-4 bg-white/[0.02] border-b border-white/5">
              <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-[0.15em] flex items-center gap-2">
                <Terminal className="w-4 h-4 text-primary" /> Technical Passport
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 pt-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.2em] text-primary font-bold opacity-80">Full User-Agent String</label>
                <div className="p-4 bg-black/40 rounded-lg border border-white/5 font-mono text-[11px] text-slate-300 break-all leading-normal tracking-normal shadow-inner">
                  Mozilla/5.0 (compatible; HumangoBot/1.0; +http://bot.humango.app)
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/5">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">Static IPv4 Address</label>
                  <div className="flex items-center gap-2 font-mono text-sm text-slate-200 tracking-normal">
                    <Globe className="w-3 h-3 text-primary opacity-70" />
                    <span>116.203.3.75</span>
                  </div>
                </div>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold tracking-widest">VERIFIED</Badge>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white/5 rounded-lg border border-white/5 space-y-1">
                  <label className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">Protocol</label>
                  <div className="text-[11px] font-bold tracking-normal">HTTP/2, TLS 1.3</div>
                </div>
                <div className="p-4 bg-white/5 rounded-lg border border-white/5 space-y-1">
                  <label className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">Standard</label>
                  <div className="text-[11px] font-bold tracking-normal">RFC 9309 / 9110</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-indigo-500/10 to-primary/10 border-primary/20 backdrop-blur-md p-8 transition-all">
            <h3 className="text-lg font-bold mb-3 flex items-center gap-2 tracking-normal">
              <Mail className="w-5 h-5 text-primary" /> Opt-out & Compliance
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed tracking-normal mb-8">
              To exclude your domain, update your <code className="text-primary font-mono font-bold">robots.txt</code> or email our abuse desk. We process all exclusion requests within 24 hours.
            </p>
            <div className="flex flex-col gap-3">
              <a href="mailto:abuse@humango.app" className="w-full">
                <Button className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-12 text-sm gap-2 shadow-lg shadow-primary/20 transition-all">
                  <Mail className="w-4 h-4" /> Contact abuse@humango.app
                </Button>
              </a>
              <div className="text-[10px] text-center text-slate-500 uppercase tracking-widest font-bold">
                GDPR Data Subject Access Request (DSAR) available via email
              </div>
            </div>
          </Card>
        </div>
      </main>

      <footer className="py-6 px-6 border-t border-white/5 bg-[#010413]/50 mt-auto">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] text-slate-500 uppercase tracking-[0.25em] font-bold">
          <div className="flex items-center gap-2 opacity-50">
            <Shield className="w-3 h-3" />
            <span>Humango Compliance Systems</span>
          </div>
          <div className="flex gap-6">
            <span>&copy; {new Date().getFullYear()} Global Infrastructure Group</span>
            <Link href="/" className="hover:text-primary transition-colors">Privacy Policy</Link>
            <Link href="/" className="hover:text-primary transition-colors">Compliance Docs</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
