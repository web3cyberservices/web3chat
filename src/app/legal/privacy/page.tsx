
import Link from 'next/link';
import Image from 'next/image';
import { ShieldCheck, ArrowLeft, Mail, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function PrivacyPage() {
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
              <ArrowLeft className="w-4 h-4" /> Legal Overview
            </Link>
          </Button>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-6 py-12 max-w-4xl">
        <div className="space-y-12">
          <div className="space-y-4">
            <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary text-[10px] font-bold uppercase tracking-[0.2em]">
              Data Protection
            </Badge>
            <h1 className="text-4xl font-extrabold tracking-tight text-white">
              Privacy & Data Minimization Statement
            </h1>
            <p className="text-slate-400 leading-relaxed text-lg">
              Official policy regarding the collection, processing, and storage of technical data by HumangoBot.
            </p>
          </div>

          <section className="space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-3 text-white border-l-2 border-primary pl-4">
              <ShieldCheck className="w-5 h-5 text-primary" /> Core Principles
            </h2>
            <div className="space-y-4 text-slate-400 leading-relaxed">
              <p>
                HumangoBot strictly adheres to the principle of <strong>Data Minimization</strong>. Our scanning activities are limited to the objective assessment of technical infrastructure and security posture.
              </p>
              <ul className="list-disc pl-6 space-y-4">
                <li>
                  <strong className="text-white">Technical Scope:</strong> The crawler only indexes technical metadata, HTTP response headers, and public security configurations (e.g., SSL/TLS versions, Content-Security-Policy headers, robots.txt directives).
                </li>
                <li>
                  <strong className="text-white">No PII Processing:</strong> We do not index user profiles, names, email addresses, or private credentials found in page content. Our engine is specifically tuned to ignore text blocks that may contain personal data.
                </li>
                <li>
                  <strong className="text-white">Regional Compliance:</strong> Our operations are designed to comply with <strong>GDPR (EU Regulation 2016/679)</strong> and <strong>CCPA (USA)</strong> regarding automated technical auditing.
                </li>
              </ul>
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-3 text-white border-l-2 border-primary pl-4">
              <Lock className="w-5 h-5 text-primary" /> Data Security
            </h2>
            <div className="text-slate-400 leading-relaxed">
              <p>
                All audit results are stored in a secured environment with strict access controls. Data is used exclusively for compliance reporting and security assessment purposes. We do not sell or trade technical audit data to third-party marketing entities.
              </p>
            </div>
          </section>

          <section className="p-8 bg-white/5 rounded-2xl border border-white/5 space-y-4">
            <div className="flex items-center gap-3 text-white font-bold">
              <Mail className="w-5 h-5 text-primary" />
              Inquiries & DPO Contact
            </div>
            <p className="text-sm text-slate-400">
              For any questions regarding our data handling or to request a copy of the technical audit data for your domain, please contact our Data Protection Officer:
            </p>
            <a href="mailto:abuse@humango.app" className="inline-block text-primary font-bold hover:underline">
              abuse@humango.app
            </a>
          </section>
        </div>
      </main>

      <footer className="py-8 px-6 border-t border-white/5 bg-[#010413]/50 mt-auto">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-8 text-[9px] text-slate-500 uppercase tracking-[0.25em] font-bold">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-4 h-4 text-primary opacity-80" />
            <span>Humango Compliance Systems • Policy Version 1.2</span>
          </div>
          <div className="flex gap-8">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <Link href="/legal/rfc9309" className="hover:text-white transition-colors">RFC 9309 Docs</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
