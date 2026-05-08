
import Link from 'next/link';
import Image from 'next/image';
import { ShieldCheck, Scale, FileText, ArrowLeft, ExternalLink, Bot } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function LegalPage() {
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
            <Link href="/" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Back to Portal
            </Link>
          </Button>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-6 py-12 max-w-4xl">
        <div className="space-y-12">
          <div className="space-y-4">
            <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary text-[10px] font-bold uppercase tracking-[0.2em]">
              Legal Directory
            </Badge>
            <h1 className="text-4xl font-extrabold tracking-tight text-white">
              Compliance Documents
            </h1>
            <p className="text-slate-400 leading-relaxed text-lg">
              Official policies and technical documentation regarding the operation of the HumangoBot audit network.
            </p>
          </div>

          <div className="grid gap-6">
            <Link href="/legal/bot-policy" className="group">
              <Card className="bg-white/[0.02] border-white/5 hover:bg-white/[0.04] border-primary/20 transition-all duration-300 overflow-hidden">
                <CardContent className="p-8 flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="p-4 bg-primary/10 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                      <Bot className="w-8 h-8 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <h2 className="text-xl font-bold text-white">Bot Policy & Purpose</h2>
                      <p className="text-sm text-slate-500">Operation standards, retention periods, and mission statement.</p>
                    </div>
                  </div>
                  <ExternalLink className="w-5 h-5 text-slate-700 group-hover:text-primary transition-colors" />
                </CardContent>
              </Card>
            </Link>

            <Link href="/legal/privacy" className="group">
              <Card className="bg-white/[0.02] border-white/5 hover:bg-white/[0.04] transition-all duration-300 overflow-hidden">
                <CardContent className="p-8 flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="p-4 bg-emerald-500/10 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                      <ShieldCheck className="w-8 h-8 text-emerald-500" />
                    </div>
                    <div className="space-y-1">
                      <h2 className="text-xl font-bold text-white">Privacy Statement</h2>
                      <p className="text-sm text-slate-500">Data minimization, GDPR compliance, and PII policy.</p>
                    </div>
                  </div>
                  <ExternalLink className="w-5 h-5 text-slate-700 group-hover:text-primary transition-colors" />
                </CardContent>
              </Card>
            </Link>

            <Link href="/legal/rfc9309" className="group">
              <Card className="bg-white/[0.02] border-white/5 hover:bg-white/[0.04] transition-all duration-300 overflow-hidden">
                <CardContent className="p-8 flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="p-4 bg-amber-500/10 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                      <Scale className="w-8 h-8 text-amber-500" />
                    </div>
                    <div className="space-y-1">
                      <h2 className="text-xl font-bold text-white">RFC 9309 Documentation</h2>
                      <p className="text-sm text-slate-500">Robots Exclusion Protocol and bot politeness standards.</p>
                    </div>
                  </div>
                  <ExternalLink className="w-5 h-5 text-slate-700 group-hover:text-primary transition-colors" />
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </main>

      <footer className="py-8 px-6 border-t border-white/5 bg-[#010413]/50">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-8 text-[9px] text-slate-500 uppercase tracking-[0.25em] font-bold">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-4 h-4 text-primary opacity-80" />
            <span>Humango Compliance Systems • Policy Version 1.2</span>
          </div>
          <div className="flex gap-8">
            <span>&copy; {new Date().getFullYear()} Global Infrastructure Group</span>
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
