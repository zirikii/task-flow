'use client';

import { useEffect, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import type { TrelloCard } from '@taskflow/types';
import { Button, Input, cn } from '@taskflow/ui';
import { Spinner, trpc } from '@taskflow/app-kit';
import { ListColumn } from './ListColumn';

type Items = Record<string, string[]>;

export function TrelloBoard({ boardId }: { boardId: string }) {
  const utils = trpc.useUtils();
  const board = trpc.trello.boards.get.useQuery({ boardId });

  const [listOrder, setListOrder] = useState<string[]>([]);
  const [listNames, setListNames] = useState<Record<string, string>>({});
  const [items, setItems] = useState<Items>({});
  const [cardsById, setCardsById] = useState<Record<string, TrelloCard>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [addingList, setAddingList] = useState(false);
  const [listName, setListName] = useState('');
  const isDragging = useRef(false);

  useEffect(() => {
    if (!board.data || isDragging.current) return;
    const order: string[] = [];
    const names: Record<string, string> = {};
    const nextItems: Items = {};
    const byId: Record<string, TrelloCard> = {};
    for (const list of board.data.lists) {
      order.push(list.id);
      names[list.id] = list.name;
      nextItems[list.id] = list.cards.map((card) => card.id);
      for (const card of list.cards) byId[card.id] = card;
    }
    setListOrder(order);
    setListNames(names);
    setItems(nextItems);
    setCardsById(byId);
  }, [board.data]);

  const createList = trpc.trello.lists.create.useMutation({
    onSettled: () => utils.trello.boards.get.invalidate({ boardId }),
  });
  const createCard = trpc.trello.cards.create.useMutation({
    onSettled: () => utils.trello.boards.get.invalidate({ boardId }),
  });
  const moveCard = trpc.trello.cards.move.useMutation({
    onSettled: () => utils.trello.boards.get.invalidate({ boardId }),
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function findContainer(id: string): string | null {
    if (listOrder.includes(id)) return id;
    return listOrder.find((listId) => items[listId]?.includes(id)) ?? null;
  }

  function handleDragStart(event: DragStartEvent) {
    isDragging.current = true;
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    isDragging.current = false;
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const cardId = String(active.id);
    const from = findContainer(cardId);
    const overId = String(over.id);
    const to = findContainer(overId);
    if (!from || !to) return;

    const fromArr = [...(items[from] ?? [])].filter((id) => id !== cardId);
    const toArr = from === to ? fromArr : [...(items[to] ?? [])];

    const overIsList = listOrder.includes(overId);
    const overIndex = overIsList ? toArr.length : toArr.indexOf(overId);
    const insertIndex = overIndex === -1 ? toArr.length : overIndex;
    toArr.splice(insertIndex, 0, cardId);

    const idx = toArr.indexOf(cardId);
    const beforeId = idx > 0 ? toArr[idx - 1]! : null;
    const afterId = idx < toArr.length - 1 ? toArr[idx + 1]! : null;

    if (from === to && (items[from] ?? []).indexOf(cardId) === idx) return;

    const next: Items = { ...items, [from]: fromArr, [to]: toArr };
    setItems(next);
    setCardsById((prev) => {
      const card = prev[cardId];
      return card ? { ...prev, [cardId]: { ...card, listId: to } } : prev;
    });
    moveCard.mutate({ cardId, toListId: to, beforeId, afterId });
  }

  if (board.isLoading || !board.data) return <Spinner label="Loading board…" />;

  const activeCard = activeId ? cardsById[activeId] : null;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <div className="border-b border-border px-6 py-3">
        <h1 className="text-lg font-semibold">{board.data.name}</h1>
      </div>
      <div className="flex-1 overflow-x-auto p-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => {
            isDragging.current = false;
            setActiveId(null);
          }}
        >
          <div className="flex items-start gap-4">
            {listOrder.map((listId) => (
              <ListColumn
                key={listId}
                id={listId}
                name={listNames[listId] ?? ''}
                cardIds={items[listId] ?? []}
                cardsById={cardsById}
                onAddCard={(id, title) => createCard.mutate({ listId: id, title })}
              />
            ))}

            <div className="w-72 shrink-0">
              {addingList ? (
                <div className="flex flex-col gap-2 rounded-lg bg-card p-2 shadow-card">
                  <Input
                    autoFocus
                    value={listName}
                    onChange={(event) => setListName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && listName.trim()) {
                        createList.mutate({ boardId, name: listName.trim() });
                        setListName('');
                        setAddingList(false);
                      }
                      if (event.key === 'Escape') setAddingList(false);
                    }}
                    placeholder="List name…"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={!listName.trim()}
                      onClick={() => {
                        createList.mutate({ boardId, name: listName.trim() });
                        setListName('');
                        setAddingList(false);
                      }}
                    >
                      Add list
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setAddingList(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingList(true)}
                  className="w-full rounded-lg border border-dashed border-border bg-card/50 px-3 py-2 text-left text-sm text-muted hover:bg-card"
                >
                  + Add another list
                </button>
              )}
            </div>
          </div>

          <DragOverlay>
            {activeCard ? (
              <div className={cn('w-64 rounded-md border border-border bg-bg p-2.5 shadow-modal')}>
                <p className="text-sm">{activeCard.title}</p>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
