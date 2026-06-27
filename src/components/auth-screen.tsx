'use client';

import React, { useState } from 'react';
import { ShieldCheck, ArrowRight, RefreshCw, Copy, Check, Key, History, AlertTriangle, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { generateMnemonic, mnemonicToId } from '@/lib/crypto-utils';
import { QRScanner } from '@/components/qr-scanner';

interface AuthScreenProps {
  onIdentityCreated: (id: string) => void;
}

export function AuthScreen({ onIdentityCreated }: AuthScreenProps) {
  const [mode, setMode] = useState<'welcome' | 'generate' | 'restore' | 'scan'>('welcome');
  const [mnemonic, setMnemonic] = useState<string[]>([]);
  const [restoreText, setRestoreText] = useState('');
  const [generatedId, setGeneratedId] = useState('');
  const [copied, setCopied] = useState(false);

  const startGeneration = async () => {
    const newMnemonic = generateMnemonic();
    const id = await mnemonicToId(newMnemonic);
    setMnemonic(newMnemonic);
    setGeneratedId(id);
    setMode('generate');
  };

  const handleRestore = async (text?: string) => {
    const input = text || restoreText;
    const words = input.trim().toLowerCase().split(/\s+/);
    if (words.length !== 12) {
      alert('Invalid Seed Phrase. Must be exactly 12 words.');
      return;
    }
    const id = await mnemonicToId(words);
    onIdentityCreated(id);
  };

  const handleQRScan = (data: string) => {
    try {
      const payload = JSON.parse(data);
      if (payload.type === 'vortex-sync' && payload.mnemonic) {
        handleRestore(payload.mnemonic);
      } else {
        alert('Invalid QR Code format.');
        setMode('welcome');
      }
    } catch (e) {
      alert('Failed to parse QR data.');
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
            <h1 className="text-3xl font-bold tracking-tight">ReguScan</h1>
            <p className="text-muted-foreground mt-2">Private. Anonymous. Secure.</p>
          </div>
        </div>

        <div className="bg-card border rounded-3xl p-8 shadow-xl space-y-6">
          {mode === 'welcome' && (
            <div className="space-y-6">
              <div className="text-left space-y-4">
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">1</div>
                  <p className="text-sm text-muted-foreground">No phone number or email required.</p>
                </div>
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">2</div>
                  <p className="text-sm text-muted-foreground">Your identity is a unique mnemonic key.</p>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <Button onClick={startGeneration} className="w-full h-12 text-lg font-semibold rounded-2xl group">
                  Create Web3 ID
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={() => setMode('restore')} className="h-12 rounded-2xl text-xs">
                    <History className="mr-2 w-4 h-4" />
                    Restore
                  </Button>
                  <Button variant="secondary" onClick={() => setMode('scan')} className="h-12 rounded-2xl text-xs">
                    <QrCode className="mr-2 w-4 h-4" />
                    Scan Sync
                  </Button>
                </div>
              </div>
            </div>
          )}

          {mode === 'generate' && (
            <div className="space-y-6 animate-in fade-in zoom-in duration-300">
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-2 text-accent">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="text-xs font-bold uppercase">Save your Recovery Phrase</span>
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  {mnemonic.map((word, i) => (
                    <div key={i} className="bg-secondary p-2 rounded-lg border border-border/50 text-[10px] flex gap-2">
                      <span className="opacity-30 font-mono">{i + 1}</span>
                      <span className="font-semibold">{word}</span>
                    </div>
                  ))}
                </div>

                <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-xl">
                  <p className="text-[10px] text-destructive leading-tight font-medium">
                    If you lose this phrase, you lose access to your chats forever.
                  </p>
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
            </div>
          )}

          {mode === 'restore' && (
            <div className="space-y-6 animate-in slide-in-from-right duration-300">
              <div className="space-y-2 text-left">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Enter your 12-word Seed Phrase</label>
                <textarea 
                  value={restoreText}
                  onChange={(e) => setRestoreText(e.target.value)}
                  placeholder="word1 word2 word3..."
                  className="w-full bg-secondary rounded-xl p-4 text-sm font-mono h-32 outline-none focus:ring-2 focus:ring-primary/20 resize-none border border-border/50"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setMode('welcome')} className="h-12 rounded-xl">
                  Back
                </Button>
                <Button onClick={() => handleRestore()} className="flex-1 h-12 rounded-xl shadow-lg shadow-primary/20">
                  <Key className="mr-2 w-4 h-4" />
                  Restore Identity
                </Button>
              </div>
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Your keys, your chat. Secure Web3 encryption active.
        </p>
      </div>
    </div>
  );
}