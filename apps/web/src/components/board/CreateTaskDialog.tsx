'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { CreateTaskInput, PRIORITY_ORDER, type TaskStatus } from '@taskflow/types';
import {
  Badge,
  Button,
  Input,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Select,
  Textarea,
} from '@taskflow/ui';
import { trpc } from '../../lib/trpc';
import { PRIORITY_LABELS, STATUS_LABELS } from '../../lib/format';

export function CreateTaskDialog({
  workspaceId,
  projectId,
  defaultStatus,
  open,
  onClose,
}: {
  workspaceId: string;
  projectId: string;
  defaultStatus: TaskStatus;
  open: boolean;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const members = trpc.workspace.members.useQuery({ workspaceId }, { enabled: open });
  const labels = trpc.label.list.useQuery({ workspaceId }, { enabled: open });

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>(defaultStatus);
  const [priority, setPriority] = useState('NONE');
  const [assigneeId, setAssigneeId] = useState('');
  const [labelIds, setLabelIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) setStatus(defaultStatus);
  }, [open, defaultStatus]);

  const create = trpc.task.create.useMutation({
    onSuccess: async () => {
      await utils.task.board.invalidate({ projectId });
      onClose();
      setTitle('');
      setDescription('');
      setPriority('NONE');
      setAssigneeId('');
      setLabelIds([]);
      setDueDate('');
    },
    onError: (err) => setError(err.message),
  });

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const parsed = CreateTaskInput.safeParse({
      projectId,
      title,
      description: description || undefined,
      status,
      priority,
      assigneeId: assigneeId || null,
      labelIds,
      dueDate: dueDate ? new Date(dueDate) : null,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid input');
      return;
    }
    create.mutate(parsed.data);
  }

  return (
    <Modal open={open} onClose={onClose} ariaLabel="Create task">
      <form onSubmit={onSubmit}>
        <ModalHeader>
          <h2 className="text-lg font-semibold">New task</h2>
        </ModalHeader>
        <ModalBody className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Implement drag-and-drop"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="task-desc">Description (markdown)</Label>
            <Textarea
              id="task-desc"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Details, acceptance criteria…"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="task-status">Status</Label>
              <Select
                id="task-status"
                value={status}
                onChange={(event) => setStatus(event.target.value as TaskStatus)}
              >
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="task-priority">Priority</Label>
              <Select
                id="task-priority"
                value={priority}
                onChange={(event) => setPriority(event.target.value)}
              >
                {PRIORITY_ORDER.map((value) => (
                  <option key={value} value={value}>
                    {PRIORITY_LABELS[value]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="task-assignee">Assignee</Label>
              <Select
                id="task-assignee"
                value={assigneeId}
                onChange={(event) => setAssigneeId(event.target.value)}
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
              <Label htmlFor="task-due">Due date</Label>
              <Input
                id="task-due"
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
              />
            </div>
          </div>

          {labels.data && labels.data.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              <Label>Labels</Label>
              <div className="flex flex-wrap gap-2">
                {labels.data.map((label) => {
                  const checked = labelIds.includes(label.id);
                  return (
                    <button
                      type="button"
                      key={label.id}
                      onClick={() =>
                        setLabelIds((current) =>
                          checked
                            ? current.filter((id) => id !== label.id)
                            : [...current, label.id],
                        )
                      }
                      className={checked ? 'ring-2 ring-accent rounded-full' : ''}
                    >
                      <Badge dotColor={label.color}>{label.name}</Badge>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {error ? <p className="text-sm text-danger">{error}</p> : null}
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={create.isPending}>
            Create task
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
