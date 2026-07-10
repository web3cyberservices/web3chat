
'use client';

import React from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useBuilderStore, PageBlock } from '@/lib/builder-store';
import { Trash2, GripVertical, Settings2, Code, Terminal, BrainCircuit } from 'lucide-react';

export function BuilderCanvas() {
  const { blocks, mode, reorderBlocks, removeBlock, updateBlock } = useBuilderStore();

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    reorderBlocks(result.source.index, result.destination.index);
  };

  return (
    <div className="flex-1 bg-muted/30 overflow-y-auto p-6 md:p-12">
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
                          <div {...provided.dragHandleProps} className="p-2 bg-card shadow-md border rounded-lg cursor-grab active:cursor-grabbing">
                            <GripVertical className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <button onClick={() => removeBlock(block.id)} className="p-2 bg-card shadow-md border rounded-lg hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

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

  // Render based on block type families
  if (['hero', 'features', 'pricing', 'contacts'].includes(type)) {
    return (
      <div className={`relative w-full ${styles.padding}`} style={{ backgroundColor: styles.backgroundColor, color: styles.textColor }}>
        <div className="max-w-2xl mx-auto text-center px-6">
          <input
            value={content.title}
            onChange={(e) => onUpdate({ ...content, title: e.target.value })}
            className={`w-full bg-transparent border-none text-center focus:ring-1 focus:ring-primary/20 outline-none font-bold ${type === 'hero' ? 'text-4xl' : 'text-2xl'}`}
          />
          <textarea
            value={content.description}
            onChange={(e) => onUpdate({ ...content, description: e.target.value })}
            className="w-full bg-transparent border-none text-center focus:ring-1 focus:ring-primary/20 outline-none mt-4 text-muted-foreground resize-none"
            rows={3}
          />
          {content.buttonText && (
            <button className="mt-8 px-8 py-3 bg-primary text-primary-foreground rounded-full font-bold shadow-lg">
              {content.buttonText}
            </button>
          )}
        </div>
      </div>
    );
  }

  // AI Agent or Bot Logic Blocks
  return (
    <div className="p-8 bg-slate-900 text-white">
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
      <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
        {['Input', 'Condition', 'Action'].map(tag => (
          <span key={tag} className="px-3 py-1 bg-slate-700 rounded-full text-[10px] font-bold uppercase tracking-widest opacity-50">
            {tag}
          </span >
        ))}
      </div>
    </div>
  );
}
