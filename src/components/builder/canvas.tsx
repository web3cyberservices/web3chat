'use client';

import React, { useState, useRef, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useBuilderStore, PageBlock, BlockContent, FontFamily } from '@/lib/builder-store';
import { 
  Trash2, GripVertical, Settings2, X, Upload, 
  Layout, Type, Palette, Move, 
  Maximize2, MousePointer2, Sparkles, Sliders,
  Zap, PanelTop, PanelBottom, MousePointer, GripHorizontal,
  Link, MousePointerClick, ChevronDown, Check, Eye
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

function ElementQuickSettings({ 
  type, 
  styles, 
  content,
  onUpdate 
}: { 
  type: 'title' | 'desc' | 'btn'; 
  styles: any; 
  content?: any;
  onUpdate: (s: any, c?: any) => void;
}) {
  return (
    <div className="flex flex-col gap-4 p-5 w-[280px] max-h-[400px] overflow-y-auto bg-card/95 backdrop-blur-3xl border border-white/10 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[9999] custom-scrollbar">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Свойства элемента</span>
        <Sliders className="w-3.5 h-3.5 text-primary" />
      </div>

      <div className="space-y-4 pb-2">
        <div className="space-y-2">
          <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Цвет / Фон</label>
          <input 
            type="color" 
            value={type === 'title' ? (styles.titleColor || styles.textColor) : type === 'desc' ? (styles.descColor || styles.textColor) : styles.buttonBgColor} 
            onChange={(e) => {
              const key = type === 'title' ? 'titleColor' : type === 'desc' ? 'descColor' : 'buttonBgColor';
              onUpdate({ ...styles, [key]: e.target.value });
            }}
            className="w-full h-10 rounded-xl cursor-pointer bg-white/5 border-none" 
          />
        </div>

        <div className="space-y-2">
          <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Шрифт</label>
          <select 
            value={type === 'title' ? styles.titleFont : type === 'desc' ? styles.descFont : styles.buttonFontFamily} 
            onChange={(e) => {
              const key = type === 'title' ? 'titleFont' : type === 'desc' ? 'descFont' : 'buttonFontFamily';
              onUpdate({ ...styles, [key]: e.target.value });
            }}
            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-[10px] font-bold outline-none uppercase"
          >
            {Object.keys(FONT_MAP).map(f => <option key={f} value={f} className="bg-[#0f0f12] text-white">{f.toUpperCase()}</option>)}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Прозрачность</label>
          <input 
            type="range" 
            min="0" max="1" step="0.1"
            value={type === 'title' ? (styles.titleOpacity ?? 1) : type === 'desc' ? (styles.descOpacity ?? 1) : (styles.buttonOpacity ?? 1)} 
            onChange={(e) => {
              const key = type === 'title' ? 'titleOpacity' : type === 'desc' ? 'descOpacity' : 'buttonOpacity';
              onUpdate({ ...styles, [key]: parseFloat(e.target.value) });
            }}
            className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-primary"
          />
        </div>

        {type === 'btn' && (
          <>
            <div className="space-y-2">
              <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Текст кнопки</label>
              <input 
                type="text" 
                value={content?.buttonText || ''} 
                onChange={(e) => onUpdate(styles, { buttonText: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-[10px] outline-none" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Ссылка (URL)</label>
              <input 
                type="text" 
                value={content?.buttonUrl || ''} 
                onChange={(e) => onUpdate(styles, { buttonUrl: e.target.value })}
                placeholder="https://..."
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-[10px] outline-none font-mono" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Скругление</label>
              <div className="flex gap-1">
                {(['none', 'md', 'full'] as const).map(r => (
                  <button 
                    key={r}
                    onClick={() => onUpdate({ ...styles, buttonRadius: r })}
                    className={`flex-1 py-2 text-[8px] font-black uppercase rounded-lg border transition-all ${styles.buttonRadius === r ? 'bg-primary text-primary-foreground border-primary' : 'border-white/10 hover:bg-white/5'}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function DraggableElement({ 
  id, 
  x, 
  y, 
  onMove, 
  children, 
  className,
  settingsContent
}: { 
  id: string; 
  x: number; 
  y: number; 
  onMove: (nx: number, ny: number) => void;
  children: React.ReactNode;
  className?: string;
  settingsContent?: React.ReactNode;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const startPos = useRef({ x: 0, y: 0 });
  const startVal = useRef({ x, y });
  const settingsRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettings(false);
      }
    };
    if (showSettings) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSettings]);

  // Умное позиционирование: если элемент в нижней половине экрана, показываем настройки сверху
  const [positionAbove, setPositionAbove] = useState(true);
  
  useEffect(() => {
    if (showSettings && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      // Если до низа экрана меньше 450px, открываем наверх
      setPositionAbove(viewportHeight - rect.bottom < 450);
    }
  }, [showSettings]);

  return (
    <div 
      ref={containerRef}
      onMouseDown={handleMouseDown}
      className={`${className} relative group/drag select-none transition-shadow duration-300 ${isDragging ? 'z-[999]' : 'z-10'}`}
      style={{ transform: `translate(${x}px, ${y}px)` }}
    >
      <div className="drag-handle absolute -left-12 top-1/2 -translate-y-1/2 p-3 bg-primary/20 text-primary rounded-xl cursor-grab active:cursor-grabbing opacity-0 group-hover/drag:opacity-100 transition-all hover:bg-primary hover:text-white z-20 shadow-xl border border-primary/20">
        <GripHorizontal className="w-4 h-4" />
      </div>

      <div 
        className={`absolute -right-12 top-1/2 -translate-y-1/2 p-3 border text-white/40 rounded-xl cursor-pointer opacity-0 group-hover/drag:opacity-100 transition-all z-20 shadow-xl ${showSettings ? 'bg-primary text-white border-primary' : 'bg-card/80 backdrop-blur-xl border-white/10 hover:bg-primary hover:text-white'}`} 
        onClick={() => setShowSettings(!showSettings)}
      >
        <Settings2 className="w-4 h-4" />
      </div>

      {showSettings && (
        <div 
          ref={settingsRef} 
          className={`absolute left-1/2 -translate-x-1/2 z-[9999] animate-in fade-in zoom-in duration-200 ${positionAbove ? 'bottom-full mb-6' : 'top-full mt-6'}`}
        >
          {settingsContent}
        </div>
      )}

      <div className={`${isDragging ? 'ring-2 ring-primary ring-offset-4 ring-offset-transparent rounded-lg scale-[1.01] shadow-2xl' : ''} transition-all duration-300`}>
        {children}
      </div>
    </div>
  );
}

function BlockContentComponent({ block, onUpdate, isEditing, isLast }: { 
  block: PageBlock; 
  onUpdate: (content: Partial<BlockContent>, styles?: any) => void;
  isEditing: boolean;
  isLast: boolean;
}) {
  const { styles, content, type } = block;

  const handleMove = (keyPrefix: string, nx: number, ny: number) => {
    onUpdate({}, { 
      ...styles, 
      [`${keyPrefix}X`]: nx, 
      [`${keyPrefix}Y`]: ny 
    });
  };

  if (type === 'header') {
    return (
      <header className="w-full flex items-center justify-between px-12 relative z-[100] transition-all duration-500" style={{ 
        backgroundColor: styles.backgroundColor, 
        minHeight: styles.minHeight,
        color: styles.textColor,
        fontFamily: FONT_MAP[styles.fontFamily],
        borderRadius: styles.borderRadius || '0px'
      }}>
        <DraggableElement id="h-title" x={styles.titleX} y={styles.titleY} onMove={(nx, ny) => handleMove('title', nx, ny)}>
          <div className="font-black text-2xl tracking-tighter">{content.title}</div>
        </DraggableElement>
        <nav className="flex items-center gap-10">
          {(content.links || []).map((l, i) => (
            <span key={i} className="text-[10px] font-black uppercase tracking-[0.3em] cursor-pointer hover:text-primary transition-colors">{l.label}</span>
          ))}
        </nav>
      </header>
    );
  }

  return (
    <div className={`relative w-full transition-all duration-1000 flex flex-col items-center justify-center ${isLast ? 'flex-grow' : ''} ${!isEditing ? 'overflow-hidden' : ''}`} style={{ 
      backgroundColor: styles.backgroundColor, 
      borderRadius: styles.borderRadius || '0px', 
      minHeight: styles.minHeight,
      marginTop: (type !== 'header' && block.id === useBuilderStore.getState().blocks[1]?.id && useBuilderStore.getState().blocks[0]?.styles.isOverlay) ? `-${useBuilderStore.getState().blocks[0]?.styles.minHeight}` : '0'
    }}>
      {styles.backgroundImage && (
        <div className="absolute inset-0 bg-cover bg-center" style={{ 
          backgroundImage: `url(${styles.backgroundImage})`, 
          opacity: styles.backgroundOpacity || 1,
          borderRadius: styles.borderRadius || '0px'
        }} />
      )}
      {styles.overlayOpacity !== undefined && (
        <div className="absolute inset-0 bg-black" style={{ opacity: styles.overlayOpacity, borderRadius: styles.borderRadius || '0px' }} />
      )}
      <div className={`relative z-10 flex flex-col items-center justify-center text-center w-full h-full ${styles.padding || 'py-32 px-10'}`}>
        <DraggableElement 
          id="title" 
          x={styles.titleX} 
          y={styles.titleY} 
          onMove={(nx, ny) => handleMove('title', nx, ny)} 
          className="max-w-5xl mx-auto w-full"
          settingsContent={
            <ElementQuickSettings 
              type="title" 
              styles={styles} 
              onUpdate={(s) => onUpdate({}, s)} 
            />
          }
        >
          <input 
            value={content.title} 
            onChange={(e) => onUpdate({ title: e.target.value })}
            className="bg-transparent border-none font-black text-center w-full outline-none tracking-tighter mb-8 placeholder:opacity-20"
            style={{ 
              color: styles.titleColor || styles.textColor,
              fontFamily: FONT_MAP[styles.titleFont || styles.fontFamily],
              fontSize: styles.fontSize === 'huge' ? '6rem' : styles.fontSize === 'large' ? '4.5rem' : '2.5rem',
              opacity: styles.titleOpacity ?? 1
            }}
          />
        </DraggableElement>
        
        <DraggableElement 
          id="desc" 
          x={styles.descX} 
          y={styles.descY} 
          onMove={(nx, ny) => handleMove('desc', nx, ny)} 
          className="max-w-4xl mx-auto w-full"
          settingsContent={
            <ElementQuickSettings 
              type="desc" 
              styles={styles} 
              onUpdate={(s) => onUpdate({}, s)} 
            />
          }
        >
          <textarea 
            value={content.description} 
            onChange={(e) => onUpdate({ description: e.target.value })}
            className="bg-transparent border-none text-xl lg:text-2xl text-center w-full outline-none resize-none mb-12 placeholder:opacity-20 leading-relaxed"
            style={{
              color: styles.descColor || styles.textColor,
              fontFamily: FONT_MAP[styles.descFont || styles.fontFamily],
              opacity: styles.descOpacity ?? 0.8
            }}
            rows={2}
          />
        </DraggableElement>

        {content.buttonText && (
          <DraggableElement 
            id="btn" 
            x={styles.btnX} 
            y={styles.btnY} 
            onMove={(nx, ny) => handleMove('btn', nx, ny)}
            settingsContent={
              <ElementQuickSettings 
                type="btn" 
                styles={styles} 
                content={content}
                onUpdate={(s, c) => onUpdate(c || {}, s)} 
              />
            }
          >
            <button 
              className="px-16 py-6 font-black uppercase tracking-[0.4em] text-[12px] shadow-2xl transition-all hover:scale-105 active:scale-95"
              style={{ 
                backgroundColor: styles.buttonBgColor,
                color: styles.buttonTextColor,
                borderRadius: styles.buttonRadius === 'full' ? '9999px' : styles.buttonRadius === 'md' ? '2rem' : '0px',
                fontFamily: FONT_MAP[styles.buttonFontFamily || 'sans'],
                opacity: styles.buttonOpacity ?? 1
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
    desktop: 'max-w-7xl',
    tablet: 'max-w-3xl',
    mobile: 'max-w-[420px]'
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
    <div className="flex-1 bg-[#050507] overflow-y-auto p-12 transition-all duration-1000 relative custom-scrollbar">
      <div className={`${canvasWidth} mx-auto min-h-dvh bg-background shadow-2xl rounded-[4rem] flex flex-col transition-all duration-1000 relative border border-white/5 overflow-x-hidden`}>
        <DragDropContext onDragEnd={(res) => res.destination && reorderBlocks(res.source.index, res.destination.index)}>
          <Droppable droppableId="canvas">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="flex-1 flex flex-col min-h-full">
                {blocks.length === 0 && (
                  <div className="flex-1 flex flex-col items-center justify-center py-60 opacity-20 text-center animate-in fade-in duration-1000">
                    <div className="w-32 h-32 bg-white/5 rounded-full flex items-center justify-center mb-8 animate-pulse">
                      <Layout className="w-12 h-12" />
                    </div>
                    <p className="font-black uppercase tracking-[0.5em] text-[12px]">Начните синтез вашего проекта</p>
                  </div>
                )}
                {blocks.map((block, index) => (
                  <Draggable key={block.id} draggableId={block.id} index={index}>
                    {(provided) => (
                      <div 
                        ref={provided.innerRef} 
                        {...provided.draggableProps} 
                        className={`group relative border-b border-white/5 last:border-b-0 flex flex-col transition-all duration-500 ${index === blocks.length - 1 ? 'flex-grow' : ''} ${block.type === 'header' ? 'z-[100]' : 'z-10'}`}
                        style={{ 
                          ...provided.draggableProps.style,
                          marginBottom: (block.type === 'header' && block.styles.isOverlay) ? `-${block.styles.minHeight}` : '0'
                        }}
                      >
                        <div className="absolute right-12 top-12 flex gap-4 opacity-0 group-hover:opacity-100 transition-all z-[200]">
                          <button onClick={() => setEditingId(editingId === block.id ? null : block.id)} className={`p-5 bg-card/90 backdrop-blur-3xl border rounded-[2rem] hover:text-primary transition-all shadow-2xl ${editingId === block.id ? 'bg-primary text-primary-foreground border-primary' : 'border-white/10'}`}>
                            <Settings2 className="w-6 h-6" />
                          </button>
                          <div {...provided.dragHandleProps} className="p-5 bg-card/90 backdrop-blur-3xl border border-white/10 rounded-[2rem] cursor-grab active:cursor-grabbing shadow-2xl"><GripVertical className="w-6 h-6" /></div>
                          <button onClick={() => removeBlock(block.id)} className="p-5 bg-card/90 backdrop-blur-3xl border border-white/10 rounded-[2rem] hover:text-destructive transition-all shadow-2xl"><Trash2 className="w-6 h-6" /></button>
                        </div>

                        {editingId === block.id && (
                          <div className="fixed right-16 top-24 w-[400px] max-h-[80vh] bg-card/95 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-10 z-[500] shadow-[0_30px_100px_rgba(0,0,0,0.8)] animate-in fade-in zoom-in duration-300 flex flex-col overflow-hidden bento-inner-glow">
                            <div className="flex items-center justify-between mb-8 shrink-0">
                              <h5 className="text-[12px] font-black uppercase tracking-[0.5em] text-primary">Параметры блока</h5>
                              <button onClick={() => setEditingId(null)} className="p-3 hover:bg-white/5 rounded-full transition-all"><X className="w-6 h-6 opacity-40" /></button>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto pr-3 custom-scrollbar">
                              <div className="space-y-12 pb-10">
                                <div className="space-y-6">
                                  <label className="text-[11px] font-black uppercase tracking-widest opacity-30 flex items-center gap-4"><Palette className="w-5 h-5" /> Стилизация</label>
                                  <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                      <span className="text-[10px] uppercase font-bold opacity-50">Фон</span>
                                      <input type="color" value={block.styles.backgroundColor} onChange={(e) => updateBlock(block.id, { styles: { ...block.styles, backgroundColor: e.target.value } })} className="w-full h-12 rounded-2xl bg-white/5 border-none cursor-pointer" />
                                    </div>
                                    <div className="space-y-3">
                                      <span className="text-[10px] uppercase font-bold opacity-50">Текст</span>
                                      <input type="color" value={block.styles.textColor} onChange={(e) => updateBlock(block.id, { styles: { ...block.styles, textColor: e.target.value } })} className="w-full h-12 rounded-2xl bg-white/5 border-none cursor-pointer" />
                                    </div>
                                  </div>
                                  <button onClick={() => fileInputRef.current?.click()} className="w-full py-5 bg-primary/10 text-primary rounded-[2rem] text-[11px] font-black uppercase flex items-center justify-center gap-4 hover:bg-primary/20 transition-all border border-primary/20 premium-border">
                                    <Upload className="w-5 h-5" /> Изменить медиа
                                  </button>
                                  <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                                </div>

                                <div className="space-y-6">
                                  <label className="text-[11px] font-black uppercase tracking-widest opacity-30 flex items-center gap-4"><Type className="w-5 h-5" /> Шрифты</label>
                                  <select 
                                    value={block.styles.fontFamily} 
                                    onChange={(e) => updateBlock(block.id, { styles: { ...block.styles, fontFamily: e.target.value as FontFamily } })}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-[12px] font-black outline-none uppercase tracking-widest"
                                  >
                                    {Object.keys(FONT_MAP).map(f => <option key={f} value={f} className="bg-[#0f0f12] text-white">{f.toUpperCase()}</option>)}
                                  </select>
                                  <div className="flex gap-2">
                                    {(['normal', 'large', 'huge'] as const).map(size => (
                                      <button 
                                        key={size}
                                        onClick={() => updateBlock(block.id, { styles: { ...block.styles, fontSize: size } })}
                                        className={`flex-1 py-4 text-[10px] font-black uppercase rounded-xl border transition-all ${block.styles.fontSize === size ? 'bg-primary text-primary-foreground border-primary shadow-xl shadow-primary/30' : 'border-white/10 hover:bg-white/5'}`}
                                      >
                                        {size}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                <div className="space-y-6">
                                  <label className="text-[11px] font-black uppercase tracking-widest opacity-30 flex items-center gap-4"><Maximize2 className="w-5 h-5" /> Геометрия</label>
                                  <div className="space-y-6">
                                    <div className="space-y-3">
                                      <span className="text-[10px] uppercase font-bold opacity-50">Минимальная высота (напр. 85vh)</span>
                                      <input type="text" value={block.styles.minHeight} onChange={(e) => updateBlock(block.id, { styles: { ...block.styles, minHeight: e.target.value } })} className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-[12px] font-bold outline-none" />
                                    </div>
                                    <div className="space-y-3">
                                      <span className="text-[10px] uppercase font-bold opacity-50">Скругление углов (напр. 50px)</span>
                                      <input type="text" value={block.styles.borderRadius} onChange={(e) => updateBlock(block.id, { styles: { ...block.styles, borderRadius: e.target.value } })} className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-[12px] font-bold outline-none" />
                                    </div>
                                    <div className="flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/5">
                                      <span className="text-[10px] uppercase font-bold opacity-50">Режим наложения (Overlay)</span>
                                      <input 
                                        type="checkbox" 
                                        checked={block.styles.isOverlay} 
                                        onChange={(e) => updateBlock(block.id, { styles: { ...block.styles, isOverlay: e.target.checked } })}
                                        className="w-6 h-6 accent-primary cursor-pointer"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <Button onClick={() => setEditingId(null)} className="w-full mt-8 rounded-[2rem] bg-primary text-primary-foreground font-black uppercase tracking-[0.4em] text-[12px] h-16 shadow-2xl shadow-primary/40 shrink-0 hover:scale-[1.02] active:scale-95 transition-all">Применить изменения</Button>
                          </div>
                        )}

                        <BlockContentComponent 
                          block={block} 
                          onUpdate={(c, s) => updateBlock(block.id, { 
                            content: { ...block.content, ...c },
                            styles: s || block.styles
                          })}
                          isEditing={editingId === block.id}
                          isLast={index === blocks.length - 1}
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