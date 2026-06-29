'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task } from '@taskflow/types';
import { Avatar, Badge, cn } from '@taskflow/ui';
import { formatDueDate, isOverdue, PRIORITY_COLORS, PRIORITY_LABELS } from '../../lib/format';

export function TaskCard({ task, onOpen }: { task: Task; onOpen: (taskId: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { status: task.status },
  });

  const due = formatDueDate(task.dueDate);

  return (
    <div
      ref={setNodeRef}
      data-testid="task-card"
      data-task-id={task.id}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        'group cursor-grab rounded-md border border-border bg-bg p-3 shadow-card active:cursor-grabbing',
        isDragging && 'opacity-50',
      )}
      {...attributes}
      {...listeners}
      onClick={() => onOpen(task.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter') onOpen(task.id);
      }}
    >
      <div className="flex items-start gap-2">
        {task.priority !== 'NONE' ? (
          <span
            className="mt-1 h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: PRIORITY_COLORS[task.priority] }}
            title={PRIORITY_LABELS[task.priority]}
            aria-label={PRIORITY_LABELS[task.priority]}
          />
        ) : null}
        <p className="flex-1 text-sm font-medium leading-snug">{task.title}</p>
        {task.assignee ? <Avatar name={task.assignee.name} size="sm" /> : null}
      </div>

      {task.labels.length > 0 || due ? (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {task.labels.map((label) => (
            <Badge key={label.id} dotColor={label.color}>
              {label.name}
            </Badge>
          ))}
          {due ? (
            <span
              className={cn('text-xs', isOverdue(task.dueDate) ? 'text-danger' : 'text-muted')}
            >
              {due}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
