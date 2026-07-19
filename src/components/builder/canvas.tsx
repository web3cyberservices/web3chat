
'use client';

import React, { useState, useRef } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useBuilderStore, PageBlock, BlockContent, FontFamily } from '@/lib/builder-store';
import { 
  Trash2, GripVertical, Settings2, Palette, X, ImageIcon, 
  Sparkles, Plus, Zap, Terminal, Database, Wrench, 
  Hash, List, MessageSquare, Code, Layout, Upload, Eye
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

function BlockContentComponent({ block, onUpdate }: { 
  block: PageBlock; 
  onUpdate: (content: Partial<BlockContent>) => void;
}) {
  const { styles, content, type } = block;

  const baseStyle = {
    color: styles.textColor,
    fontFamily: FONT_MAP[styles.fontFamily]
  };

  if (['system-prompt', 'knowledge', 'tools', 'command', 'menu', 'reply', 'wa-template', 'wa-config'].includes(type)) {
    return (
      <div className="p-10 w-full bento-inner-glow bg-card/40 rounded-[2rem] border border-white/5">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-primary/10 rounded-xl text-primary">
            {type.includes('wa') ? <MessageSquare className="w-5 h-5" /> : <Terminal className="w-5 h-5" />}
          </div>
          <h4 className="text-lg font-bold uppercase tracking-widest">{type.replace('-', ' ')}</h4>
        </div>
        <textarea 
          value={content.systemPrompt || content.commandName || JSON.stringify(content.templates, null, 2)}
          onChange={(e) => onUpdate(type === 'command' ? { commandName: e.target.value } : { systemPrompt: e.target.value })}
          className="w-full h-40 bg-black/40 p-6 font-mono text-xs rounded-2xl border border-white/10 outline-none focus:ring-1 focus:ring-primary/40"
          placeholder="Настройте параметры здесь..."
        />
      </div>
    );
  }

  return (
    <div className="relative w-full min-h-[10rem] flex flex-col items-center justify-center text-center px-10 py-20" style={{ backgroundColor: styles.backgroundColor, borderRadius: styles.borderRadius }}>
      {styles.backgroundImage && (
        <div className="absolute inset-0 bg-cover bg-center pointer-events-none" style={{ backgroundImage: `url(${styles.backgroundImage})`, opacity: styles.backgroundOpacity || 1 }} />
      )}
      <div className="relative z-10 space-y-6 max-w-4xl w-full">
        <input 
          value={content.title} 
          onChange={(e) => onUpdate({ title: e.target.value })}
          className="bg-transparent border-none text-4xl md:text-6xl font-black text-center w-full outline-none tracking-tighter"
          style={baseStyle}
        />
        <textarea 
          value={content.description} 
          onChange={(e) => onUpdate({ description: e.target.value })}
          className="bg-transparent border-none text-lg text-center w-full outline-none opacity-60 resize-none"
          style={baseStyle}
          rows={2}
        />
        {content.buttonText && (
          <button 
            className="px-10 py-4 font-bold uppercase tracking-widest text-[10px] shadow-2xl transition-transform hover:scale-105"
            style={{ backgroundColor: styles.buttonBgColor, color: styles.buttonTextColor, borderRadius: styles.buttonRadius === 'full' ? '9999px' : '1rem' }}
          >
            {content.buttonText}
          </button>
        )}
      </div>
    </div>
  );
}

export function BuilderCanvas() {
  const { blocks, viewport, reorderBlocks, removeBlock, updateBlock } = useBuilderStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canvasWidth = {
    desktop: 'max-w-6xl',
    tablet: 'max-w-2xl',
    mobile: 'max-w-[390px]'
  }[viewport];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editingId) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        updateBlock(editingId, { styles: { ...blocks.find(b => b.id === editingId)!.styles, backgroundImage: base64 } });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex-1 bg-[#050507] overflow-y-auto p-12 transition-all duration-1000 relative">
      <div className={`${canvasWidth} mx-auto min-h-[85vh] bg-background shadow-2xl rounded-[4rem] flex flex-col transition-all duration-1000 relative overflow-hidden border border-white/5`}>
        <DragDropContext onDragEnd={(res) => res.destination && reorderBlocks(res.source.index, res.destination.index)}>
          <Droppable droppableId="canvas">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="flex-1">
                {blocks.length === 0 && (
                  <div className="flex-1 flex flex-col items-center justify-center py-40 opacity-20 text-center">
                    <Layout className="w-16 h-16 mb-4 animate-pulse" />
                    <p className="font-bold uppercase tracking-widest text-xs">Добавьте первый блок</p>
                  </div>
                )}
                {blocks.map((block, index) => (
                  <Draggable key={block.id} draggableId={block.id} index={index}>
                    {(provided) => (
                      <div ref={provided.innerRef} {...provided.draggableProps} className="group relative border-b border-white/5 last:border-b-0">
                        <div className="absolute right-8 top-8 flex gap-2 opacity-0 group-hover:opacity-100 transition-all z-50">
                          <button onClick={() => setEditingId(editingId === block.id ? null : block.id)} className={`p-3 bg-card border rounded-xl hover:text-primary transition-all ${editingId === block.id ? 'bg-primary text-primary-foreground' : ''}`}>
                            <Settings2 className="w-5 h-5" />
                          </button>
                          <div {...provided.dragHandleProps} className="p-3 bg-card border rounded-xl cursor-grab active:cursor-grabbing"><GripVertical className="w-5 h-5" /></div>
                          <button onClick={() => removeBlock(block.id)} className="p-3 bg-card border rounded-xl hover:text-destructive"><Trash2 className="w-5 h-5" /></button>
                        </div>

                        {editingId === block.id && (
                          <div className="absolute right-24 top-8 w-80 bg-card/95 backdrop-blur-3xl border rounded-[2rem] p-6 z-[60] shadow-2xl animate-in fade-in zoom-in duration-300">
                            <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-6">Настройки блока</h5>
                            <div className="space-y-6">
                              <div className="space-y-2">
                                <label className="text-[9px] uppercase font-bold opacity-40 px-2">Фон (Цвет)</label>
                                <input type="color" value={block.styles.backgroundColor} onChange={(e) => updateBlock(block.id, { styles: { ...block.styles, backgroundColor: e.target.value } })} className="w-full h-10 rounded-xl bg-white/5 border-none" />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[9px] uppercase font-bold opacity-40 px-2">Текст (Цвет)</label>
                                <input type="color" value={block.styles.textColor} onChange={(e) => updateBlock(block.id, { styles: { ...block.styles, textColor: e.target.value } })} className="w-full h-10 rounded-xl bg-white/5 border-none" />
                              </div>
                              <button onClick={() => fileInputRef.current?.click()} className="w-full py-3 bg-primary/10 text-primary rounded-xl text-[10px] font-bold uppercase flex items-center justify-center gap-2 hover:bg-primary/20 transition-all">
                                <Upload className="w-4 h-4" /> Загрузить изображение
                              </button>
                              <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                            </div>
                          </div>
                        )}

                        <BlockContentComponent block={block} onUpdate={(content) => updateBlock(block.id, { content })} />
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
