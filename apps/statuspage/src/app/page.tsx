'use client';

import { useEffect, useState } from 'react';
import { ProductChrome, Spinner, trpc, useActiveWorkspace } from '@taskflow/app-kit';
import type {
  ComponentStatus,
  IncidentImpact,
  IncidentStatus,
  StatusPageDetail,
} from '@taskflow/types';
import {
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

const COMPONENT_STATUS: Record<ComponentStatus, { label: string; color: string }> = {
  OPERATIONAL: { label: 'Operational', color: '#22a06b' },
  DEGRADED: { label: 'Degraded performance', color: '#e2b203' },
  PARTIAL_OUTAGE: { label: 'Partial outage', color: '#e56910' },
  MAJOR_OUTAGE: { label: 'Major outage', color: '#e2483d' },
};

const INCIDENT_STATUS: Record<IncidentStatus, string> = {
  INVESTIGATING: 'Investigating',
  IDENTIFIED: 'Identified',
  MONITORING: 'Monitoring',
  RESOLVED: 'Resolved',
};

const IMPACT_COLOR: Record<IncidentImpact, string> = {
  MINOR: '#e2b203',
  MAJOR: '#e56910',
  CRITICAL: '#e2483d',
};

function overallStatus(detail: StatusPageDetail): { label: string; color: string } {
  const worst = detail.components.reduce<ComponentStatus>((acc, c) => {
    const order: ComponentStatus[] = [
      'OPERATIONAL',
      'DEGRADED',
      'PARTIAL_OUTAGE',
      'MAJOR_OUTAGE',
    ];
    return order.indexOf(c.status) > order.indexOf(acc) ? c.status : acc;
  }, 'OPERATIONAL');
  if (worst === 'OPERATIONAL')
    return { label: 'All systems operational', color: COMPONENT_STATUS.OPERATIONAL.color };
  return { label: 'Some systems affected', color: COMPONENT_STATUS[worst].color };
}

export default function StatuspagePage() {
  const { workspaceId } = useActiveWorkspace();
  return (
    <ProductChrome productId="statuspage">
      {workspaceId ? (
        <Workspace workspaceId={workspaceId} />
      ) : (
        <div className="p-8 text-muted">Loading workspace…</div>
      )}
    </ProductChrome>
  );
}

function Workspace({ workspaceId }: { workspaceId: string }) {
  const pages = trpc.statuspage.pages.list.useQuery({ workspaceId });
  const [pageId, setPageId] = useState<string | null>(null);

  useEffect(() => {
    if (!pageId && pages.data && pages.data.length > 0) setPageId(pages.data[0]!.id);
  }, [pages.data, pageId]);

  const create = trpc.statuspage.pages.create.useMutation({
    onSuccess: async (page) => {
      await pages.refetch();
      setPageId(page.id);
    },
  });

  if (pages.isLoading) return <Spinner label="Loading status pages…" />;

  if (!pages.data || pages.data.length === 0) {
    return (
      <div className="p-10 text-center text-muted">
        <p>No status page yet.</p>
        <Button
          className="mt-3"
          isLoading={create.isPending}
          onClick={() => create.mutate({ workspaceId, name: 'Public Status' })}
        >
          Create a status page
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-4 flex items-center gap-3">
        <Select
          value={pageId ?? ''}
          onChange={(event) => setPageId(event.target.value)}
          className="max-w-xs"
        >
          {pages.data.map((page) => (
            <option key={page.id} value={page.id}>
              {page.name}
            </option>
          ))}
        </Select>
      </div>
      {pageId ? <PageDetail pageId={pageId} /> : null}
    </div>
  );
}

function PageDetail({ pageId }: { pageId: string }) {
  const utils = trpc.useUtils();
  const detail = trpc.statuspage.pages.get.useQuery({ pageId });
  const [addComponentOpen, setAddComponentOpen] = useState(false);
  const [componentName, setComponentName] = useState('');
  const [incidentOpen, setIncidentOpen] = useState(false);

  const setStatus = trpc.statuspage.components.setStatus.useMutation({
    onSettled: () => utils.statuspage.pages.get.invalidate({ pageId }),
  });
  const addComponent = trpc.statuspage.components.create.useMutation({
    onSuccess: async () => {
      await utils.statuspage.pages.get.invalidate({ pageId });
      setComponentName('');
      setAddComponentOpen(false);
    },
  });

  if (detail.isLoading || !detail.data) return <Spinner label="Loading…" />;
  const overall = overallStatus(detail.data);

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex items-center gap-3 p-5" style={{ borderLeft: `4px solid ${overall.color}` }}>
        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: overall.color }} />
        <h1 className="text-xl font-semibold">{overall.label}</h1>
      </Card>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Components</h2>
          <Button size="sm" variant="secondary" onClick={() => setAddComponentOpen(true)}>
            + Add component
          </Button>
        </div>
        <Card className="divide-y divide-border">
          {detail.data.components.length === 0 ? (
            <p className="p-4 text-sm text-muted">No components yet.</p>
          ) : (
            detail.data.components.map((component) => (
              <div key={component.id} className="flex items-center justify-between gap-3 p-3">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: COMPONENT_STATUS[component.status].color }}
                  />
                  <span className="text-sm font-medium">{component.name}</span>
                </div>
                <Select
                  aria-label={`Status for ${component.name}`}
                  className="max-w-[220px]"
                  value={component.status}
                  onChange={(event) =>
                    setStatus.mutate({
                      componentId: component.id,
                      status: event.target.value as ComponentStatus,
                    })
                  }
                >
                  {(Object.keys(COMPONENT_STATUS) as ComponentStatus[]).map((status) => (
                    <option key={status} value={status}>
                      {COMPONENT_STATUS[status].label}
                    </option>
                  ))}
                </Select>
              </div>
            ))
          )}
        </Card>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Incidents</h2>
          <Button size="sm" onClick={() => setIncidentOpen(true)}>
            Report incident
          </Button>
        </div>
        {detail.data.incidents.length === 0 ? (
          <Card className="p-4 text-sm text-muted">No incidents reported. 🎉</Card>
        ) : (
          <div className="flex flex-col gap-3">
            {detail.data.incidents.map((incident) => (
              <IncidentCard key={incident.id} incident={incident} pageId={pageId} />
            ))}
          </div>
        )}
      </section>

      <Modal open={addComponentOpen} onClose={() => setAddComponentOpen(false)} ariaLabel="Add component">
        <ModalHeader>
          <h2 className="text-lg font-semibold">Add component</h2>
        </ModalHeader>
        <ModalBody>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="component-name">Name</Label>
            <Input
              id="component-name"
              value={componentName}
              onChange={(event) => setComponentName(event.target.value)}
              placeholder="API"
              autoFocus
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setAddComponentOpen(false)}>
            Cancel
          </Button>
          <Button
            isLoading={addComponent.isPending}
            disabled={!componentName.trim()}
            onClick={() => addComponent.mutate({ pageId, name: componentName })}
          >
            Add
          </Button>
        </ModalFooter>
      </Modal>

      <CreateIncidentDialog
        pageId={pageId}
        open={incidentOpen}
        onClose={() => setIncidentOpen(false)}
      />
    </div>
  );
}

function IncidentCard({
  incident,
  pageId,
}: {
  incident: StatusPageDetail['incidents'][number];
  pageId: string;
}) {
  const utils = trpc.useUtils();
  const [addOpen, setAddOpen] = useState(false);
  const [body, setBody] = useState('');
  const [status, setStatus] = useState<IncidentStatus>(incident.status);

  const addUpdate = trpc.statuspage.incidents.addUpdate.useMutation({
    onSuccess: async () => {
      await utils.statuspage.pages.get.invalidate({ pageId });
      setBody('');
      setAddOpen(false);
    },
  });

  const resolved = incident.status === 'RESOLVED';

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="rounded-full px-2 py-0.5 text-xs font-semibold text-white"
              style={{ backgroundColor: resolved ? '#22a06b' : IMPACT_COLOR[incident.impact] }}
            >
              {resolved ? 'Resolved' : INCIDENT_STATUS[incident.status]}
            </span>
            <h3 className="font-semibold">{incident.title}</h3>
          </div>
        </div>
        {!resolved ? (
          <Button size="sm" variant="secondary" onClick={() => setAddOpen(true)}>
            Post update
          </Button>
        ) : null}
      </div>

      <ol className="mt-3 space-y-3 border-l-2 border-border pl-4">
        {incident.updates.map((update) => (
          <li key={update.id}>
            <p className="text-xs font-semibold uppercase text-muted">
              {INCIDENT_STATUS[update.status]} ·{' '}
              {new Date(update.createdAt).toLocaleString()}
            </p>
            <p className="mt-0.5 text-sm">{update.body}</p>
          </li>
        ))}
      </ol>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} ariaLabel="Post incident update">
        <ModalHeader>
          <h2 className="text-lg font-semibold">Post update</h2>
        </ModalHeader>
        <ModalBody>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="update-status">Status</Label>
              <Select
                id="update-status"
                value={status}
                onChange={(event) => setStatus(event.target.value as IncidentStatus)}
              >
                {(Object.keys(INCIDENT_STATUS) as IncidentStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {INCIDENT_STATUS[s]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="update-body">Update</Label>
              <Textarea
                id="update-body"
                rows={4}
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder="What's the latest?"
              />
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setAddOpen(false)}>
            Cancel
          </Button>
          <Button
            isLoading={addUpdate.isPending}
            disabled={!body.trim()}
            onClick={() => addUpdate.mutate({ incidentId: incident.id, status, body })}
          >
            Post update
          </Button>
        </ModalFooter>
      </Modal>
    </Card>
  );
}

function CreateIncidentDialog({
  pageId,
  open,
  onClose,
}: {
  pageId: string;
  open: boolean;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const [title, setTitle] = useState('');
  const [impact, setImpact] = useState<IncidentImpact>('MINOR');
  const [status, setStatus] = useState<IncidentStatus>('INVESTIGATING');
  const [body, setBody] = useState('');

  const create = trpc.statuspage.incidents.create.useMutation({
    onSuccess: async () => {
      await utils.statuspage.pages.get.invalidate({ pageId });
      setTitle('');
      setBody('');
      onClose();
    },
  });

  return (
    <Modal open={open} onClose={onClose} ariaLabel="Report incident">
      <ModalHeader>
        <h2 className="text-lg font-semibold">Report an incident</h2>
      </ModalHeader>
      <ModalBody>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="incident-title">Title</Label>
            <Input
              id="incident-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Elevated error rates"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="incident-impact">Impact</Label>
              <Select
                id="incident-impact"
                value={impact}
                onChange={(event) => setImpact(event.target.value as IncidentImpact)}
              >
                <option value="MINOR">Minor</option>
                <option value="MAJOR">Major</option>
                <option value="CRITICAL">Critical</option>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="incident-status">Status</Label>
              <Select
                id="incident-status"
                value={status}
                onChange={(event) => setStatus(event.target.value as IncidentStatus)}
              >
                {(Object.keys(INCIDENT_STATUS) as IncidentStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {INCIDENT_STATUS[s]}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="incident-body">Initial update</Label>
            <Textarea
              id="incident-body"
              rows={4}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="We are investigating…"
            />
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          isLoading={create.isPending}
          disabled={!title.trim() || !body.trim()}
          onClick={() => create.mutate({ pageId, title, impact, status, body })}
        >
          Report incident
        </Button>
      </ModalFooter>
    </Modal>
  );
}
