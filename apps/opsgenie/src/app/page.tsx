'use client';

import { useState } from 'react';
import { ProductChrome, Spinner, trpc, useActiveWorkspace } from '@taskflow/app-kit';
import type { AlertPriority, AlertStatus } from '@taskflow/types';
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
} from '@taskflow/ui';

const PRIORITY_COLORS: Record<AlertPriority, string> = {
  P1: '#e2483d',
  P2: '#e56910',
  P3: '#e2b203',
  P4: '#0c66e4',
  P5: '#6b7280',
};

const STATUS_LABELS: Record<AlertStatus, string> = {
  OPEN: 'Open',
  ACKED: 'Acked',
  CLOSED: 'Closed',
};

export default function OpsgeniePage() {
  const { workspaceId } = useActiveWorkspace();
  return (
    <ProductChrome productId="opsgenie">
      {workspaceId ? (
        <Workspace workspaceId={workspaceId} />
      ) : (
        <div className="p-8 text-muted">Loading workspace…</div>
      )}
    </ProductChrome>
  );
}

function Workspace({ workspaceId }: { workspaceId: string }) {
  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-6 py-8 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Alerts workspaceId={workspaceId} />
      </div>
      <div>
        <OnCall workspaceId={workspaceId} />
      </div>
    </div>
  );
}

function Alerts({ workspaceId }: { workspaceId: string }) {
  const utils = trpc.useUtils();
  const [status, setStatus] = useState<AlertStatus | 'ALL'>('ALL');
  const [createOpen, setCreateOpen] = useState(false);
  const alerts = trpc.opsgenie.alerts.list.useQuery({
    workspaceId,
    status: status === 'ALL' ? undefined : status,
  });

  const invalidate = () => utils.opsgenie.alerts.list.invalidate();
  const ack = trpc.opsgenie.alerts.ack.useMutation({ onSuccess: invalidate });
  const close = trpc.opsgenie.alerts.close.useMutation({ onSuccess: invalidate });

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Alerts</h1>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          + Create alert
        </Button>
      </div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {(['ALL', 'OPEN', 'ACKED', 'CLOSED'] as const).map((s) => (
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

      {alerts.isLoading ? (
        <Spinner label="Loading alerts…" />
      ) : (
        <div className="flex flex-col gap-2">
          {(alerts.data ?? []).length === 0 ? (
            <Card className="p-4 text-sm text-muted">No alerts. All quiet. 🌙</Card>
          ) : (
            (alerts.data ?? []).map((alert) => (
              <Card key={alert.id} className="flex items-center gap-3 p-3">
                <span
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-xs font-bold text-white"
                  style={{ backgroundColor: PRIORITY_COLORS[alert.priority] }}
                >
                  {alert.priority}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{alert.message}</p>
                  <p className="text-xs text-muted">
                    {alert.source} · {new Date(alert.createdAt).toLocaleString()}
                    {alert.ackedBy ? ` · acked by ${alert.ackedBy.name}` : ''}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  dotColor={
                    alert.status === 'OPEN'
                      ? '#e2483d'
                      : alert.status === 'ACKED'
                        ? '#e2b203'
                        : '#22a06b'
                  }
                >
                  {STATUS_LABELS[alert.status]}
                </Badge>
                {alert.status === 'OPEN' ? (
                  <Button size="sm" variant="secondary" onClick={() => ack.mutate({ alertId: alert.id })}>
                    Ack
                  </Button>
                ) : null}
                {alert.status !== 'CLOSED' ? (
                  <Button size="sm" variant="ghost" onClick={() => close.mutate({ alertId: alert.id })}>
                    Close
                  </Button>
                ) : null}
              </Card>
            ))
          )}
        </div>
      )}

      <CreateAlertDialog workspaceId={workspaceId} open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}

function CreateAlertDialog({
  workspaceId,
  open,
  onClose,
}: {
  workspaceId: string;
  open: boolean;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<AlertPriority>('P3');

  const create = trpc.opsgenie.alerts.create.useMutation({
    onSuccess: async () => {
      await utils.opsgenie.alerts.list.invalidate();
      setMessage('');
      onClose();
    },
  });

  return (
    <Modal open={open} onClose={onClose} ariaLabel="Create alert">
      <ModalHeader>
        <h2 className="text-lg font-semibold">Create alert</h2>
      </ModalHeader>
      <ModalBody>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="alert-message">Message</Label>
            <Input
              id="alert-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="CPU > 90% on web-1"
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="alert-priority">Priority</Label>
            <Select
              id="alert-priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as AlertPriority)}
            >
              {(['P1', 'P2', 'P3', 'P4', 'P5'] as AlertPriority[]).map((p) => (
                <option key={p} value={p}>
                  {p}
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
          disabled={!message.trim()}
          onClick={() => create.mutate({ workspaceId, message, priority })}
        >
          Create
        </Button>
      </ModalFooter>
    </Modal>
  );
}

function OnCall({ workspaceId }: { workspaceId: string }) {
  const utils = trpc.useUtils();
  const schedules = trpc.opsgenie.schedules.list.useQuery({ workspaceId });
  const members = trpc.workspace.members.useQuery({ workspaceId });
  const [addFor, setAddFor] = useState<string | null>(null);

  const createSchedule = trpc.opsgenie.schedules.create.useMutation({
    onSuccess: () => utils.opsgenie.schedules.list.invalidate({ workspaceId }),
  });

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xl font-semibold">On-call</h2>
        <Button
          size="sm"
          variant="secondary"
          isLoading={createSchedule.isPending}
          onClick={() => createSchedule.mutate({ workspaceId, name: 'Primary' })}
        >
          + Schedule
        </Button>
      </div>

      {schedules.isLoading ? (
        <Spinner label="Loading…" />
      ) : (
        <div className="flex flex-col gap-3">
          {(schedules.data ?? []).length === 0 ? (
            <Card className="p-4 text-sm text-muted">No schedules yet.</Card>
          ) : (
            (schedules.data ?? []).map((schedule) => (
              <Card key={schedule.id} className="p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{schedule.name}</h3>
                  <Button size="sm" variant="ghost" onClick={() => setAddFor(schedule.id)}>
                    + Shift
                  </Button>
                </div>
                <div className="mt-2 flex items-center gap-2 rounded-md bg-bg p-2">
                  <span className="text-xs font-semibold uppercase text-muted">On call now</span>
                  {schedule.currentOnCall ? (
                    <span className="flex items-center gap-1.5">
                      <Avatar name={schedule.currentOnCall.name} size="sm" />
                      <span className="text-sm font-medium">{schedule.currentOnCall.name}</span>
                    </span>
                  ) : (
                    <span className="text-sm text-muted">Nobody</span>
                  )}
                </div>
                {schedule.shifts.length > 0 ? (
                  <ul className="mt-2 space-y-1 text-xs text-muted">
                    {schedule.shifts.map((shift) => (
                      <li key={shift.id}>
                        {shift.user.name}: {new Date(shift.startsAt).toLocaleString()} →{' '}
                        {new Date(shift.endsAt).toLocaleString()}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </Card>
            ))
          )}
        </div>
      )}

      <AddShiftDialog
        scheduleId={addFor}
        workspaceId={workspaceId}
        members={(members.data ?? []).map((m) => ({ id: m.user.id, name: m.user.name }))}
        onClose={() => setAddFor(null)}
      />
    </div>
  );
}

function AddShiftDialog({
  scheduleId,
  workspaceId,
  members,
  onClose,
}: {
  scheduleId: string | null;
  workspaceId: string;
  members: { id: string; name: string }[];
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const [userId, setUserId] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  const addShift = trpc.opsgenie.schedules.addShift.useMutation({
    onSuccess: async () => {
      await utils.opsgenie.schedules.list.invalidate({ workspaceId });
      setStart('');
      setEnd('');
      onClose();
    },
  });

  const effectiveUser = userId || members[0]?.id || '';

  return (
    <Modal open={scheduleId !== null} onClose={onClose} ariaLabel="Add shift">
      <ModalHeader>
        <h2 className="text-lg font-semibold">Add on-call shift</h2>
      </ModalHeader>
      <ModalBody>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="shift-user">Who</Label>
            <Select id="shift-user" value={effectiveUser} onChange={(e) => setUserId(e.target.value)}>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="shift-start">Starts</Label>
            <Input
              id="shift-start"
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="shift-end">Ends</Label>
            <Input
              id="shift-end"
              type="datetime-local"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          isLoading={addShift.isPending}
          disabled={!scheduleId || !effectiveUser || !start || !end}
          onClick={() =>
            scheduleId &&
            addShift.mutate({
              scheduleId,
              userId: effectiveUser,
              startsAt: new Date(start),
              endsAt: new Date(end),
            })
          }
        >
          Add shift
        </Button>
      </ModalFooter>
    </Modal>
  );
}
