
'use client';

import React, { useState, useRef } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useBuilderStore, PageBlock, BlockContent, FontFamily } from '@/lib/builder-store';
import { 
  Trash2, GripVertical, Settings2, X, Upload, 
  Terminal, MessageSquare, Layout, Type, Palette, Move, 
  Maximize2, MousePointer2, Sparkles, ChevronRight, Sliders
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

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

  const titleFinalStyle = {
    ...baseStyle,
    transform: `translate(${styles.titleX || 0}px, ${styles.titleY || 0}px)`,
    fontSize: styles.fontSize === 'huge' ? '4rem' : styles.fontSize === 'large' ? '3rem' : '2.25rem'
  };

  const descFinalStyle = {
    ...baseStyle,
    transform: `translate(${styles.descX || 0}px, ${styles.descY || 0}px)`,
    opacity: 0.8
  };

  const btnFinalStyle = {
    backgroundColor: styles.buttonBgColor,
    color: styles.buttonTextColor,
    borderRadius: styles.buttonRadius === 'full' ? '9999px' : styles.buttonRadius === 'md' ? '1rem' : '0px',
    fontFamily: FONT_MAP[styles.buttonFontFamily || 'sans'],
    transform: `translate(${styles.btnX || 0}px, ${styles.btnY || 0}px)`
  };

  if (['system-prompt', 'knowledge', 'tools', 'command', 'menu', 'reply', 'wa-template', 'wa-config'].includes(type)) {
    return (
      <div className="p-10 w-full bento-inner-glow bg-card/40 rounded-[3rem] border border-white/5">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-primary/10 rounded-2xl text-primary">
            {type.includes('wa') ? <MessageSquare className="w-5 h-5" /> : <Terminal className="w-5 h-5" />}
          </div>
          <h4 className="text-lg font-black uppercase tracking-widest">{type.replace('-', ' ')}</h4>
        </div>
        <textarea 
          value={content.systemPrompt || content.commandName || JSON.stringify(content.templates, null, 2)}
          onChange={(e) => onUpdate(type === 'command' ? { commandName: e.target.value } : { systemPrompt: e.target.value })}
          className="w-full h-48 bg-black/60 p-6 font-mono text-xs rounded-[2rem] border border-white/10 outline-none focus:ring-2 focus:ring-primary/40 transition-all"
          placeholder="Введите параметры здесь..."
        />
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-hidden transition-all duration-500" style={{ backgroundColor: styles.backgroundColor, borderRadius: styles.borderRadius || '0px', minHeight: styles.minHeight }}>
      {styles.backgroundImage && (
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${styles.backgroundImage})`, opacity: styles.backgroundOpacity || 1 }} />
      )}
      {styles.overlayOpacity !== undefined && (
        <div className="absolute inset-0 bg-black" style={{ opacity: styles.overlayOpacity }} />
      )}
      <div className={`relative z-10 flex flex-col items-center justify-center text-center ${styles.padding || 'py-20 px-10'}`} style={{ transform: `translate(${styles.translateX || 0}px, ${styles.translateY || 0}px)` }}>
        <input 
          value={content.title} 
          onChange={(e) => onUpdate({ title: e.target.value })}
          className="bg-transparent border-none font-black text-center w-full outline-none tracking-tighter mb-6"
          style={titleFinalStyle}
        />
        <textarea 
          value={content.description} 
          onChange={(e) => onUpdate({ description: e.target.value })}
          className="bg-transparent border-none text-lg text-center w-full outline-none resize-none mb-8"
          style={descFinalStyle}
          rows={2}
        />
        {content.buttonText && (
          <button className="px-10 py-4 font-bold uppercase tracking-widest text-[10px] shadow-2xl transition-all hover:scale-105 active:scale-95" style={btnFinalStyle}>
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
                  <div className="flex-1 flex flex-col items-center justify-center py-60 opacity-20 text-center">
                    <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6 animate-pulse">
                      <Layout className="w-10 h-10" />
                    </div>
                    <p className="font-black uppercase tracking-[0.4em] text-xs">Ваш проект пуст. Добавьте первый блок из панели слева.</p>
                  </div>
                )}
                {blocks.map((block, index) => (
                  <Draggable key={block.id} draggableId={block.id} index={index}>
                    {(provided) => (
                      <div ref={provided.innerRef} {...provided.draggableProps} className="group relative border-b border-white/5 last:border-b-0">
                        {/* Панель быстрых действий */}
                        <div className="absolute right-8 top-8 flex gap-2 opacity-0 group-hover:opacity-100 transition-all z-50">
                          <button onClick={() => setEditingId(editingId === block.id ? null : block.id)} className={`p-3 bg-card/80 backdrop-blur-xl border rounded-2xl hover:text-primary transition-all ${editingId === block.id ? 'bg-primary text-primary-foreground border-primary' : 'border-white/10'}`}>
                            <Settings2 className="w-5 h-5" />
                          </button>
                          <div {...provided.dragHandleProps} className="p-3 bg-card/80 backdrop-blur-xl border border-white/10 rounded-2xl cursor-grab active:cursor-grabbing"><GripVertical className="w-5 h-5" /></div>
                          <button onClick={() => removeBlock(block.id)} className="p-3 bg-card/80 backdrop-blur-xl border border-white/10 rounded-2xl hover:text-destructive"><Trash2 className="w-5 h-5" /></button>
                        </div>

                        {/* Расширенная панель настроек */}
                        {editingId === block.id && (
                          <div className="absolute right-28 top-8 w-96 bg-card/95 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-8 z-[60] shadow-2xl animate-in fade-in zoom-in duration-300">
                            <div className="flex items-center justify-between mb-8">
                              <h5 className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Мастер Спилей</h5>
                              <button onClick={() => setEditingId(null)} className="p-2 hover:bg-white/5 rounded-full transition-all"><X className="w-4 h-4 opacity-40" /></button>
                            </div>
                            
                            <ScrollArea className="h-[60vh] pr-4">
                              <div className="space-y-8">
                                {/* Группа: Цвета и Фон */}
                                <div className="space-y-4">
                                  <label className="text-[9px] font-black uppercase tracking-widest opacity-30 flex items-center gap-2"><Palette className="w-3 h-3" /> Фон и Цвета</label>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <span className="text-[8px] uppercase font-bold opacity-50">Фон</span>
                                      <input type="color" value={block.styles.backgroundColor} onChange={(e) => updateBlock(block.id, { styles: { ...block.styles, backgroundColor: e.target.value } })} className="w-full h-10 rounded-xl bg-white/5 border-none cursor-pointer" />
                                    </div>
                                    <div className="space-y-2">
                                      <span className="text-[8px] uppercase font-bold opacity-50">Текст</span>
                                      <input type="color" value={block.styles.textColor} onChange={(e) => updateBlock(block.id, { styles: { ...block.styles, textColor: e.target.value } })} className="w-full h-10 rounded-xl bg-white/5 border-none cursor-pointer" />
                                    </div>
                                  </div>
                                  <button onClick={() => fileInputRef.current?.click()} className="w-full py-4 bg-primary/10 text-primary rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-primary/20 transition-all border border-primary/20">
                                    <Upload className="w-4 h-4" /> Загрузить изображение
                                  </button>
                                  <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                                </div>

                                {/* Группа: Типографика */}
                                <div className="space-y-4">
                                  <label className="text-[9px] font-black uppercase tracking-widest opacity-30 flex items-center gap-2"><Type className="w-3 h-3" /> Типографика</label>
                                  <select 
                                    value={block.styles.fontFamily} 
                                    onChange={(e) => updateBlock(block.id, { styles: { ...block.styles, fontFamily: e.target.value as FontFamily } })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-[10px] font-bold outline-none uppercase"
                                  >
                                    {Object.keys(FONT_MAP).map(f => <option key={f} value={f} className="bg-[#0f0f12]">{f.toUpperCase()}</option>)}
                                  </select>
                                  <div className="flex gap-2">
                                    {(['normal', 'large', 'huge'] as const).map(size => (
                                      <button 
                                        key={size}
                                        onClick={() => updateBlock(block.id, { styles: { ...block.styles, fontSize: size } })}
                                        className={`flex-1 py-2 text-[8px] font-black uppercase rounded-lg border transition-all ${block.styles.fontSize === size ? 'bg-primary text-primary-foreground border-primary' : 'border-white/10 hover:bg-white/5'}`}
                                      >
                                        {size}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                {/* Группа: Геометрия */}
                                <div className="space-y-4">
                                  <label className="text-[9px] font-black uppercase tracking-widest opacity-30 flex items-center gap-2"><Maximize2 className="w-3 h-3" /> Геометрия</label>
                                  <div className="space-y-2">
                                    <span className="text-[8px] uppercase font-bold opacity-50">Высота: {block.styles.minHeight}</span>
                                    <input type="text" value={block.styles.minHeight} onChange={(e) => updateBlock(block.id, { styles: { ...block.styles, minHeight: e.target.value } })} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-[10px] font-bold outline-none" placeholder="например, 500px или 80vh" />
                                  </div>
                                  <div className="space-y-2">
                                    <span className="text-[8px] uppercase font-bold opacity-50">Скругление: {block.styles.borderRadius}</span>
                                    <input type="text" value={block.styles.borderRadius} onChange={(e) => updateBlock(block.id, { styles: { ...block.styles, borderRadius: e.target.value } })} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-[10px] font-bold outline-none" placeholder="например, 3rem или 20px" />
                                  </div>
                                </div>

                                {/* Группа: Смещение элементов */}
                                <div className="space-y-4">
                                  <label className="text-[9px] font-black uppercase tracking-widest opacity-30 flex items-center gap-2"><Move className="w-3 h-3" /> Позиционирование</label>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <span className="text-[8px] uppercase font-bold opacity-50">Заголовок X/Y</span>
                                      <div className="flex gap-2">
                                        <input type="number" value={block.styles.titleX} onChange={(e) => updateBlock(block.id, { styles: { ...block.styles, titleX: parseInt(e.target.value) } })} className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-[10px]" />
                                        <input type="number" value={block.styles.titleY} onChange={(e) => updateBlock(block.id, { styles: { ...block.styles, titleY: parseInt(e.target.value) } })} className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-[10px]" />
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      <span className="text-[8px] uppercase font-bold opacity-50">Кнопка X/Y</span>
                                      <div className="flex gap-2">
                                        <input type="number" value={block.styles.btnX} onChange={(e) => updateBlock(block.id, { styles: { ...block.styles, btnX: parseInt(e.target.value) } })} className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-[10px]" />
                                        <input type="number" value={block.styles.btnY} onChange={(e) => updateBlock(block.id, { styles: { ...block.styles, btnY: parseInt(e.target.value) } })} className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-[10px]" />
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Группа: Настройка кнопки */}
                                {block.content.buttonText && (
                                  <div className="space-y-4">
                                    <label className="text-[9px] font-black uppercase tracking-widest opacity-30 flex items-center gap-2"><MousePointer2 className="w-3 h-3" /> Стили Кнопки</label>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="space-y-2">
                                        <span className="text-[8px] uppercase font-bold opacity-50">Фон Кнопки</span>
                                        <input type="color" value={block.styles.buttonBgColor} onChange={(e) => updateBlock(block.id, { styles: { ...block.styles, buttonBgColor: e.target.value } })} className="w-full h-10 rounded-xl bg-white/5 border-none" />
                                      </div>
                                      <div className="space-y-2">
                                        <span className="text-[8px] uppercase font-bold opacity-50">Текст Кнопки</span>
                                        <input type="color" value={block.styles.buttonTextColor} onChange={(e) => updateBlock(block.id, { styles: { ...block.styles, buttonTextColor: e.target.value } })} className="w-full h-10 rounded-xl bg-white/5 border-none" />
                                      </div>
                                    </div>
                                    <div className="flex gap-2">
                                      {(['none', 'md', 'full'] as const).map(radius => (
                                        <button 
                                          key={radius}
                                          onClick={() => updateBlock(block.id, { styles: { ...block.styles, buttonRadius: radius } })}
                                          className={`flex-1 py-2 text-[8px] font-black uppercase rounded-lg border transition-all ${block.styles.buttonRadius === radius ? 'bg-accent text-accent-foreground border-accent' : 'border-white/10 hover:bg-white/5'}`}
                                        >
                                          {radius}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </ScrollArea>

                            <Button onClick={() => setEditingId(null)} className="w-full mt-8 rounded-[1.5rem] bg-primary/20 text-primary hover:bg-primary hover:text-primary-foreground font-black uppercase tracking-[0.2em] text-[10px]">Применить</Button>
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
