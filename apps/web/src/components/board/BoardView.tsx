'use client';

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
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  TASK_STATUS_ORDER,
  type Task,
  type TaskFiltersInput,
  type TaskStatus,
} from '@taskflow/types';
import { Button } from '@taskflow/ui';
import { trpc } from '../../lib/trpc';
import { useDebounce } from '../../lib/useDebounce';
import { Column } from './Column';
import { TaskCard } from './TaskCard';
import { BoardFilters, DEFAULT_FILTERS, FilterBar } from './FilterBar';
import { CreateTaskDialog } from './CreateTaskDialog';
import { TaskModal } from '../task/TaskModal';

type Items = Record<TaskStatus, string[]>;

function emptyItems(): Items {
  return { BACKLOG: [], TODO: [], IN_PROGRESS: [], DONE: [] };
}

function toFiltersInput(filters: BoardFilters): TaskFiltersInput | undefined {
  const input: TaskFiltersInput = {};
  if (filters.query.trim()) input.query = filters.query.trim();
  if (filters.assigneeId === 'UNASSIGNED') input.assigneeId = null;
  else if (filters.assigneeId !== 'ALL') input.assigneeId = filters.assigneeId;
  if (filters.priority !== 'ALL') input.priority = filters.priority as TaskFiltersInput['priority'];
  if (filters.labelId !== 'ALL') input.labelIds = [filters.labelId];
  return Object.keys(input).length > 0 ? input : undefined;
}

export function BoardView({ workspaceId, projectId }: { workspaceId: string; projectId: string }) {
  const utils = trpc.useUtils();
  const [filters, setFilters] = useState<BoardFilters>(DEFAULT_FILTERS);
  const debouncedQuery = useDebounce(filters.query, 250);

  const filtersInput = useMemo(
    () => toFiltersInput({ ...filters, query: debouncedQuery }),
    [filters, debouncedQuery],
  );

  const board = trpc.task.board.useQuery({ projectId, filters: filtersInput });
  const project = trpc.project.get.useQuery({ projectId });

  const [items, setItems] = useState<Items>(emptyItems());
  const [tasksById, setTasksById] = useState<Record<string, Task>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [createStatus, setCreateStatus] = useState<TaskStatus | null>(null);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const isDragging = useRef(false);

  // Sync local board state from the server query whenever it changes and we
  // are not mid-drag (so optimistic order is not clobbered during a drag).
  useEffect(() => {
    if (!board.data || isDragging.current) return;
    const nextItems = emptyItems();
    const nextById: Record<string, Task> = {};
    for (const column of board.data.columns) {
      nextItems[column.status] = column.tasks.map((task) => task.id);
      for (const task of column.tasks) nextById[task.id] = task;
    }
    setItems(nextItems);
    setTasksById(nextById);
  }, [board.data]);

  // Realtime: refetch the board whenever another client changes it.
  trpc.task.onBoardChange.useSubscription(
    { projectId },
    {
      onData: () => {
        void utils.task.board.invalidate();
      },
    },
  );

  const move = trpc.task.move.useMutation({
    onError: () => {
      void utils.task.board.invalidate();
    },
    onSettled: () => {
      void utils.task.board.invalidate();
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  function findContainer(id: string): TaskStatus | null {
    if ((TASK_STATUS_ORDER as readonly string[]).includes(id)) return id as TaskStatus;
    return TASK_STATUS_ORDER.find((status) => items[status].includes(id)) ?? null;
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

    const activeTaskId = String(active.id);
    const fromContainer = findContainer(activeTaskId);
    const overId = String(over.id);
    const toContainer = findContainer(overId);
    if (!fromContainer || !toContainer) return;

    const next: Items = { ...items, [fromContainer]: [...items[fromContainer]] };
    next[toContainer] = fromContainer === toContainer ? next[fromContainer] : [...items[toContainer]];
    next[fromContainer] = next[fromContainer].filter((id) => id !== activeTaskId);

    const isColumn = (TASK_STATUS_ORDER as readonly string[]).includes(overId);
    const overIndex = isColumn ? next[toContainer].length : next[toContainer].indexOf(overId);
    const insertIndex = overIndex === -1 ? next[toContainer].length : overIndex;
    next[toContainer].splice(insertIndex, 0, activeTaskId);

    const arr = next[toContainer];
    const idx = arr.indexOf(activeTaskId);
    const beforeId = idx > 0 ? arr[idx - 1]! : null;
    const afterId = idx < arr.length - 1 ? arr[idx + 1]! : null;

    // No-op if nothing changed.
    if (fromContainer === toContainer && items[fromContainer].indexOf(activeTaskId) === idx) {
      return;
    }

    setItems(next);
    setTasksById((prev) => {
      const task = prev[activeTaskId];
      if (!task) return prev;
      return { ...prev, [activeTaskId]: { ...task, status: toContainer } };
    });

    move.mutate({ taskId: activeTaskId, status: toContainer, beforeId, afterId });
  }

  const activeTask = activeId ? tasksById[activeId] : null;

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-3">
        <div className="flex items-baseline gap-2">
          <h1 className="text-lg font-semibold">{project.data?.name ?? 'Board'}</h1>
          {project.data ? (
            <span className="rounded bg-border/60 px-1.5 text-xs font-semibold text-muted">
              {project.data.key}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <FilterBar workspaceId={workspaceId} filters={filters} onChange={setFilters} />
          <Button size="sm" onClick={() => setCreateStatus('BACKLOG')}>
            New task
          </Button>
        </div>
      </header>

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
          <div className="flex gap-4">
            {TASK_STATUS_ORDER.map((status) => (
              <Column
                key={status}
                status={status}
                taskIds={items[status]}
                tasksById={tasksById}
                onOpen={setOpenTaskId}
                onAddTask={setCreateStatus}
              />
            ))}
          </div>
          <DragOverlay>
            {activeTask ? <TaskCard task={activeTask} onOpen={() => undefined} /> : null}
          </DragOverlay>
        </DndContext>
      </div>

      <CreateTaskDialog
        workspaceId={workspaceId}
        projectId={projectId}
        defaultStatus={createStatus ?? 'BACKLOG'}
        open={createStatus !== null}
        onClose={() => setCreateStatus(null)}
      />

      <TaskModal
        workspaceId={workspaceId}
        taskId={openTaskId}
        onClose={() => setOpenTaskId(null)}
      />
    </>
  );
}
