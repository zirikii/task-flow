'use client';

import { useEffect, useState } from 'react';
import { ProductChrome, Spinner, trpc, useActiveWorkspace } from '@taskflow/app-kit';
import type { Priority, RequestStatus } from '@taskflow/types';
import { REQUEST_STATUS_ORDER } from '@taskflow/types';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Input,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Select,
  Textarea,
} from '@taskflow/ui';

const STATUS_LABELS: Record<RequestStatus, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In progress',
  WAITING: 'Waiting for support',
  RESOLVED: 'Resolved',
};

const STATUS_COLORS: Record<RequestStatus, string> = {
  OPEN: '#0c66e4',
  IN_PROGRESS: '#e56910',
  WAITING: '#8270db',
  RESOLVED: '#22a06b',
};

const PRIORITIES: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export default function ServiceDeskPage() {
  const { workspaceId } = useActiveWorkspace();
  return (
    <ProductChrome productId="servicedesk">
      {workspaceId ? (
        <Workspace workspaceId={workspaceId} />
      ) : (
        <div className="p-8 text-muted">Loading workspace…</div>
      )}
    </ProductChrome>
  );
}

function Workspace({ workspaceId }: { workspaceId: string }) {
  const desks = trpc.servicedesk.desks.list.useQuery({ workspaceId });
  const [deskId, setDeskId] = useState<string | null>(null);
  const [tab, setTab] = useState<'portal' | 'queue'>('portal');

  useEffect(() => {
    if (!deskId && desks.data && desks.data.length > 0) setDeskId(desks.data[0]!.id);
  }, [desks.data, deskId]);

  const createDesk = trpc.servicedesk.desks.create.useMutation({
    onSuccess: async (desk) => {
      await desks.refetch();
      setDeskId(desk.id);
    },
  });

  if (desks.isLoading) return <Spinner label="Loading service desks…" />;

  if (!desks.data || desks.data.length === 0) {
    return (
      <div className="p-10 text-center text-muted">
        <p>No service desk yet.</p>
        <Button
          className="mt-3"
          isLoading={createDesk.isPending}
          onClick={() => createDesk.mutate({ workspaceId, name: 'IT Support' })}
        >
          Create a service desk
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-5 flex items-center justify-between gap-3">
        <Select value={deskId ?? ''} onChange={(e) => setDeskId(e.target.value)} className="max-w-xs">
          {desks.data.map((desk) => (
            <option key={desk.id} value={desk.id}>
              {desk.name}
            </option>
          ))}
        </Select>
        <div className="inline-flex rounded-md border border-border bg-card p-0.5">
          {(['portal', 'queue'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded px-3 py-1.5 text-sm font-medium ${
                tab === t ? 'bg-accent text-accent-fg' : 'text-muted hover:text-fg'
              }`}
            >
              {t === 'portal' ? 'Portal' : 'Agent queue'}
            </button>
          ))}
        </div>
      </div>

      {deskId ? (
        tab === 'portal' ? (
          <Portal serviceDeskId={deskId} onSubmitted={() => setTab('queue')} />
        ) : (
          <Queue serviceDeskId={deskId} workspaceId={workspaceId} />
        )
      ) : null}
    </div>
  );
}

function Portal({
  serviceDeskId,
  onSubmitted,
}: {
  serviceDeskId: string;
  onSubmitted: () => void;
}) {
  const types = trpc.servicedesk.requestTypes.list.useQuery({ serviceDeskId });
  const [addTypeOpen, setAddTypeOpen] = useState(false);
  const [typeName, setTypeName] = useState('');
  const [activeType, setActiveType] = useState<string | null>(null);
  const utils = trpc.useUtils();

  const createType = trpc.servicedesk.requestTypes.create.useMutation({
    onSuccess: async () => {
      await utils.servicedesk.requestTypes.list.invalidate({ serviceDeskId });
      setTypeName('');
      setAddTypeOpen(false);
    },
  });

  if (types.isLoading) return <Spinner label="Loading…" />;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-xl font-semibold">What can we help you with?</h1>
        <Button size="sm" variant="secondary" onClick={() => setAddTypeOpen(true)}>
          + Request type
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {(types.data ?? []).map((type) => (
          <button key={type.id} type="button" onClick={() => setActiveType(type.id)} className="text-left">
            <Card className="h-full p-4 transition-shadow hover:shadow-modal">
              <p className="font-semibold">{type.name}</p>
              {type.description ? (
                <p className="mt-1 text-sm text-muted">{type.description}</p>
              ) : null}
            </Card>
          </button>
        ))}
        {types.data && types.data.length === 0 ? (
          <p className="text-sm text-muted">No request types yet. Add one to start.</p>
        ) : null}
      </div>

      <Modal open={addTypeOpen} onClose={() => setAddTypeOpen(false)} ariaLabel="Add request type">
        <ModalHeader>
          <h2 className="text-lg font-semibold">New request type</h2>
        </ModalHeader>
        <ModalBody>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="type-name">Name</Label>
            <Input
              id="type-name"
              value={typeName}
              onChange={(e) => setTypeName(e.target.value)}
              placeholder="Get IT help"
              autoFocus
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setAddTypeOpen(false)}>
            Cancel
          </Button>
          <Button
            isLoading={createType.isPending}
            disabled={!typeName.trim()}
            onClick={() => createType.mutate({ serviceDeskId, name: typeName })}
          >
            Create
          </Button>
        </ModalFooter>
      </Modal>

      <SubmitRequestDialog
        requestTypeId={activeType}
        onClose={() => setActiveType(null)}
        onSubmitted={onSubmitted}
      />
    </div>
  );
}

function SubmitRequestDialog({
  requestTypeId,
  onClose,
  onSubmitted,
}: {
  requestTypeId: string | null;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('MEDIUM');

  const create = trpc.servicedesk.requests.create.useMutation({
    onSuccess: () => {
      setSummary('');
      setDescription('');
      onClose();
      onSubmitted();
    },
  });

  return (
    <Modal open={requestTypeId !== null} onClose={onClose} ariaLabel="Submit request">
      <ModalHeader>
        <h2 className="text-lg font-semibold">Raise a request</h2>
      </ModalHeader>
      <ModalBody>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="req-summary">Summary</Label>
            <Input
              id="req-summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="My laptop won't boot"
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="req-desc">Details</Label>
            <Textarea
              id="req-desc"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what's happening…"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="req-priority">Priority</Label>
            <Select
              id="req-priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p.charAt(0) + p.slice(1).toLowerCase()}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          isLoading={create.isPending}
          disabled={!summary.trim() || !requestTypeId}
          onClick={() =>
            requestTypeId && create.mutate({ requestTypeId, summary, description, priority })
          }
        >
          Submit request
        </Button>
      </ModalFooter>
    </Modal>
  );
}

function Queue({ serviceDeskId, workspaceId }: { serviceDeskId: string; workspaceId: string }) {
  const [status, setStatus] = useState<RequestStatus | 'ALL'>('ALL');
  const [openId, setOpenId] = useState<string | null>(null);
  const queue = trpc.servicedesk.requests.queue.useQuery({
    serviceDeskId,
    status: status === 'ALL' ? undefined : status,
  });

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {(['ALL', ...REQUEST_STATUS_ORDER] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              status === s
                ? 'border-accent bg-accent-subtle text-accent'
                : 'border-border text-muted hover:text-fg'
            }`}
          >
            {s === 'ALL' ? 'All' : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {queue.isLoading ? (
        <Spinner label="Loading queue…" />
      ) : (
        <Card className="divide-y divide-border">
          {(queue.data ?? []).length === 0 ? (
            <p className="p-4 text-sm text-muted">No requests here.</p>
          ) : (
            (queue.data ?? []).map((request) => (
              <button
                key={request.id}
                type="button"
                onClick={() => setOpenId(request.id)}
                className="flex w-full items-center gap-3 p-3 text-left hover:bg-border/30"
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: STATUS_COLORS[request.status] }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{request.summary}</span>
                  <span className="block text-xs text-muted">
                    {request.requestType.name} · {request.reporter.name}
                  </span>
                </span>
                <Badge variant="outline">{STATUS_LABELS[request.status]}</Badge>
                {request.assignee ? <Avatar name={request.assignee.name} size="sm" /> : null}
              </button>
            ))
          )}
        </Card>
      )}

      <RequestDetailModal
        requestId={openId}
        workspaceId={workspaceId}
        serviceDeskId={serviceDeskId}
        onClose={() => setOpenId(null)}
      />
    </div>
  );
}

function RequestDetailModal({
  requestId,
  workspaceId,
  serviceDeskId,
  onClose,
}: {
  requestId: string | null;
  workspaceId: string;
  serviceDeskId: string;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const detail = trpc.servicedesk.requests.get.useQuery(
    { requestId: requestId ?? '' },
    { enabled: requestId !== null },
  );
  const members = trpc.workspace.members.useQuery({ workspaceId });
  const [comment, setComment] = useState('');

  const invalidate = async () => {
    await Promise.all([
      utils.servicedesk.requests.get.invalidate({ requestId: requestId ?? '' }),
      utils.servicedesk.requests.queue.invalidate({ serviceDeskId }),
    ]);
  };

  const setStatus = trpc.servicedesk.requests.setStatus.useMutation({ onSuccess: invalidate });
  const assign = trpc.servicedesk.requests.assign.useMutation({ onSuccess: invalidate });
  const addComment = trpc.servicedesk.requests.comment.useMutation({
    onSuccess: async () => {
      setComment('');
      await invalidate();
    },
  });

  const request = detail.data;

  return (
    <Modal open={requestId !== null} onClose={onClose} ariaLabel="Request detail" className="max-w-2xl">
      <ModalHeader>
        <h2 className="text-lg font-semibold">{request?.summary ?? 'Request'}</h2>
      </ModalHeader>
      <ModalBody>
        {!request ? (
          <Spinner />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="d-status">Status</Label>
                <Select
                  id="d-status"
                  value={request.status}
                  onChange={(e) =>
                    setStatus.mutate({
                      requestId: request.id,
                      status: e.target.value as RequestStatus,
                    })
                  }
                >
                  {REQUEST_STATUS_ORDER.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="d-assignee">Assignee</Label>
                <Select
                  id="d-assignee"
                  value={request.assignee?.id ?? ''}
                  onChange={(e) =>
                    assign.mutate({
                      requestId: request.id,
                      assigneeId: e.target.value || null,
                    })
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
            </div>

            {request.description ? (
              <p className="whitespace-pre-wrap rounded-md bg-bg p-3 text-sm">
                {request.description}
              </p>
            ) : null}

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                Activity
              </p>
              <div className="flex flex-col gap-2">
                {request.comments.map((c) => (
                  <div key={c.id} className="flex gap-2">
                    <Avatar name={c.author.name} size="sm" />
                    <div className="rounded-md bg-bg px-3 py-2">
                      <p className="text-xs font-medium">{c.author.name}</p>
                      <p className="text-sm">{c.body}</p>
                    </div>
                  </div>
                ))}
                {request.comments.length === 0 ? (
                  <p className="text-sm text-muted">No replies yet.</p>
                ) : null}
              </div>
              <div className="mt-3 flex gap-2">
                <Input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Reply to the customer…"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && comment.trim()) {
                      addComment.mutate({ requestId: request.id, body: comment });
                    }
                  }}
                />
                <Button
                  isLoading={addComment.isPending}
                  disabled={!comment.trim()}
                  onClick={() => addComment.mutate({ requestId: request.id, body: comment })}
                >
                  Reply
                </Button>
              </div>
            </div>
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
      </ModalFooter>
    </Modal>
  );
}
