'use client';

import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useBuilderStore, PageBlock, BlockContent, FontFamily } from '@/lib/builder-store';
import { Trash2, GripVertical, Settings2, Palette, X, Move, RotateCcw, Sparkles, Image as ImageIcon, Type, Plus, MousePointer2, ExternalLink, Anchor, Zap, Terminal, Database, Wrench, Hash, List, MessageSquare } from 'lucide-react';
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
      className="absolute -left-10 top-1/2 -translate-y-1/2 opacity-0 group-hover/el:opacity-100 p-2 bg-primary text-primary-foreground rounded-full shadow-xl z-30 cursor-move transition-all hover:scale-110"
    >
      <Move className="w-3.5 h-3.5" />
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
      <div className="p-6 w-full" style={containerStyles}>
        <div className="flex items-center gap-3 mb-4 opacity-50">
          {type === 'system-prompt' && <Terminal className="w-4 h-4" />}
          {type === 'knowledge' && <Database className="w-4 h-4" />}
          {type === 'tools' && <Wrench className="w-4 h-4" />}
          {type === 'command' && <Hash className="w-4 h-4" />}
          {type === 'menu' && <List className="w-4 h-4" />}
          {type === 'reply' && <MessageSquare className="w-4 h-4" />}
          <span className="text-[10px] uppercase font-bold tracking-widest">{type.replace('-', ' ')}</span>
        </div>

        {type === 'system-prompt' && (
          <textarea 
            value={content.systemPrompt}
            onChange={(e) => onUpdate({ systemPrompt: e.target.value })}
            className="w-full h-40 bg-black/20 p-4 font-mono text-sm border border-white/10 rounded-xl outline-none focus:ring-1 focus:ring-primary/50 resize-none"
            placeholder="Define the behavior of your agent..."
          />
        )}

        {type === 'knowledge' && (
          <div className="space-y-2">
            <h3 className="font-bold mb-2">{content.title}</h3>
            {content.knowledgeSources?.map((source, i) => (
              <div key={i} className="flex items-center gap-2 p-3 bg-white/5 border rounded-lg text-xs">
                <ExternalLink className="w-3 h-3 opacity-50" /> {source}
              </div>
            ))}
            <button className="text-[10px] text-primary font-bold mt-2">+ Add Source</button>
          </div>
        )}

        {type === 'tools' && (
          <div className="space-y-3">
             {content.tools?.map((tool, i) => (
               <div key={i} className="p-4 bg-white/5 border rounded-xl">
                 <div className="font-bold text-sm mb-1">{tool.name}</div>
                 <div className="text-[10px] opacity-60 mb-2">{tool.description}</div>
                 <div className="text-[10px] font-mono text-primary">{tool.endpoint}</div>
               </div>
             ))}
          </div>
        )}

        {type === 'command' && (
          <div className="flex flex-col gap-3">
            <input 
              value={content.commandName} 
              onChange={(e) => onUpdate({ commandName: e.target.value })} 
              className="bg-primary/10 text-primary border border-primary/20 p-2 rounded-lg font-mono text-sm outline-none" 
            />
            <textarea 
              value={content.description} 
              onChange={(e) => onUpdate({ description: e.target.value })} 
              className="bg-white/5 border p-3 rounded-lg text-xs outline-none" 
              placeholder="What should happen when this command is called?"
            />
          </div>
        )}

        {type === 'menu' && (
          <div className="space-y-2">
            <h3 className="font-bold text-sm">{content.title}</h3>
            <div className="grid grid-cols-2 gap-2">
              {content.links?.map((link, i) => (
                <div key={i} className="p-3 bg-white/5 border rounded-xl text-center text-xs font-bold">
                  {link.label}
                </div>
              ))}
            </div>
          </div>
        )}

        {type === 'reply' && (
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl">
            <div className="text-[10px] text-primary font-bold mb-2 uppercase">Bot Response</div>
            <textarea 
              value={content.description} 
              onChange={(e) => onUpdate({ description: e.target.value })}
              className="w-full bg-transparent border-none outline-none text-sm resize-none"
              rows={3}
            />
          </div>
        )}
      </div>
    );
  }

  // --- RENDERING LANDING BLOCKS ---
  return (
    <div 
      className={`relative flex flex-col justify-center transition-all duration-300 w-full overflow-visible ${type === 'header' && styles.isOverlay ? 'absolute top-0 left-0 z-40' : ''} ${type === 'header' && styles.isSticky ? 'sticky top-0 z-50 shadow-lg' : ''}`} 
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
          <div className="max-w-6xl mx-auto px-6 flex items-center justify-between w-full min-h-[4rem]">
             <div className="flex items-center gap-3">
                {content.logoUrl ? (
                  <img src={content.logoUrl} alt="Logo" className="h-10 w-auto object-contain" />
                ) : (
                  <input 
                    value={content.title} 
                    onChange={(e) => onUpdate({ title: e.target.value })} 
                    className="bg-transparent border-none font-black text-2xl outline-none tracking-tighter"
                    style={baseStyle}
                  />
                )}
             </div>
             <nav className="hidden md:flex items-center gap-6">
               {(content.links || []).map((link, idx) => (
                 <a key={idx} href={link.url} className="text-sm font-bold opacity-80 hover:opacity-100 transition-opacity" style={baseStyle}>
                   {link.label}
                 </a>
               ))}
             </nav>
          </div>
        )}

        {(['hero', 'features', 'pricing', 'contacts', 'faq', 'testimonials', 'gallery'].includes(type)) && (
          <div className="max-w-4xl mx-auto px-6 text-center space-y-8 flex flex-col items-center py-10 w-full">
            <div className="relative group/el inline-block w-full">
              {renderDragHandle('title')}
              <textarea 
                value={content.title} 
                onChange={(e) => onUpdate({ title: e.target.value })}
                className={`bg-transparent border-none font-black text-center w-full outline-none resize-none overflow-hidden leading-tight ${styles.fontSize === 'huge' ? 'text-7xl' : styles.fontSize === 'large' ? 'text-5xl' : 'text-4xl'}`}
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
                  className="bg-transparent border-none text-lg text-center w-full outline-none resize-none overflow-hidden opacity-90 leading-relaxed"
                  style={baseStyle}
                  rows={2}
                />
              </div>
            )}

            {type === 'faq' && content.faq && (
              <div className="w-full space-y-4 text-left">
                {content.faq.map((item, i) => (
                  <div key={i} className="p-4 border rounded-2xl bg-white/5">
                    <div className="font-bold mb-1">{item.question}</div>
                    <div className="text-sm opacity-60">{item.answer}</div>
                  </div>
                ))}
              </div>
            )}

            {type === 'testimonials' && content.testimonials && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                {content.testimonials.map((t, i) => (
                  <div key={i} className="p-6 bg-white/5 border rounded-3xl text-left space-y-4">
                    <p className="italic text-sm">"{t.text}"</p>
                    <div className="flex items-center gap-3">
                      <img src={t.avatar} className="w-10 h-10 rounded-full" alt={t.name} />
                      <div>
                        <div className="font-bold text-xs">{t.name}</div>
                        <div className="text-[10px] opacity-50">{t.role}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {type === 'gallery' && content.gallery && (
              <div className="grid grid-cols-2 gap-4 w-full">
                {content.gallery.map((img, i) => (
                  <img key={i} src={img} className="rounded-2xl w-full aspect-video object-cover" />
                ))}
              </div>
            )}

            {content.buttonText !== undefined && (
              <div className="relative group/el inline-block mt-4">
                {renderDragHandle('btn')}
                <input 
                  value={content.buttonText} 
                  onChange={(e) => onUpdate({ buttonText: e.target.value })}
                  className="px-12 py-5 font-bold text-center outline-none shadow-2xl transition-all hover:scale-105 active:scale-95"
                  style={{
                    backgroundColor: styles.buttonBgColor,
                    color: styles.buttonTextColor,
                    borderRadius: styles.buttonRadius === 'full' ? '9999px' : '0.75rem',
                    fontFamily: FONT_MAP[styles.buttonFontFamily]
                  }}
                />
              </div>
            )}
          </div>
        )}

        {type === 'footer' && (
          <div className="max-w-6xl mx-auto px-6 text-center py-12 w-full">
            <input 
              value={content.title} 
              onChange={(e) => onUpdate({ title: e.target.value })} 
              className="bg-transparent border-none text-xs font-bold uppercase tracking-[0.3em] opacity-70 outline-none w-full text-center"
              style={baseStyle}
            />
            <p className="text-[10px] opacity-40 mt-4 uppercase tracking-widest">&copy; {new Date().getFullYear()} Built with Web3 Builder</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function BuilderCanvas() {
  const { blocks, mode, viewport, reorderBlocks, removeBlock, updateBlock } = useBuilderStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'visual' | 'typo' | 'buttons' | 'nav'>('visual');
  const { toast } = useToast();

  const canvasWidth = {
    desktop: 'max-w-6xl',
    tablet: 'max-w-2xl',
    mobile: 'max-w-[375px]'
  }[viewport];

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    reorderBlocks(result.source.index, result.destination.index);
  };

  const startPositionDrag = (e: React.MouseEvent, block: PageBlock, type: ElementType) => {
    // Handle responsive positioning if needed
  };

  return (
    <div className="flex-1 bg-muted/20 overflow-y-auto p-4 md:p-12 transition-all duration-500">
      <div className={`${canvasWidth} mx-auto min-h-[90vh] bg-card shadow-2xl rounded-sm ring-1 ring-black/5 flex flex-col transition-all duration-500 relative ${mode !== 'landing' ? 'dark' : ''}`}>
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="canvas">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="flex-1">
                {blocks.length === 0 && (
                  <div className="flex-1 flex flex-col items-center justify-center py-40 border-2 border-dashed m-4 rounded-3xl opacity-30">
                    <MousePointer2 className="w-8 h-8 animate-bounce" />
                    <p className="font-bold text-lg mt-4">Canvas Ready</p>
                    <p className="text-sm">Select a block to start</p>
                  </div>
                )}
                
                {blocks.map((block, index) => (
                  <Draggable key={block.id} draggableId={block.id} index={index}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className="group relative border-b last:border-b-0"
                        style={provided.draggableProps.style as any}
                      >
                        <div className="absolute right-4 top-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all z-[60]">
                          <button onClick={() => setEditingId(editingId === block.id ? null : block.id)} className="p-2 bg-card border rounded-xl hover:text-primary"><Settings2 className="w-4 h-4" /></button>
                          <div {...provided.dragHandleProps} className="p-2 bg-card border rounded-xl cursor-grab"><GripVertical className="w-4 h-4" /></div>
                          <button onClick={() => removeBlock(block.id)} className="p-2 bg-card border rounded-xl hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                        </div>

                        {editingId === block.id && (
                          <div className="fixed top-24 right-8 w-80 bg-card border rounded-[2rem] shadow-2xl p-5 z-[70] max-h-[75vh] overflow-y-auto">
                            <div className="flex items-center justify-between mb-4 pb-2 border-b">
                              <h4 className="text-xs font-bold uppercase tracking-widest">Settings</h4>
                              <X className="w-4 h-4 cursor-pointer" onClick={() => setEditingId(null)} />
                            </div>
                            {/* Standard Settings Tabs - Simplified for this fix */}
                            <div className="space-y-4">
                              <div>
                                <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-2">Background Color</label>
                                <input type="color" value={block.styles.backgroundColor} onChange={(e) => updateBlock(block.id, { styles: { ...block.styles, backgroundColor: e.target.value } })} className="w-full h-10 rounded-xl" />
                              </div>
                              <div>
                                <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-2">Text Color</label>
                                <input type="color" value={block.styles.textColor} onChange={(e) => updateBlock(block.id, { styles: { ...block.styles, textColor: e.target.value } })} className="w-full h-10 rounded-xl" />
                              </div>
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
