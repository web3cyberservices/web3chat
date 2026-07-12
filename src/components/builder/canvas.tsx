'use client';

import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useBuilderStore, PageBlock, BlockContent, FontFamily } from '@/lib/builder-store';
import { 
  Trash2, GripVertical, Settings2, Palette, X, Move, RotateCcw, 
  Sparkles, Image as ImageIcon, Type, Plus, MousePointer2, 
  ExternalLink, Anchor, Zap, Terminal, Database, Wrench, 
  Hash, List, MessageSquare, Code, Layout, Smartphone, Tablet, Monitor, Info
} from 'lucide-react';
import { generateBlockContent } from '@/ai/flows/block-generator-flow';
import { useToast } from '@/hooks/use-toast';

type ElementType = 'title' | 'desc' | 'btn' | 'block' | 'prompt';

const FONT_MAP: Record<FontFamily, string> = {
  sans: 'Inter, sans-serif',
  serif: '"Playfair Display", serif',
  mono: '"JetBrains Mono", monospace',
  montserrat: 'Montserrat, sans-serif',
  oswald: 'Oswald, sans-serif',
  merriweather: 'Merriweather, serif',
  bebas: '"Bebas Neue", cursive',
  dancing: '"Dancing Script", cursive',
  inter: 'Inter, sans-serif'
};

function hexToRgba(hex: string, opacity: number): string {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.substring(1, 3), 16);
    g = parseInt(hex.substring(3, 5), 16);
    b = parseInt(hex.substring(5, 7), 16);
  }
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

function BlockContentComponent({ block, onUpdate, onStartDrag }: { 
  block: PageBlock; 
  onUpdate: (content: Partial<BlockContent>) => void;
  onStartDrag: (e: React.MouseEvent, block: PageBlock, type: ElementType) => void;
}) {
  const { styles, content, type } = block;

  const baseStyle = {
    color: styles.textColor,
    fontFamily: FONT_MAP[styles.fontFamily]
  };

  const renderDragHandle = (type: ElementType) => (
    <button 
      onMouseDown={(e) => onStartDrag(e, block, type)} 
      className="absolute -left-12 top-1/2 -translate-y-1/2 opacity-0 group-hover/el:opacity-100 p-3 bg-primary text-primary-foreground rounded-2xl shadow-2xl z-30 cursor-move transition-all hover:scale-110 active:scale-90"
    >
      <Move className="w-4 h-4" />
    </button>
  );

  const containerStyles = {
    minHeight: styles.minHeight,
    backgroundColor: hexToRgba(styles.backgroundColor, styles.backgroundOpacity ?? 1),
    borderRadius: styles.borderRadius,
    padding: styles.padding
  };

  // --- RENDERING AGENT / BOT BLOCKS ---
  if (['system-prompt', 'knowledge', 'tools', 'command', 'menu', 'reply'].includes(type)) {
    return (
      <div className="p-10 w-full" style={containerStyles}>
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20">
            {type === 'system-prompt' && <Terminal className="w-5 h-5 text-primary" />}
            {type === 'knowledge' && <Database className="w-5 h-5 text-primary" />}
            {type === 'tools' && <Wrench className="w-5 h-5 text-primary" />}
            {type === 'command' && <Hash className="w-5 h-5 text-primary" />}
            {type === 'menu' && <List className="w-5 h-5 text-primary" />}
            {type === 'reply' && <MessageSquare className="w-5 h-5 text-primary" />}
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-[0.3em] text-primary">{type.replace('-', ' ')} node</span>
            <h4 className="text-lg font-black tracking-tight text-white/90">Agent Logical Interface</h4>
          </div>
        </div>

        {type === 'system-prompt' && (
          <div className="relative">
            <textarea 
              value={content.systemPrompt}
              onChange={(e) => onUpdate({ systemPrompt: e.target.value })}
              className="w-full h-56 bg-black/40 p-6 font-mono text-xs border border-white/5 rounded-3xl outline-none focus:ring-1 focus:ring-primary/40 resize-none bento-inner-glow transition-all"
              placeholder="Define instructions for the neural engine..."
            />
            <div className="absolute right-4 bottom-4 text-[9px] font-mono text-primary/40 uppercase tracking-widest">System Instructions Layer</div>
          </div>
        )}

        {type === 'knowledge' && (
          <div className="space-y-4">
            <h3 className="font-bold text-sm tracking-tight">{content.title}</h3>
            <div className="grid grid-cols-1 gap-3">
              {content.knowledgeSources?.map((source, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl text-xs group/item hover:bg-white/10 transition-all">
                  <div className="flex items-center gap-3">
                    <Database className="w-4 h-4 text-primary" />
                    <span className="font-mono opacity-80">{source}</span>
                  </div>
                  <button className="text-[9px] font-bold text-destructive opacity-0 group-hover/item:opacity-100 transition-all uppercase tracking-widest">Delete</button>
                </div>
              ))}
            </div>
            <button className="text-[10px] text-primary font-bold mt-4 flex items-center gap-2 hover:translate-x-1 transition-transform uppercase tracking-widest">+ Inject knowledge source</button>
          </div>
        )}

        {type === 'tools' && (
          <div className="space-y-4">
             {content.tools?.map((tool, i) => (
               <div key={i} className="p-6 bg-white/5 border border-white/5 rounded-[2rem] relative group/tool overflow-hidden bento-inner-glow">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl -z-10" />
                 <div className="font-black text-sm mb-2 text-white/90">{tool.name}</div>
                 <div className="text-[11px] opacity-60 mb-4 leading-relaxed">{tool.description}</div>
                 <div className="flex items-center gap-2 text-[10px] font-mono p-3 bg-black/40 rounded-xl border border-white/5 text-primary">
                   <Zap className="w-3 h-3" /> {tool.endpoint}
                 </div>
               </div>
             ))}
             <button className="w-full py-4 border border-dashed border-white/10 rounded-2xl text-[10px] font-bold opacity-40 hover:opacity-100 hover:border-primary/50 transition-all uppercase tracking-widest">Add capability node</button>
          </div>
        )}

        {type === 'command' && (
          <div className="flex flex-col gap-4">
            <div className="space-y-2">
              <label className="text-[9px] font-bold uppercase tracking-widest opacity-40">Entry point</label>
              <input 
                value={content.commandName} 
                onChange={(e) => onUpdate({ commandName: e.target.value })} 
                className="w-full bg-primary/5 text-primary border border-primary/20 p-4 rounded-2xl font-mono text-sm outline-none shadow-inner" 
                placeholder="/cmd"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-bold uppercase tracking-widest opacity-40">Execution logic</label>
              <textarea 
                value={content.description} 
                onChange={(e) => onUpdate({ description: e.target.value })} 
                className="w-full bg-white/5 border border-white/5 p-4 rounded-2xl text-xs outline-none h-32 resize-none" 
                placeholder="What protocol should be initiated?"
              />
            </div>
          </div>
        )}

        {type === 'menu' && (
          <div className="space-y-4">
            <h3 className="font-black text-sm uppercase tracking-widest text-white/70">{content.title}</h3>
            <div className="grid grid-cols-2 gap-3">
              {content.links?.map((link, i) => (
                <div key={i} className="p-4 bg-white/5 border border-white/5 rounded-2xl text-center text-xs font-bold premium-border cursor-pointer hover:bg-white/10 transition-all">
                  {link.label}
                </div>
              ))}
            </div>
            <button className="w-full py-3 border border-dashed rounded-xl text-[9px] font-bold opacity-30 hover:opacity-100 transition-all uppercase tracking-widest">+ Add Option</button>
          </div>
        )}

        {type === 'reply' && (
          <div className="p-8 bg-primary/5 border border-primary/20 rounded-[3rem] bento-inner-glow">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-primary animate-pulse" />
              <div className="text-[10px] text-primary font-bold uppercase tracking-widest">Neural Response</div>
            </div>
            <textarea 
              value={content.description} 
              onChange={(e) => onUpdate({ description: e.target.value })}
              className="w-full bg-transparent border-none outline-none text-base font-light italic leading-relaxed text-white/90 resize-none"
              rows={4}
              placeholder="System will synthesize response here..."
            />
          </div>
        )}
      </div>
    );
  }

  // --- RENDERING LANDING BLOCKS ---
  return (
    <div 
      className={`relative flex flex-col justify-center transition-all duration-700 w-full overflow-visible ${type === 'header' && styles.isOverlay ? 'absolute top-0 left-0 z-40' : ''} ${type === 'header' && styles.isSticky ? 'sticky top-0 z-50 shadow-2xl' : ''}`} 
      style={containerStyles}
    >
      {styles.backgroundImage && (
        <div 
          className="absolute inset-0 bg-cover bg-center pointer-events-none" 
          style={{ backgroundImage: `url(${styles.backgroundImage})`, opacity: styles.backgroundOpacity ?? 1 }} 
        />
      )}

      {styles.backgroundImage && (
        <div 
          className="absolute inset-0 bg-black pointer-events-none" 
          style={{ opacity: styles.overlayOpacity || 0.4 }} 
        />
      )}
      
      <div className="relative z-10 w-full h-full flex items-center">
        {type === 'header' && (
          <div className="max-w-7xl mx-auto px-8 flex items-center justify-between w-full min-h-[5rem]">
             <div className="flex items-center gap-5 group/logo">
                {content.logoUrl ? (
                  <img src={content.logoUrl} alt="Logo" className="h-12 w-auto object-contain transition-transform group-hover/logo:scale-105" />
                ) : (
                  <input 
                    value={content.title} 
                    onChange={(e) => onUpdate({ title: e.target.value })} 
                    className="bg-transparent border-none font-black text-3xl outline-none tracking-tighter text-gradient hover:opacity-80 transition-all"
                    style={baseStyle}
                  />
                )}
             </div>
             <nav className="hidden md:flex items-center gap-10">
               {(content.links || []).map((link, idx) => (
                 <a key={idx} href={link.url} className="text-xs font-bold uppercase tracking-[0.2em] opacity-60 hover:opacity-100 hover:text-primary transition-all" style={baseStyle}>
                   {link.label}
                 </a>
               ))}
             </nav>
          </div>
        )}

        {(['hero', 'features', 'pricing', 'contacts', 'faq', 'testimonials', 'gallery'].includes(type)) && (
          <div className="max-w-5xl mx-auto px-8 text-center space-y-12 flex flex-col items-center py-24 w-full relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-20" />
            
            <div className="relative group/el inline-block w-full">
              {renderDragHandle('title')}
              <textarea 
                value={content.title} 
                onChange={(e) => onUpdate({ title: e.target.value })}
                className={`bg-transparent border-none font-black text-center w-full outline-none resize-none overflow-hidden leading-[1.1] tracking-tighter ${styles.fontSize === 'huge' ? 'text-[120px]' : styles.fontSize === 'large' ? 'text-7xl' : 'text-5xl'}`}
                style={baseStyle}
                rows={1}
              />
            </div>

            {content.description !== undefined && (
              <div className="relative group/el inline-block w-full">
                {renderDragHandle('desc')}
                <textarea 
                  value={content.description} 
                  onChange={(e) => onUpdate({ description: e.target.value })}
                  className="bg-transparent border-none text-2xl font-light text-center w-full outline-none resize-none overflow-hidden opacity-70 leading-relaxed max-w-4xl mx-auto"
                  style={baseStyle}
                  rows={2}
                />
              </div>
            )}

            {type === 'faq' && content.faq && (
              <div className="w-full space-y-6 text-left max-w-3xl mx-auto">
                {content.faq.map((item, i) => (
                  <div key={i} className="p-8 border border-white/5 rounded-[2.5rem] glass-morphism bento-inner-glow transition-all hover:border-primary/20">
                    <div className="font-black text-lg mb-3 tracking-tight">{item.question}</div>
                    <div className="text-base opacity-50 font-light leading-relaxed">{item.answer}</div>
                  </div>
                ))}
              </div>
            )}

            {type === 'testimonials' && content.testimonials && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-6xl">
                {content.testimonials.map((t, i) => (
                  <div key={i} className="p-10 glass-morphism border border-white/5 rounded-[3.5rem] text-left space-y-6 relative overflow-hidden bento-inner-glow">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 blur-3xl -z-10" />
                    <p className="text-xl font-light italic leading-relaxed opacity-90">"{t.text}"</p>
                    <div className="flex items-center gap-5 pt-4">
                      <img src={t.avatar} className="w-14 h-14 rounded-full premium-border shadow-2xl" alt={t.name} />
                      <div>
                        <div className="font-black text-sm tracking-tight">{t.name}</div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40">{t.role}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {type === 'gallery' && content.gallery && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10 w-full max-w-6xl">
                {content.gallery.map((img, i) => (
                  <div key={i} className="relative group/img overflow-hidden rounded-[3rem] premium-border">
                    <img src={img} className="w-full aspect-video object-cover transition-transform duration-1000 group-hover/img:scale-110" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity duration-700 flex items-center justify-center">
                      <ImageIcon className="w-10 h-10 text-white" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {content.buttonText !== undefined && (
              <div className="relative group/el inline-block mt-8">
                {renderDragHandle('btn')}
                <input 
                  value={content.buttonText} 
                  onChange={(e) => onUpdate({ buttonText: e.target.value })}
                  className="px-16 py-6 font-black text-center outline-none shadow-2xl transition-all hover:scale-105 active:scale-95 neo-shadow cursor-pointer uppercase tracking-[0.3em] text-[11px]"
                  style={{
                    backgroundColor: styles.buttonBgColor,
                    color: styles.buttonTextColor,
                    borderRadius: styles.buttonRadius === 'full' ? '9999px' : (styles.buttonRadius === 'md' ? '2rem' : '0px'),
                    fontFamily: FONT_MAP[styles.buttonFontFamily]
                  }}
                />
              </div>
            )}
            
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[80%] h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-20" />
          </div>
        )}

        {type === 'custom-code' && (
          <div className="w-full max-w-7xl mx-auto px-8 py-10">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-2 bg-accent/20 rounded-xl">
                <Code className="w-4 h-4 text-accent" />
              </div>
              <span className="text-[10px] uppercase font-bold tracking-[0.3em] text-accent">Protocol Injection</span>
            </div>
            <textarea 
              value={content.customCode}
              onChange={(e) => onUpdate({ customCode: e.target.value })}
              className="w-full bg-black/60 p-8 font-mono text-xs border border-white/5 rounded-[2.5rem] outline-none focus:ring-1 focus:ring-accent/40 min-h-[300px] resize-y bento-inner-glow text-accent/80"
              placeholder="Inject custom HTML/CSS/JS layer here..."
            />
            <div className="mt-8 border border-dashed border-white/5 rounded-[2.5rem] p-6 opacity-40 hover:opacity-60 transition-opacity">
              <div className="text-[9px] uppercase tracking-widest text-center mb-4 font-bold">Runtime Preview Layer</div>
              <div dangerouslySetInnerHTML={{ __html: content.customCode || '' }} />
            </div>
          </div>
        )}

        {type === 'footer' && (
          <div className="max-w-7xl mx-auto px-8 text-center py-24 w-full space-y-8">
            <input 
              value={content.title} 
              onChange={(e) => onUpdate({ title: e.target.value })} 
              className="bg-transparent border-none text-[12px] font-black uppercase tracking-[0.5em] opacity-40 outline-none w-full text-center hover:opacity-100 transition-opacity"
              style={baseStyle}
            />
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              <p className="text-[9px] opacity-20 uppercase tracking-[0.5em] font-bold">Generated via Cyber Synthesis Platform &copy; 2026</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function BuilderCanvas() {
  const { blocks, mode, viewport, reorderBlocks, removeBlock, updateBlock } = useBuilderStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const { toast } = useToast();

  const canvasWidth = {
    desktop: 'max-w-7xl',
    tablet: 'max-w-3xl',
    mobile: 'max-w-[400px]'
  }[viewport];

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    reorderBlocks(result.source.index, result.destination.index);
  };

  const startPositionDrag = (e: React.MouseEvent, block: PageBlock, type: ElementType) => {
    // Positioning logic could be added here for free-move elements
  };

  return (
    <div className="flex-1 bg-[#050507] overflow-y-auto p-4 md:p-20 transition-all duration-700 relative">
      {/* Visual Workspace Background */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(#ffffff05_1px,transparent_1px)] [background-size:40px_40px]" />
      </div>

      <div className={`${canvasWidth} mx-auto min-h-[90vh] bg-background shadow-[0_100px_200px_-50px_rgba(0,0,0,0.5)] rounded-[3rem] ring-1 ring-white/5 flex flex-col transition-all duration-700 relative overflow-hidden bento-inner-glow`}>
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="canvas">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="flex-1">
                {blocks.length === 0 && (
                  <div className="flex-1 flex flex-col items-center justify-center py-64 border-2 border-dashed border-white/5 m-10 rounded-[4rem] opacity-20 hover:opacity-40 transition-opacity duration-700 group cursor-default">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                      <Layout className="w-10 h-10 animate-pulse" />
                    </div>
                    <p className="font-black text-2xl tracking-tighter uppercase mb-2">Workspace initialized</p>
                    <p className="text-sm font-light tracking-[0.2em] uppercase">Select protocol to begin</p>
                  </div>
                )}
                
                {blocks.map((block, index) => (
                  <Draggable key={block.id} draggableId={block.id} index={index}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`group relative border-b border-white/5 last:border-b-0 hover:z-20 transition-all ${editingId === block.id ? 'ring-2 ring-primary/30 z-30' : ''}`}
                        style={provided.draggableProps.style as any}
                      >
                        {/* Block Management Overlay */}
                        <div className="absolute right-8 top-8 flex gap-3 opacity-0 group-hover:opacity-100 transition-all z-[60] scale-90 group-hover:scale-100 duration-500">
                          <button 
                            onClick={() => setEditingId(editingId === block.id ? null : block.id)} 
                            className={`p-3 bg-card border border-white/10 rounded-2xl hover:text-primary hover:border-primary/40 transition-all shadow-2xl ${editingId === block.id ? 'bg-primary text-primary-foreground border-primary' : ''}`}
                            title="Block Settings"
                          >
                            <Settings2 className="w-5 h-5" />
                          </button>
                          <div {...provided.dragHandleProps} className="p-3 bg-card border border-white/10 rounded-2xl cursor-grab active:cursor-grabbing hover:text-primary transition-all shadow-2xl" title="Reorder">
                            <GripVertical className="w-5 h-5" />
                          </div>
                          <button 
                            onClick={() => removeBlock(block.id)} 
                            className="p-3 bg-card border border-white/10 rounded-2xl hover:text-destructive hover:border-destructive/40 transition-all shadow-2xl"
                            title="Remove Block"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>

                        {/* Floating Settings Panel */}
                        {editingId === block.id && (
                          <div className="fixed top-32 right-12 w-96 bg-card border border-white/10 rounded-[3rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.8)] p-8 z-[70] max-h-[70vh] overflow-y-auto bento-inner-glow animate-in slide-in-from-right-10 duration-500 backdrop-blur-3xl">
                            <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
                              <div>
                                <h4 className="text-xs font-black uppercase tracking-[0.4em] text-primary">Protocol Config</h4>
                                <p className="text-[9px] opacity-40 uppercase tracking-widest mt-1">Refining {block.type} node</p>
                              </div>
                              <button onClick={() => setEditingId(null)} className="p-2 hover:bg-white/5 rounded-full transition-all"><X className="w-5 h-5" /></button>
                            </div>
                            
                            <div className="space-y-8">
                              <section className="space-y-4">
                                <h5 className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40 flex items-center gap-2">
                                  <Palette className="w-3 h-3" /> Chromatic Settings
                                </h5>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <label className="text-[9px] font-bold uppercase tracking-widest block px-1">Backdrop</label>
                                    <input type="color" value={block.styles.backgroundColor} onChange={(e) => updateBlock(block.id, { styles: { ...block.styles, backgroundColor: e.target.value } })} className="w-full h-12 rounded-2xl cursor-pointer bg-white/5 border-none" />
                                  </div>
                                  <div className="space-y-2">
                                    <label className="text-[9px] font-bold uppercase tracking-widest block px-1">Typography</label>
                                    <input type="color" value={block.styles.textColor} onChange={(e) => updateBlock(block.id, { styles: { ...block.styles, textColor: e.target.value } })} className="w-full h-12 rounded-2xl cursor-pointer bg-white/5 border-none" />
                                  </div>
                                </div>
                              </section>

                              <section className="space-y-4">
                                <h5 className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40 flex items-center gap-2">
                                  <ImageIcon className="w-3 h-3" /> Visual Layer
                                </h5>
                                <div className="space-y-2">
                                  <label className="text-[9px] font-bold uppercase tracking-widest block px-1">Background URI</label>
                                  <input 
                                    value={block.styles.backgroundImage || ''} 
                                    onChange={(e) => updateBlock(block.id, { styles: { ...block.styles, backgroundImage: e.target.value } })} 
                                    placeholder="https://images..." 
                                    className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-[10px] outline-none focus:ring-1 focus:ring-primary/40 transition-all"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <div className="flex justify-between items-baseline">
                                    <label className="text-[9px] font-bold uppercase tracking-widest block px-1">Opacity</label>
                                    <span className="text-[9px] font-mono text-primary">{Math.round((block.styles.backgroundOpacity ?? 1) * 100)}%</span>
                                  </div>
                                  <input 
                                    type="range" min="0" max="1" step="0.01" 
                                    value={block.styles.backgroundOpacity ?? 1} 
                                    onChange={(e) => updateBlock(block.id, { styles: { ...block.styles, backgroundOpacity: parseFloat(e.target.value) } })} 
                                    className="w-full accent-primary h-1 bg-white/10 rounded-full appearance-none"
                                  />
                                </div>
                              </section>

                              <section className="space-y-4">
                                <h5 className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40 flex items-center gap-2">
                                  <Info className="w-3 h-3" /> Spatial Config
                                </h5>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <label className="text-[9px] font-bold uppercase tracking-widest block px-1">Radius</label>
                                    <select 
                                      value={block.styles.borderRadius} 
                                      onChange={(e) => updateBlock(block.id, { styles: { ...block.styles, borderRadius: e.target.value } })}
                                      className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-[10px] outline-none"
                                    >
                                      <option value="0px">Sharp</option>
                                      <option value="2rem">Soft</option>
                                      <option value="4rem">Ultra</option>
                                      <option value="9999px">Oval</option>
                                    </select>
                                  </div>
                                  <div className="space-y-2">
                                    <label className="text-[9px] font-bold uppercase tracking-widest block px-1">Text Scale</label>
                                    <select 
                                      value={block.styles.fontSize} 
                                      onChange={(e) => updateBlock(block.id, { styles: { ...block.styles, fontSize: e.target.value as any } })}
                                      className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-[10px] outline-none"
                                    >
                                      <option value="normal">Standard</option>
                                      <option value="large">Elevated</option>
                                      <option value="huge">Monolithic</option>
                                    </select>
                                  </div>
                                </div>
                              </section>
                              
                              {type === 'header' && (
                                <section className="space-y-4 pt-4 border-t border-white/5">
                                  <h5 className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40">Protocol Behavior</h5>
                                  <div className="flex flex-col gap-3">
                                    <label className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl cursor-pointer hover:bg-white/10 transition-all border border-transparent hover:border-primary/20">
                                      <input type="checkbox" checked={block.styles.isSticky} onChange={(e) => updateBlock(block.id, { styles: { ...block.styles, isSticky: e.target.checked } })} className="w-4 h-4 accent-primary" />
                                      <span className="text-[10px] font-bold uppercase tracking-widest">Fixed Scroll</span>
                                    </label>
                                    <label className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl cursor-pointer hover:bg-white/10 transition-all border border-transparent hover:border-primary/20">
                                      <input type="checkbox" checked={block.styles.isOverlay} onChange={(e) => updateBlock(block.id, { styles: { ...block.styles, isOverlay: e.target.checked } })} className="w-4 h-4 accent-primary" />
                                      <span className="text-[10px] font-bold uppercase tracking-widest">Overlay Mode</span>
                                    </label>
                                  </div>
                                </section>
                              )}
                            </div>
                          </div>
                        )}

                        <BlockContentComponent 
                          block={block} 
                          onUpdate={(content) => updateBlock(block.id, { content })} 
                          onStartDrag={startPositionDrag}
                        />
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>
    </div>
  );
}