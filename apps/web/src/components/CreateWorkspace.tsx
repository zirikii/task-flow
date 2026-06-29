'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { CreateWorkspaceInput } from '@taskflow/types';
import { Button, Card, Input, Label } from '@taskflow/ui';
import { trpc } from '../lib/trpc';

export function CreateWorkspace() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const create = trpc.workspace.create.useMutation({
    onSuccess: async (workspace) => {
      await utils.workspace.list.invalidate();
      router.replace(`/w/${workspace.id}`);
    },
    onError: (err) => setError(err.message),
  });

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const parsed = CreateWorkspaceInput.safeParse({ name });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid input');
      return;
    }
    create.mutate(parsed.data);
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm p-6">
        <h1 className="text-2xl font-bold">Create a workspace</h1>
        <p className="mt-1 text-sm text-muted">
          Workspaces hold your projects and team. Create one to get started.
        </p>
        <form className="mt-6 flex flex-col gap-4" onSubmit={onSubmit}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ws-name">Workspace name</Label>
            <Input
              id="ws-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Acme Engineering"
              required
            />
          </div>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="submit" isLoading={create.isPending} className="w-full">
            Create workspace
          </Button>
        </form>
      </Card>
    </main>
  );
}
