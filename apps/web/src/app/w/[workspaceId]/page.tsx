'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { trpc } from '../../../lib/trpc';

export default function WorkspaceHomePage() {
  const router = useRouter();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const projects = trpc.project.list.useQuery({ workspaceId });
  const firstProjectId = projects.data?.[0]?.id;

  useEffect(() => {
    if (firstProjectId) router.replace(`/w/${workspaceId}/p/${firstProjectId}`);
  }, [firstProjectId, workspaceId, router]);

  return (
    <main className="flex flex-1 items-center justify-center p-8 text-center">
      <div>
        <h1 className="text-xl font-semibold">No project selected</h1>
        <p className="mt-1 text-sm text-muted">
          {projects.isLoading
            ? 'Loading projects…'
            : 'Create a project from the sidebar to get started.'}
        </p>
      </div>
    </main>
  );
}
