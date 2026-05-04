
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Search, Lock, Info, Mail, ChevronRight, Globe, CheckCircle2 } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#020617] text-slate-50 selection:bg-primary/30">
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[30%] bg-indigo-500/10 blur-[100px] rounded-full" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-50 contrast-150" />
      </div>

      <header className="border-b border-white/5 bg-[#020617]/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary p-2 rounded-xl shadow-lg shadow-primary/20">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-2xl tracking-tight">Humango<span className="text-primary">Bot</span></span>
          </div>
          <nav className="flex items-center gap-8 text-sm font-medium">
            <Link href="/" className="text-slate-400 hover:text-white transition-colors">Specifications</Link>
            <Link href="/" className="text-slate-400 hover:text-white transition-colors">Compliance</Link>
            <Link href="/admin">
              <Button size="sm" className="bg-white/5 hover:bg-white/10 text-white border border-white/10 backdrop-blur-sm px-5 h-10 rounded-full font-semibold">
                Admin Portal
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative pt-32 pb-24 px-6">
          <div className="container mx-auto max-w-5xl text-center">
            <Badge variant="outline" className="mb-6 py-1.5 px-4 rounded-full border-primary/20 bg-primary/5 text-primary text-xs font-bold tracking-widest uppercase">
              Official Crawler Identity
            </Badge>
            <h1 className="text-5xl md:text-7xl font-extrabold mb-8 tracking-tight leading-[1.1] text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400">
              Securing the Web Through <br /> Automated Auditing
            </h1>
            <p className="text-lg md:text-xl text-slate-400 mb-12 leading-relaxed max-w-3xl mx-auto font-medium">
              A specialized, high-performance web crawler dedicated to auditing websites for <span className="text-white">GDPR compliance</span>, <span className="text-white">SSL security standards</span>, and <span className="text-white">data privacy protection</span>.
            </p>
            <div className="flex flex-wrap justify-center gap-6">
              <div className="flex items-center gap-3 px-6 py-3 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span className="text-sm font-semibold tracking-wide uppercase">GDPR Ready</span>
              </div>
              <div className="flex items-center gap-3 px-6 py-3 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                <span className="text-sm font-semibold tracking-wide uppercase">SSL Verified</span>
              </div>
            </div>
          </div>
        </section>

        {/* Specifications Section */}
        <section className="py-24 px-6 border-y border-white/5 bg-white/[0.01]">
          <div className="container mx-auto max-w-6xl">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-8">
                <div className="space-y-4">
                  <h2 className="text-3xl md:text-4xl font-bold flex items-center gap-4">
                    <Info className="w-10 h-10 text-primary" />
                    Bot Specifications
                  </h2>
                  <p className="text-slate-400 font-medium">For webmasters and security teams: use the following parameters to verify our crawler's legitimacy.</p>
                </div>
                
                <div className="grid gap-4">
                  <div className="bg-[#0b1120] p-6 rounded-2xl border border-white/5 space-y-3 group hover:border-primary/30 transition-colors">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-primary font-bold">Verified User-Agent</label>
                    <p className="font-mono text-xs md:text-sm break-all text-slate-300 leading-relaxed bg-black/40 p-3 rounded-lg border border-white/5">
                      Mozilla/5.0 (compatible; HumangoBot/1.0; +http://bot.humango.app)
                    </p>
                  </div>
                  <div className="bg-[#0b1120] p-6 rounded-2xl border border-white/5 space-y-3 group hover:border-primary/30 transition-colors">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-primary font-bold">Source IP Address</label>
                    <div className="flex items-center gap-3 font-mono text-lg text-slate-200">
                      <Globe className="w-4 h-4 text-slate-500" />
                      <span>116.203.3.75</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-8">
                <div className="p-8 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-md relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Search className="w-32 h-32 -mr-8 -mt-8 rotate-12" />
                  </div>
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary" /> Polite Crawling
                  </h3>
                  <p className="text-slate-400 text-sm leading-relaxed mb-4">
                    HumangoBot respects <code className="text-primary font-mono px-1.5 py-0.5 bg-primary/10 rounded">robots.txt</code> instructions and implements an adaptive delay algorithm to minimize server load impact.
                  </p>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Data collected is encrypted in transit and used strictly for security auditing and compliance scoring.
                  </p>
                </div>
                
                <div className="p-8 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-md relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Lock className="w-32 h-32 -mr-8 -mt-8 -rotate-12" />
                  </div>
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" /> Security First
                  </h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Our audits focus on identifying weak cipher suites, expired certificates, and non-compliant cookie handling to help businesses maintain high privacy standards.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Opt-out Section */}
        <section className="py-32 px-6">
          <div className="container mx-auto max-w-4xl text-center">
            <div className="bg-gradient-to-br from-primary/10 to-indigo-500/10 rounded-[3rem] p-12 md:p-20 border border-white/5 backdrop-blur-xl relative overflow-hidden">
               <div className="absolute top-[-20%] right-[-10%] w-[300px] h-[300px] bg-primary/20 blur-[100px] rounded-full" />
              <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight">Opt-out & Governance</h2>
              <p className="text-lg text-slate-400 mb-10 leading-relaxed max-w-2xl mx-auto">
                If you wish to exclude your domain from our audits, update your robots.txt or contact our security desk directly.
              </p>
              <a href="mailto:abuse@humango.app" className="inline-flex items-center gap-3 px-8 py-4 bg-primary text-white rounded-2xl hover:bg-primary/90 transition-all shadow-xl shadow-primary/30 font-bold group">
                <Mail className="w-5 h-5" />
                Contact abuse@humango.app
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-16 px-6 border-t border-white/5">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2 opacity-60">
            <Shield className="w-5 h-5" />
            <span className="font-bold text-sm tracking-tight">HumangoBot</span>
          </div>
          <p className="text-slate-500 text-sm">&copy; {new Date().getFullYear()} Humango Compliance Systems. All rights reserved.</p>
          <div className="flex gap-6 text-xs font-semibold uppercase tracking-widest text-slate-500">
            <Link href="/" className="hover:text-primary transition-colors">Privacy</Link>
            <Link href="/" className="hover:text-primary transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
