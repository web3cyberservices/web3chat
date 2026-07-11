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
                        style={provided.draggableProps.style as any}
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
