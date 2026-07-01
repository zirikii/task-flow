'use client';

import { useState } from 'react';
import { ProductChrome, Spinner, trpc, useActiveWorkspace } from '@taskflow/app-kit';
import type { AtlasProjectStatus } from '@taskflow/types';
import {
  Avatar,
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

const STATUS_META: Record<AtlasProjectStatus, { label: string; color: string; bg: string }> = {
  ON_TRACK: { label: 'On track', color: '#22a06b', bg: '#e5f4ec' },
  AT_RISK: { label: 'At risk', color: '#e2b203', bg: '#fdf6e3' },
  OFF_TRACK: { label: 'Off track', color: '#e2483d', bg: '#fcecea' },
  PAUSED: { label: 'Paused', color: '#6b7280', bg: '#eef0f2' },
};

const STATUSES: AtlasProjectStatus[] = ['ON_TRACK', 'AT_RISK', 'OFF_TRACK', 'PAUSED'];

function StatusPill({ status }: { status: AtlasProjectStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{ color: meta.color, backgroundColor: meta.bg }}
    >
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: meta.color }} />
      {meta.label}
    </span>
  );
}

export default function AtlasPage() {
  const { workspaceId } = useActiveWorkspace();
  return (
    <ProductChrome productId="atlas">
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
    <div className="mx-auto max-w-5xl px-6 py-8">
      <Projects workspaceId={workspaceId} />
      <div className="mt-10">
        <Teams workspaceId={workspaceId} />
      </div>
    </div>
  );
}

function Projects({ workspaceId }: { workspaceId: string }) {
  const projects = trpc.atlas.projects.list.useQuery({ workspaceId });
  const teams = trpc.atlas.teams.list.useQuery({ workspaceId });
  const [createOpen, setCreateOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Projects</h1>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          + New project
        </Button>
      </div>

      {projects.isLoading ? (
        <Spinner label="Loading projects…" />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(projects.data ?? []).map((project) => (
            <button key={project.id} type="button" onClick={() => setOpenId(project.id)} className="text-left">
              <Card className="h-full p-4 transition-shadow hover:shadow-modal">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-semibold">{project.name}</p>
                  <StatusPill status={project.status} />
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-muted">
                  <Avatar name={project.owner.name} size="sm" />
                  <span>{project.owner.name}</span>
                  {project.teamName ? <span>· {project.teamName}</span> : null}
                </div>
              </Card>
            </button>
          ))}
          {projects.data && projects.data.length === 0 ? (
            <p className="text-sm text-muted">No projects yet.</p>
          ) : null}
        </div>
      )}

      <CreateProjectDialog
        workspaceId={workspaceId}
        teams={(teams.data ?? []).map((t) => ({ id: t.id, name: t.name }))}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(id) => setOpenId(id)}
      />
      <ProjectDetailModal atlasProjectId={openId} onClose={() => setOpenId(null)} />
    </section>
  );
}

function ProjectDetailModal({
  atlasProjectId,
  onClose,
}: {
  atlasProjectId: string | null;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const detail = trpc.atlas.projects.get.useQuery(
    { atlasProjectId: atlasProjectId ?? '' },
    { enabled: atlasProjectId !== null },
  );
  const [status, setStatus] = useState<AtlasProjectStatus>('ON_TRACK');
  const [body, setBody] = useState('');

  const post = trpc.atlas.projects.postUpdate.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.atlas.projects.get.invalidate({ atlasProjectId: atlasProjectId ?? '' }),
        utils.atlas.projects.list.invalidate(),
      ]);
      setBody('');
    },
  });

  const project = detail.data;

  return (
    <Modal open={atlasProjectId !== null} onClose={onClose} ariaLabel="Project" className="max-w-2xl">
      <ModalHeader>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">{project?.name ?? 'Project'}</h2>
          {project ? <StatusPill status={project.status} /> : null}
        </div>
      </ModalHeader>
      <ModalBody>
        {!project ? (
          <Spinner />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-sm text-muted">
              <Avatar name={project.owner.name} size="sm" />
              <span>{project.owner.name}</span>
              {project.teamName ? <span>· {project.teamName}</span> : null}
            </div>

            <div className="rounded-md border border-border p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                Post an update
              </p>
              <div className="flex flex-col gap-2">
                <Select value={status} onChange={(e) => setStatus(e.target.value as AtlasProjectStatus)}>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_META[s].label}
                    </option>
                  ))}
                </Select>
                <Textarea
                  rows={3}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="What changed since the last update?"
                />
                <div className="flex justify-end">
                  <Button
                    isLoading={post.isPending}
                    disabled={!body.trim()}
                    onClick={() => post.mutate({ atlasProjectId: project.id, status, body })}
                  >
                    Post update
                  </Button>
                </div>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                Update history
              </p>
              <ol className="space-y-3 border-l-2 border-border pl-4">
                {project.updates.map((update) => (
                  <li key={update.id}>
                    <div className="flex items-center gap-2">
                      <StatusPill status={update.status} />
                      <span className="text-xs text-muted">
                        {update.author.name} · {new Date(update.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-1 text-sm">{update.body}</p>
                  </li>
                ))}
                {project.updates.length === 0 ? (
                  <li className="text-sm text-muted">No updates yet.</li>
                ) : null}
              </ol>
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

function CreateProjectDialog({
  workspaceId,
  teams,
  open,
  onClose,
  onCreated,
}: {
  workspaceId: string;
  teams: { id: string; name: string }[];
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const utils = trpc.useUtils();
  const [name, setName] = useState('');
  const [teamId, setTeamId] = useState('');
  const [status, setStatus] = useState<AtlasProjectStatus>('ON_TRACK');

  const create = trpc.atlas.projects.create.useMutation({
    onSuccess: async (project) => {
      await utils.atlas.projects.list.invalidate({ workspaceId });
      onCreated(project.id);
      setName('');
      onClose();
    },
  });

  return (
    <Modal open={open} onClose={onClose} ariaLabel="New project">
      <ModalHeader>
        <h2 className="text-lg font-semibold">New project</h2>
      </ModalHeader>
      <ModalBody>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="p-name">Name</Label>
            <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Q3 Activation" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="p-team">Team</Label>
              <Select id="p-team" value={teamId} onChange={(e) => setTeamId(e.target.value)}>
                <option value="">No team</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="p-status">Status</Label>
              <Select id="p-status" value={status} onChange={(e) => setStatus(e.target.value as AtlasProjectStatus)}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_META[s].label}
                  </option>
                ))}
              </Select>
            </div>
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
            create.mutate({ workspaceId, name, teamId: teamId || null, status })
          }
        >
          Create
        </Button>
      </ModalFooter>
    </Modal>
  );
}

function Teams({ workspaceId }: { workspaceId: string }) {
  const utils = trpc.useUtils();
  const teams = trpc.atlas.teams.list.useQuery({ workspaceId });
  const members = trpc.workspace.members.useQuery({ workspaceId });
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [mission, setMission] = useState('');

  const createTeam = trpc.atlas.teams.create.useMutation({
    onSuccess: async () => {
      await utils.atlas.teams.list.invalidate({ workspaceId });
      setName('');
      setMission('');
      setCreateOpen(false);
    },
  });
  const addMember = trpc.atlas.teams.addMember.useMutation({
    onSuccess: () => utils.atlas.teams.list.invalidate({ workspaceId }),
  });

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Teams</h2>
        <Button size="sm" variant="secondary" onClick={() => setCreateOpen(true)}>
          + New team
        </Button>
      </div>

      {teams.isLoading ? (
        <Spinner label="Loading teams…" />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(teams.data ?? []).map((team) => {
            const memberIds = new Set(team.members.map((m) => m.id));
            const candidates = (members.data ?? []).filter((m) => !memberIds.has(m.user.id));
            return (
              <Card key={team.id} className="p-4">
                <p className="font-semibold">{team.name}</p>
                {team.mission ? <p className="mt-0.5 text-sm text-muted">{team.mission}</p> : null}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {team.members.map((member) => (
                    <span key={member.id} className="flex items-center gap-1">
                      <Avatar name={member.name} size="sm" />
                    </span>
                  ))}
                  {candidates.length > 0 ? (
                    <select
                      aria-label={`Add member to ${team.name}`}
                      className="rounded-md border border-border bg-bg px-2 py-1 text-xs"
                      value=""
                      onChange={(e) => {
                        if (e.target.value) {
                          addMember.mutate({ teamId: team.id, userId: e.target.value });
                        }
                      }}
                    >
                      <option value="">+ Add member</option>
                      {candidates.map((m) => (
                        <option key={m.user.id} value={m.user.id}>
                          {m.user.name}
                        </option>
                      ))}
                    </select>
                  ) : null}
                </div>
              </Card>
            );
          })}
          {teams.data && teams.data.length === 0 ? (
            <p className="text-sm text-muted">No teams yet.</p>
          ) : null}
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} ariaLabel="New team">
        <ModalHeader>
          <h2 className="text-lg font-semibold">New team</h2>
        </ModalHeader>
        <ModalBody>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="t-name">Name</Label>
              <Input id="t-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Platform" autoFocus />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="t-mission">Mission</Label>
              <Input id="t-mission" value={mission} onChange={(e) => setMission(e.target.value)} placeholder="Keep the lights on and the platform fast." />
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setCreateOpen(false)}>
            Cancel
          </Button>
          <Button
            isLoading={createTeam.isPending}
            disabled={!name.trim()}
            onClick={() => createTeam.mutate({ workspaceId, name, mission })}
          >
            Create
          </Button>
        </ModalFooter>
      </Modal>
    </section>
  );
}
