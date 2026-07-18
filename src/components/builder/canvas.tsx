'use client';

import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useBuilderStore, PageBlock, BlockContent, FontFamily } from '@/lib/builder-store';
import { 
  Trash2, GripVertical, Settings2, Palette, X, Move, 
  Sparkles, Image as ImageIcon, Plus, 
  Zap, Terminal, Database, Wrench, 
  Hash, List, MessageSquare, Code, Layout, Info
} from 'lucide-react';

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
  onStartDrag: (e: React.MouseEvent, block: PageBlock, type: any) => void;
}) {
  const { styles, content, type } = block;

  const baseStyle = {
    color: styles.textColor,
    fontFamily: FONT_MAP[styles.fontFamily]
  };

  const containerStyles = {
    minHeight: styles.minHeight,
    backgroundColor: hexToRgba(styles.backgroundColor, styles.backgroundOpacity ?? 1),
    borderRadius: styles.borderRadius,
    padding: styles.padding
  };

  if (['system-prompt', 'knowledge', 'tools', 'command', 'menu', 'reply'].includes(type)) {
    return (
      <div className="p-10 w-full bento-inner-glow" style={containerStyles}>
        <div className="flex items-center gap-4 mb-8">
          <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20 shadow-xl shadow-primary/5">
            {type === 'system-prompt' && <Terminal className="w-6 h-6 text-primary" />}
            {type === 'knowledge' && <Database className="w-6 h-6 text-primary" />}
            {type === 'tools' && <Wrench className="w-6 h-6 text-primary" />}
            {type === 'command' && <Hash className="w-6 h-6 text-primary" />}
            {type === 'menu' && <List className="w-6 h-6 text-primary" />}
            {type === 'reply' && <MessageSquare className="w-6 h-6 text-primary" />}
          </div>
          <div>
            <span className="text-[10px] uppercase font-black tracking-[0.4em] text-primary/60">{type.replace('-', ' ')} protocol</span>
            <h4 className="text-xl font-black tracking-tight text-white/90">Neural Logic Interface</h4>
          </div>
        </div>

        {type === 'system-prompt' && (
          <div className="relative group/textarea">
            <textarea 
              value={content.systemPrompt}
              onChange={(e) => onUpdate({ systemPrompt: e.target.value })}
              className="w-full h-64 bg-black/60 p-8 font-mono text-[11px] leading-relaxed border border-white/5 rounded-[2.5rem] outline-none focus:ring-1 focus:ring-primary/40 resize-none transition-all shadow-2xl"
              placeholder="Inject core behavioral directives..."
            />
            <div className="absolute right-6 bottom-6 text-[8px] font-mono text-primary/20 uppercase tracking-[0.3em]">System.Core.Prompt</div>
          </div>
        )}

        {type === 'knowledge' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
              {content.knowledgeSources?.map((source, i) => (
                <div key={i} className="flex items-center justify-between p-6 bg-white/[0.02] border border-white/5 rounded-3xl text-[11px] group/item hover:bg-white/[0.04] transition-all">
                  <div className="flex items-center gap-4">
                    <Database className="w-4 h-4 text-primary/40" />
                    <span className="font-mono text-white/70">{source}</span>
                  </div>
                  <button className="text-[9px] font-black text-destructive/60 opacity-0 group-hover/item:opacity-100 transition-all uppercase tracking-widest hover:text-destructive">Purge</button>
                </div>
              ))}
            </div>
            <button className="w-full py-4 border border-dashed border-white/10 rounded-[2rem] text-[10px] font-black text-primary/40 hover:text-primary hover:border-primary/40 transition-all uppercase tracking-[0.3em]">+ Inject Knowledge Layer</button>
          </div>
        )}

        {type === 'tools' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {content.tools?.map((tool, i) => (
               <div key={i} className="p-8 bg-white/[0.02] border border-white/5 rounded-[2.5rem] relative group/tool overflow-hidden bento-inner-glow transition-all hover:border-primary/20">
                 <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/5 blur-[80px] -z-10" />
                 <div className="font-black text-sm mb-2 text-white/90">{tool.name}</div>
                 <div className="text-[10px] text-white/50 mb-6 leading-relaxed font-light">{tool.description}</div>
                 <div className="flex items-center gap-3 text-[9px] font-mono p-4 bg-black/60 rounded-2xl border border-white/5 text-primary">
                   <Zap className="w-3.5 h-3.5" /> {tool.endpoint}
                 </div>
               </div>
             ))}
             <button className="w-full py-10 border border-dashed border-white/10 rounded-[2.5rem] flex flex-col items-center justify-center gap-3 opacity-30 hover:opacity-100 hover:border-primary/50 transition-all group/add">
               <Wrench className="w-6 h-6 group-hover:rotate-45 transition-transform" />
               <span className="text-[9px] font-black uppercase tracking-[0.3em]">Add Capability Node</span>
             </button>
          </div>
        )}

        {type === 'command' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[9px] font-black uppercase tracking-[0.3em] opacity-40 ml-2">Protocol Entry</label>
              <input 
                value={content.commandName} 
                onChange={(e) => onUpdate({ commandName: e.target.value })} 
                className="w-full bg-primary/5 text-primary border border-primary/20 p-6 rounded-[2rem] font-mono text-sm outline-none shadow-inner transition-all focus:bg-primary/10" 
                placeholder="/initialize"
              />
            </div>
            <div className="space-y-3">
              <label className="text-[9px] font-black uppercase tracking-[0.3em] opacity-40 ml-2">Response Logic</label>
              <textarea 
                value={content.description} 
                onChange={(e) => onUpdate({ description: e.target.value })} 
                className="w-full bg-white/[0.02] border border-white/5 p-6 rounded-[2.5rem] text-[11px] outline-none h-32 resize-none transition-all focus:bg-white/[0.04]" 
                placeholder="What output should be synthesized?"
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div 
      className={`relative flex flex-col justify-center transition-all duration-1000 w-full overflow-visible ${type === 'header' && styles.isOverlay ? 'absolute top-0 left-0 z-40' : ''} ${type === 'header' && styles.isSticky ? 'sticky top-0 z-50' : ''}`} 
      style={containerStyles}
    >
      {styles.backgroundImage && (
        <div 
          className="absolute inset-0 bg-cover bg-center pointer-events-none transition-opacity duration-1000" 
          style={{ backgroundImage: `url(${styles.backgroundImage})`, opacity: styles.backgroundOpacity ?? 1 }} 
        />
      )}

      {styles.backgroundImage && (
        <div className="absolute inset-0 bg-black/60 pointer-events-none" style={{ opacity: styles.overlayOpacity || 0.6 }} />
      )}
      
      <div className="relative z-10 w-full h-full flex items-center">
        {type === 'header' && (
          <div className="max-w-7xl mx-auto px-10 flex items-center justify-between w-full min-h-[5rem]">
             <div className="flex items-center gap-6 group/logo">
                {content.logoUrl ? (
                  <img src={content.logoUrl} alt="Logo" className="h-10 w-auto object-contain transition-transform group-hover/logo:scale-105 duration-700" />
                ) : (
                  <input 
                    value={content.title} 
                    onChange={(e) => onUpdate({ title: e.target.value })} 
                    className="bg-transparent border-none font-black text-2xl outline-none tracking-tighter text-gradient hover:opacity-80 transition-all cursor-text"
                    style={baseStyle}
                  />
                )}
             </div>
             <nav className="hidden lg:flex items-center gap-12">
               {(content.links || []).map((link, idx) => (
                 <a key={idx} href={link.url} className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 hover:opacity-100 hover:text-primary transition-all duration-500" style={baseStyle}>
                   {link.label}
                 </a>
               ))}
             </nav>
          </div>
        )}

        {(['hero', 'features', 'pricing', 'contacts', 'faq', 'testimonials', 'gallery'].includes(type)) && (
          <div className="max-w-6xl mx-auto px-10 text-center space-y-12 flex flex-col items-center py-32 w-full relative">
            <div className="relative group/el inline-block w-full">
              <textarea 
                value={content.title} 
                onChange={(e) => onUpdate({ title: e.target.value })}
                className={`bg-transparent border-none font-black text-center w-full outline-none resize-none overflow-hidden leading-[1.05] tracking-tighter transition-all duration-700 ${styles.fontSize === 'huge' ? 'text-[90px]' : styles.fontSize === 'large' ? 'text-6xl' : 'text-4xl'}`}
                style={baseStyle}
                rows={1}
              />
            </div>

            {content.description !== undefined && (
              <div className="relative group/el inline-block w-full">
                <textarea 
                  value={content.description} 
                  onChange={(e) => onUpdate({ description: e.target.value })}
                  className="bg-transparent border-none text-xl font-light text-center w-full outline-none resize-none overflow-hidden opacity-60 leading-relaxed max-w-3xl mx-auto transition-opacity duration-700"
                  style={baseStyle}
                  rows={2}
                />
              </div>
            )}

            {content.buttonText !== undefined && (
              <div className="relative group/el inline-block mt-8">
                <input 
                  value={content.buttonText} 
                  onChange={(e) => onUpdate({ buttonText: e.target.value })}
                  className="px-14 py-5 font-black text-center outline-none shadow-2xl transition-all duration-700 hover:scale-105 active:scale-95 cursor-pointer uppercase tracking-[0.4em] text-[10px] premium-border"
                  style={{
                    backgroundColor: styles.buttonBgColor,
                    color: styles.buttonTextColor,
                    borderRadius: styles.buttonRadius === 'full' ? '9999px' : (styles.buttonRadius === 'md' ? '2rem' : '0px'),
                    fontFamily: FONT_MAP[styles.buttonFontFamily]
                  }}
                />
              </div>
            )}
          </div>
        )}

        {type === 'custom-code' && (
          <div className="w-full max-w-7xl mx-auto px-10 py-16">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-accent/20 rounded-2xl border border-accent/20">
                <Code className="w-5 h-5 text-accent" />
              </div>
              <span className="text-[10px] uppercase font-black tracking-[0.4em] text-accent/60">Logic Injection Layer</span>
            </div>
            <textarea 
              value={content.customCode}
              onChange={(e) => onUpdate({ customCode: e.target.value })}
              className="w-full bg-black/60 p-10 font-mono text-[11px] border border-white/5 rounded-[3.5rem] outline-none focus:ring-1 focus:ring-accent/40 min-h-[400px] resize-y shadow-2xl transition-all"
              placeholder="Inject custom Web3 components or logic..."
            />
          </div>
        )}
      </div>
    </div>
  );
}

export function BuilderCanvas() {
  const { blocks, viewport, reorderBlocks, removeBlock, updateBlock } = useBuilderStore();
  const [editingId, setEditingId] = useState<string | null>(null);

  const canvasWidth = {
    desktop: 'max-w-7xl',
    tablet: 'max-w-3xl',
    mobile: 'max-w-[420px]'
  }[viewport];

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    reorderBlocks(result.source.index, result.destination.index);
  };

  return (
    <div className="flex-1 bg-[#050507] overflow-y-auto p-8 md:p-24 transition-all duration-1000 relative scroll-smooth">
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:60px_60px]" />
      </div>

      <div className={`${canvasWidth} mx-auto min-h-[90vh] bg-background shadow-[0_150px_250px_-50px_rgba(0,0,0,0.8)] rounded-[4.5rem] ring-1 ring-white/[0.05] flex flex-col transition-all duration-1000 relative overflow-hidden bento-inner-glow`}>
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="canvas">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="flex-1">
                {blocks.length === 0 && (
                  <div className="flex-1 flex flex-col items-center justify-center py-72 border-2 border-dashed border-white/5 m-12 rounded-[4rem] opacity-20 hover:opacity-40 transition-all duration-1000 group">
                    <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-1000">
                      <Layout className="w-12 h-12 text-primary/40 animate-pulse" />
                    </div>
                    <p className="font-black text-2xl tracking-tighter uppercase mb-2">Protocol Ready</p>
                    <p className="text-[10px] font-black tracking-[0.4em] uppercase opacity-60">Inject Component Nodes</p>
                  </div>
                )}
                
                {blocks.map((block, index) => (
                  <Draggable key={block.id} draggableId={block.id} index={index}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`group relative border-b border-white/[0.02] last:border-b-0 transition-all duration-500 ${editingId === block.id ? 'ring-2 ring-primary/20 z-30' : ''}`}
                        style={provided.draggableProps.style as any}
                      >
                        <div className="absolute right-12 top-12 flex gap-4 opacity-0 group-hover:opacity-100 transition-all z-[60] scale-90 group-hover:scale-100 duration-500">
                          <button 
                            onClick={() => setEditingId(editingId === block.id ? null : block.id)} 
                            className={`p-4 bg-card border border-white/10 rounded-2xl hover:text-primary transition-all shadow-2xl ${editingId === block.id ? 'bg-primary text-primary-foreground border-primary' : ''}`}
                          >
                            <Settings2 className="w-6 h-6" />
                          </button>
                          <div {...provided.dragHandleProps} className="p-4 bg-card border border-white/10 rounded-2xl cursor-grab active:cursor-grabbing hover:text-primary transition-all shadow-2xl">
                            <GripVertical className="w-6 h-6" />
                          </div>
                          <button 
                            onClick={() => removeBlock(block.id)} 
                            className="p-4 bg-card border border-white/10 rounded-2xl hover:text-destructive transition-all shadow-2xl"
                          >
                            <Trash2 className="w-6 h-6" />
                          </button>
                        </div>

                        {editingId === block.id && (
                          <div className="fixed top-32 right-16 w-[420px] bg-card/80 backdrop-blur-3xl border border-white/10 rounded-[4rem] shadow-[0_80px_160px_-40px_rgba(0,0,0,0.9)] p-10 z-[70] max-h-[75vh] overflow-y-auto bento-inner-glow animate-in slide-in-from-right-10 duration-700">
                            <div className="flex items-center justify-between mb-10 pb-6 border-b border-white/5">
                              <div>
                                <h4 className="text-sm font-black uppercase tracking-[0.5em] text-primary">Synthesis Config</h4>
                                <p className="text-[9px] opacity-40 uppercase tracking-[0.3em] mt-2 font-bold">Node: {block.type}</p>
                              </div>
                              <button onClick={() => setEditingId(null)} className="p-3 hover:bg-white/5 rounded-full transition-all"><X className="w-6 h-6" /></button>
                            </div>
                            
                            <div className="space-y-10">
                              <section className="space-y-6">
                                <h5 className="text-[11px] font-black uppercase tracking-[0.3em] opacity-30 flex items-center gap-3">
                                  <Palette className="w-4 h-4" /> Chromatic Matrix
                                </h5>
                                <div className="grid grid-cols-2 gap-6">
                                  <div className="space-y-3">
                                    <label className="text-[9px] font-black uppercase tracking-[0.3em] block px-2 opacity-50">Base</label>
                                    <input type="color" value={block.styles.backgroundColor} onChange={(e) => updateBlock(block.id, { styles: { ...block.styles, backgroundColor: e.target.value } })} className="w-full h-14 rounded-2xl cursor-pointer bg-white/5 border-none shadow-inner" />
                                  </div>
                                  <div className="space-y-3">
                                    <label className="text-[9px] font-black uppercase tracking-[0.3em] block px-2 opacity-50">Typography</label>
                                    <input type="color" value={block.styles.textColor} onChange={(e) => updateBlock(block.id, { styles: { ...block.styles, textColor: e.target.value } })} className="w-full h-14 rounded-2xl cursor-pointer bg-white/5 border-none shadow-inner" />
                                  </div>
                                </div>
                              </section>

                              <section className="space-y-6">
                                <h5 className="text-[11px] font-black uppercase tracking-[0.3em] opacity-30 flex items-center gap-3">
                                  <ImageIcon className="w-4 h-4" /> Visual Layering
                                </h5>
                                <div className="space-y-4">
                                  <label className="text-[9px] font-black uppercase tracking-[0.3em] block px-2 opacity-50">Background Source (URI)</label>
                                  <input 
                                    value={block.styles.backgroundImage || ''} 
                                    onChange={(e) => updateBlock(block.id, { styles: { ...block.styles, backgroundImage: e.target.value } })} 
                                    placeholder="https://images.unsplash.com/..." 
                                    className="w-full bg-white/5 border border-white/5 rounded-3xl p-5 text-[10px] outline-none focus:ring-1 focus:ring-primary/40 transition-all font-mono"
                                  />
                                </div>
                                <div className="space-y-4">
                                  <div className="flex justify-between items-baseline px-2">
                                    <label className="text-[9px] font-black uppercase tracking-[0.3em] opacity-50">Opacity Matrix</label>
                                    <span className="text-[10px] font-mono text-primary font-bold">{Math.round((block.styles.backgroundOpacity ?? 1) * 100)}%</span>
                                  </div>
                                  <input 
                                    type="range" min="0" max="1" step="0.01" 
                                    value={block.styles.backgroundOpacity ?? 1} 
                                    onChange={(e) => updateBlock(block.id, { styles: { ...block.styles, backgroundOpacity: parseFloat(e.target.value) } })} 
                                    className="w-full accent-primary h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer"
                                  />
                                </div>
                              </section>

                              <section className="space-y-6">
                                <h5 className="text-[11px] font-black uppercase tracking-[0.3em] opacity-30 flex items-center gap-3">
                                  <Info className="w-4 h-4" /> Spatial Logic
                                </h5>
                                <div className="grid grid-cols-2 gap-6">
                                  <div className="space-y-3">
                                    <label className="text-[9px] font-black uppercase tracking-[0.3em] block px-2 opacity-50">Corner Radius</label>
                                    <select 
                                      value={block.styles.borderRadius} 
                                      onChange={(e) => updateBlock(block.id, { styles: { ...block.styles, borderRadius: e.target.value } })}
                                      className="w-full bg-white/5 border border-white/5 rounded-3xl p-5 text-[10px] outline-none font-bold uppercase tracking-widest"
                                    >
                                      <option value="0px">Absolute</option>
                                      <option value="2.5rem">Refined</option>
                                      <option value="4.5rem">Premium</option>
                                      <option value="9999px">Organic</option>
                                    </select>
                                  </div>
                                  <div className="space-y-3">
                                    <label className="text-[9px] font-black uppercase tracking-[0.3em] block px-2 opacity-50">Text Scale</label>
                                    <select 
                                      value={block.styles.fontSize} 
                                      onChange={(e) => updateBlock(block.id, { styles: { ...block.styles, fontSize: e.target.value as any } })}
                                      className="w-full bg-white/5 border border-white/5 rounded-3xl p-5 text-[10px] outline-none font-bold uppercase tracking-widest"
                                    >
                                      <option value="normal">Base</option>
                                      <option value="large">Impact</option>
                                      <option value="huge">Ultra</option>
                                    </select>
                                  </div>
                                </div>
                              </section>
                              
                              {block.type === 'header' && (
                                <section className="space-y-6 pt-6 border-t border-white/5">
                                  <h5 className="text-[11px] font-black uppercase tracking-[0.3em] opacity-30">Protocol Directives</h5>
                                  <div className="grid grid-cols-1 gap-4">
                                    <label className="flex items-center justify-between p-5 bg-white/5 rounded-3xl cursor-pointer hover:bg-white/10 transition-all border border-transparent hover:border-primary/20">
                                      <span className="text-[10px] font-black uppercase tracking-[0.3em]">Fixed Header</span>
                                      <input type="checkbox" checked={block.styles.isSticky} onChange={(e) => updateBlock(block.id, { styles: { ...block.styles, isSticky: e.target.checked } })} className="w-5 h-5 accent-primary" />
                                    </label>
                                    <label className="flex items-center justify-between p-5 bg-white/5 rounded-3xl cursor-pointer hover:bg-white/10 transition-all border border-transparent hover:border-primary/20">
                                      <span className="text-[10px] font-black uppercase tracking-[0.3em]">Overlay Mode</span>
                                      <input type="checkbox" checked={block.styles.isOverlay} onChange={(e) => updateBlock(block.id, { styles: { ...block.styles, isOverlay: e.target.checked } })} className="w-5 h-5 accent-primary" />
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
                          onStartDrag={() => {}}
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
