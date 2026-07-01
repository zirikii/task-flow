'use client';

import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { Avatar, Button } from '@taskflow/ui';
import { AppSwitcher } from '@taskflow/app-kit';
import { trpc } from '../lib/trpc';
import { Spinner } from './Spinner';
import { CreateProjectDialog } from './CreateProjectDialog';

export function AppShell({ workspaceId, children }: { workspaceId: string; children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams<{ projectId?: string }>();
  const utils = trpc.useUtils();
  const [createOpen, setCreateOpen] = useState(false);

  const me = trpc.auth.me.useQuery();
  const workspaces = trpc.workspace.list.useQuery(undefined, { enabled: Boolean(me.data) });
  const projects = trpc.project.list.useQuery(
    { workspaceId },
    { enabled: Boolean(me.data) },
  );

  const logout = trpc.auth.logout.useMutation({
    onSuccess: async () => {
      await utils.invalidate();
      router.replace('/login');
    },
  });

  if (me.isLoading) return <Spinner label="Loading…" />;
  if (!me.data) {
    router.replace('/login');
    return <Spinner />;
  }
  const currentUser = me.data;

  const activeProjectId = params?.projectId;

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border p-3">
          <AppSwitcher currentId="jira" />
          <span className="flex items-center gap-2 text-lg font-semibold">
            <span
              className="grid h-7 w-7 place-items-center rounded-md text-xs font-bold text-white"
              style={{ backgroundColor: '#2684ff' }}
            >
              J
            </span>
            Jira
          </span>
        </div>

        <div className="border-b border-border p-3">
          <label className="sr-only" htmlFor="workspace-switcher">
            Switch workspace
          </label>
          <select
            id="workspace-switcher"
            className="w-full rounded-md border border-border bg-bg px-2 py-1.5 text-sm font-medium"
            value={workspaceId}
            onChange={(event) => router.push(`/w/${event.target.value}`)}
          >
            {(workspaces.data ?? []).map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name}
              </option>
            ))}
          </select>
        </div>

        <nav className="flex-1 overflow-y-auto p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">
              Projects
            </span>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="rounded px-1.5 text-lg leading-none text-muted hover:bg-border/40 hover:text-fg"
              aria-label="Create project"
            >
              +
            </button>
          </div>
          <ul className="flex flex-col gap-0.5">
            {(projects.data ?? []).map((project) => {
              const href = `/w/${workspaceId}/p/${project.id}`;
              const active = activeProjectId === project.id || pathname === href;
              return (
                <li key={project.id}>
                  <Link
                    href={href}
                    className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
                      active ? 'bg-accent-subtle text-accent' : 'text-fg hover:bg-border/40'
                    }`}
                  >
                    <span className="rounded bg-border/60 px-1 text-[10px] font-semibold text-muted">
                      {project.key}
                    </span>
                    <span className="truncate">{project.name}</span>
                  </Link>
                </li>
              );
            })}
            {projects.data && projects.data.length === 0 ? (
              <li className="px-2 py-1.5 text-sm text-muted">No projects yet.</li>
            ) : null}
          </ul>
        </nav>

        <div className="flex items-center gap-2 border-t border-border p-3">
          <Avatar name={currentUser.name} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{currentUser.name}</p>
            <p className="truncate text-xs text-muted">{currentUser.email}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => logout.mutate()}
            isLoading={logout.isPending}
          >
            Sign out
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">{children}</div>

      <CreateProjectDialog
        workspaceId={workspaceId}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
    </div>
  );
}
