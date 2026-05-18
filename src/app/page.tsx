
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { startCrawlAction, checkAuditStatus } from '@/app/actions/crawler-actions';
import { 
  Mail, Globe, Terminal, ShieldCheck, Zap, Loader2, CheckCircle2, Download, AlertCircle, ArrowRight 
} from "lucide-react";

export default function Home() {
  const [url, setUrl] = useState('');
  const [email, setEmail] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<'idle' | 'pending' | 'queued' | 'processing' | 'completed' | 'failed'>('idle');
  const [pollingUrl, setPollingUrl] = useState('');
  const { toast } = useToast();

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsScanning(true);
    setScanStatus('queued');
    try {
      const result = await startCrawlAction(url, email);
      if (result.status === 'success' && result.url) {
        setPollingUrl(result.url);
        toast({ title: "Audit Queued", description: "Request accepted." });
      } else {
        setScanStatus('failed');
        setIsScanning(false);
      }
    } catch (error) {
      setScanStatus('failed');
      setIsScanning(false);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isScanning && pollingUrl && ['queued', 'pending', 'processing'].includes(scanStatus)) {
      interval = setInterval(async () => {
        const res = await checkAuditStatus(pollingUrl);
        if (res.success && res.status === 'completed') {
          setScanStatus('completed');
          setIsScanning(false);
          clearInterval(interval);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isScanning, scanStatus, pollingUrl]);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-50 font-body flex flex-col">
      <header className="border-b border-white/5 bg-[#020617]/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Logo" width={32} height={32} />
            <span className="font-bold text-lg">Humango Compliance</span>
          </div>
          <Link href="/admin" className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-white flex items-center gap-2">
            <Terminal className="w-3 h-3" /> Admin Terminal
          </Link>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-6 py-12 flex flex-col items-center justify-center">
        <div className="max-w-3xl w-full space-y-8 text-center">
          <Badge variant="outline" className="py-1 px-3 border-primary/20 bg-primary/5 text-primary">Automated GDPR Audit</Badge>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">Professional Statutory <br />Compliance Monitoring</h1>
          
          <form onSubmit={handleScan} className="flex flex-col md:flex-row gap-3 bg-white/5 p-3 rounded-2xl border border-white/10">
            <Input placeholder="domain.com" value={url} onChange={(e) => setUrl(e.target.value)} className="bg-transparent border-none focus-visible:ring-0" required />
            <Input type="email" placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-transparent border-none focus-visible:ring-0" required />
            <Button type="submit" disabled={isScanning} className="bg-primary font-bold px-8">
              {isScanning ? <Loader2 className="animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
              {isScanning ? 'Processing...' : 'Run Audit'}
            </Button>
          </form>

          {scanStatus === 'completed' && (
            <Card className="bg-emerald-500/10 border-emerald-500/20 p-6 flex items-center justify-between">
              <div className="flex items-center gap-4 text-left">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                <div>
                  <h4 className="font-bold text-white">Audit Complete</h4>
                  <p className="text-sm text-slate-400">Your report is ready for download.</p>
                </div>
              </div>
              <Button asChild className="bg-white text-primary font-bold">
                <a href={`/api/admin/report-pdf?domain=${url}`} target="_blank"><Download className="w-4 h-4 mr-2" /> PDF</a>
              </Button>
            </Card>
          )}
        </div>
      </main>

      <footer className="py-12 px-6 border-t border-white/5 bg-[#010413]/50">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-8 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
          <div className="flex gap-6">
            <Link href="/legal/privacy" className="hover:text-white">Privacy Policy</Link>
            <Link href="/legal/impressum" className="hover:text-white">Legal Notice</Link>
            <Link href="/legal/bot-policy" className="hover:text-white">Bot Policy</Link>
          </div>
          <div className="flex items-center gap-4">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span>&copy; {new Date().getFullYear()} Humango Limited • bot.humango.app</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
