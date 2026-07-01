'use client';

import { useEffect, useState } from 'react';
import { ProductChrome, Spinner, trpc, useActiveWorkspace } from '@taskflow/app-kit';
import { Button, Input, Label, Modal, ModalBody, ModalFooter, ModalHeader } from '@taskflow/ui';
import { TrelloBoard } from '../components/TrelloBoard';

export default function TrelloPage() {
  const { workspaceId } = useActiveWorkspace();
  return (
    <ProductChrome productId="trello">
      {workspaceId ? (
        <Workspace workspaceId={workspaceId} />
      ) : (
        <div className="p-8 text-muted">Loading workspace…</div>
      )}
    </ProductChrome>
  );
}

function Workspace({ workspaceId }: { workspaceId: string }) {
  const boards = trpc.trello.boards.list.useQuery({ workspaceId });
  const [boardId, setBoardId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    if (!boardId && boards.data && boards.data.length > 0) setBoardId(boards.data[0]!.id);
  }, [boards.data, boardId]);

  if (boards.isLoading) return <Spinner label="Loading boards…" />;

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)]">
      <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-card">
        <div className="flex items-center justify-between border-b border-border p-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">Boards</span>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="rounded px-1.5 text-lg leading-none text-muted hover:bg-border/40 hover:text-fg"
            aria-label="Create board"
          >
            +
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-2">
          {(boards.data ?? []).map((board) => (
            <button
              key={board.id}
              type="button"
              onClick={() => setBoardId(board.id)}
              className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm ${
                boardId === board.id ? 'bg-accent-subtle text-accent' : 'hover:bg-border/40'
              }`}
            >
              <span className="h-4 w-4 rounded bg-[#0c66e4]" aria-hidden />
              <span className="truncate">{board.name}</span>
            </button>
          ))}
          {boards.data && boards.data.length === 0 ? (
            <p className="px-2 py-1.5 text-sm text-muted">No boards yet.</p>
          ) : null}
        </nav>
      </aside>

      <section className="min-w-0 flex-1">
        {boardId ? (
          <TrelloBoard boardId={boardId} />
        ) : (
          <div className="p-10 text-center text-muted">
            <p>Create a board to get started.</p>
            <Button className="mt-3" onClick={() => setCreateOpen(true)}>
              Create a board
            </Button>
          </div>
        )}
      </section>

      <CreateBoardDialog
        workspaceId={workspaceId}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(id) => setBoardId(id)}
      />
    </div>
  );
}

function CreateBoardDialog({
  workspaceId,
  open,
  onClose,
  onCreated,
}: {
  workspaceId: string;
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const utils = trpc.useUtils();
  const [name, setName] = useState('');

  const create = trpc.trello.boards.create.useMutation({
    onSuccess: async (board) => {
      await utils.trello.boards.list.invalidate({ workspaceId });
      onCreated(board.id);
      setName('');
      onClose();
    },
  });

  return (
    <Modal open={open} onClose={onClose} ariaLabel="Create board">
      <ModalHeader>
        <h2 className="text-lg font-semibold">Create board</h2>
      </ModalHeader>
      <ModalBody>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="board-name">Board name</Label>
          <Input
            id="board-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Product Roadmap"
            autoFocus
          />
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          isLoading={create.isPending}
          disabled={!name.trim()}
          onClick={() => create.mutate({ workspaceId, name })}
        >
          Create
        </Button>
      </ModalFooter>
    </Modal>
  );
}
