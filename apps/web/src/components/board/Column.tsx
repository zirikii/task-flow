'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Task, TaskStatus } from '@taskflow/types';
import { STATUS_LABELS } from '../../lib/format';
import { TaskCard } from './TaskCard';

const STATUS_DOT: Record<TaskStatus, string> = {
  BACKLOG: '#94a3b8',
  TODO: '#6366f1',
  IN_PROGRESS: '#f59e0b',
  DONE: '#22c55e',
};

export function Column({
  status,
  taskIds,
  tasksById,
  onOpen,
  onAddTask,
}: {
  status: TaskStatus;
  taskIds: string[];
  tasksById: Record<string, Task>;
  onOpen: (taskId: string) => void;
  onAddTask: (status: TaskStatus) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div className="mb-2 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: STATUS_DOT[status] }}
            aria-hidden
          />
          <h2 className="text-sm font-semibold">{STATUS_LABELS[status]}</h2>
          <span className="text-xs text-muted">{taskIds.length}</span>
        </div>
        <button
          type="button"
          onClick={() => onAddTask(status)}
          className="rounded px-1.5 text-lg leading-none text-muted hover:bg-border/40 hover:text-fg"
          aria-label={`Add task to ${STATUS_LABELS[status]}`}
        >
          +
        </button>
      </div>

      <div
        ref={setNodeRef}
        className={`flex min-h-[120px] flex-1 flex-col gap-2 rounded-lg border border-dashed p-2 transition-colors ${
          isOver ? 'border-accent bg-accent-subtle/40' : 'border-border bg-card/50'
        }`}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {taskIds.map((id) => {
            const task = tasksById[id];
            if (!task) return null;
            return <TaskCard key={id} task={task} onOpen={onOpen} />;
          })}
        </SortableContext>
        {taskIds.length === 0 ? (
          <p className="px-1 py-6 text-center text-xs text-muted">No tasks</p>
        ) : null}
      </div>
    </div>
  );
}
