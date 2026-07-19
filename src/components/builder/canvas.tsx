'use client';

import React, { useState, useRef, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useBuilderStore, PageBlock, BlockContent, FontFamily } from '@/lib/builder-store';
import { 
  Trash2, GripVertical, Settings2, X, Upload, 
  Layout, Type, Palette, Move, 
  Maximize2, MousePointer2, Sparkles, Sliders,
  Zap, PanelTop, PanelBottom, MousePointer, GripHorizontal,
  Link, MousePointerClick
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

function DraggableElement({ 
  id, 
  x, 
  y, 
  onMove, 
  children, 
  className 
}: { 
  id: string; 
  x: number; 
  y: number; 
  onMove: (nx: number, ny: number) => void;
  children: React.ReactNode;
  className?: string;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const startPos = useRef({ x: 0, y: 0 });
  const startVal = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest('.drag-handle')) return;

    e.preventDefault();
    setIsDragging(true);
    startPos.current = { x: e.clientX, y: e.clientY };
    startVal.current = { x, y };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - startPos.current.x;
      const dy = e.clientY - startPos.current.y;
      onMove(startVal.current.x + dx, startVal.current.y + dy);
    };

    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, onMove]);

  return (
    <div 
      onMouseDown={handleMouseDown}
      className={`${className} relative group/drag select-none transition-shadow duration-300 ${isDragging ? 'z-50' : ''}`}
      style={{ transform: `translate(${x}px, ${y}px)` }}
    >
      <div className="drag-handle absolute -left-8 top-1/2 -translate-y-1/2 p-1.5 bg-primary/20 text-primary rounded-lg cursor-grab active:cursor-grabbing opacity-0 group-hover/drag:opacity-100 transition-all hover:bg-primary hover:text-white z-20">
        <GripHorizontal className="w-4 h-4" />
      </div>
      <div className={`${isDragging ? 'ring-2 ring-primary ring-offset-4 ring-offset-transparent rounded-xl' : ''}`}>
        {children}
      </div>
    </div>
  );
}

function BlockContentComponent({ block, onUpdate }: { 
  block: PageBlock; 
  onUpdate: (content: Partial<BlockContent>, styles?: any) => void;
}) {
  const { styles, content, type } = block;

  const handleMove = (keyPrefix: string, nx: number, ny: number) => {
    onUpdate({}, { 
      ...styles, 
      [`${keyPrefix}X`]: nx, 
      [`${keyPrefix}Y`]: ny 
    });
  };

  const baseStyle = {
    color: styles.textColor,
    fontFamily: FONT_MAP[styles.fontFamily]
  };

  if (type === 'header') {
    return (
      <header className="w-full flex items-center justify-between px-10" style={{ 
        backgroundColor: styles.backgroundColor, 
        minHeight: styles.minHeight,
        color: styles.textColor,
        fontFamily: FONT_MAP[styles.fontFamily]
      }}>
        <DraggableElement id="h-title" x={styles.titleX} y={styles.titleY} onMove={(nx, ny) => handleMove('title', nx, ny)}>
          <div className="font-black text-xl tracking-tighter">{content.title}</div>
        </DraggableElement>
        <nav className="flex items-center gap-6">
          {(content.links || []).map((l, i) => (
            <span key={i} className="text-xs font-bold uppercase tracking-widest cursor-pointer hover:opacity-70">{l.label}</span>
          ))}
        </nav>
      </header>
    );
  }

  return (
    <div className="relative w-full overflow-hidden transition-all duration-500 flex flex-col items-center justify-center flex-1" style={{ 
      backgroundColor: styles.backgroundColor, 
      borderRadius: styles.borderRadius || '0px', 
      minHeight: styles.minHeight 
    }}>
      {styles.backgroundImage && (
        <div className="absolute inset-0 bg-cover bg-center" style={{ 
          backgroundImage: `url(${styles.backgroundImage})`, 
          opacity: styles.backgroundOpacity || 1 
        }} />
      )}
      {styles.overlayOpacity !== undefined && (
        <div className="absolute inset-0 bg-black" style={{ opacity: styles.overlayOpacity }} />
      )}
      <div className={`relative z-10 flex flex-col items-center justify-center text-center w-full h-full ${styles.padding || 'py-20 px-10'}`}>
        <DraggableElement id="title" x={styles.titleX} y={styles.titleY} onMove={(nx, ny) => handleMove('title', nx, ny)} className="max-w-4xl mx-auto">
          <input 
            value={content.title} 
            onChange={(e) => onUpdate({ title: e.target.value })}
            className="bg-transparent border-none font-black text-center w-full outline-none tracking-tighter mb-6"
            style={{ ...baseStyle, fontSize: styles.fontSize === 'huge' ? '4rem' : styles.fontSize === 'large' ? '3rem' : '2.25rem' }}
          />
        </DraggableElement>
        
        <DraggableElement id="desc" x={styles.descX} y={styles.descY} onMove={(nx, ny) => handleMove('desc', nx, ny)} className="max-w-2xl mx-auto">
          <textarea 
            value={content.description} 
            onChange={(e) => onUpdate({ description: e.target.value })}
            className="bg-transparent border-none text-lg text-center w-full outline-none resize-none mb-8 opacity-80"
            style={baseStyle}
            rows={2}
          />
        </DraggableElement>

        {content.buttonText && (
          <DraggableElement id="btn" x={styles.btnX} y={styles.btnY} onMove={(nx, ny) => handleMove('btn', nx, ny)}>
            <button 
              className="px-10 py-4 font-bold uppercase tracking-widest text-[10px] shadow-2xl transition-all"
              style={{ 
                backgroundColor: styles.buttonBgColor,
                color: styles.buttonTextColor,
                borderRadius: styles.buttonRadius === 'full' ? '9999px' : styles.buttonRadius === 'md' ? '1rem' : '0px',
                fontFamily: FONT_MAP[styles.buttonFontFamily || 'sans']
              }}
            >
              {content.buttonText}
            </button>
          </DraggableElement>
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
              <div {...provided.droppableProps} ref={provided.innerRef} className="flex-1 flex flex-col">
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
                      <div 
                        ref={provided.innerRef} 
                        {...provided.draggableProps} 
                        className={`group relative border-b border-white/5 last:border-b-0 flex flex-col ${index === blocks.length - 1 ? 'flex-1' : ''}`}
                      >
                        <div className="absolute right-8 top-8 flex gap-2 opacity-0 group-hover:opacity-100 transition-all z-50">
                          <button onClick={() => setEditingId(editingId === block.id ? null : block.id)} className={`p-3 bg-card/80 backdrop-blur-xl border rounded-2xl hover:text-primary transition-all ${editingId === block.id ? 'bg-primary text-primary-foreground border-primary' : 'border-white/10'}`}>
                            <Settings2 className="w-5 h-5" />
                          </button>
                          <div {...provided.dragHandleProps} className="p-3 bg-card/80 backdrop-blur-xl border border-white/10 rounded-2xl cursor-grab active:cursor-grabbing"><GripVertical className="w-5 h-5" /></div>
                          <button onClick={() => removeBlock(block.id)} className="p-3 bg-card/80 backdrop-blur-xl border border-white/10 rounded-2xl hover:text-destructive"><Trash2 className="w-5 h-5" /></button>
                        </div>

                        {editingId === block.id && (
                          <div className="absolute right-28 top-8 w-96 bg-card/95 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-8 z-[100] shadow-2xl animate-in fade-in zoom-in duration-300">
                            <div className="flex items-center justify-between mb-8">
                              <h5 className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Настройки Блока</h5>
                              <button onClick={() => setEditingId(null)} className="p-2 hover:bg-white/5 rounded-full transition-all"><X className="w-4 h-4 opacity-40" /></button>
                            </div>
                            
                            <ScrollArea className="h-[65vh] pr-4">
                              <div className="space-y-8 pb-10">
                                <div className="space-y-4">
                                  <label className="text-[9px] font-black uppercase tracking-widest opacity-30 flex items-center gap-2"><Palette className="w-3 h-3" /> Фон и Текст</label>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <span className="text-[8px] uppercase font-bold opacity-50">Цвет фона</span>
                                      <input type="color" value={block.styles.backgroundColor} onChange={(e) => updateBlock(block.id, { styles: { ...block.styles, backgroundColor: e.target.value } })} className="w-full h-10 rounded-xl bg-white/5 border-none cursor-pointer" />
                                    </div>
                                    <div className="space-y-2">
                                      <span className="text-[8px] uppercase font-bold opacity-50">Цвет текста</span>
                                      <input type="color" value={block.styles.textColor} onChange={(e) => updateBlock(block.id, { styles: { ...block.styles, textColor: e.target.value } })} className="w-full h-10 rounded-xl bg-white/5 border-none cursor-pointer" />
                                    </div>
                                  </div>
                                  <button onClick={() => fileInputRef.current?.click()} className="w-full py-4 bg-primary/10 text-primary rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-primary/20 transition-all border border-primary/20">
                                    <Upload className="w-4 h-4" /> Загрузить изображение
                                  </button>
                                  <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                                </div>

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

                                <div className="space-y-4">
                                  <label className="text-[9px] font-black uppercase tracking-widest opacity-30 flex items-center gap-2"><MousePointerClick className="w-3 h-3" /> Настройка Кнопки</label>
                                  <div className="space-y-3">
                                    <div className="space-y-2">
                                      <span className="text-[8px] uppercase font-bold opacity-50">Текст кнопки</span>
                                      <input 
                                        type="text" 
                                        value={block.content.buttonText || ''} 
                                        onChange={(e) => updateBlock(block.id, { content: { ...block.content, buttonText: e.target.value } })} 
                                        placeholder="Напр: Узнать больше"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-[10px] font-bold outline-none" 
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <span className="text-[8px] uppercase font-bold opacity-50">Ссылка (URL)</span>
                                      <input 
                                        type="text" 
                                        value={block.content.buttonUrl || ''} 
                                        onChange={(e) => updateBlock(block.id, { content: { ...block.content, buttonUrl: e.target.value } })} 
                                        placeholder="https://..."
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-[10px] font-bold outline-none" 
                                      />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="space-y-2">
                                        <span className="text-[8px] uppercase font-bold opacity-50">Фон кнопки</span>
                                        <input type="color" value={block.styles.buttonBgColor} onChange={(e) => updateBlock(block.id, { styles: { ...block.styles, buttonBgColor: e.target.value } })} className="w-full h-10 rounded-xl bg-white/5 border-none cursor-pointer" />
                                      </div>
                                      <div className="space-y-2">
                                        <span className="text-[8px] uppercase font-bold opacity-50">Текст на кнопке</span>
                                        <input type="color" value={block.styles.buttonTextColor} onChange={(e) => updateBlock(block.id, { styles: { ...block.styles, buttonTextColor: e.target.value } })} className="w-full h-10 rounded-xl bg-white/5 border-none cursor-pointer" />
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      <span className="text-[8px] uppercase font-bold opacity-50">Скругление кнопки</span>
                                      <div className="flex gap-2">
                                        {(['none', 'md', 'full'] as const).map(radius => (
                                          <button 
                                            key={radius}
                                            onClick={() => updateBlock(block.id, { styles: { ...block.styles, buttonRadius: radius } })}
                                            className={`flex-1 py-2 text-[8px] font-black uppercase rounded-lg border transition-all ${block.styles.buttonRadius === radius ? 'bg-primary text-primary-foreground border-primary' : 'border-white/10 hover:bg-white/5'}`}
                                          >
                                            {radius}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <div className="space-y-4">
                                  <label className="text-[9px] font-black uppercase tracking-widest opacity-30 flex items-center gap-2"><Maximize2 className="w-3 h-3" /> Геометрия</label>
                                  <div className="space-y-2">
                                    <span className="text-[8px] uppercase font-bold opacity-50">Мин. высота</span>
                                    <input type="text" value={block.styles.minHeight} onChange={(e) => updateBlock(block.id, { styles: { ...block.styles, minHeight: e.target.value } })} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-[10px] font-bold outline-none" />
                                  </div>
                                  <div className="space-y-2">
                                    <span className="text-[8px] uppercase font-bold opacity-50">Скругление блока (px)</span>
                                    <input type="text" value={block.styles.borderRadius} onChange={(e) => updateBlock(block.id, { styles: { ...block.styles, borderRadius: e.target.value } })} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-[10px] font-bold outline-none" />
                                  </div>
                                </div>
                                <div className="bg-primary/10 p-4 rounded-2xl border border-primary/20 flex items-start gap-3">
                                  <MousePointer className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                                  <p className="text-[8px] font-black uppercase tracking-widest leading-relaxed text-primary">Используйте иконку ручки (слева от элементов), чтобы свободно перемещать их по блоку.</p>
                                </div>
                              </div>
                            </ScrollArea>
                            <Button onClick={() => setEditingId(null)} className="w-full mt-4 rounded-[1.5rem] bg-primary text-primary-foreground font-black uppercase tracking-[0.2em] text-[10px] h-12 shadow-xl shadow-primary/20">Сохранить</Button>
                          </div>
                        )}

                        <BlockContentComponent 
                          block={block} 
                          onUpdate={(c, s) => updateBlock(block.id, { 
                            content: { ...block.content, ...c },
                            styles: s || block.styles
                          })} 
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