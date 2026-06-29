'use client';

import { useEffect, useState, type FormEvent } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  CreateCommentInput,
  PRIORITY_ORDER,
  type ActivityType,
  type Priority,
  type TaskStatus,
} from '@taskflow/types';
import {
  Avatar,
  Badge,
  Button,
  Input,
  Label,
  Modal,
  ModalBody,
  ModalHeader,
  Select,
  Textarea,
} from '@taskflow/ui';
import { trpc } from '../../lib/trpc';
import { formatDateTime, PRIORITY_LABELS, STATUS_LABELS } from '../../lib/format';

const ACTIVITY_TEXT: Record<ActivityType, string> = {
  TASK_CREATED: 'created this task',
  TASK_UPDATED: 'updated this task',
  TASK_MOVED: 'moved this task',
  TASK_ASSIGNED: 'changed the assignee',
  TASK_LABELED: 'changed labels',
  COMMENT_ADDED: 'commented',
};

export function TaskModal({
  workspaceId,
  taskId,
  onClose,
}: {
  workspaceId: string;
  taskId: string | null;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const open = taskId !== null;
  const detail = trpc.task.byId.useQuery({ taskId: taskId ?? '' }, { enabled: open });
  const members = trpc.workspace.members.useQuery({ workspaceId }, { enabled: open });
  const labels = trpc.label.list.useQuery({ workspaceId }, { enabled: open });

  const [title, setTitle] = useState('');
  const [editingDesc, setEditingDesc] = useState(false);
  const [description, setDescription] = useState('');
  const [comment, setComment] = useState('');

  const task = detail.data;

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description ?? '');
      setEditingDesc(false);
    }
  }, [task]);

  async function refresh() {
    if (taskId) await utils.task.byId.invalidate({ taskId });
    await utils.task.board.invalidate();
  }

  const update = trpc.task.update.useMutation({ onSuccess: refresh });
  const remove = trpc.task.delete.useMutation({
    onSuccess: async () => {
      await utils.task.board.invalidate();
      onClose();
    },
  });
  const addComment = trpc.comment.create.useMutation({
    onSuccess: async () => {
      setComment('');
      await refresh();
    },
  });

  if (!open) return null;

  function saveTitle() {
    if (!taskId || !task) return;
    const trimmed = title.trim();
    if (!trimmed || trimmed === task.title) return;
    update.mutate({ taskId, title: trimmed });
  }

  function saveDescription() {
    if (!taskId) return;
    update.mutate({ taskId, description: description.trim() || null });
    setEditingDesc(false);
  }

  function toggleLabel(labelId: string) {
    if (!taskId || !task) return;
    const current = task.labels.map((label) => label.id);
    const nextLabels = current.includes(labelId)
      ? current.filter((id) => id !== labelId)
      : [...current, labelId];
    update.mutate({ taskId, labelIds: nextLabels });
  }

  function onSubmitComment(event: FormEvent) {
    event.preventDefault();
    if (!taskId) return;
    const parsed = CreateCommentInput.safeParse({ taskId, body: comment });
    if (!parsed.success) return;
    addComment.mutate(parsed.data);
  }

  return (
    <Modal open={open} onClose={onClose} ariaLabel="Task details" className="max-w-3xl">
      <ModalHeader>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onBlur={saveTitle}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur();
          }}
          className="w-full rounded-md bg-transparent text-lg font-semibold focus:bg-bg focus:outline-none focus:ring-2 focus:ring-accent"
          aria-label="Task title"
        />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="rounded p-1 text-muted hover:bg-border/40 hover:text-fg"
        >
          ✕
        </button>
      </ModalHeader>

      <ModalBody className="grid max-h-[70vh] grid-cols-1 gap-6 overflow-y-auto md:grid-cols-3">
        {detail.isLoading || !task ? (
          <p className="col-span-full text-sm text-muted">Loading…</p>
        ) : (
          <>
            <div className="md:col-span-2 flex flex-col gap-5">
              <section>
                <div className="mb-1 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Description</h3>
                  {!editingDesc ? (
                    <button
                      type="button"
                      onClick={() => setEditingDesc(true)}
                      className="text-xs text-accent hover:underline"
                    >
                      Edit
                    </button>
                  ) : null}
                </div>
                {editingDesc ? (
                  <div className="flex flex-col gap-2">
                    <Textarea
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      rows={6}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={saveDescription} isLoading={update.isPending}>
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setDescription(task.description ?? '');
                          setEditingDesc(false);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : task.description ? (
                  <div className="prose-sm max-w-none text-sm text-fg [&_a]:text-accent [&_code]:rounded [&_code]:bg-border/50 [&_code]:px-1 [&_h2]:mt-3 [&_h2]:font-semibold [&_li]:ml-4 [&_li]:list-disc [&_p]:my-1">
                    <ReactMarkdown>{task.description}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm text-muted">No description.</p>
                )}
              </section>

              <section>
                <h3 className="mb-2 text-sm font-semibold">Comments</h3>
                <ul className="flex flex-col gap-3">
                  {task.comments.map((item) => (
                    <li key={item.id} className="flex gap-2">
                      <Avatar name={item.author.name} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-medium">{item.author.name}</span>
                          <span className="text-xs text-muted">
                            {formatDateTime(item.createdAt)}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap text-sm">{item.body}</p>
                      </div>
                    </li>
                  ))}
                  {task.comments.length === 0 ? (
                    <li className="text-sm text-muted">No comments yet.</li>
                  ) : null}
                </ul>
                <form className="mt-3 flex flex-col gap-2" onSubmit={onSubmitComment}>
                  <Textarea
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    placeholder="Add a comment…"
                    rows={2}
                  />
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      size="sm"
                      isLoading={addComment.isPending}
                      disabled={!comment.trim()}
                    >
                      Comment
                    </Button>
                  </div>
                </form>
              </section>
            </div>

            <aside className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="modal-status">Status</Label>
                <Select
                  id="modal-status"
                  value={task.status}
                  onChange={(event) =>
                    taskId && update.mutate({ taskId, status: event.target.value as TaskStatus })
                  }
                >
                  {Object.entries(STATUS_LABELS).map(([value, text]) => (
                    <option key={value} value={value}>
                      {text}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="modal-priority">Priority</Label>
                <Select
                  id="modal-priority"
                  value={task.priority}
                  onChange={(event) =>
                    taskId && update.mutate({ taskId, priority: event.target.value as Priority })
                  }
                >
                  {PRIORITY_ORDER.map((value) => (
                    <option key={value} value={value}>
                      {PRIORITY_LABELS[value]}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="modal-assignee">Assignee</Label>
                <Select
                  id="modal-assignee"
                  value={task.assignee?.id ?? ''}
                  onChange={(event) =>
                    taskId && update.mutate({ taskId, assigneeId: event.target.value || null })
                  }
                >
                  <option value="">Unassigned</option>
                  {(members.data ?? []).map((member) => (
                    <option key={member.user.id} value={member.user.id}>
                      {member.user.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="modal-due">Due date</Label>
                <Input
                  id="modal-due"
                  type="date"
                  value={task.dueDate ? task.dueDate.toISOString().slice(0, 10) : ''}
                  onChange={(event) =>
                    taskId &&
                    update.mutate({
                      taskId,
                      dueDate: event.target.value ? new Date(event.target.value) : null,
                    })
                  }
                />
              </div>

              {labels.data && labels.data.length > 0 ? (
                <div className="flex flex-col gap-1.5">
                  <Label>Labels</Label>
                  <div className="flex flex-wrap gap-2">
                    {labels.data.map((label) => {
                      const checked = task.labels.some((l) => l.id === label.id);
                      return (
                        <button
                          type="button"
                          key={label.id}
                          onClick={() => toggleLabel(label.id)}
                          className={checked ? 'rounded-full ring-2 ring-accent' : 'opacity-60'}
                        >
                          <Badge dotColor={label.color}>{label.name}</Badge>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <div>
                <h3 className="mb-2 text-sm font-semibold">Activity</h3>
                <ul className="flex flex-col gap-2">
                  {task.activities.map((activity) => (
                    <li key={activity.id} className="text-xs text-muted">
                      <span className="font-medium text-fg">{activity.actor.name}</span>{' '}
                      {ACTIVITY_TEXT[activity.type]} · {formatDateTime(activity.createdAt)}
                    </li>
                  ))}
                </ul>
              </div>

              <Button
                variant="danger"
                size="sm"
                onClick={() => taskId && remove.mutate({ taskId })}
                isLoading={remove.isPending}
              >
                Delete task
              </Button>
            </aside>
          </>
        )}
      </ModalBody>
    </Modal>
  );
}
