'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, ArrowRight, Key, History, AlertTriangle, QrCode, ShieldAlert, Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { generateMnemonic, mnemonicToId } from '@/lib/crypto-utils';
import { QRScanner } from '@/components/qr-scanner';
import { useToast } from '@/hooks/use-toast';

interface AuthScreenProps {
  onIdentityCreated: (id: string) => void;
}

export function AuthScreen({ onIdentityCreated }: AuthScreenProps) {
  const [mode, setMode] = useState<'welcome' | 'generate' | 'restore' | 'scan'>('welcome');
  const [mnemonic, setMnemonic] = useState<string[]>([]);
  const [restoreText, setRestoreText] = useState('');
  const [generatedId, setGeneratedId] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSecure, setIsSecure] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Проверка защищенного контекста (обязательно для crypto.subtle)
    const secure = typeof window !== 'undefined' && 
                   (window.location.protocol === 'https:' || 
                    window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1');
    setIsSecure(secure);
  }, []);

  const startGeneration = async () => {
    if (!isSecure) {
      toast({
        title: "Insecure Connection",
        description: "Browser blocks encryption on HTTP. Please use HTTPS (port 8443) to create an Identity.",
        variant: "destructive"
      });
      return;
    }

    try {
      const newMnemonic = generateMnemonic();
      const id = await mnemonicToId(newMnemonic);
      setMnemonic(newMnemonic);
      setGeneratedId(id);
      setMode('generate');
    } catch (e: any) {
      toast({
        title: "Generation Failed",
        description: "Could not create Web3 Identity. Ensure you are using HTTPS.",
        variant: "destructive"
      });
    }
  };

  const handleRestore = async (text?: string) => {
    if (!isSecure) {
      toast({
        title: "Insecure Connection",
        description: "Please use HTTPS to restore Identity.",
        variant: "destructive"
      });
      return;
    }

    try {
      const input = text || restoreText;
      const words = input.trim().toLowerCase().split(/\s+/);
      if (words.length !== 12) {
        toast({ title: "Invalid Phrase", description: "Seed phrase must be 12 words.", variant: "destructive" });
        return;
      }
      const id = await mnemonicToId(words);
      onIdentityCreated(id);
    } catch (e: any) {
      toast({ title: "Restore Failed", description: "Check your phrase.", variant: "destructive" });
    }
  };

  const handleQRScan = (data: string) => {
    try {
      const payload = JSON.parse(data);
      if (payload.type === 'web3chat-sync' && payload.mnemonic) {
        handleRestore(payload.mnemonic);
      } else {
        setMode('welcome');
      }
    } catch (e) {
      setMode('welcome');
    }
  };

  const copyMnemonic = () => {
    navigator.clipboard.writeText(mnemonic.join(' '));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-screen w-full bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 blur-[120px] rounded-full -z-10" />
      
      {mode === 'scan' && <QRScanner onScan={handleQRScan} onClose={() => setMode('welcome')} />}

      <div className="max-w-md w-full space-y-8 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-20 h-20 bg-primary/20 rounded-3xl flex items-center justify-center border border-primary/30 shadow-2xl shadow-primary/20">
            <ShieldCheck className="w-10 h-10 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Web3 Chat</h1>
            <p className="text-muted-foreground mt-2">Private. Anonymous. Secure.</p>
          </div>
        </div>

        {!isSecure && (
          <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-2xl flex flex-col items-center gap-3 animate-in fade-in zoom-in duration-500">
            <ShieldAlert className="w-10 h-10 text-destructive" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-destructive">HTTPS Required</p>
              <p className="text-xs text-destructive/80 leading-relaxed">
                Crypto APIs are disabled on <strong>HTTP</strong>. 
                Please access via <strong>https://</strong> (port 8443).
              </p>
            </div>
          </div>
        )}

        <div className="bg-card border rounded-3xl p-8 shadow-xl space-y-6">
          {mode === 'welcome' && (
            <div className="space-y-6">
              <div className="flex flex-col gap-3">
                <Button 
                  onClick={startGeneration} 
                  disabled={!isSecure}
                  className="w-full h-12 text-lg font-semibold rounded-2xl group"
                >
                  Create Web3 ID
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={() => setMode('restore')} className="h-12 rounded-2xl text-xs">
                    <History className="mr-2 w-4 h-4" /> Restore
                  </Button>
                  <Button variant="secondary" onClick={() => setMode('scan')} className="h-12 rounded-2xl text-xs">
                    <QrCode className="mr-2 w-4 h-4" /> Scan Sync
                  </Button>
                </div>
              </div>
            </div>
          )}

          {mode === 'generate' && (
            <div className="space-y-6 animate-in fade-in zoom-in duration-300">
              <div className="grid grid-cols-3 gap-2">
                {mnemonic.map((word, i) => (
                  <div key={i} className="bg-secondary p-2 rounded-lg border text-[10px] flex gap-2">
                    <span className="opacity-30 font-mono">{i + 1}</span>
                    <span className="font-semibold">{word}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={copyMnemonic} className="flex-1 h-12 rounded-xl">
                  {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                  Copy
                </Button>
                <Button onClick={() => onIdentityCreated(generatedId)} className="flex-[2] h-12 rounded-xl">
                  I've saved it
                </Button>
              </div>
            </div>
          )}

          {mode === 'restore' && (
            <div className="space-y-6 animate-in slide-in-from-right duration-300">
              <textarea 
                value={restoreText}
                onChange={(e) => setRestoreText(e.target.value)}
                placeholder="Enter 12-word seed phrase..."
                className="w-full bg-secondary rounded-xl p-4 text-sm font-mono h-32 outline-none border border-border/50"
              />
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setMode('welcome')} className="h-12 rounded-xl">Back</Button>
                <Button onClick={() => handleRestore()} className="flex-1 h-12 rounded-xl shadow-lg shadow-primary/20">
                  <Key className="mr-2 w-4 h-4" /> Restore Identity
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}