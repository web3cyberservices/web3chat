'use client';

import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useBuilderStore, PageBlock, BlockContent, FontFamily } from '@/lib/builder-store';
import { Trash2, GripVertical, Settings2, Palette, X, Move, RotateCcw, Sparkles, Image as ImageIcon, Type, Plus, MousePointer2 } from 'lucide-react';
import { generateBlockContent } from '@/ai/flows/block-generator-flow';
import { useToast } from '@/hooks/use-toast';

type ElementType = 'title' | 'desc' | 'btn' | 'block';

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

function BlockContentComponent({ block, onUpdate, onStartDrag }: { 
  block: PageBlock; 
  onUpdate: (content: Partial<BlockContent>) => void;
  onStartDrag: (e: React.MouseEvent, block: PageBlock, type: ElementType) => void;
}) {
  const { styles, content, type } = block;

  const titleStyle = {
    color: styles.textColor,
    transform: `translate(${styles.titleX || 0}px, ${styles.titleY || 0}px)`,
    transition: 'none',
    cursor: 'text',
    fontFamily: FONT_MAP[styles.fontFamily]
  };

  const descStyle = {
    color: styles.textColor,
    transform: `translate(${styles.descX || 0}px, ${styles.descY || 0}px)`,
    transition: 'none',
    cursor: 'text',
    fontFamily: FONT_MAP[styles.fontFamily]
  };

  const btnStyle = {
    backgroundColor: styles.buttonBgColor,
    color: styles.buttonTextColor,
    borderRadius: styles.buttonRadius === 'full' ? '9999px' : styles.buttonRadius === 'md' ? '0.75rem' : '0',
    transform: `translate(${styles.btnX || 0}px, ${styles.btnY || 0}px)`,
    transition: 'none',
    fontFamily: FONT_MAP[styles.buttonFontFamily || styles.fontFamily]
  };

  const contentGroupStyle = {
    transform: `translate(${styles.translateX || 0}px, ${styles.translateY || 0}px)`,
  };

  const renderDragHandle = (type: ElementType) => (
    <button 
      onMouseDown={(e) => onStartDrag(e, block, type)} 
      className="absolute -left-10 top-1/2 -translate-y-1/2 opacity-0 group-hover/el:opacity-100 p-2 bg-primary text-primary-foreground rounded-full shadow-xl z-30 cursor-move transition-all hover:scale-110"
      title="Move Element"
    >
      <Move className="w-3.5 h-3.5" />
    </button>
  );

  return (
    <div 
      className={`relative ${styles.padding} overflow-hidden flex flex-col justify-center transition-all duration-300 w-full min-h-[4rem]`} 
      style={{ 
        minHeight: styles.minHeight || (type === 'header' ? '5rem' : 'auto'),
        borderRadius: styles.borderRadius || '0px'
      }}
    >
      {/* Background Layers */}
      <div 
        className="absolute inset-0 -z-10" 
        style={{ 
          backgroundColor: styles.backgroundColor, 
          opacity: styles.backgroundOpacity ?? 1,
          borderRadius: styles.borderRadius || '0px'
        }} 
      />

      {styles.backgroundImage && (
        <div 
          className="absolute inset-0 -z-20 bg-cover bg-center" 
          style={{ 
            backgroundImage: `url(${styles.backgroundImage})`,
            borderRadius: styles.borderRadius || '0px'
          }} 
        />
      )}

      {styles.backgroundImage && (
        <div 
          className="absolute inset-0 -z-10 bg-black" 
          style={{ 
            opacity: styles.overlayOpacity || 0.4,
            borderRadius: styles.borderRadius || '0px'
          }} 
        />
      )}
      
      <div className="relative z-10 w-full h-full flex items-center" style={contentGroupStyle}>
        {type === 'header' && (
          <div className="max-w-6xl mx-auto px-6 flex items-center justify-between w-full">
             <div className="relative group/el flex items-center gap-3">
                {renderDragHandle('title')}
                {content.logoUrl ? (
                  <img src={content.logoUrl} alt="Logo" className="h-10 w-auto object-contain transition-transform" style={titleStyle} />
                ) : (
                  <input 
                    value={content.title} 
                    onChange={(e) => onUpdate({ title: e.target.value })} 
                    placeholder="Brand Name"
                    className="bg-transparent border-none font-black text-2xl outline-none tracking-tighter hover:ring-1 hover:ring-primary/30 rounded px-2 transition-all"
                    style={titleStyle}
                  />
                )}
             </div>
             <nav className="hidden md:flex items-center gap-6">
               {content.links?.map((link, idx) => (
                 <a 
                   key={idx} 
                   href={link.url} 
                   className="text-sm font-bold opacity-80 hover:opacity-100 transition-opacity border-b border-transparent hover:border-current" 
                   style={{ fontFamily: FONT_MAP[styles.fontFamily], color: styles.textColor }}
                 >
                   {link.label}
                 </a>
               ))}
             </nav>
          </div>
        )}

        {(['hero', 'features', 'pricing', 'contacts'].includes(type)) && (
          <div className="max-w-4xl mx-auto px-6 text-center space-y-8 flex flex-col items-center py-10 w-full">
            <div className="relative group/el inline-block w-full">
              {renderDragHandle('title')}
              <textarea 
                value={content.title} 
                onChange={(e) => onUpdate({ title: e.target.value })}
                className={`bg-transparent border-none font-black text-center w-full outline-none resize-none overflow-hidden leading-tight transition-all focus:ring-1 focus:ring-primary/30 rounded ${styles.fontSize === 'huge' ? 'text-7xl' : styles.fontSize === 'large' ? 'text-5xl' : 'text-4xl'}`}
                style={titleStyle}
                rows={1}
              />
            </div>

            <div className="relative group/el inline-block w-full">
              {renderDragHandle('desc')}
              <textarea 
                value={content.description} 
                onChange={(e) => onUpdate({ description: e.target.value })}
                className="bg-transparent border-none text-lg text-center w-full outline-none resize-none overflow-hidden opacity-90 leading-relaxed focus:ring-1 focus:ring-primary/30 rounded"
                style={descStyle}
                rows={2}
              />
            </div>

            {content.buttonText !== undefined && (
              <div className="relative group/el inline-block mt-4">
                {renderDragHandle('btn')}
                <input 
                  value={content.buttonText} 
                  onChange={(e) => onUpdate({ buttonText: e.target.value })}
                  className="px-12 py-5 font-bold text-center outline-none shadow-2xl cursor-text transition-all hover:scale-105 active:scale-95 border-none"
                  style={btnStyle}
                />
              </div>
            )}
          </div>
        )}

        {type === 'footer' && (
          <div className="max-w-6xl mx-auto px-6 text-center py-12 w-full">
            <div className="relative group/el inline-block w-full">
              {renderDragHandle('title')}
              <input 
                value={content.title} 
                onChange={(e) => onUpdate({ title: e.target.value })} 
                className="bg-transparent border-none text-xs font-bold uppercase tracking-[0.3em] opacity-70 outline-none w-full text-center"
                style={titleStyle}
              />
            </div>
            <p className="text-[10px] opacity-40 mt-4 uppercase tracking-widest" style={{ color: styles.textColor }}>&copy; {new Date().getFullYear()} Built with Web3 Cyber Builder</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function BuilderCanvas() {
  const { blocks, mode, viewport, reorderBlocks, removeBlock, updateBlock } = useBuilderStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'visual' | 'typo' | 'buttons' | 'nav'>('visual');
  const { toast } = useToast();

  const [dragging, setDragging] = useState<{ 
    id: string; 
    type: ElementType;
    startX: number; 
    startY: number; 
    initialX: number; 
    initialY: number;
  } | null>(null);

  const canvasWidth = {
    desktop: 'max-w-6xl',
    tablet: 'max-w-2xl',
    mobile: 'max-w-[375px]'
  }[viewport];

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    reorderBlocks(result.source.index, result.destination.index);
  };

  const handleAIGenerate = async (block: PageBlock) => {
    setIsGenerating(block.id);
    try {
      const result = await generateBlockContent({ 
        type: block.type, 
        context: "Modern Web3 Decentralized Services" 
      });
      updateBlock(block.id, { 
        content: { 
          ...block.content, 
          title: result.title, 
          description: result.description,
          buttonText: result.buttonText || block.content.buttonText
        } 
      });
      toast({ title: "AI Generation Success", description: "Content has been updated." });
    } catch (e) {
      toast({ title: "AI Error", description: "Failed to generate content.", variant: "destructive" });
    } finally {
      setIsGenerating(null);
    }
  };

  const startPositionDrag = (e: React.MouseEvent, block: PageBlock, type: ElementType) => {
    e.preventDefault();
    e.stopPropagation();
    
    let initialX = 0;
    let initialY = 0;

    if (type === 'title') { initialX = block.styles.titleX || 0; initialY = block.styles.titleY || 0; }
    else if (type === 'desc') { initialX = block.styles.descX || 0; initialY = block.styles.descY || 0; }
    else if (type === 'btn') { initialX = block.styles.btnX || 0; initialY = block.styles.btnY || 0; }
    else { initialX = block.styles.translateX || 0; initialY = block.styles.translateY || 0; }

    setDragging({
      id: block.id,
      type,
      startX: e.clientX,
      startY: e.clientY,
      initialX,
      initialY
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragging) return;

      const dx = e.clientX - dragging.startX;
      const dy = e.clientY - dragging.startY;
      const currentBlock = blocks.find(b => b.id === dragging.id);
      if (!currentBlock) return;

      const updates: any = { styles: { ...currentBlock.styles } };
      
      if (dragging.type === 'title') {
        updates.styles.titleX = dragging.initialX + dx;
        updates.styles.titleY = dragging.initialY + dy;
      } else if (dragging.type === 'desc') {
        updates.styles.descX = dragging.initialX + dx;
        updates.styles.descY = dragging.initialY + dy;
      } else if (dragging.type === 'btn') {
        updates.styles.btnX = dragging.initialX + dx;
        updates.styles.btnY = dragging.initialY + dy;
      } else {
        updates.styles.translateX = dragging.initialX + dx;
        updates.styles.translateY = dragging.initialY + dy;
      }

      updateBlock(dragging.id, updates);
    };

    const handleMouseUp = () => {
      setDragging(null);
    };

    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.userSelect = 'auto';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, blocks, updateBlock]);

  return (
    <div className="flex-1 bg-muted/20 overflow-y-auto p-4 md:p-12 relative transition-all duration-500">
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=Playfair+Display:wght@700&family=JetBrains+Mono&family=Montserrat:wght@400;700;900&family=Oswald:wght@400;700&family=Merriweather:wght@400;700&family=Bebas+Neue&family=Dancing+Script:wght@700&display=swap" rel="stylesheet" />
      
      <div className={`${canvasWidth} mx-auto min-h-[90vh] bg-white shadow-2xl rounded-sm ring-1 ring-black/5 flex flex-col transition-all duration-500 overflow-hidden ${mode !== 'landing' ? 'dark bg-slate-900 border border-white/10' : ''}`}>
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="canvas">
            {(provided) => (
              <div 
                {...provided.droppableProps} 
                ref={provided.innerRef} 
                className="flex-1"
              >
                {blocks.length === 0 && (
                  <div className="flex-1 flex flex-col items-center justify-center py-40 border-2 border-dashed border-muted/50 m-4 rounded-3xl bg-muted/5">
                    <div className="p-4 bg-primary/10 rounded-full mb-4">
                      <MousePointer2 className="w-8 h-8 text-primary animate-bounce" />
                    </div>
                    <p className="text-muted-foreground font-bold text-lg">Your Canvas is Ready</p>
                    <p className="text-sm text-muted-foreground/60">Choose a block from the sidebar to start building.</p>
                  </div>
                )}
                
                {blocks.map((block, index) => (
                  <Draggable key={block.id} draggableId={block.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`group relative border-b last:border-b-0 border-slate-100 dark:border-slate-800 transition-all ${snapshot.isDragging ? 'shadow-2xl z-50 ring-2 ring-primary scale-[1.01]' : ''}`}
                        style={provided.draggableProps.style as any}
                      >
                        {/* Editor Controls Overlay */}
                        <div className="absolute right-4 top-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all z-20">
                          <button 
                            onClick={() => handleAIGenerate(block)}
                            disabled={isGenerating === block.id}
                            className={`p-2 bg-card shadow-lg border rounded-xl hover:text-primary transition-all active:scale-95 ${isGenerating === block.id ? 'animate-pulse text-primary' : ''}`}
                            title="AI Generate Content"
                          >
                            <Sparkles className="w-4 h-4" />
                          </button>
                          <button 
                            onMouseDown={(e) => startPositionDrag(e, block, 'block')}
                            className="p-2 bg-card shadow-lg border rounded-xl cursor-move hover:text-primary transition-all active:scale-95"
                            title="Move Block Container"
                          >
                            <Move className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => {
                              setEditingId(editingId === block.id ? null : block.id);
                              if (block.type === 'header') setActiveTab('nav');
                              else setActiveTab('visual');
                            }}
                            className={`p-2 bg-card shadow-lg border rounded-xl hover:text-primary transition-all active:scale-95 ${editingId === block.id ? 'text-primary ring-1 ring-primary' : ''}`}
                          >
                            <Settings2 className="w-4 h-4" />
                          </button>
                          <div {...provided.dragHandleProps} className="p-2 bg-card shadow-lg border rounded-xl cursor-grab active:cursor-grabbing hover:bg-muted transition-colors">
                            <GripVertical className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <button onClick={() => removeBlock(block.id)} className="p-2 bg-card shadow-lg border rounded-xl hover:text-destructive hover:bg-destructive/5 transition-all active:scale-95">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Block Border for visibility during editing */}
                        <div className="absolute inset-0 border border-dashed border-primary/5 pointer-events-none group-hover:border-primary/20 transition-colors" />

                        {editingId === block.id && (
                          <div className="absolute right-4 top-16 w-80 bg-card/95 backdrop-blur-xl border rounded-[2rem] shadow-2xl p-0 z-50 max-h-[75vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="flex items-center justify-between p-5 border-b bg-muted/30">
                              <h4 className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                                <Palette className="w-3 h-3 text-primary" /> Block Settings
                              </h4>
                              <X className="w-4 h-4 cursor-pointer hover:rotate-90 transition-transform" onClick={() => setEditingId(null)} />
                            </div>

                            <div className="flex border-b bg-muted/20 overflow-x-auto scrollbar-hide">
                              {block.type === 'header' && (
                                <button onClick={() => setActiveTab('nav')} className={`flex-1 py-3 px-4 text-[9px] font-bold uppercase border-b-2 transition-all whitespace-nowrap ${activeTab === 'nav' ? 'border-primary text-primary bg-primary/5' : 'border-transparent opacity-50 hover:opacity-100'}`}>Navigation</button>
                              )}
                              <button onClick={() => setActiveTab('visual')} className={`flex-1 py-3 px-4 text-[9px] font-bold uppercase border-b-2 transition-all whitespace-nowrap ${activeTab === 'visual' ? 'border-primary text-primary bg-primary/5' : 'border-transparent opacity-50 hover:opacity-100'}`}>Visual</button>
                              <button onClick={() => setActiveTab('typo')} className={`flex-1 py-3 px-4 text-[9px] font-bold uppercase border-b-2 transition-all whitespace-nowrap ${activeTab === 'typo' ? 'border-primary text-primary bg-primary/5' : 'border-transparent opacity-50 hover:opacity-100'}`}>Text</button>
                              <button onClick={() => setActiveTab('buttons')} className={`flex-1 py-3 px-4 text-[9px] font-bold uppercase border-b-2 transition-all whitespace-nowrap ${activeTab === 'buttons' ? 'border-primary text-primary bg-primary/5' : 'border-transparent opacity-50 hover:opacity-100'}`}>Buttons</button>
                            </div>
                            
                            <div className="p-5 overflow-y-auto space-y-6">
                              {activeTab === 'nav' && block.type === 'header' && (
                                <div className="space-y-4">
                                  <label className="text-[10px] uppercase font-bold text-muted-foreground block">Links</label>
                                  <div className="space-y-2">
                                    {(block.content.links || []).map((link, lidx) => (
                                      <div key={lidx} className="flex flex-col gap-2 p-4 bg-secondary/30 rounded-2xl border border-border/50 group/link">
                                        <div className="flex items-center justify-between">
                                          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Link {lidx + 1}</span>
                                          <button 
                                            onClick={() => {
                                              const newLinks = [...(block.content.links || [])];
                                              newLinks.splice(lidx, 1);
                                              updateBlock(block.id, { content: { ...block.content, links: newLinks } });
                                            }}
                                            className="text-destructive hover:scale-125 transition-transform"
                                          >
                                            <X className="w-3 h-3" />
                                          </button>
                                        </div>
                                        <input 
                                          value={link.label} 
                                          onChange={(e) => {
                                            const newLinks = [...(block.content.links || [])];
                                            newLinks[lidx].label = e.target.value;
                                            updateBlock(block.id, { content: { ...block.content, links: newLinks } });
                                          }} 
                                          placeholder="Label (e.g. About)"
                                          className="bg-background border rounded-lg p-2 text-xs outline-none focus:ring-1 focus:ring-primary/50"
                                        />
                                        <input 
                                          value={link.url} 
                                          onChange={(e) => {
                                            const newLinks = [...(block.content.links || [])];
                                            newLinks[lidx].url = e.target.value;
                                            updateBlock(block.id, { content: { ...block.content, links: newLinks } });
                                          }} 
                                          placeholder="URL (e.g. #features)"
                                          className="bg-background border rounded-lg p-2 text-xs outline-none font-mono focus:ring-1 focus:ring-primary/50"
                                        />
                                      </div>
                                    ))}
                                    <button 
                                      onClick={() => {
                                        const newLinks = [...(block.content.links || []), { label: 'New Link', url: '#' }];
                                        updateBlock(block.id, { content: { ...block.content, links: newLinks } });
                                      }}
                                      className="w-full py-3 border border-dashed rounded-2xl flex items-center justify-center gap-2 text-[10px] font-bold hover:bg-primary/5 hover:border-primary transition-all group"
                                    >
                                      <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" /> Add Menu Item
                                    </button>
                                  </div>
                                </div>
                              )}

                              {activeTab === 'visual' && (
                                <>
                                  <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold text-muted-foreground block">Block Height</label>
                                    <div className="grid grid-cols-4 gap-1">
                                      {['auto', '50vh', '75vh', '100vh'].map((h) => (
                                        <button 
                                          key={h}
                                          onClick={() => updateBlock(block.id, { styles: { ...block.styles, minHeight: h } })}
                                          className={`p-2 rounded-lg text-[9px] border transition-all ${block.styles.minHeight === h ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary/30 border-transparent hover:bg-secondary/50'}`}
                                        >
                                          {h === 'auto' ? 'Auto' : h.replace('vh', '%')}
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold text-muted-foreground block">Block Radius</label>
                                    <div className="grid grid-cols-4 gap-1">
                                      {[
                                        { label: 'None', val: '0px' },
                                        { label: 'Small', val: '12px' },
                                        { label: 'Large', val: '40px' },
                                        { label: 'Full', val: '9999px' }
                                      ].map((r) => (
                                        <button 
                                          key={r.val}
                                          onClick={() => updateBlock(block.id, { styles: { ...block.styles, borderRadius: r.val } })}
                                          className={`p-2 rounded-lg text-[9px] border transition-all ${block.styles.borderRadius === r.val ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary/30 border-transparent hover:bg-secondary/50'}`}
                                        >
                                          {r.label}
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  {block.type === 'header' && (
                                    <div className="space-y-2">
                                      <label className="text-[10px] uppercase font-bold text-muted-foreground block">Logo URL (Optional)</label>
                                      <div className="flex gap-2">
                                        <input 
                                          value={block.content.logoUrl || ''} 
                                          onChange={(e) => updateBlock(block.id, { content: { ...block.content, logoUrl: e.target.value } })} 
                                          placeholder="https://example.com/logo.png"
                                          className="flex-1 bg-background border rounded-xl p-2.5 text-[10px] outline-none"
                                        />
                                        {block.content.logoUrl && (
                                          <button onClick={() => updateBlock(block.id, { content: { ...block.content, logoUrl: '' } })} className="p-2 border rounded-xl hover:text-destructive"><X className="w-4 h-4" /></button>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <span className="text-[9px] text-muted-foreground mb-1 block font-bold">Background</span>
                                      <input type="color" value={block.styles.backgroundColor} onChange={(e) => updateBlock(block.id, { styles: { ...block.styles, backgroundColor: e.target.value } })} className="w-full h-10 rounded-xl cursor-pointer bg-transparent border p-1" />
                                    </div>
                                    <div>
                                      <span className="text-[9px] text-muted-foreground mb-1 block font-bold">Text Color</span>
                                      <input type="color" value={block.styles.textColor} onChange={(e) => updateBlock(block.id, { styles: { ...block.styles, textColor: e.target.value } })} className="w-full h-10 rounded-xl cursor-pointer bg-transparent border p-1" />
                                    </div>
                                  </div>

                                  <div>
                                    <span className="text-[9px] text-muted-foreground mt-2 mb-1 block uppercase font-bold">Background Opacity: {Math.round((block.styles.backgroundOpacity ?? 1) * 100)}%</span>
                                    <input type="range" min="0" max="1" step="0.05" value={block.styles.backgroundOpacity ?? 1} onChange={(e) => updateBlock(block.id, { styles: { ...block.styles, backgroundOpacity: parseFloat(e.target.value) } })} className="w-full accent-primary h-1.5 bg-muted rounded-full" />
                                  </div>
                                  
                                  <div className="pt-2 border-t mt-4">
                                    <span className="text-[9px] text-muted-foreground mb-2 block font-bold uppercase tracking-wider">Background Image</span>
                                    <div className="space-y-3">
                                      <div className="flex gap-2">
                                        <input 
                                          value={block.styles.backgroundImage || ''} 
                                          onChange={(e) => updateBlock(block.id, { styles: { ...block.styles, backgroundImage: e.target.value } })} 
                                          placeholder="https://picsum.photos/seed/..."
                                          className="flex-1 bg-background border rounded-xl p-2.5 text-[10px] outline-none"
                                        />
                                        <div className="p-2.5 border rounded-xl bg-muted/50"><ImageIcon className="w-4 h-4 text-muted-foreground" /></div>
                                      </div>
                                      {block.styles.backgroundImage && (
                                        <>
                                          <span className="text-[9px] text-muted-foreground mb-1 block uppercase font-bold">Image Overlay: {Math.round((block.styles.overlayOpacity || 0) * 100)}%</span>
                                          <input type="range" min="0" max="1" step="0.1" value={block.styles.overlayOpacity || 0} onChange={(e) => updateBlock(block.id, { styles: { ...block.styles, overlayOpacity: parseFloat(e.target.value) } })} className="w-full accent-primary h-1.5 bg-muted rounded-full" />
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </>
                              )}

                              {activeTab === 'typo' && (
                                <div className="space-y-4">
                                  <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold text-muted-foreground block flex items-center gap-1"><Type className="w-3 h-3" /> Font Family</label>
                                    <div className="grid grid-cols-2 gap-1.5">
                                      {(['inter', 'serif', 'mono', 'montserrat', 'oswald', 'merriweather', 'bebas', 'dancing'] as const).map((f) => (
                                        <button 
                                          key={f} 
                                          onClick={() => updateBlock(block.id, { styles: { ...block.styles, fontFamily: f as any } })} 
                                          className={`p-2.5 rounded-xl border capitalize transition-all ${block.styles.fontFamily === f ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20' : 'bg-secondary/30 hover:bg-secondary/50 border-transparent'}`}
                                          style={{ fontFamily: FONT_MAP[f as any] }}
                                        >
                                          {f}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                  
                                  <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold text-muted-foreground block">Font Size</label>
                                    <div className="grid grid-cols-3 gap-1.5">
                                      {(['normal', 'large', 'huge'] as const).map((s) => (
                                        <button key={s} onClick={() => updateBlock(block.id, { styles: { ...block.styles, fontSize: s } })} className={`p-2.5 rounded-xl border capitalize transition-all ${block.styles.fontSize === s ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20' : 'bg-secondary/30 hover:bg-secondary/50 border-transparent'}`}>{s}</button>
                                      ))}
                                    </div>
                                  </div>

                                  <div className="space-y-2 pt-4 border-t">
                                    <label className="text-[10px] uppercase font-bold text-muted-foreground block">Layout Reset</label>
                                    <button onClick={() => updateBlock(block.id, { styles: { ...block.styles, translateX: 0, translateY: 0, titleX: 0, titleY: 0, descX: 0, descY: 0, btnX: 0, btnY: 0 } })} className="flex items-center justify-between w-full bg-destructive/10 p-3 rounded-xl text-[10px] hover:bg-destructive/20 text-destructive font-bold transition-all group">
                                      <span>Reset Element Positions</span> <RotateCcw className="w-3.5 h-3.5 group-hover:rotate-[-180deg] transition-transform duration-500" />
                                    </button>
                                  </div>
                                </div>
                              )}

                              {activeTab === 'buttons' && (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <span className="text-[9px] text-muted-foreground mb-1 block font-bold">Button BG</span>
                                      <input type="color" value={block.styles.buttonBgColor} onChange={(e) => updateBlock(block.id, { styles: { ...block.styles, buttonBgColor: e.target.value } })} className="w-full h-10 rounded-xl cursor-pointer bg-transparent border p-1" />
                                    </div>
                                    <div>
                                      <span className="text-[9px] text-muted-foreground mb-1 block font-bold">Button Text</span>
                                      <input type="color" value={block.styles.buttonTextColor} onChange={(e) => updateBlock(block.id, { styles: { ...block.styles, buttonTextColor: e.target.value } })} className="w-full h-10 rounded-xl cursor-pointer bg-transparent border p-1" />
                                    </div>
                                  </div>
                                  
                                  <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold text-muted-foreground block">Button Font</label>
                                    <div className="grid grid-cols-2 gap-1.5">
                                      {(['inter', 'serif', 'mono', 'montserrat', 'oswald', 'merriweather', 'bebas', 'dancing'] as const).map((f) => (
                                        <button 
                                          key={f} 
                                          onClick={() => updateBlock(block.id, { styles: { ...block.styles, buttonFontFamily: f as any } })} 
                                          className={`p-2.5 rounded-xl border capitalize transition-all ${block.styles.buttonFontFamily === f ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20' : 'bg-secondary/30 hover:bg-secondary/50 border-transparent'}`}
                                          style={{ fontFamily: FONT_MAP[f as any] }}
                                        >
                                          {f}
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold text-muted-foreground block">Button Radius</label>
                                    <div className="grid grid-cols-3 gap-1.5">
                                      {(['none', 'md', 'full'] as const).map((r) => (
                                        <button key={r} onClick={() => updateBlock(block.id, { styles: { ...block.styles, buttonRadius: r } })} className={`p-2.5 rounded-xl border capitalize transition-all ${block.styles.buttonRadius === r ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20' : 'bg-secondary/30 hover:bg-secondary/50 border-transparent'}`}>{r}</button>
                                      ))}
                                    </div>
                                  </div>
                                </div>
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
