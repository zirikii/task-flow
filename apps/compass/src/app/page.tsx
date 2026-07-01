'use client';

import { useState } from 'react';
import { ProductChrome, Spinner, trpc, useActiveWorkspace } from '@taskflow/app-kit';
import type { Component, ComponentType } from '@taskflow/types';
import { COMPONENT_TYPES } from '@taskflow/types';
import {
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

const TYPE_LABELS: Record<ComponentType, string> = {
  SERVICE: 'Service',
  LIBRARY: 'Library',
  APPLICATION: 'Application',
  WEBSITE: 'Website',
  DATA_PIPELINE: 'Data pipeline',
};

function healthColor(score: number): string {
  if (score >= 80) return '#22a06b';
  if (score >= 50) return '#e2b203';
  return '#e2483d';
}

export default function CompassPage() {
  const { workspaceId } = useActiveWorkspace();
  return (
    <ProductChrome productId="compass">
      {workspaceId ? (
        <Workspace workspaceId={workspaceId} />
      ) : (
        <div className="p-8 text-muted">Loading workspace…</div>
      )}
    </ProductChrome>
  );
}

function Workspace({ workspaceId }: { workspaceId: string }) {
  const [type, setType] = useState<ComponentType | 'ALL'>('ALL');
  const [createOpen, setCreateOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const components = trpc.compass.components.list.useQuery({
    workspaceId,
    type: type === 'ALL' ? undefined : type,
  });

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Component catalog</h1>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          + Add component
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {(['ALL', ...COMPONENT_TYPES] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              type === t
                ? 'border-accent bg-accent-subtle text-accent'
                : 'border-border text-muted hover:text-fg'
            }`}
          >
            {t === 'ALL' ? 'All' : TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {components.isLoading ? (
        <Spinner label="Loading catalog…" />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(components.data ?? []).map((component) => (
            <button key={component.id} type="button" onClick={() => setOpenId(component.id)} className="text-left">
              <Card className="h-full p-4 transition-shadow hover:shadow-modal">
                <div className="flex items-center justify-between">
                  <Badge variant="outline">{TYPE_LABELS[component.type]}</Badge>
                  <span className="text-xs font-medium text-muted">Tier {component.tier}</span>
                </div>
                <p className="mt-2 font-semibold">{component.name}</p>
                {component.ownerTeam ? (
                  <p className="text-xs text-muted">Owned by {component.ownerTeam}</p>
                ) : null}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted">Health</span>
                    <span className="font-semibold">{component.healthScore}</span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-border">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${component.healthScore}%`,
                        backgroundColor: healthColor(component.healthScore),
                      }}
                    />
                  </div>
                </div>
              </Card>
            </button>
          ))}
          {components.data && components.data.length === 0 ? (
            <p className="text-sm text-muted">No components yet.</p>
          ) : null}
        </div>
      )}

      <CreateComponentDialog
        workspaceId={workspaceId}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
      <ComponentDetailModal componentId={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}

function CreateComponentDialog({
  workspaceId,
  open,
  onClose,
}: {
  workspaceId: string;
  open: boolean;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const [name, setName] = useState('');
  const [type, setType] = useState<ComponentType>('SERVICE');
  const [ownerTeam, setOwnerTeam] = useState('');
  const [tier, setTier] = useState(3);
  const [healthScore, setHealthScore] = useState(80);
  const [description, setDescription] = useState('');

  const create = trpc.compass.components.create.useMutation({
    onSuccess: async () => {
      await utils.compass.components.list.invalidate();
      setName('');
      setOwnerTeam('');
      setDescription('');
      onClose();
    },
  });

  return (
    <Modal open={open} onClose={onClose} ariaLabel="Add component">
      <ModalHeader>
        <h2 className="text-lg font-semibold">Add component</h2>
      </ModalHeader>
      <ModalBody>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="c-name">Name</Label>
            <Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="checkout-service" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="c-type">Type</Label>
              <Select id="c-type" value={type} onChange={(e) => setType(e.target.value as ComponentType)}>
                {COMPONENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {TYPE_LABELS[t]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="c-team">Owner team</Label>
              <Input id="c-team" value={ownerTeam} onChange={(e) => setOwnerTeam(e.target.value)} placeholder="Payments" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="c-tier">Tier (1-4)</Label>
              <Select id="c-tier" value={tier} onChange={(e) => setTier(Number(e.target.value))}>
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="c-health">Health (0-100)</Label>
              <Input
                id="c-health"
                type="number"
                min={0}
                max={100}
                value={healthScore}
                onChange={(e) => setHealthScore(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="c-desc">Description</Label>
            <Textarea id="c-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          isLoading={create.isPending}
          disabled={!name.trim()}
          onClick={() =>
            create.mutate({ workspaceId, name, type, ownerTeam, tier, healthScore, description })
          }
        >
          Add
        </Button>
      </ModalFooter>
    </Modal>
  );
}

function ComponentDetailModal({
  componentId,
  onClose,
}: {
  componentId: string | null;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const detail = trpc.compass.components.get.useQuery(
    { componentId: componentId ?? '' },
    { enabled: componentId !== null },
  );
  const update = trpc.compass.components.update.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.compass.components.get.invalidate({ componentId: componentId ?? '' }),
        utils.compass.components.list.invalidate(),
      ]);
    },
  });

  const component: Component | undefined = detail.data;

  return (
    <Modal open={componentId !== null} onClose={onClose} ariaLabel="Component detail">
      <ModalHeader>
        <h2 className="text-lg font-semibold">{component?.name ?? 'Component'}</h2>
      </ModalHeader>
      <ModalBody>
        {!component ? (
          <Spinner />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{TYPE_LABELS[component.type]}</Badge>
              <Badge>Tier {component.tier}</Badge>
              {component.ownerTeam ? <Badge variant="neutral">{component.ownerTeam}</Badge> : null}
            </div>
            {component.description ? (
              <p className="text-sm text-fg/90">{component.description}</p>
            ) : (
              <p className="text-sm text-muted">No description.</p>
            )}
            <div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Health score</span>
                <span className="font-semibold" style={{ color: healthColor(component.healthScore) }}>
                  {component.healthScore}/100
                </span>
              </div>
              <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${component.healthScore}%`,
                    backgroundColor: healthColor(component.healthScore),
                  }}
                />
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={component.healthScore}
                onChange={(e) =>
                  update.mutate({ componentId: component.id, healthScore: Number(e.target.value) })
                }
                className="mt-3 w-full"
                aria-label="Adjust health score"
              />
              <p className="text-xs text-muted">Drag to simulate a scorecard change.</p>
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
