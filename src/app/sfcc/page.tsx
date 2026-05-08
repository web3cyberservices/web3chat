
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from "@/components/ui/badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ShieldCheck, 
  Globe, 
  Scale, 
  Activity, 
  ShoppingCart, 
  Database, 
  Lock,
  Zap,
  ArrowRight,
  Search,
  CheckCircle2,
  FileBarChart
} from "lucide-react";
import { Button as ShadButton } from "@/components/ui/button";

export default function SFCCLandingPage() {
  return (
    <div className="min-h-screen bg-[#020617] text-slate-50 font-body overflow-x-hidden flex flex-col">
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[30%] bg-primary/10 blur-[100px] rounded-full" />
      </div>

      <header className="border-b border-white/5 bg-[#020617]/50 backdrop-blur-xl shrink-0 sticky top-0 z-50">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-default">
            <Image 
              src="/logo.png" 
              alt="Humango Logo" 
              width={36}
              height={36}
              className="object-contain"
              priority
            />
            <span className="font-bold text-xl tracking-tight text-white">
              Humango<span className="text-primary">SFCC</span>
            </span>
          </div>
          <nav className="flex items-center gap-4">
            <Badge variant="outline" className="hidden sm:flex border-primary/20 bg-primary/5 text-primary text-[10px] font-bold tracking-[0.2em] px-3 py-1 rounded-full uppercase">
              Enterprise Compliance
            </Badge>
            <ShadButton variant="ghost" size="sm" asChild className="text-slate-400 hover:text-white">
              <Link href="https://humango.app" className="text-xs font-bold uppercase tracking-wider">Global Portal</Link>
            </ShadButton>
          </nav>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-6 py-12 flex flex-col justify-center">
        <div className="grid lg:grid-cols-12 gap-12 items-start w-full max-w-7xl mx-auto">
          <div className="lg:col-span-7 space-y-8">
            <div className="space-y-6">
              <Badge variant="outline" className="py-1 px-3 border-primary/20 bg-primary/5 text-primary text-[10px] font-bold uppercase tracking-[0.2em]">
                Automated Retail Audit
              </Badge>
              <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-tight text-white">
                Salesforce <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-primary">Commerce Cloud</span> <br />Monitoring
              </h1>
              <p className="text-xl text-slate-400 max-w-xl leading-relaxed">
                Humango provides automated infrastructure auditing for <span className="text-white font-medium">SFCC Stores</span>. We ensure global retailers stay compliant, secure, and performant by monitoring third-party risks in real-time.
              </p>
              <div className="flex flex-wrap gap-4 pt-4">
                <ShadButton className="bg-primary hover:bg-primary/90 text-white font-bold h-14 px-10 rounded-2xl shadow-2xl shadow-primary/20" asChild>
                  <a href="mailto:abuse@humango.app">Partner with Us <ArrowRight className="ml-2 w-4 h-4" /></a>
                </ShadButton>
                <ShadButton variant="outline" className="border-white/10 hover:bg-white/5 h-14 px-10 rounded-2xl backdrop-blur-md" asChild>
                  <Link href="/legal/bot-policy">Transparency Policy</Link>
                </ShadButton>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[
                { icon: ShoppingCart, title: "Pixel Monitoring", desc: "Automated tracking of marketing pixels and third-party script behavior to prevent data leaks." },
                { icon: ShieldCheck, title: "Compliance Guard", desc: "Real-time auditing of GDPR, CCPA, and regional e-commerce regulations across your entire fleet." },
                { icon: Lock, title: "Security Hardening", desc: "Constant verification of CSP, HSTS, and encryption standards on production storefronts." },
                { icon: Zap, title: "UX Integrity", desc: "Identifying technical glitches in checkout flows and product catalog accessibility." },
              ].map((item, i) => (
                <Card key={i} className="bg-white/[0.02] border-white/5 p-8 hover:bg-white/[0.04] transition-all border-l-primary/30 border-l-2 shadow-2xl group">
                  <div className="bg-primary/10 w-12 h-12 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <item.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-3">{item.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
                </Card>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 space-y-6">
            <Card className="bg-white/[0.03] border-white/10 backdrop-blur-xl shadow-2xl overflow-hidden border-t-primary/20">
              <CardHeader className="bg-white/[0.02] border-b border-white/5">
                <CardTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Search className="w-4 h-4 text-primary" /> Our Enterprise Mission
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="space-y-4">
                   <div className="flex items-start gap-4">
                     <div className="mt-1 bg-emerald-500/20 p-1 rounded-full"><CheckCircle2 className="w-3 h-3 text-emerald-500" /></div>
                     <p className="text-xs text-slate-400 leading-relaxed">
                       <strong className="text-slate-200">Continuous Monitoring:</strong> We act as an external auditor, ensuring that changes in your SFCC Business Manager don't compromise security.
                     </p>
                   </div>
                   <div className="flex items-start gap-4">
                     <div className="mt-1 bg-emerald-500/20 p-1 rounded-full"><CheckCircle2 className="w-3 h-3 text-emerald-500" /></div>
                     <p className="text-xs text-slate-400 leading-relaxed">
                       <strong className="text-slate-200">Stateless Auditing:</strong> Our system performs audits without storing sensitive customer data, maintaining 100% privacy.
                     </p>
                   </div>
                   <div className="flex items-start gap-4">
                     <div className="mt-1 bg-emerald-500/20 p-1 rounded-full"><CheckCircle2 className="w-3 h-3 text-emerald-500" /></div>
                     <p className="text-xs text-slate-400 leading-relaxed">
                       <strong className="text-slate-200">Global Verification:</strong> We provide transparency for CDNs and security teams to verify our audit traffic.
                     </p>
                   </div>
                </div>

                <div className="pt-6 border-t border-white/5">
                   <div className="p-5 bg-indigo-500/5 rounded-2xl border border-indigo-500/20 flex items-center gap-4">
                     <FileBarChart className="w-8 h-8 text-indigo-400 shrink-0" />
                     <div>
                       <p className="text-[10px] font-bold uppercase text-indigo-200">Retail Integrity Report</p>
                       <p className="text-[10px] text-slate-500 leading-relaxed italic">
                         We generate technical evidence of compliance to help retailers avoid regulatory fines and security breaches.
                       </p>
                     </div>
                   </div>
                </div>
              </CardContent>
            </Card>

            <div className="p-8 bg-gradient-to-br from-primary/20 to-indigo-500/20 rounded-3xl border border-primary/30 shadow-2xl">
              <h3 className="text-xl font-bold text-white mb-3">Auditing Expertise</h3>
              <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                We specialize in Salesforce Commerce Cloud, providing unmatched insights into third-party risks and platform-specific vulnerabilities.
              </p>
              <ShadButton className="w-full bg-primary font-bold h-12 rounded-xl shadow-lg shadow-primary/30 text-white" asChild>
                <a href="mailto:abuse@humango.app">Contact Our Experts</a>
              </ShadButton>
            </div>
          </div>
        </div>
      </main>

      <footer className="py-10 px-6 border-t border-white/5 bg-[#010413]/50">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-8 text-[10px] text-slate-500 uppercase tracking-[0.25em] font-bold">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-primary opacity-80" />
            <span>Humango Enterprise • Compliance Solutions</span>
          </div>
          <div className="flex gap-10">
            <Link href="/legal/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/legal/bot-policy" className="hover:text-white transition-colors">Bot Policy</Link>
            <Link href="https://humango.app" className="hover:text-white transition-colors">Global</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
