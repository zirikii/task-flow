'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { CreateProjectInput } from '@taskflow/types';
import {
  Button,
  Input,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from '@taskflow/ui';
import { trpc } from '../lib/trpc';

export function CreateProjectDialog({
  workspaceId,
  open,
  onClose,
}: {
  workspaceId: string;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [error, setError] = useState<string | null>(null);

  const create = trpc.project.create.useMutation({
    onSuccess: async (project) => {
      await utils.project.list.invalidate({ workspaceId });
      onClose();
      setName('');
      setKey('');
      router.push(`/w/${workspaceId}/p/${project.id}`);
    },
    onError: (err) => setError(err.message),
  });

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const parsed = CreateProjectInput.safeParse({ workspaceId, name, key });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid input');
      return;
    }
    create.mutate(parsed.data);
  }

  return (
    <Modal open={open} onClose={onClose} ariaLabel="Create project">
      <form onSubmit={onSubmit}>
        <ModalHeader>
          <h2 className="text-lg font-semibold">New project</h2>
        </ModalHeader>
        <ModalBody className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="project-name">Name</Label>
            <Input
              id="project-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Web App"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="project-key">Key</Label>
            <Input
              id="project-key"
              value={key}
              onChange={(event) => setKey(event.target.value.toUpperCase())}
              placeholder="WEB"
              maxLength={6}
              required
            />
            <p className="text-xs text-muted">2–6 letters, used as a short prefix.</p>
          </div>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={create.isPending}>
            Create project
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
