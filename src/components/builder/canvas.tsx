
'use client';

import React from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useBuilderStore, PageBlock } from '@/lib/builder-store';
import { Trash2, GripVertical, Settings2 } from 'lucide-react';

export function BuilderCanvas() {
  const { blocks, reorderBlocks, removeBlock, updateBlock } = useBuilderStore();

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    reorderBlocks(result.source.index, result.destination.index);
  };

  return (
    <div className="flex-1 bg-muted/30 overflow-y-auto p-12">
      <div className="max-w-4xl mx-auto min-h-[80vh] bg-white shadow-2xl rounded-sm ring-1 ring-black/5 flex flex-col">
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
                    <p className="text-muted-foreground font-medium">Your canvas is empty.</p>
                    <p className="text-xs text-muted-foreground">Drag or click blocks from the sidebar to start building.</p>
                  </div>
                )}
                
                {blocks.map((block, index) => (
                  <Draggable key={block.id} draggableId={block.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`group relative border-b last:border-b-0 ${snapshot.isDragging ? 'shadow-2xl z-50 ring-2 ring-primary' : ''}`}
                      >
                        {/* Block Toolbar */}
                        <div className="absolute right-4 top-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                          <div {...provided.dragHandleProps} className="p-2 bg-white shadow-md border rounded-lg cursor-grab active:cursor-grabbing">
                            <GripVertical className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <button onClick={() => removeBlock(block.id)} className="p-2 bg-white shadow-md border rounded-lg hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Block Content */}
                        <BlockComponent 
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

function BlockComponent({ block, onUpdate }: { block: PageBlock; onUpdate: (content: any) => void }) {
  const isHero = block.type === 'hero';
  
  return (
    <div 
      className={`relative w-full ${block.styles.padding}`} 
      style={{ backgroundColor: block.styles.backgroundColor, color: block.styles.textColor }}
    >
      <div className="max-w-2xl mx-auto text-center px-6">
        <input
          value={block.content.title}
          onChange={(e) => onUpdate({ ...block.content, title: e.target.value })}
          className={`w-full bg-transparent border-none text-center focus:ring-1 focus:ring-primary/20 outline-none font-bold ${isHero ? 'text-4xl' : 'text-2xl'}`}
        />
        <textarea
          value={block.content.description}
          onChange={(e) => onUpdate({ ...block.content, description: e.target.value })}
          className="w-full bg-transparent border-none text-center focus:ring-1 focus:ring-primary/20 outline-none mt-4 text-muted-foreground resize-none"
          rows={3}
        />
        {block.content.buttonText && (
          <button className="mt-8 px-8 py-3 bg-primary text-primary-foreground rounded-full font-bold shadow-lg">
            {block.content.buttonText}
          </button>
        )}
      </div>
    </div>
  );
}
