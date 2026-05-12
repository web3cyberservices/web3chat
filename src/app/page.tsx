
'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { startCrawlAction } from '@/app/actions/crawler-actions';
import { 
  Mail, 
  Globe, 
  Terminal, 
  Scale, 
  Clock, 
  ShieldCheck, 
  FileText, 
  Lock, 
  Activity, 
  ShoppingCart, 
  ArrowRight, 
  Search, 
  Zap,
  Loader2,
  AlertTriangle,
  Download,
  CheckCircle2,
  Info,
  ShieldAlert,
  FileSearch,
  Check
} from "lucide-react";

export default function Home() {
  const [url, setUrl] = useState('');
  const [email, setEmail] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const { toast } = useToast();

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url || !email) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please provide both a valid URL and your email address.",
      });
      return;
    }

    setIsScanning(true);
    setScanResult(null);

    try {
      const result = await startCrawlAction(url, email);
      setScanResult(result);
      
      if (result.status === 'success') {
        toast({
          title: "Scan Completed",
          description: `Full report has been sent to ${email}.`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Scan Failed",
          description: result.reason || "Could not complete the scan. Please check the URL.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred during the scan.",
      });
    } finally {
      setIsScanning(false);
    }
  };

  const domain = scanResult?.url ? new URL(scanResult.url).hostname : '';
  const report = scanResult?.compliance_report;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-50 font-body overflow-x-hidden flex flex-col">
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[30%] bg-indigo-500/10 blur-[100px] rounded-full" />
      </div>

      <header className="border-b border-white/5 bg-[#020617]/50 backdrop-blur-xl shrink-0 sticky top-0 z-50">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-default">
            <Image 
              src="/logo.png" 
              alt="HumangoBot Logo" 
              width={40}
              height={40}
              className="object-contain"
              priority
            />
            <span className="font-bold text-xl tracking-tight text-white">
              HumangoBot
            </span>
          </div>
          <nav className="flex items-center gap-6">
            <Link 
              href="https://sfcc.humango.app" 
              className="hidden md:flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-primary transition-colors"
            >
              <ShoppingCart className="w-3 h-3" /> Enterprise SFCC
            </Link>
            <Badge variant="outline" className="hidden sm:flex border-primary/20 bg-primary/5 text-primary text-[10px] font-bold tracking-[0.2em] px-3 py-1 rounded-full uppercase">
              Compliance Portal
            </Badge>
          </nav>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-6 py-12 flex flex-col justify-center">
        <div className="grid lg:grid-cols-12 gap-12 items-start w-full max-w-7xl mx-auto">
          <div className="lg:col-span-7 space-y-8">
            <div className="space-y-6">
              <Badge variant="outline" className="py-1 px-3 border-primary/20 bg-primary/5 text-primary text-[10px] font-bold uppercase tracking-[0.2em]">
                Automated Auditing
              </Badge>
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight text-white">
                Compliance & Security <br />Audit Portal
              </h1>
              <p className="text-lg text-slate-400 max-w-xl leading-relaxed">
                Enter your website to receive an authenticated <span className="text-white font-medium">GDPR & Technical Audit</span> report. Results are displayed instantly.
              </p>
            </div>

            {/* SCANNER FORM */}
            <div className="max-w-xl w-full">
              <form onSubmit={handleScan} className="space-y-4">
                <div className="relative group">
                  <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative flex flex-col md:flex-row gap-3 bg-white/[0.03] border border-white/10 p-3 rounded-2xl backdrop-blur-xl focus-within:border-primary/50 transition-all">
                    <div className="flex-1 flex flex-col bg-white/5 rounded-xl border border-white/5">
                      <label htmlFor="target-url" className="sr-only">Target Website URL</label>
                      <div className="flex items-center w-full">
                        <div className="pl-4 pr-2">
                          <Globe className="w-4 h-4 text-slate-500" />
                        </div>
                        <Input 
                          id="target-url"
                          name="target-url"
                          type="url" 
                          placeholder="https://your-website.com" 
                          value={url}
                          onChange={(e) => setUrl(e.target.value)}
                          className="bg-transparent border-none focus-visible:ring-0 text-white placeholder:text-slate-600 h-11 text-sm"
                          required
                        />
                      </div>
                    </div>
                    <div className="flex-1 flex flex-col bg-white/5 rounded-xl border border-white/5">
                      <label htmlFor="recipient-email" className="sr-only">Report Recipient Email</label>
                      <div className="flex items-center w-full">
                        <div className="pl-4 pr-2">
                          <Mail className="w-4 h-4 text-slate-500" />
                        </div>
                        <Input 
                          id="recipient-email"
                          name="recipient-email"
                          type="email" 
                          placeholder="your@email.com" 
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="bg-transparent border-none focus-visible:ring-0 text-white placeholder:text-slate-600 h-11 text-sm"
                          required
                        />
                      </div>
                    </div>
                    <Button 
                      type="submit" 
                      disabled={isScanning}
                      className="bg-primary hover:bg-primary/90 text-white font-bold h-11 px-6 rounded-xl shrink-0 gap-2"
                    >
                      {isScanning ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Zap className="w-4 h-4" />
                      )}
                      {isScanning ? 'Auditing...' : 'Run Audit'}
                    </Button>
                  </div>
                </div>
              </form>
              <p className="mt-4 text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
                <ShieldCheck className="w-3 h-3 text-primary" /> Reports use authoritative GDPR Art. 83 liability estimates
              </p>
            </div>

            {/* LIVE SCAN RESULTS DISPLAY */}
            {scanResult && scanResult.status === 'success' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                <Card className="bg-white/[0.03] border-white/10 overflow-hidden shadow-2xl">
                  <div className={`p-4 flex items-center justify-between border-b border-white/5 ${report?.verdict === 'COMPLIANT' ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
                    <div className="flex items-center gap-3">
                      {report?.verdict === 'COMPLIANT' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <ShieldAlert className="w-5 h-5 text-rose-500" />
                      )}
                      <div className="flex flex-col">
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${report?.verdict === 'COMPLIANT' ? 'text-emerald-500' : 'text-rose-500'}`}>
                          Audit Verdict: {report?.verdict}
                        </span>
                        <span className="text-[9px] text-slate-500 uppercase font-mono">{domain}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="bg-white/5 border-white/10 text-[10px] font-mono">
                        Score: {report?.score}/100
                      </Badge>
                      <Button size="sm" variant="outline" className="h-8 border-white/10 hover:bg-white/5 text-[9px] font-bold uppercase tracking-widest gap-2" asChild>
                        <a href={`/api/admin/report-pdf?domain=${domain}`} target="_blank">
                          <Download className="w-3 h-3" /> PDF Report
                        </a>
                      </Button>
                    </div>
                  </div>
                  
                  <CardContent className="p-8">
                    <div className="grid md:grid-cols-2 gap-10">
                      {/* Left Column: Navigation Scout */}
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
                            <FileSearch className="w-4 h-4 text-primary" /> NAV-SCOUT Findings
                          </h4>
                          <p className="text-[10px] text-slate-500 leading-relaxed uppercase font-bold tracking-tight">Discovery of Mandatory Legal Infrastructure</p>
                        </div>
                        
                        <div className="space-y-3">
                          {['Privacy Policy', 'Legal Notice (Impressum)', 'Terms of Service', 'Cookie Policy'].map((docName, idx) => {
                            const isMissing = report?.nav_scout?.missing_critical?.includes(docName);
                            return (
                              <div key={idx} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                                <span className="text-xs text-slate-300 font-medium">{docName}</span>
                                {isMissing ? (
                                  <Badge className="bg-rose-500/10 text-rose-500 border-rose-500/20 text-[9px] font-bold">MISSING</Badge>
                                ) : (
                                  <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[9px] font-bold">DETECTED</Badge>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Right Column: Lex Analyzer */}
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
                            <Terminal className="w-4 h-4 text-primary" /> LEX-ANALYZER Content Audit
                          </h4>
                          <p className="text-[10px] text-slate-500 leading-relaxed uppercase font-bold tracking-tight">Validation of Mandatory Legal Clusters</p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { label: 'Retention Period', status: !report?.lex_analyzer?.missing_clusters?.includes('RETENTION') },
                            { label: 'Controller Identity', status: !report?.lex_analyzer?.missing_clusters?.includes('CONTROLLER') },
                            { label: 'DPO Contact', status: !report?.lex_analyzer?.missing_clusters?.includes('DPO') },
                            { label: 'VAT ID Compliance', status: report?.lex_analyzer?.has_vat_id },
                            { label: 'User Rights (Art. 13)', status: !report?.lex_analyzer?.missing_clusters?.includes('RIGHTS') },
                            { label: 'CMP Active', status: report?.cmp_detect?.is_active }
                          ].map((item, i) => (
                            <div key={i} className="flex items-center gap-2 p-3 bg-white/5 rounded-xl border border-white/5">
                              {item.status ? (
                                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              ) : (
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                              )}
                              <span className="text-[10px] text-slate-400 font-medium truncate">{item.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 pt-8 border-t border-white/5">
                      <div className="bg-primary/5 border border-primary/10 p-4 rounded-2xl flex items-start gap-4">
                        <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs text-white font-bold mb-1 uppercase tracking-tight">Audit Methodology: {scanResult.meta?.verification_method}</p>
                          <p className="text-[10px] text-slate-400 leading-relaxed">
                            The scan detected <span className="text-white font-bold">{scanResult.issuesFound}</span> unique legal vulnerabilities. 
                            Potential administrative liability is estimated based on <span className="text-primary font-bold">GDPR Article 83</span>.
                            A complete PDF report has been dispatched to your email address.
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[
                { icon: ShieldCheck, title: "NAV-SCOUT Engine", desc: "Structural navigation analysis identifying mandatory legal documents and their visibility." },
                { icon: FileText, title: "LEX-ANALYZER Module", desc: "Semantic legal cluster verification for VAT IDs, retention policies, and DPO contacts." },
                { icon: Scale, title: "Art. 83 Liability", desc: "Authoritative liability mapping based on the latest EU regulatory fine frameworks." },
                { icon: Globe, title: "Stateless Agent", desc: "Auditing performed by HumangoBot/1.0 under strict compliance protocols." },
              ].map((item, i) => (
                <Card key={i} className="bg-white/[0.02] border-white/5 p-6 hover:bg-white/[0.04] transition-all">
                  <div className="bg-primary/10 w-10 h-10 rounded-xl flex items-center justify-center mb-4">
                    <item.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-sm font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
                </Card>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 space-y-6">
            <Card className="bg-white/[0.03] border-white/10 backdrop-blur-xl shadow-2xl overflow-hidden">
              <CardHeader className="bg-white/[0.02] border-b border-white/5">
                <CardTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-primary" /> Audit Network Intelligence
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="space-y-3">
                  <label className="text-[10px] uppercase tracking-[0.2em] text-primary font-bold">User-Agent Proxy</label>
                  <div className="p-4 bg-black/40 rounded-xl border border-white/5 font-mono text-[10px] text-slate-300 break-all leading-relaxed">
                    HumangoBot/1.0 (+https://bot.humango.app)
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  <div className="p-4 bg-white/5 rounded-xl border border-white/5 space-y-2">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">Static Exit Node</label>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-mono text-xs text-slate-200">
                        <Globe className="w-3.5 h-3.5 text-primary" />
                        <span>116.203.3.75</span>
                      </div>
                      <Badge className="bg-primary/10 text-primary border-primary/20 text-[8px] px-2 h-4">Verified</Badge>
                    </div>
                  </div>

                  <div className="p-4 bg-white/5 rounded-xl border border-white/5 space-y-2">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">Transparency Adherence</label>
                    <div className="flex items-center gap-2 font-mono text-xs text-slate-200">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      <span>GDPR ART. 6(1)(F)</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-primary/10 rounded-xl border border-primary/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase text-primary">System Capacity</span>
                    <span className="text-[10px] font-bold text-white">Active Node</span>
                  </div>
                  <div className="w-full bg-primary/20 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-primary h-full w-[92%]" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-indigo-500/10 to-primary/10 border-primary/20 p-6 space-y-4">
              <h3 className="text-sm font-bold flex items-center gap-2 text-white">
                <ShieldAlert className="w-4 h-4 text-primary" /> Enforcement Ready
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Our reports provide technical evidence of missing mandatory legal disclosures required by regulatory authorities.
              </p>
              <Button className="w-full bg-primary font-bold h-11 text-xs gap-2 rounded-xl shadow-xl shadow-primary/20" asChild>
                <a href="mailto:abuse@humango.app">
                  Enterprise Compliance
                </a>
              </Button>
            </Card>
          </div>
        </div>
      </main>

      <footer className="py-8 px-6 border-t border-white/5 bg-[#010413]/50 mt-auto">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-8 text-[9px] text-slate-500 uppercase tracking-[0.25em] font-bold">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-4 h-4 text-primary opacity-80" />
            <span>Humango Compliance Engine • v2.9 Semantic Audit</span>
          </div>
          <div className="flex gap-8 items-center">
            <Link href="/legal/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/admin" className="text-slate-800 hover:text-white transition-colors">Admin Terminal</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
