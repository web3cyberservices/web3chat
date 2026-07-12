'use client';

import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useBuilderStore, PageBlock, BlockContent } from '@/lib/builder-store';
import { Trash2, GripVertical, Settings2, Palette, X, Move, RotateCcw, Sparkles } from 'lucide-react';
import images from '@/app/lib/placeholder-images.json';
import { generateBlockContent } from '@/ai/flows/block-generator-flow';
import { useToast } from '@/hooks/use-toast';

type ElementType = 'title' | 'desc' | 'btn' | 'block';

// Помещаем вспомогательный компонент ПЕРЕД основным для предотвращения ReferenceError
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
    cursor: 'text'
  };

  const descStyle = {
    color: styles.textColor,
    transform: `translate(${styles.descX || 0}px, ${styles.descY || 0}px)`,
    transition: 'none',
    cursor: 'text'
  };

  const btnStyle = {
    backgroundColor: styles.buttonBgColor,
    color: styles.buttonTextColor,
    borderRadius: styles.buttonRadius === 'full' ? '9999px' : styles.buttonRadius === 'md' ? '0.75rem' : '0',
    transform: `translate(${styles.btnX || 0}px, ${styles.btnY || 0}px)`,
    transition: 'none'
  };

  const bgStyle = styles.backgroundImage 
    ? { 
        backgroundImage: `url(${styles.backgroundImage})`, 
        backgroundSize: 'cover', 
        backgroundPosition: 'center',
        minHeight: styles.minHeight || 'auto'
      }
    : { 
        backgroundColor: styles.backgroundColor,
        minHeight: styles.minHeight || 'auto'
      };

  const contentGroupStyle = {
    transform: `translate(${styles.translateX || 0}px, ${styles.translateY || 0}px)`,
  };

  const renderDragHandle = (type: ElementType) => (
    <button 
      onMouseDown={(e) => onStartDrag(e, block, type)} 
      className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover/el:opacity-100 p-1.5 bg-primary text-primary-foreground rounded-lg shadow-lg z-30 cursor-move transition-opacity"
      title="Move Element"
    >
      <Move className="w-3.5 h-3.5" />
    </button>
  );

  return (
    <div className={`relative ${styles.padding} overflow-hidden flex flex-col justify-center font-${styles.fontFamily}`} style={bgStyle}>
      {styles.backgroundImage && (
        <div 
          className="absolute inset-0 bg-black" 
          style={{ opacity: styles.overlayOpacity || 0.4 }} 
        />
      )}
      
      <div className="relative z-10 w-full" style={contentGroupStyle}>
        {type === 'header' && (
          <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
             <div className="relative group/el">
                {renderDragHandle('title')}
                <input 
                  value={content.title} 
                  onChange={(e) => onUpdate({ title: e.target.value })} 
                  className="bg-transparent border-none font-black text-2xl outline-none tracking-tighter"
                  style={titleStyle}
                />
             </div>
          </div>
        )}

        {(['hero', 'features', 'pricing', 'contacts'].includes(type)) && (
          <div className="max-w-4xl mx-auto px-6 text-center space-y-6">
            <div className="relative group/el inline-block w-full">
              {renderDragHandle('title')}
              <textarea 
                value={content.title} 
                onChange={(e) => onUpdate({ title: e.target.value })}
                className={`bg-transparent border-none font-black text-center w-full outline-none resize-none overflow-hidden leading-tight ${styles.fontSize === 'huge' ? 'text-7xl' : styles.fontSize === 'large' ? 'text-5xl' : 'text-4xl'}`}
                style={titleStyle}
                rows={1}
              />
            </div>

            <div className="relative group/el inline-block w-full">
              {renderDragHandle('desc')}
              <textarea 
                value={content.description} 
                onChange={(e) => onUpdate({ description: e.target.value })}
                className="bg-transparent border-none text-lg text-center w-full outline-none resize-none overflow-hidden opacity-90 leading-relaxed"
                style={descStyle}
                rows={2}
              />
            </div>

            {content.buttonText !== undefined && (
              <div className="relative group/el inline-block">
                {renderDragHandle('btn')}
                <input 
                  value={content.buttonText} 
                  onChange={(e) => onUpdate({ buttonText: e.target.value })}
                  className="px-10 py-4 font-bold text-center outline-none shadow-2xl cursor-text transition-transform hover:scale-105 active:scale-95"
                  style={btnStyle}
                />
              </div>
            )}
          </div>
        )}

        {type === 'footer' && (
          <div className="max-w-6xl mx-auto px-6 text-center">
            <div className="relative group/el inline-block w-full">
              {renderDragHandle('title')}
              <input 
                value={content.title} 
                onChange={(e) => onUpdate({ title: e.target.value })} 
                className="bg-transparent border-none text-[10px] font-bold uppercase tracking-[0.2em] opacity-50 outline-none w-full text-center"
                style={titleStyle}
              />
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
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'visual' | 'typo' | 'buttons'>('visual');
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
    <div className="flex-1 bg-muted/20 overflow-y-auto p-4 md:p-8 relative transition-all duration-500">
      <div className={`${canvasWidth} mx-auto min-h-[85vh] bg-white shadow-2xl rounded-sm ring-1 ring-black/5 flex flex-col transition-all duration-500 ${mode !== 'landing' ? 'dark bg-slate-900 border border-white/10' : ''}`}>
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="canvas">
            {(provided) => (
              <div 
                {...provided.droppableProps} 
                ref={provided.innerRef} 
                className="flex-1"
              >
                {blocks.length === 0 && (
                  <div className="flex-1 flex flex-col items-center justify-center py-40 border-2 border-dashed border-muted m-4 rounded-xl">
                    <p className="text-muted-foreground font-medium">Canvas is empty.</p>
                    <p className="text-xs text-muted-foreground">Add components from the sidebar to start building.</p>
                  </div>
                )}
                
                {blocks.map((block, index) => (
                  <Draggable key={block.id} draggableId={block.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`group relative border-b last:border-b-0 border-slate-200 dark:border-slate-800 ${snapshot.isDragging ? 'shadow-2xl z-50 ring-2 ring-primary' : ''}`}
                        style={provided.draggableProps.style as any}
                      >
                        {/* Block Toolbar */}
                        <div className="absolute right-4 top-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                          <button 
                            onClick={() => handleAIGenerate(block)}
                            disabled={isGenerating === block.id}
                            className={`p-2 bg-card shadow-md border rounded-lg hover:text-primary transition-colors ${isGenerating === block.id ? 'animate-pulse text-primary' : ''}`}
                            title="AI Generate Content"
                          >
                            <Sparkles className="w-4 h-4" />
                          </button>
                          <button 
                            onMouseDown={(e) => startPositionDrag(e, block, 'block')}
                            className="p-2 bg-card shadow-md border rounded-lg cursor-move hover:text-primary transition-colors"
                            title="Move Block Container"
                          >
                            <Move className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setEditingId(editingId === block.id ? null : block.id)}
                            className={`p-2 bg-card shadow-md border rounded-lg hover:text-primary transition-colors ${editingId === block.id ? 'text-primary' : ''}`}
                          >
                            <Settings2 className="w-4 h-4" />
                          </button>
                          <div {...provided.dragHandleProps} className="p-2 bg-card shadow-md border rounded-lg cursor-grab active:cursor-grabbing">
                            <GripVertical className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <button onClick={() => removeBlock(block.id)} className="p-2 bg-card shadow-md border rounded-lg hover:text-destructive transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Enhanced Block Settings */}
                        {editingId === block.id && (
                          <div className="absolute right-4 top-16 w-80 bg-card border rounded-2xl shadow-2xl p-0 z-50 max-h-[70vh] flex flex-col overflow-hidden">
                            <div className="flex items-center justify-between p-4 border-b">
                              <h4 className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                                <Palette className="w-3 h-3" /> Block Settings
                              </h4>
                              <X className="w-3 h-3 cursor-pointer" onClick={() => setEditingId(null)} />
                            </div>

                            <div className="flex border-b bg-muted/20">
                              <button onClick={() => setActiveTab('visual')} className={`flex-1 py-2 text-[9px] font-bold uppercase border-b-2 transition-colors ${activeTab === 'visual' ? 'border-primary text-primary' : 'border-transparent opacity-50'}`}>Visual</button>
                              <button onClick={() => setActiveTab('typo')} className={`flex-1 py-2 text-[9px] font-bold uppercase border-b-2 transition-colors ${activeTab === 'typo' ? 'border-primary text-primary' : 'border-transparent opacity-50'}`}>Text</button>
                              <button onClick={() => setActiveTab('buttons')} className={`flex-1 py-2 text-[9px] font-bold uppercase border-b-2 transition-colors ${activeTab === 'buttons' ? 'border-primary text-primary' : 'border-transparent opacity-50'}`}>Buttons</button>
                            </div>
                            
                            <div className="p-4 overflow-y-auto space-y-6">
                              {activeTab === 'visual' && (
                                <>
                                  <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold text-muted-foreground block">Min Height</label>
                                    <div className="grid grid-cols-4 gap-1">
                                      {['auto', '50vh', '75vh', '100vh'].map((h) => (
                                        <button 
                                          key={h}
                                          onClick={() => updateBlock(block.id, { styles: { ...block.styles, minHeight: h } })}
                                          className={`p-2 rounded text-[9px] border transition-all ${block.styles.minHeight === h ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary/30 border-transparent hover:bg-secondary/50'}`}
                                        >
                                          {h === 'auto' ? 'Auto' : h.replace('vh', '%')}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <span className="text-[9px] text-muted-foreground mb-1 block font-bold">Background Color</span>
                                      <input type="color" value={block.styles.backgroundColor} onChange={(e) => updateBlock(block.id, { styles: { ...block.styles, backgroundColor: e.target.value } })} className="w-full h-8 rounded-lg cursor-pointer bg-transparent border" />
                                    </div>
                                    <div>
                                      <span className="text-[9px] text-muted-foreground mb-1 block font-bold">Text Color</span>
                                      <input type="color" value={block.styles.textColor} onChange={(e) => updateBlock(block.id, { styles: { ...block.styles, textColor: e.target.value } })} className="w-full h-8 rounded-lg cursor-pointer bg-transparent border" />
                                    </div>
                                  </div>
                                  <div>
                                    <span className="text-[9px] text-muted-foreground mb-2 block font-bold uppercase tracking-wider">Background Image & Overlay</span>
                                    <div className="grid grid-cols-4 gap-1 mb-2">
                                      <button onClick={() => updateBlock(block.id, { styles: { ...block.styles, backgroundImage: '' } })} className={`h-8 border rounded flex items-center justify-center ${!block.styles.backgroundImage ? 'border-primary' : ''}`}><X className="w-3 h-3" /></button>
                                      {images.slice(0, 7).map(img => (
                                        <button key={img.id} onClick={() => updateBlock(block.id, { styles: { ...block.styles, backgroundImage: img.url } })} className={`h-8 border rounded overflow-hidden transition-transform hover:scale-105 ${block.styles.backgroundImage === img.url ? 'border-primary ring-1 ring-primary' : ''}`}><img src={img.url} className="w-full h-full object-cover" /></button>
                                      ))}
                                    </div>
                                    <span className="text-[9px] text-muted-foreground mb-1 block">Overlay Opacity: {(block.styles.overlayOpacity || 0) * 100}%</span>
                                    <input type="range" min="0" max="1" step="0.1" value={block.styles.overlayOpacity || 0} onChange={(e) => updateBlock(block.id, { styles: { ...block.styles, overlayOpacity: parseFloat(e.target.value) } })} className="w-full" />
                                  </div>
                                </>
                              )}

                              {activeTab === 'typo' && (
                                <div className="space-y-4">
                                  <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold text-muted-foreground block">Font Family</label>
                                    <div className="grid grid-cols-3 gap-1">
                                      {(['sans', 'serif', 'mono'] as const).map((f) => (
                                        <button key={f} onClick={() => updateBlock(block.id, { styles: { ...block.styles, fontFamily: f } })} className={`p-2 rounded text-[9px] border capitalize ${block.styles.fontFamily === f ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary/30'}`}>{f}</button>
                                      ))}
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold text-muted-foreground block">Position Controls</label>
                                    <button onClick={() => updateBlock(block.id, { styles: { ...block.styles, translateX: 0, translateY: 0, titleX: 0, titleY: 0, descX: 0, descY: 0, btnX: 0, btnY: 0 } })} className="flex items-center justify-between w-full bg-primary/10 p-2 rounded text-[9px] hover:bg-primary/20 text-primary font-bold">
                                      <span>Reset All Positions</span> <RotateCcw className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              )}

                              {activeTab === 'buttons' && (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <span className="text-[9px] text-muted-foreground mb-1 block font-bold">Button BG</span>
                                      <input type="color" value={block.styles.buttonBgColor} onChange={(e) => updateBlock(block.id, { styles: { ...block.styles, buttonBgColor: e.target.value } })} className="w-full h-8 rounded-lg cursor-pointer bg-transparent border" />
                                    </div>
                                    <div>
                                      <span className="text-[9px] text-muted-foreground mb-1 block font-bold">Button Text</span>
                                      <input type="color" value={block.styles.buttonTextColor} onChange={(e) => updateBlock(block.id, { styles: { ...block.styles, buttonTextColor: e.target.value } })} className="w-full h-8 rounded-lg cursor-pointer bg-transparent border" />
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold text-muted-foreground block">Button Radius</label>
                                    <div className="grid grid-cols-3 gap-1">
                                      {(['none', 'md', 'full'] as const).map((r) => (
                                        <button key={r} onClick={() => updateBlock(block.id, { styles: { ...block.styles, buttonRadius: r } })} className={`p-2 rounded text-[9px] border capitalize ${block.styles.buttonRadius === r ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary/30'}`}>{r}</button>
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
