'use client';

import React, { useState, useRef, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useBuilderStore, PageBlock, BlockContent, FontFamily } from '@/lib/builder-store';
import { 
  Trash2, GripVertical, Settings2, X, Upload, 
  Layout, Type, Palette, Move, 
  Maximize2, MousePointer2, Sparkles, Sliders,
  Zap, PanelTop, PanelBottom, MousePointer, GripHorizontal,
  Link, MousePointerClick, ChevronDown, Check, Eye, Sun,
  Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';

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

const TEXT_SHADOW_MAP = {
  none: 'none',
  soft: '0 0 15px rgba(0,0,0,0.3)',
  medium: '0 0 35px rgba(0,0,0,0.5)',
  hard: '0 0 60px rgba(0,0,0,0.7)'
};

const BOX_SHADOW_MAP = {
  none: 'none',
  soft: '0 0 40px -5px rgba(0,0,0,0.2)',
  medium: '0 0 70px -10px rgba(0,0,0,0.4)',
  hard: '0 0 120px -20px rgba(0,0,0,0.6)'
};

function hexToRgba(hex: string, opacity: number): string {
  let r = 0, g = 0, b = 0;
  if (!hex || hex === 'transparent') return 'transparent';
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

interface EditingElement {
  blockId: string;
  type: 'title' | 'desc' | 'btn';
}

function ElementSettingsPanel({ 
  element, 
  block, 
  onUpdate, 
  onClose 
}: { 
  element: EditingElement; 
  block: PageBlock;
  onUpdate: (s: any, c?: any) => void;
  onClose: () => void;
}) {
  const { styles, content } = block;
  const { type } = element;

  const prefix = type === 'title' ? 'title' : type === 'desc' ? 'desc' : 'button';

  return (
    <div className="fixed right-16 top-24 w-[400px] h-[75vh] bg-card/95 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-10 z-[9999] shadow-[0_30px_100px_rgba(0,0,0,0.8)] animate-in fade-in zoom-in duration-300 flex flex-col overflow-hidden bento-inner-glow">
      <div className="flex items-center justify-between mb-8 shrink-0">
        <div className="flex flex-col">
          <h5 className="text-[12px] font-black uppercase tracking-[0.5em] text-primary">Настройка элемента</h5>
          <span className="text-[8px] font-bold opacity-30 uppercase mt-1">{type === 'title' ? 'Заголовок' : type === 'desc' ? 'Описание' : 'Кнопка'}</span>
        </div>
        <button onClick={onClose} className="p-3 hover:bg-white/5 rounded-full transition-all"><X className="w-6 h-6 opacity-40" /></button>
      </div>

      <div className="flex-1 overflow-y-auto pr-3 custom-scrollbar">
        <div className="space-y-10 pb-10">
          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-widest opacity-40 flex items-center gap-2">
              <Palette className="w-3.5 h-3.5" /> {type === 'btn' ? 'Цвет текста кнопки' : 'Цвет текста'}
            </label>
            <input 
              type="color" 
              value={type === 'btn' ? (styles.buttonTextColor || '#ffffff') : ((styles as any)[`${prefix}Color`] || styles.textColor)} 
              onChange={(e) => {
                if (type === 'btn') onUpdate({ ...styles, buttonTextColor: e.target.value });
                else onUpdate({ ...styles, [`${prefix}Color`]: e.target.value });
              }}
              className="w-full h-12 rounded-2xl cursor-pointer bg-white/5 border-none p-1" 
            />
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-widest opacity-40 flex items-center gap-2">
              <Type className="w-3.5 h-3.5" /> Шрифт
            </label>
            <select 
              value={type === 'btn' ? (styles.buttonFontFamily || 'sans') : ((styles as any)[`${prefix}Font`] || styles.fontFamily)} 
              onChange={(e) => {
                const key = type === 'btn' ? 'buttonFontFamily' : `${prefix}Font`;
                onUpdate({ ...styles, [key]: e.target.value });
              }}
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-[11px] font-black outline-none uppercase tracking-widest"
            >
              {Object.keys(FONT_MAP).map(f => <option key={f} value={f} className="bg-[#0f0f12] text-white">{f.toUpperCase()}</option>)}
            </select>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-widest opacity-40 flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5" /> Прозрачность
            </label>
            <input 
              type="range" 
              min="0" max="1" step="0.1"
              value={type === 'btn' ? (styles.buttonOpacity ?? 1) : ((styles as any)[`${prefix}Opacity`] ?? 1)} 
              onChange={(e) => {
                const key = type === 'btn' ? 'buttonOpacity' : `${prefix}Opacity`;
                onUpdate({ ...styles, [key]: parseFloat(e.target.value) });
              }}
              className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-primary"
            />
          </div>

          <div className="space-y-6">
            <label className="text-[11px] font-black uppercase tracking-widest opacity-30 flex items-center gap-4"><Zap className="w-5 h-5" /> {type === 'btn' ? 'Границы Кнопки' : 'Ободок и Свечение'}</label>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <span className="text-[10px] uppercase font-bold opacity-50">Цвет ободка</span>
                <input type="color" value={(styles as any)[`${prefix}BorderColor`] || '#ffffff'} onChange={(e) => onUpdate({ ...styles, [`${prefix}BorderColor`]: e.target.value })} className="w-full h-12 rounded-2xl bg-white/5 border-none cursor-pointer" />
              </div>
              <div className="space-y-3">
                <span className="text-[10px] uppercase font-bold opacity-50">Толщина (px)</span>
                <input type="text" value={(styles as any)[`${prefix}BorderWidth`] || '0px'} onChange={(e) => onUpdate({ ...styles, [`${prefix}BorderWidth`]: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-[12px] font-bold outline-none" />
              </div>
            </div>
            <div className="flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/5">
              <div className="flex items-center gap-3">
                <Sun className="w-4 h-4 text-primary" />
                <span className="text-[10px] uppercase font-bold opacity-50">Эффект свечения</span>
              </div>
              <input 
                type="checkbox" 
                checked={(styles as any)[`${prefix}BorderGlow`] || false} 
                onChange={(e) => onUpdate({ ...styles, [`${prefix}BorderGlow`]: e.target.checked })}
                className="w-6 h-6 accent-primary cursor-pointer"
              />
            </div>
            {(styles as any)[`${prefix}BorderGlow`] && (
              <div className="space-y-3">
                <span className="text-[10px] uppercase font-bold opacity-50">Сила свечения</span>
                <input 
                  type="range" min="0" max="150" step="1"
                  value={(styles as any)[`${prefix}BorderGlowStrength`] ?? 30}
                  onChange={(e) => onUpdate({ ...styles, [`${prefix}BorderGlowStrength`]: parseInt(e.target.value) })}
                  className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-primary"
                />
              </div>
            )}
          </div>

          <div className="space-y-6">
            <label className="text-[11px] font-black uppercase tracking-widest opacity-30 flex items-center gap-4"><Layers className="w-5 h-5" /> Тень {type === 'btn' ? 'Кнопки' : 'Текста'}</label>
            <div className="grid grid-cols-2 gap-2">
              {(['none', 'soft', 'medium', 'hard'] as const).map(s => (
                <button 
                  key={s}
                  onClick={() => onUpdate({ ...styles, [`${prefix}Shadow`]: s })}
                  className={`py-3 text-[9px] font-black uppercase rounded-xl border transition-all ${(styles as any)[`${prefix}Shadow`] === s ? 'bg-primary text-primary-foreground border-primary' : 'border-white/10 hover:bg-white/5'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {type === 'btn' && (
            <div className="space-y-10 pt-10 border-t border-white/5">
              <div className="space-y-6">
                <label className="text-[11px] font-black uppercase tracking-widest text-primary flex items-center gap-4"><Type className="w-5 h-5" /> Текст кнопки</label>
                
                <div className="space-y-3">
                  <span className="text-[10px] uppercase font-bold opacity-50">Надпись на кнопке</span>
                  <input 
                    type="text" 
                    value={content?.buttonText || ''} 
                    onChange={(e) => onUpdate(styles, { buttonText: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-[11px] font-bold outline-none" 
                  />
                </div>

                <div className="space-y-3">
                  <span className="text-[10px] uppercase font-bold opacity-50">Ссылка (URL)</span>
                  <input 
                    type="text" 
                    value={content?.buttonUrl || ''} 
                    onChange={(e) => onUpdate(styles, { buttonUrl: e.target.value })}
                    placeholder="https://..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-[11px] outline-none font-mono" 
                  />
                </div>
              </div>

              <div className="space-y-6">
                <label className="text-[11px] font-black uppercase tracking-widest text-primary flex items-center gap-4"><Zap className="w-5 h-5" /> Эффекты Текста Кнопки</label>
                
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <span className="text-[10px] uppercase font-bold opacity-50">Ободок букв</span>
                    <input type="color" value={styles.buttonTextBorderColor || '#ffffff'} onChange={(e) => onUpdate({ ...styles, buttonTextBorderColor: e.target.value })} className="w-full h-12 rounded-2xl bg-white/5 border-none cursor-pointer" />
                  </div>
                  <div className="space-y-3">
                    <span className="text-[10px] uppercase font-bold opacity-50">Толщина (px)</span>
                    <input type="text" value={styles.buttonTextBorderWidth || '0px'} onChange={(e) => onUpdate({ ...styles, buttonTextBorderWidth: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-[12px] font-bold outline-none" />
                  </div>
                </div>

                <div className="flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/5">
                  <span className="text-[10px] uppercase font-bold opacity-50">Свечение текста</span>
                  <input 
                    type="checkbox" 
                    checked={styles.buttonTextBorderGlow} 
                    onChange={(e) => onUpdate({ ...styles, buttonTextBorderGlow: e.target.checked })}
                    className="w-6 h-6 accent-primary cursor-pointer"
                  />
                </div>

                {styles.buttonTextBorderGlow && (
                  <div className="space-y-3">
                    <span className="text-[10px] uppercase font-bold opacity-50">Сила свечения</span>
                    <input 
                      type="range" min="0" max="100" step="1"
                      value={styles.buttonTextBorderGlowStrength ?? 15}
                      onChange={(e) => onUpdate({ ...styles, buttonTextBorderGlowStrength: parseInt(e.target.value) })}
                      className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-primary"
                    />
                  </div>
                )}

                <div className="space-y-3">
                  <span className="text-[10px] uppercase font-bold opacity-50">Тень текста кнопки</span>
                  <div className="grid grid-cols-2 gap-2">
                    {(['none', 'soft', 'medium', 'hard'] as const).map(s => (
                      <button 
                        key={s}
                        onClick={() => onUpdate({ ...styles, buttonTextShadow: s })}
                        className={`py-3 text-[9px] font-black uppercase rounded-xl border transition-all ${styles.buttonTextShadow === s ? 'bg-accent text-accent-foreground border-accent' : 'border-white/10 hover:bg-white/5'}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Скругление углов</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['none', 'md', 'full'] as const).map(r => (
                    <button 
                      key={r}
                      onClick={() => onUpdate({ ...styles, buttonRadius: r })}
                      className={`py-4 text-[10px] font-black uppercase rounded-xl border transition-all ${styles.buttonRadius === r ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20' : 'border-white/10 hover:bg-white/5'}`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <Button onClick={onClose} className="w-full mt-8 rounded-[2rem] bg-primary text-primary-foreground font-black uppercase tracking-[0.4em] text-[12px] h-16 shadow-2xl shadow-primary/40 shrink-0">Применить</Button>
    </div>
  );
}

function DraggableElement({ 
  id, 
  x, 
  y, 
  onMove, 
  onSettingsClick,
  isSettingsOpen,
  children, 
  className
}: { 
  id: string; 
  x: number; 
  y: number; 
  onMove: (nx: number, ny: number) => void;
  onSettingsClick: () => void;
  isSettingsOpen: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const startPos = useRef({ x: 0, y: 0 });
  const startVal = useRef({ x, y });

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
      className={`${className} relative group/drag select-none transition-shadow duration-300 ${isDragging ? 'z-[999]' : 'z-10'}`}
      style={{ transform: `translate(${x}px, ${y}px)` }}
    >
      <div className="drag-handle absolute -left-12 top-1/2 -translate-y-1/2 p-3 bg-primary/20 text-primary rounded-xl cursor-grab active:cursor-grabbing opacity-0 group-hover/drag:opacity-100 transition-all hover:bg-primary hover:text-white z-20 shadow-xl border border-primary/20">
        <GripHorizontal className="w-4 h-4" />
      </div>

      <div 
        className={`absolute -right-12 top-1/2 -translate-y-1/2 p-3 border text-white/40 rounded-xl cursor-pointer opacity-0 group-hover/drag:opacity-100 transition-all z-20 shadow-xl ${isSettingsOpen ? 'bg-primary text-white border-primary' : 'bg-card/80 backdrop-blur-xl border-white/10 hover:bg-primary hover:text-white'}`} 
        onClick={onSettingsClick}
      >
        <Settings2 className="w-4 h-4" />
      </div>

      <div className={`${isDragging ? 'ring-2 ring-primary ring-offset-4 ring-offset-transparent rounded-lg scale-[1.01] shadow-2xl' : ''} transition-all duration-300`}>
        {children}
      </div>
    </div>
  );
}

function BlockContentComponent({ block, onUpdate, editingElement, onSetEditingElement, isLast, isFirst }: { 
  block: PageBlock; 
  onUpdate: (content: Partial<BlockContent>, styles?: any) => void;
  editingElement: EditingElement | null;
  onSetEditingElement: (el: EditingElement | null) => void;
  isLast: boolean;
  isFirst: boolean;
}) {
  const { styles, content, type } = block;

  const handleMove = (keyPrefix: string, nx: number, ny: number) => {
    onUpdate({}, { 
      ...styles, 
      [`${keyPrefix}X`]: nx, 
      [`${keyPrefix}Y`]: ny 
    });
  };

  const bgRgba = hexToRgba(styles.backgroundColor, styles.backgroundOpacity ?? 1);
  const glowStyle = styles.borderGlow ? `0 0 ${styles.borderGlowStrength || 15}px ${styles.borderColor || styles.textColor}` : 'none';

  if (type === 'header') {
    const position = styles.isOverlay ? 'absolute' : 'relative';
    return (
      <header className={`w-full flex items-center justify-between px-12 z-[100] transition-all duration-500`} style={{ 
        backgroundColor: bgRgba, 
        minHeight: styles.minHeight,
        color: styles.textColor,
        fontFamily: FONT_MAP[styles.fontFamily],
        borderRadius: styles.borderRadius || '0px',
        border: `${styles.borderWidth || '0px'} solid ${styles.borderColor || 'transparent'}`,
        boxShadow: glowStyle,
        position: position as any,
        top: 0,
        left: 0
      }}>
        <DraggableElement 
          id="h-title" 
          x={styles.titleX} 
          y={styles.titleY} 
          onMove={(nx, ny) => handleMove('title', nx, ny)}
          onSettingsClick={() => onSetEditingElement({ blockId: block.id, type: 'title' })}
          isSettingsOpen={editingElement?.blockId === block.id && editingElement?.type === 'title'}
        >
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

  const fontSizeValue = styles.fontSize === 'huge' ? '6rem' : styles.fontSize === 'large' ? '4.5rem' : '2.5rem';

  const titleShadow = TEXT_SHADOW_MAP[styles.titleShadow || 'none'];
  const titleGlow = styles.titleBorderGlow ? `0 0 ${styles.titleBorderGlowStrength || 20}px ${styles.titleBorderColor || styles.titleColor || styles.textColor}` : 'none';
  const titleCombinedShadow = titleGlow !== 'none' ? `${titleGlow}${titleShadow !== 'none' ? `, ${titleShadow}` : ''}` : titleShadow;

  const descShadow = TEXT_SHADOW_MAP[styles.descShadow || 'none'];
  const descGlow = styles.descBorderGlow ? `0 0 ${styles.descBorderGlowStrength || 20}px ${styles.descBorderColor || styles.descColor || styles.textColor}` : 'none';
  const descCombinedShadow = descGlow !== 'none' ? `${descGlow}${descShadow !== 'none' ? `, ${descShadow}` : ''}` : descShadow;

  const btnContainerShadow = BOX_SHADOW_MAP[styles.buttonShadow || 'none'];
  const btnContainerGlow = styles.buttonBorderGlow ? `0 0 ${styles.buttonBorderGlowStrength || 40}px ${styles.buttonBorderColor || styles.buttonBgColor}` : 'none';
  const btnContainerCombinedShadow = btnContainerGlow !== 'none' ? `${btnContainerGlow}${btnContainerShadow !== 'none' ? `, ${btnContainerShadow}` : ''}` : btnContainerShadow;

  const btnTextShadow = TEXT_SHADOW_MAP[styles.buttonTextShadow || 'none'];
  const btnTextGlow = styles.buttonTextBorderGlow ? `0 0 ${styles.buttonTextBorderGlowStrength || 15}px ${styles.buttonTextBorderColor || styles.buttonTextColor}` : 'none';
  const btnTextCombinedShadow = btnTextGlow !== 'none' ? `${btnTextGlow}${btnTextShadow !== 'none' ? `, ${btnTextShadow}` : ''}` : btnTextShadow;

  return (
    <div className={`relative w-full transition-all duration-1000 flex flex-col items-center justify-center overflow-hidden ${isLast ? 'flex-grow' : ''}`} style={{ 
      backgroundColor: bgRgba, 
      borderRadius: styles.borderRadius || '0px', 
      minHeight: styles.minHeight,
      border: `${styles.borderWidth || '0px'} solid ${styles.borderColor || 'transparent'}`,
      boxShadow: glowStyle
    }}>
      {styles.backgroundImage && (
        <div 
          style={{ 
            position: 'absolute', 
            inset: 0, 
            backgroundImage: `url(${styles.backgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center center',
            backgroundRepeat: 'no-repeat',
            zIndex: 0,
            pointerEvents: 'none'
          }} 
        />
      )}
      {styles.backgroundImage && styles.overlayOpacity !== undefined && (
        <div className="absolute inset-0 bg-black pointer-events-none" style={{ opacity: styles.overlayOpacity, borderRadius: styles.borderRadius || '0px', zIndex: 1 }} />
      )}
      <div className={`relative z-10 flex flex-col items-center justify-center text-center w-full h-full ${styles.padding || 'py-32 px-10'}`}>
        <DraggableElement 
          id="title" 
          x={styles.titleX} 
          y={styles.titleY} 
          onMove={(nx, ny) => handleMove('title', nx, ny)} 
          className="max-w-5xl mx-auto w-full"
          onSettingsClick={() => onSetEditingElement({ blockId: block.id, type: 'title' })}
          isSettingsOpen={editingElement?.blockId === block.id && editingElement?.type === 'title'}
        >
          <input 
            value={content.title} 
            onChange={(e) => onUpdate({ title: e.target.value })}
            className="bg-transparent border-none font-black text-center w-full outline-none tracking-tighter mb-8 placeholder:opacity-20"
            style={{ 
              color: styles.titleColor || styles.textColor,
              fontFamily: FONT_MAP[styles.titleFont || styles.fontFamily],
              fontSize: fontSizeValue,
              opacity: styles.titleOpacity ?? 1,
              WebkitTextStroke: `${styles.titleBorderWidth || '0px'} ${styles.titleBorderColor || 'transparent'}`,
              textShadow: titleCombinedShadow
            }}
          />
        </DraggableElement>
        
        <DraggableElement 
          id="desc" 
          x={styles.descX} 
          y={styles.descY} 
          onMove={(nx, ny) => handleMove('desc', nx, ny)} 
          className="max-w-4xl mx-auto w-full"
          onSettingsClick={() => onSetEditingElement({ blockId: block.id, type: 'desc' })}
          isSettingsOpen={editingElement?.blockId === block.id && editingElement?.type === 'desc'}
        >
          <textarea 
            value={content.description} 
            onChange={(e) => onUpdate({ description: e.target.value })}
            className="bg-transparent border-none text-xl lg:text-2xl text-center w-full outline-none resize-none mb-12 placeholder:opacity-20 leading-relaxed"
            style={{
              color: styles.descColor || styles.textColor,
              fontFamily: FONT_MAP[styles.descFont || styles.fontFamily],
              opacity: styles.descOpacity ?? 0.85,
              WebkitTextStroke: `${styles.descBorderWidth || '0px'} ${styles.descBorderColor || 'transparent'}`,
              textShadow: descCombinedShadow
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
            onSettingsClick={() => onSetEditingElement({ blockId: block.id, type: 'btn' })}
            isSettingsOpen={editingElement?.blockId === block.id && editingElement?.type === 'btn'}
          >
            <button 
              className="px-16 py-6 font-black uppercase tracking-[0.4em] text-[12px] transition-all hover:scale-105 active:scale-95"
              style={{ 
                backgroundColor: styles.buttonBgColor,
                color: styles.buttonTextColor,
                borderRadius: styles.buttonRadius === 'full' ? '9999px' : styles.buttonRadius === 'md' ? '2rem' : '0px',
                fontFamily: FONT_MAP[styles.buttonFontFamily || 'sans'],
                opacity: styles.buttonOpacity ?? 1,
                border: `${styles.buttonBorderWidth || '0px'} solid ${styles.buttonBorderColor || 'transparent'}`,
                boxShadow: btnContainerCombinedShadow,
                WebkitTextStroke: `${styles.buttonTextBorderWidth || '0px'} ${styles.buttonTextBorderColor || 'transparent'}`,
                textShadow: btnTextCombinedShadow
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
  const [editingElement, setEditingElement] = useState<EditingElement | null>(null);
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
    <div className="flex-1 bg-[#050507] overflow-y-auto p-0 transition-all duration-1000 relative custom-scrollbar flex flex-col items-center">
      <div className={`${canvasWidth} w-full min-h-dvh bg-background shadow-2xl flex flex-col transition-all duration-1000 relative border-x border-b border-white/5 overflow-hidden`}>
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
                        style={{ ...provided.draggableProps.style }}
                      >
                        <div className="absolute right-4 bottom-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all z-[200]">
                          <button onClick={() => { setEditingId(editingId === block.id ? null : block.id); setEditingElement(null); }} className={`p-3 bg-card/90 backdrop-blur-3xl border rounded-2xl hover:text-primary transition-all shadow-xl ${editingId === block.id ? 'bg-primary text-primary-foreground border-primary' : 'border-white/10'}`}>
                            <Settings2 className="w-5 h-5" />
                          </button>
                          <div {...provided.dragHandleProps} className="p-3 bg-card/90 backdrop-blur-3xl border border-white/10 rounded-2xl cursor-grab active:cursor-grabbing shadow-xl"><GripVertical className="w-5 h-5" /></div>
                          <button onClick={() => removeBlock(block.id)} className="p-3 bg-card/90 backdrop-blur-3xl border border-white/10 rounded-2xl hover:text-destructive transition-all shadow-xl"><Trash2 className="w-5 h-5" /></button>
                        </div>

                        {editingId === block.id && (
                          <div className="fixed right-16 top-24 w-[400px] h-[75vh] bg-card/95 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-10 z-[500] shadow-[0_30px_100px_rgba(0,0,0,0.8)] animate-in fade-in zoom-in duration-300 flex flex-col overflow-hidden bento-inner-glow">
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
                                  
                                  <div className="space-y-3">
                                    <span className="text-[10px] uppercase font-bold opacity-50">Прозрачность фона</span>
                                    <input 
                                      type="range" min="0" max="1" step="0.05"
                                      value={block.styles.backgroundOpacity ?? 1}
                                      onChange={(e) => updateBlock(block.id, { styles: { ...block.styles, backgroundOpacity: parseFloat(e.target.value) } })}
                                      className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-primary"
                                    />
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
                                  <label className="text-[11px] font-black uppercase tracking-widest opacity-30 flex items-center gap-4"><Zap className="w-5 h-5" /> Эффекты границы</label>
                                  <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                      <span className="text-[10px] uppercase font-bold opacity-50">Цвет ободка</span>
                                      <input type="color" value={block.styles.borderColor || '#ffffff'} onChange={(e) => updateBlock(block.id, { styles: { ...block.styles, borderColor: e.target.value, borderWidth: block.styles.borderWidth === '0px' ? '1px' : block.styles.borderWidth } })} className="w-full h-12 rounded-2xl bg-white/5 border-none cursor-pointer" />
                                    </div>
                                    <div className="space-y-3">
                                      <span className="text-[10px] uppercase font-bold opacity-50">Толщина (px)</span>
                                      <input type="text" value={block.styles.borderWidth || '0px'} onChange={(e) => updateBlock(block.id, { styles: { ...block.styles, borderWidth: e.target.value } })} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-[12px] font-bold outline-none" />
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/5">
                                    <div className="flex items-center gap-3">
                                      <Sun className="w-4 h-4 text-primary" />
                                      <span className="text-[10px] uppercase font-bold opacity-50">Эффект свечения</span>
                                    </div>
                                    <input 
                                      type="checkbox" 
                                      checked={block.styles.borderGlow} 
                                      onChange={(e) => updateBlock(block.id, { styles: { ...block.styles, borderGlow: e.target.checked } })}
                                      className="w-6 h-6 accent-primary cursor-pointer"
                                    />
                                  </div>
                                  {block.styles.borderGlow && (
                                    <div className="space-y-3">
                                      <span className="text-[10px] uppercase font-bold opacity-50">Сила свечения</span>
                                      <input 
                                        type="range" min="0" max="200" step="1"
                                        value={block.styles.borderGlowStrength ?? 30}
                                        onChange={(e) => updateBlock(block.id, { styles: { ...block.styles, borderGlowStrength: parseInt(e.target.value) } })}
                                        className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-primary"
                                      />
                                    </div>
                                  )}
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
                          editingElement={editingElement}
                          onSetEditingElement={(el) => { setEditingElement(el); setEditingId(null); }}
                          isLast={index === blocks.length - 1}
                          isFirst={index === 0}
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
        
        {editingElement && (
          <ElementSettingsPanel 
            element={editingElement}
            block={blocks.find(b => b.id === editingElement.blockId)!}
            onUpdate={(s, c) => updateBlock(editingElement.blockId, { 
              styles: s, 
              content: c ? { ...blocks.find(b => b.id === editingElement.blockId)!.content, ...c } : blocks.find(b => b.id === editingElement.blockId)!.content 
            })}
            onClose={() => setEditingElement(null)}
          />
        )}
      </div>
    </div>
  );
}
