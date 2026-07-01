'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Workspace } from '@taskflow/types';
import { trpc } from './trpc';

const STORAGE_KEY = 'taskflow.activeWorkspaceId';

export interface ActiveWorkspace {
  workspaces: Workspace[];
  workspaceId: string | undefined;
  activeWorkspace: Workspace | undefined;
  setWorkspaceId: (id: string) => void;
  isLoading: boolean;
}

/**
 * Resolves the "active" workspace for a product app. The selection persists in
 * localStorage (per-origin) and falls back to the first workspace the user
 * belongs to. Both the chrome (switcher) and pages read this so they agree.
 */
export function useActiveWorkspace(): ActiveWorkspace {
  const query = trpc.workspace.list.useQuery();
  const [stored, setStored] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setStored(window.localStorage.getItem(STORAGE_KEY) ?? undefined);
  }, []);

  const workspaces = query.data ?? [];

  const workspaceId = useMemo(() => {
    if (workspaces.length === 0) return undefined;
    if (stored && workspaces.some((w) => w.id === stored)) return stored;
    return workspaces[0]?.id;
  }, [workspaces, stored]);

  const setWorkspaceId = useCallback((id: string) => {
    if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, id);
    setStored(id);
  }, []);

  const activeWorkspace = workspaces.find((w) => w.id === workspaceId);

  return {
    workspaces,
    workspaceId,
    activeWorkspace,
    setWorkspaceId,
    isLoading: query.isLoading,
  };
}
