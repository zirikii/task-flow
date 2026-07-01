'use client';

import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { TrelloCard } from '@taskflow/types';
import { Button, Input } from '@taskflow/ui';
import { CardItem } from './CardItem';

export function ListColumn({
  id,
  name,
  cardIds,
  cardsById,
  onAddCard,
}: {
  id: string;
  name: string;
  cardIds: string[];
  cardsById: Record<string, TrelloCard>;
  onAddCard: (listId: string, title: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');

  function submit() {
    const trimmed = title.trim();
    if (!trimmed) return;
    onAddCard(id, trimmed);
    setTitle('');
    setAdding(false);
  }

  return (
    <div className="flex max-h-full w-72 shrink-0 flex-col rounded-lg bg-card p-2 shadow-card">
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold">{name}</h2>
        <span className="text-xs text-muted">{cardIds.length}</span>
      </div>

      <div
        ref={setNodeRef}
        data-testid="trello-list"
        data-list-id={id}
        className={`flex min-h-[40px] flex-1 flex-col gap-2 overflow-y-auto rounded-md p-1 transition-colors ${
          isOver ? 'bg-accent-subtle/50' : ''
        }`}
      >
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          {cardIds.map((cardId) => {
            const card = cardsById[cardId];
            return card ? <CardItem key={cardId} card={card} /> : null;
          })}
        </SortableContext>
      </div>

      {adding ? (
        <div className="mt-2 flex flex-col gap-2">
          <Input
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') submit();
              if (event.key === 'Escape') setAdding(false);
            }}
            placeholder="Card title…"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={submit}>
              Add card
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="mt-2 rounded-md px-2 py-1.5 text-left text-sm text-muted hover:bg-border/40 hover:text-fg"
        >
          + Add a card
        </button>
      )}
    </div>
  );
}
