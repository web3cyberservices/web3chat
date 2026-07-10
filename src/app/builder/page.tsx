
'use client';

import React from 'react';
import { BuilderSidebar } from '@/components/builder/sidebar';
import { BuilderCanvas } from '@/components/builder/canvas';
import { Button } from '@/components/ui/button';
import { Save, Eye, Globe, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useBuilderStore } from '@/lib/builder-store';
import { generateFullHTML } from '@/lib/builder-renderer';

export default function BuilderPage() {
  const blocks = useBuilderStore((state) => state.blocks);

  const handleExport = () => {
    const html = generateFullHTML(blocks);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'index.html';
    a.click();
  };

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      {/* Top Navbar */}
      <header className="h-16 border-b flex items-center justify-between px-6 bg-card shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="h-6 w-[1px] bg-border mx-2" />
          <h1 className="font-bold tracking-tight">Site Builder <span className="text-primary text-[10px] ml-2 border px-2 py-0.5 rounded-full">v1.0-beta</span></h1>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => console.log(JSON.stringify(blocks, null, 2))}>
            <Eye className="w-4 h-4 mr-2" /> Preview JSON
          </Button>
          <Button variant="secondary" size="sm" onClick={handleExport}>
            <Save className="w-4 h-4 mr-2" /> Export HTML
          </Button>
          <Button size="sm" className="shadow-lg shadow-primary/20">
            <Globe className="w-4 h-4 mr-2" /> Publish
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        <BuilderSidebar />
        <BuilderCanvas />
      </div>
    </div>
  );
}
