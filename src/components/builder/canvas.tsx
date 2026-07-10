
'use client';

import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useBuilderStore, PageBlock, BlockStyles } from '@/lib/builder-store';
import { Trash2, GripVertical, Settings2, Code, Terminal, BrainCircuit, Type, Maximize2, Palette, Image as ImageIcon, X } from 'lucide-react';
import images from '@/app/lib/placeholder-images.json';

export function BuilderCanvas() {
  const { blocks, mode, reorderBlocks, removeBlock, updateBlock } = useBuilderStore();
  const [editingId, setEditingId] = useState<string | null>(null);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    reorderBlocks(result.source.index, result.destination.index);
  };

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
                      >
                        {/* Block Toolbar */}
                        <div className="absolute right-4 top-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                          <button 
                            onClick={() => setEditingId(editingId === block.id ? null : block.id)}
                            className={`p-2 bg-card shadow-md border rounded-lg hover:text-primary ${editingId === block.id ? 'text-primary' : ''}`}
                          >
                            <Settings2 className="w-4 h-4" />
                          </button>
                          <div {...provided.dragHandleProps} className="p-2 bg-card shadow-md border rounded-lg cursor-grab active:cursor-grabbing">
                            <GripVertical className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <button onClick={() => removeBlock(block.id)} className="p-2 bg-card shadow-md border rounded-lg hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Settings Panel */}
                        {editingId === block.id && (
                          <div className="absolute right-4 top-16 w-64 bg-card border rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in zoom-in duration-200">
                            <div className="flex items-center justify-between mb-4 pb-2 border-b">
                              <h4 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                                <Palette className="w-3 h-3" /> Block Settings
                              </h4>
                              <X className="w-3 h-3 cursor-pointer" onClick={() => setEditingId(null)} />
                            </div>
                            
                            <div className="space-y-4">
                              {/* Background */}
                              <div>
                                <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Background Color</label>
                                <input 
                                  type="color" 
                                  value={block.styles.backgroundColor}
                                  onChange={(e) => updateBlock(block.id, { styles: { ...block.styles, backgroundColor: e.target.value } })}
                                  className="w-full h-8 rounded-lg cursor-pointer bg-transparent border-none"
                                />
                              </div>

                              <div>
                                <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Background Image</label>
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

                              {/* Typography */}
                              <div>
                                <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Text Color</label>
                                <input 
                                  type="color" 
                                  value={block.styles.textColor}
                                  onChange={(e) => updateBlock(block.id, { styles: { ...block.styles, textColor: e.target.value } })}
                                  className="w-full h-8 rounded-lg cursor-pointer bg-transparent border-none"
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Font</label>
                                  <select 
                                    value={block.styles.fontFamily}
                                    onChange={(e) => updateBlock(block.id, { styles: { ...block.styles, fontFamily: e.target.value as any } })}
                                    className="w-full bg-secondary text-[10px] p-1 rounded border outline-none"
                                  >
                                    <option value="sans">Sans</option>
                                    <option value="serif">Serif</option>
                                    <option value="mono">Mono</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Size</label>
                                  <select 
                                    value={block.styles.fontSize}
                                    onChange={(e) => updateBlock(block.id, { styles: { ...block.styles, fontSize: e.target.value as any } })}
                                    className="w-full bg-secondary text-[10px] p-1 rounded border outline-none"
                                  >
                                    <option value="normal">Normal</option>
                                    <option value="large">Large</option>
                                    <option value="huge">Huge</option>
                                  </select>
                                </div>
                              </div>

                              {/* Layout */}
                              <div>
                                <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1 flex justify-between">
                                  Padding <span>{block.styles.padding.replace('py-', '')}px</span>
                                </label>
                                <input 
                                  type="range" 
                                  min="20" 
                                  max="160" 
                                  step="20"
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

function BlockContentComponent({ block, onUpdate }: { block: PageBlock; onUpdate: (content: any) => void }) {
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

  if (['hero', 'features', 'pricing', 'contacts'].includes(type)) {
    return (
      <div 
        className={`relative w-full transition-all duration-300 ${styles.padding} ${fontClasses[styles.fontFamily]}`} 
        style={{ 
          backgroundColor: styles.backgroundColor, 
          color: styles.textColor,
          backgroundImage: styles.backgroundImage ? `url(${styles.backgroundImage})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        {/* Overlay for readability if image is present */}
        {styles.backgroundImage && (
          <div className="absolute inset-0 bg-black/30 pointer-events-none" />
        )}

        <div className="relative max-w-3xl mx-auto text-center px-6 z-10">
          <input
            value={content.title}
            onChange={(e) => onUpdate({ ...content, title: e.target.value })}
            className={`w-full bg-transparent border-none text-center focus:ring-2 focus:ring-primary/40 outline-none font-extrabold tracking-tight ${type === 'hero' ? sizeClasses[styles.fontSize] : 'text-3xl'}`}
          />
          <textarea
            value={content.description}
            onChange={(e) => onUpdate({ ...content, description: e.target.value })}
            className="w-full bg-transparent border-none text-center focus:ring-2 focus:ring-primary/40 outline-none mt-6 text-lg opacity-90 resize-none leading-relaxed"
            rows={3}
          />
          {content.buttonText && (
            <div className="mt-10">
              <button className="px-10 py-4 bg-primary text-primary-foreground rounded-full font-bold shadow-2xl hover:scale-105 transition-transform">
                {content.buttonText}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // AI Agent or Bot Logic Blocks (Simplified for settings context)
  return (
    <div className="p-8 bg-slate-900 text-white font-mono">
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
