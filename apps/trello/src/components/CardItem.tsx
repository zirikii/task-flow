'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { TrelloCard } from '@taskflow/types';
import { cn } from '@taskflow/ui';

export function CardItem({ card }: { card: TrelloCard }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { listId: card.listId },
  });

  return (
    <div
      ref={setNodeRef}
      data-testid="trello-card"
      data-card-id={card.id}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        'cursor-grab rounded-md border border-border bg-bg p-2.5 shadow-card active:cursor-grabbing',
        isDragging && 'opacity-50',
      )}
      {...attributes}
      {...listeners}
    >
      <p className="text-sm leading-snug">{card.title}</p>
      {card.description ? (
        <p className="mt-1 line-clamp-2 text-xs text-muted">{card.description}</p>
      ) : null}
    </div>
  );
}
