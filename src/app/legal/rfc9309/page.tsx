
import Link from 'next/link';
import Image from 'next/image';
import { Scale, ArrowLeft, ShieldCheck, Zap, Terminal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function RFCPage() {
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
              Standard Compliance
            </Badge>
            <h1 className="text-4xl font-extrabold tracking-tight text-white">
              RFC 9309 Compliance Documentation
            </h1>
            <p className="text-slate-400 leading-relaxed text-lg">
              Implementation details of the Robots Exclusion Protocol (REP) within the HumangoBot engine.
            </p>
          </div>

          <section className="space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-3 text-white border-l-2 border-primary pl-4">
              <Scale className="w-5 h-5 text-primary" /> Robots Exclusion Protocol
            </h2>
            <div className="space-y-4 text-slate-400 leading-relaxed">
              <p>
                HumangoBot is engineered to be a "polite" crawler. We strictly follow the industry-standard <strong>IETF RFC 9309</strong> protocols for automated web traversal.
              </p>
              <div className="grid md:grid-cols-2 gap-6 mt-8">
                <div className="p-6 bg-white/5 rounded-xl border border-white/5 space-y-3">
                  <div className="flex items-center gap-2 text-white font-bold">
                    <Zap className="w-4 h-4 text-amber-500" /> Pre-fetch Check
                  </div>
                  <p className="text-sm">The crawler fetches the <code>robots.txt</code> file before any page interaction. If the file is unreachable (5xx), we abort the crawl.</p>
                </div>
                <div className="p-6 bg-white/5 rounded-xl border border-white/5 space-y-3">
                  <div className="flex items-center gap-2 text-white font-bold">
                    <Clock className="w-4 h-4 text-primary" /> Crawl-Delay Support
                  </div>
                  <p className="text-sm">We fully honor the <code>Crawl-delay</code> directive. Our engine calculates the required wait time to prevent server spikes.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-3 text-white border-l-2 border-primary pl-4">
              <Terminal className="w-5 h-5 text-primary" /> Technical Implementation
            </h2>
            <div className="space-y-4 text-slate-400 leading-relaxed">
              <p>
                Our parsing logic uses the official RFC 9309 interpretation rules:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Disallow Directives:</strong> Full support for path-based exclusions including wildcards (*).</li>
                <li><strong>User-Agent Specificity:</strong> Rules for <code>HumangoBot</code> take precedence over generic <code>*</code> rules.</li>
                <li><strong>Sitemap Discovery:</strong> We use Sitemap declarations in robots.txt to prioritize our audit path efficiently.</li>
              </ul>
            </div>
          </section>

          <section className="p-8 bg-primary/10 rounded-2xl border border-primary/20">
            <h3 className="text-white font-bold mb-2">Exclusion Request</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Site owners can block HumangoBot at any time by adding the following block to their robots.txt:
            </p>
            <div className="mt-4 p-4 bg-black/40 rounded-lg font-mono text-xs text-primary leading-relaxed">
              User-agent: HumangoBot<br />
              Disallow: /
            </div>
          </section>
        </div>
      </main>

      <footer className="py-8 px-6 border-t border-white/5 bg-[#010413]/50 mt-auto">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-8 text-[9px] text-slate-500 uppercase tracking-[0.25em] font-bold">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-4 h-4 text-primary opacity-80" />
            <span>Humango Compliance Systems • Data Minimization Policy Active</span>
          </div>
          <div className="flex gap-8">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <Link href="/legal/privacy" className="hover:text-white transition-colors">Privacy Statement</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Simple clock component for the UI
function Clock({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  );
}
