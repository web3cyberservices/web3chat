'use client';

import React, { useState, useRef, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useBuilderStore, PageBlock, BlockStyles, BlockLink } from '@/lib/builder-store';
import { Trash2, GripVertical, Settings2, Code, Terminal, BrainCircuit, Type, Maximize2, Palette, Image as ImageIcon, X, Plus, Link as LinkIcon, MousePointer2, Move, RotateCcw } from 'lucide-react';
import images from '@/app/lib/placeholder-images.json';

type ElementType = 'title' | 'desc' | 'btn' | 'block';

export function BuilderCanvas() {
  const { blocks, mode, reorderBlocks, removeBlock, updateBlock } = useBuilderStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<{ 
    id: string; 
    type: ElementType;
    startX: number; 
    startY: number; 
    initialX: number; 
    initialY: number;
  } | null>(null);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    reorderBlocks(result.source.index, result.destination.index);
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
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, blocks, updateBlock]);

  return (
    <div className="flex-1 bg-muted/30 overflow-y-auto p-6 md:p-12 relative">
      <div className={`max-w-4xl mx-auto min-h-[80vh] bg-white shadow-2xl rounded-sm ring-1 ring-black/5 flex flex-col ${mode !== 'landing' ? 'dark bg-slate-900 border border-white/10' : ''}`}>
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="canvas">
            {(provided) => (
              <div 
                {...provided.droppableProps} 
                ref={provided.innerRef} 
                className="flex-1 space-y-0"
              >
                {blocks.length === 0 && (
                  <div className="flex-1 flex flex-col items-center justify-center py-40 border-2 border-dashed border-muted m-4 rounded-xl">
                    {mode === 'landing' ? <Settings2 className="w-12 h-12 mb-4 opacity-20" /> : <BrainCircuit className="w-12 h-12 mb-4 opacity-20 text-primary" />}
                    <p className="text-muted-foreground font-medium">Workspace is empty.</p>
                    <p className="text-xs text-muted-foreground">Add components from the left sidebar to begin.</p>
                  </div>
                )}
                
                {blocks.map((block, index) => (
                  <Draggable key={block.id} draggableId={block.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`group relative border-b last:border-b-0 border-slate-200 dark:border-slate-800 ${snapshot.isDragging ? 'shadow-2xl z-50 ring-2 ring-primary' : ''}`}
                        style={provided.draggableProps.style}
                      >
                        {/* Block Toolbar */}
                        <div className="absolute right-4 top-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                          <button 
                            onMouseDown={(e) => startPositionDrag(e, block, 'block')}
                            className="p-2 bg-card shadow-md border rounded-lg cursor-move hover:text-primary"
                            title="Shift Entire Block Content"
                          >
                            <Move className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setEditingId(editingId === block.id ? null : block.id)}
                            className={`p-2 bg-card shadow-md border rounded-lg hover:text-primary ${editingId === block.id ? 'text-primary' : ''}`}
                            title="Settings"
                          >
                            <Settings2 className="w-4 h-4" />
                          </button>
                          <div {...provided.dragHandleProps} className="p-2 bg-card shadow-md border rounded-lg cursor-grab active:cursor-grabbing" title="Reorder Section">
                            <GripVertical className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <button onClick={() => removeBlock(block.id)} className="p-2 bg-card shadow-md border rounded-lg hover:text-destructive" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Settings Panel */}
                        {editingId === block.id && (
                          <div className="absolute right-4 top-16 w-80 bg-card border rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in zoom-in duration-200 max-h-[70vh] overflow-y-auto">
                            <div className="flex items-center justify-between mb-4 pb-2 border-b">
                              <h4 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                                <Palette className="w-3 h-3" /> Block Settings
                              </h4>
                              <X className="w-3 h-3 cursor-pointer" onClick={() => setEditingId(null)} />
                            </div>
                            
                            <div className="space-y-6">
                              {/* Element Positioning Resets */}
                              <div className="space-y-2">
                                <label className="text-[10px] uppercase font-bold text-muted-foreground block">Position Resets</label>
                                <div className="grid grid-cols-1 gap-1">
                                  <button 
                                    onClick={() => updateBlock(block.id, { styles: { ...block.styles, titleX: 0, titleY: 0 } })}
                                    className="flex items-center justify-between bg-secondary/30 p-2 rounded text-[9px] hover:bg-secondary/50"
                                  >
                                    <span>Title Position</span>
                                    <RotateCcw className="w-3 h-3" />
                                  </button>
                                  <button 
                                    onClick={() => updateBlock(block.id, { styles: { ...block.styles, descX: 0, descY: 0 } })}
                                    className="flex items-center justify-between bg-secondary/30 p-2 rounded text-[9px] hover:bg-secondary/50"
                                  >
                                    <span>Description Position</span>
                                    <RotateCcw className="w-3 h-3" />
                                  </button>
                                  <button 
                                    onClick={() => updateBlock(block.id, { styles: { ...block.styles, btnX: 0, btnY: 0 } })}
                                    className="flex items-center justify-between bg-secondary/30 p-2 rounded text-[9px] hover:bg-secondary/50"
                                  >
                                    <span>Button Position</span>
                                    <RotateCcw className="w-3 h-3" />
                                  </button>
                                  <button 
                                    onClick={() => updateBlock(block.id, { styles: { ...block.styles, translateX: 0, translateY: 0, titleX: 0, titleY: 0, descX: 0, descY: 0, btnX: 0, btnY: 0 } })}
                                    className="flex items-center justify-between bg-primary/10 p-2 rounded text-[9px] hover:bg-primary/20 text-primary font-bold mt-2"
                                  >
                                    <span>Reset All Alignment</span>
                                    <Maximize2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>

                              {/* Background */}
                              <div className="space-y-3 pt-4 border-t">
                                <label className="text-[10px] uppercase font-bold text-muted-foreground block">Visuals</label>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <span className="text-[9px] text-muted-foreground mb-1 block">Bg Color</span>
                                    <input 
                                      type="color" 
                                      value={block.styles.backgroundColor}
                                      onChange={(e) => updateBlock(block.id, { styles: { ...block.styles, backgroundColor: e.target.value } })}
                                      className="w-full h-8 rounded-lg cursor-pointer bg-transparent border-none"
                                    />
                                  </div>
                                  <div>
                                    <span className="text-[9px] text-muted-foreground mb-1 block">Text Color</span>
                                    <input 
                                      type="color" 
                                      value={block.styles.textColor}
                                      onChange={(e) => updateBlock(block.id, { styles: { ...block.styles, textColor: e.target.value } })}
                                      className="w-full h-8 rounded-lg cursor-pointer bg-transparent border-none"
                                    />
                                  </div>
                                </div>

                                <div>
                                  <span className="text-[9px] text-muted-foreground mb-1 block">Bg Image</span>
                                  <div className="grid grid-cols-4 gap-1">
                                    <button 
                                      onClick={() => updateBlock(block.id, { styles: { ...block.styles, backgroundImage: '' } })}
                                      className={`h-8 border rounded flex items-center justify-center ${!block.styles.backgroundImage ? 'border-primary' : ''}`}
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                    {images.slice(0, 7).map(img => (
                                      <button 
                                        key={img.id}
                                        onClick={() => updateBlock(block.id, { styles: { ...block.styles, backgroundImage: img.url } })}
                                        className={`h-8 border rounded overflow-hidden ${block.styles.backgroundImage === img.url ? 'border-primary ring-1 ring-primary' : ''}`}
                                      >
                                        <img src={img.url} className="w-full h-full object-cover" />
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              {/* Typography */}
                              <div className="space-y-3 pt-4 border-t">
                                <label className="text-[10px] uppercase font-bold text-muted-foreground block">Typography</label>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <span className="text-[9px] text-muted-foreground mb-1 block">Font</span>
                                    <select 
                                      value={block.styles.fontFamily}
                                      onChange={(e) => updateBlock(block.id, { styles: { ...block.styles, fontFamily: e.target.value as any } })}
                                      className="w-full bg-secondary text-[10px] p-1.5 rounded border outline-none"
                                    >
                                      <option value="sans">Sans</option>
                                      <option value="serif">Serif</option>
                                      <option value="mono">Mono</option>
                                    </select>
                                  </div>
                                  <div>
                                    <span className="text-[9px] text-muted-foreground mb-1 block">Size</span>
                                    <select 
                                      value={block.styles.fontSize}
                                      onChange={(e) => updateBlock(block.id, { styles: { ...block.styles, fontSize: e.target.value as any } })}
                                      className="w-full bg-secondary text-[10px] p-1.5 rounded border outline-none"
                                    >
                                      <option value="normal">Normal</option>
                                      <option value="large">Large</option>
                                      <option value="huge">Huge</option>
                                    </select>
                                  </div>
                                </div>
                              </div>

                              {/* Button Settings */}
                              {block.content.buttonText !== undefined && (
                                <div className="space-y-3 pt-4 border-t">
                                  <label className="text-[10px] uppercase font-bold text-muted-foreground block flex items-center gap-2">
                                    <MousePointer2 className="w-3 h-3" /> Button Style
                                  </label>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <span className="text-[9px] text-muted-foreground mb-1 block">Shape</span>
                                      <select 
                                        value={block.styles.buttonRadius}
                                        onChange={(e) => updateBlock(block.id, { styles: { ...block.styles, buttonRadius: e.target.value as any } })}
                                        className="w-full bg-secondary text-[10px] p-1.5 rounded border outline-none"
                                      >
                                        <option value="none">Square</option>
                                        <option value="md">Rounded</option>
                                        <option value="full">Pill</option>
                                      </select>
                                    </div>
                                    <div>
                                      <span className="text-[9px] text-muted-foreground mb-1 block">Font</span>
                                      <select 
                                        value={block.styles.buttonFontFamily}
                                        onChange={(e) => updateBlock(block.id, { styles: { ...block.styles, buttonFontFamily: e.target.value as any } })}
                                        className="w-full bg-secondary text-[10px] p-1.5 rounded border outline-none"
                                      >
                                        <option value="sans">Sans</option>
                                        <option value="serif">Serif</option>
                                        <option value="mono">Mono</option>
                                      </select>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <span className="text-[9px] text-muted-foreground mb-1 block">Color</span>
                                      <input 
                                        type="color" 
                                        value={block.styles.buttonBgColor}
                                        onChange={(e) => updateBlock(block.id, { styles: { ...block.styles, buttonBgColor: e.target.value } })}
                                        className="w-full h-8 rounded-lg cursor-pointer bg-transparent border-none"
                                      />
                                    </div>
                                    <div>
                                      <span className="text-[9px] text-muted-foreground mb-1 block">Label</span>
                                      <input 
                                        type="color" 
                                        value={block.styles.buttonTextColor}
                                        onChange={(e) => updateBlock(block.id, { styles: { ...block.styles, buttonTextColor: e.target.value } })}
                                        className="w-full h-8 rounded-lg cursor-pointer bg-transparent border-none"
                                      />
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Layout */}
                              <div className="pt-4 border-t">
                                <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1 flex justify-between">
                                  Section Spacing <span>{block.styles.padding.replace('py-', '')}px</span>
                                </label>
                                <input 
                                  type="range" 
                                  min="4" 
                                  max="160" 
                                  step="4"
                                  value={parseInt(block.styles.padding.replace('py-', ''))}
                                  onChange={(e) => updateBlock(block.id, { styles: { ...block.styles, padding: `py-${e.target.value}` } })}
                                  className="w-full accent-primary"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Block Content */}
                        <BlockContentComponent 
                          block={block} 
                          onUpdate={(content) => updateBlock(block.id, { content })} 
                          onStartDrag={startPositionDrag}
                          isDraggingAny={!!dragging}
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

interface BlockContentProps {
  block: PageBlock;
  onUpdate: (content: any) => void;
  onStartDrag: (e: React.MouseEvent, block: PageBlock, type: ElementType) => void;
  isDraggingAny: boolean;
}

function BlockContentComponent({ block, onUpdate, onStartDrag, isDraggingAny }: BlockContentProps) {
  const { type, content, styles } = block;

  const fontClasses = {
    sans: 'font-sans',
    serif: 'font-serif',
    mono: 'font-mono'
  };

  const sizeClasses = {
    normal: 'text-4xl',
    large: 'text-5xl',
    huge: 'text-7xl'
  };

  const radiusClasses = {
    none: 'rounded-none',
    md: 'rounded-xl',
    full: 'rounded-full'
  };

  const blockBgStyles = { 
    backgroundColor: styles.backgroundColor, 
    color: styles.textColor,
    backgroundImage: styles.backgroundImage ? `url(${styles.backgroundImage})` : 'none',
    backgroundSize: 'cover',
    backgroundPosition: 'center'
  };

  const globalTransform = {
    transform: `translate(${styles.translateX || 0}px, ${styles.translateY || 0}px)`,
    transition: isDraggingAny ? 'none' : 'transform 0.2s ease-out'
  };

  const titleTransform = {
    transform: `translate(${styles.titleX || 0}px, ${styles.titleY || 0}px)`,
    transition: isDraggingAny ? 'none' : 'transform 0.2s ease-out'
  };

  const descTransform = {
    transform: `translate(${styles.descX || 0}px, ${styles.descY || 0}px)`,
    transition: isDraggingAny ? 'none' : 'transform 0.2s ease-out'
  };

  const btnTransform = {
    transform: `translate(${styles.btnX || 0}px, ${styles.btnY || 0}px)`,
    transition: isDraggingAny ? 'none' : 'transform 0.2s ease-out'
  };

  const buttonStyle = {
    backgroundColor: styles.buttonBgColor,
    color: styles.buttonTextColor,
    fontFamily: fontClasses[styles.buttonFontFamily || 'sans']
  };

  if (type === 'header') {
    return (
      <header 
        className={`w-full ${styles.padding} ${fontClasses[styles.fontFamily]} relative`} 
        style={blockBgStyles}
      >
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between z-10 relative" style={globalTransform}>
          <div className="relative group/el">
             <input
              value={content.title}
              onChange={(e) => onUpdate({ ...content, title: e.target.value })}
              className="bg-transparent border-none text-xl font-black focus:outline-none focus:ring-1 focus:ring-primary/40 rounded px-2"
            />
          </div>
          <nav className="hidden md:flex items-center gap-6">
            {content.links?.map((link, idx) => (
              <span key={idx} className="text-sm font-medium opacity-80 cursor-default">{link.label}</span>
            ))}
          </nav>
        </div>
      </header>
    );
  }

  if (type === 'footer') {
    return (
      <footer 
        className={`w-full ${styles.padding} ${fontClasses[styles.fontFamily]} relative`} 
        style={blockBgStyles}
      >
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-8 z-10 relative" style={globalTransform}>
          <div className="space-y-2">
            <input
              value={content.title}
              onChange={(e) => onUpdate({ ...content, title: e.target.value })}
              className="bg-transparent border-none text-lg font-bold focus:outline-none focus:ring-1 focus:ring-primary/40 rounded px-2"
            />
            <textarea
              value={content.description}
              onChange={(e) => onUpdate({ ...content, description: e.target.value })}
              className="w-full bg-transparent border-none text-sm opacity-60 focus:ring-1 focus:ring-primary/40 outline-none resize-none"
              rows={2}
            />
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-2 md:justify-end items-center">
            {content.links?.map((link, idx) => (
              <span key={idx} className="text-sm opacity-80 cursor-default">{link.label}</span>
            ))}
          </div>
        </div>
      </footer>
    );
  }

  if (['hero', 'features', 'pricing', 'contacts'].includes(type)) {
    return (
      <div 
        className={`relative w-full transition-all duration-300 ${styles.padding} ${fontClasses[styles.fontFamily]}`} 
        style={blockBgStyles}
      >
        {styles.backgroundImage && (
          <div className="absolute inset-0 bg-black/30 pointer-events-none" />
        )}

        <div className="relative max-w-4xl mx-auto text-center px-6 z-10 space-y-8" style={globalTransform}>
          
          <div className="relative group/el" style={titleTransform}>
             <button 
                onMouseDown={(e) => onStartDrag(e, block, 'title')}
                className="absolute -left-8 top-1/2 -translate-y-1/2 p-1.5 bg-primary text-primary-foreground rounded-full opacity-0 group-hover/el:opacity-100 transition-opacity z-30 cursor-move"
              >
                <Move className="w-3 h-3" />
              </button>
            <input
              value={content.title}
              onChange={(e) => onUpdate({ ...content, title: e.target.value })}
              className={`w-full bg-transparent border-none text-center focus:ring-2 focus:ring-primary/40 outline-none font-extrabold tracking-tight ${type === 'hero' ? sizeClasses[styles.fontSize] : 'text-3xl'}`}
            />
          </div>

          <div className="relative group/el" style={descTransform}>
             <button 
                onMouseDown={(e) => onStartDrag(e, block, 'desc')}
                className="absolute -left-8 top-1/2 -translate-y-1/2 p-1.5 bg-primary text-primary-foreground rounded-full opacity-0 group-hover/el:opacity-100 transition-opacity z-30 cursor-move"
              >
                <Move className="w-3 h-3" />
              </button>
            <textarea
              value={content.description}
              onChange={(e) => onUpdate({ ...content, description: e.target.value })}
              className="w-full bg-transparent border-none text-center focus:ring-2 focus:ring-primary/40 outline-none text-lg opacity-90 resize-none leading-relaxed"
              rows={3}
            />
          </div>

          {content.buttonText !== undefined && (
            <div className="relative group/el inline-block mx-auto" style={btnTransform}>
              <button 
                onMouseDown={(e) => onStartDrag(e, block, 'btn')}
                className="absolute -left-10 top-1/2 -translate-y-1/2 p-1.5 bg-primary text-primary-foreground rounded-full opacity-0 group-hover/el:opacity-100 transition-opacity z-30 cursor-move"
              >
                <Move className="w-3 h-3" />
              </button>
              <div className="flex flex-col items-center gap-2">
                <input
                  value={content.buttonText}
                  onChange={(e) => onUpdate({ ...content, buttonText: e.target.value })}
                  className={`px-10 py-4 text-center font-bold shadow-2xl transition-all hover:scale-105 border-none outline-none ${radiusClasses[styles.buttonRadius || 'full']} ${fontClasses[styles.buttonFontFamily || 'sans']}`}
                  style={buttonStyle}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // AI Logic Blocks
  return (
    <div className="p-8 bg-slate-900 text-white font-mono" style={globalTransform}>
      <div className="flex items-center gap-4 mb-4">
        <div className="p-2 bg-primary/10 rounded-lg">
          {type.includes('prompt') ? <Terminal className="w-5 h-5 text-primary" /> : <Code className="w-5 h-5 text-accent" />}
        </div>
        <input
          value={content.title}
          onChange={(e) => onUpdate({ ...content, title: e.target.value })}
          className="bg-transparent border-none text-xl font-bold focus:outline-none focus:ring-b focus:ring-primary"
        />
      </div>
      <textarea
        value={content.description}
        onChange={(e) => onUpdate({ ...content, description: e.target.value })}
        className="w-full bg-slate-800 rounded-xl p-4 text-sm font-mono focus:ring-2 focus:ring-primary outline-none border border-slate-700 min-h-[120px]"
        placeholder="Configure logic here..."
      />
    </div>
  );
}
