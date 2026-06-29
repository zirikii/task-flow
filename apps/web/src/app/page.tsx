'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Spinner } from '../components/Spinner';
import { CreateWorkspace } from '../components/CreateWorkspace';
import { trpc } from '../lib/trpc';

export default function HomePage() {
  const router = useRouter();
  const me = trpc.auth.me.useQuery();
  const workspaces = trpc.workspace.list.useQuery(undefined, {
    enabled: Boolean(me.data),
  });

  const firstWorkspaceId = workspaces.data?.[0]?.id;

  useEffect(() => {
    if (me.isSuccess && me.data === null) {
      router.replace('/login');
    }
  }, [me.isSuccess, me.data, router]);

  useEffect(() => {
    if (firstWorkspaceId) {
      router.replace(`/w/${firstWorkspaceId}`);
    }
  }, [firstWorkspaceId, router]);

  if (me.isLoading || me.data === null) return <Spinner label="Loading…" />;
  if (workspaces.isLoading) return <Spinner label="Loading workspaces…" />;
  if (workspaces.data && workspaces.data.length === 0) return <CreateWorkspace />;

  return <Spinner label="Opening workspace…" />;
}
