'use client';

import { useEffect, useMemo, useState } from 'react';
import { ProductChrome, Spinner, trpc, useActiveWorkspace } from '@taskflow/app-kit';
import type { Idea, IdeaStatus } from '@taskflow/types';
import { IDEA_STATUS_ORDER } from '@taskflow/types';
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

const STATUS_LABELS: Record<IdeaStatus, string> = {
  NEW: 'New',
  UNDER_REVIEW: 'Under review',
  PLANNED: 'Planned',
  SHIPPED: 'Shipped',
};

const STATUS_COLORS: Record<IdeaStatus, string> = {
  NEW: '#6b7280',
  UNDER_REVIEW: '#8270db',
  PLANNED: '#0c66e4',
  SHIPPED: '#22a06b',
};

export default function DiscoveryPage() {
  const { workspaceId } = useActiveWorkspace();
  return (
    <ProductChrome productId="discovery">
      {workspaceId ? (
        <Workspace workspaceId={workspaceId} />
      ) : (
        <div className="p-8 text-muted">Loading workspace…</div>
      )}
    </ProductChrome>
  );
}

function Workspace({ workspaceId }: { workspaceId: string }) {
  const boards = trpc.discovery.boards.list.useQuery({ workspaceId });
  const [boardId, setBoardId] = useState<string | null>(null);

  useEffect(() => {
    if (!boardId && boards.data && boards.data.length > 0) setBoardId(boards.data[0]!.id);
  }, [boards.data, boardId]);

  const create = trpc.discovery.boards.create.useMutation({
    onSuccess: async (board) => {
      await boards.refetch();
      setBoardId(board.id);
    },
  });

  if (boards.isLoading) return <Spinner label="Loading idea boards…" />;

  if (!boards.data || boards.data.length === 0) {
    return (
      <div className="p-10 text-center text-muted">
        <p>No idea board yet.</p>
        <Button
          className="mt-3"
          isLoading={create.isPending}
          onClick={() => create.mutate({ workspaceId, name: 'Roadmap ideas' })}
        >
          Create an idea board
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-4">
        <Select value={boardId ?? ''} onChange={(e) => setBoardId(e.target.value)} className="max-w-xs">
          {boards.data.map((board) => (
            <option key={board.id} value={board.id}>
              {board.name}
            </option>
          ))}
        </Select>
      </div>
      {boardId ? <BoardView boardId={boardId} /> : null}
    </div>
  );
}

function BoardView({ boardId }: { boardId: string }) {
  const utils = trpc.useUtils();
  const ideas = trpc.discovery.ideas.list.useQuery({ boardId });
  const [view, setView] = useState<'list' | 'matrix'>('list');
  const [createOpen, setCreateOpen] = useState(false);

  const sorted = useMemo(
    () => [...(ideas.data ?? [])].sort((a, b) => b.votes - a.votes),
    [ideas.data],
  );

  const invalidate = () => utils.discovery.ideas.list.invalidate({ boardId });
  const vote = trpc.discovery.ideas.vote.useMutation({ onSuccess: invalidate });
  const unvote = trpc.discovery.ideas.unvote.useMutation({ onSuccess: invalidate });
  const updateIdea = trpc.discovery.ideas.update.useMutation({ onSuccess: invalidate });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="inline-flex rounded-md border border-border bg-card p-0.5">
          {(['list', 'matrix'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`rounded px-3 py-1.5 text-sm font-medium capitalize ${
                view === v ? 'bg-accent text-accent-fg' : 'text-muted hover:text-fg'
              }`}
            >
              {v === 'matrix' ? 'Impact / Effort' : 'Ranked list'}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          + New idea
        </Button>
      </div>

      {ideas.isLoading ? (
        <Spinner label="Loading ideas…" />
      ) : view === 'list' ? (
        <div className="flex flex-col gap-2">
          {sorted.length === 0 ? (
            <Card className="p-4 text-sm text-muted">No ideas yet. Add the first one!</Card>
          ) : (
            sorted.map((idea) => (
              <Card key={idea.id} className="flex items-center gap-4 p-3">
                <button
                  type="button"
                  onClick={() =>
                    idea.hasVoted
                      ? unvote.mutate({ ideaId: idea.id })
                      : vote.mutate({ ideaId: idea.id })
                  }
                  className={`flex w-14 shrink-0 flex-col items-center rounded-md border px-2 py-1.5 ${
                    idea.hasVoted
                      ? 'border-accent bg-accent-subtle text-accent'
                      : 'border-border text-muted hover:text-fg'
                  }`}
                  aria-label={idea.hasVoted ? 'Remove vote' : 'Upvote'}
                >
                  <span className="text-sm leading-none">▲</span>
                  <span className="text-sm font-semibold">{idea.votes}</span>
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium">{idea.title}</p>
                    <Badge dotColor={STATUS_COLORS[idea.status]}>{STATUS_LABELS[idea.status]}</Badge>
                  </div>
                  {idea.description ? (
                    <p className="mt-0.5 line-clamp-1 text-sm text-muted">{idea.description}</p>
                  ) : null}
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted">
                    <span>Impact {idea.impact}/5</span>
                    <span>Effort {idea.effort}/5</span>
                    <span>by {idea.creator.name}</span>
                  </div>
                </div>
                <Select
                  aria-label={`Status for ${idea.title}`}
                  className="max-w-[150px]"
                  value={idea.status}
                  onChange={(e) =>
                    updateIdea.mutate({ ideaId: idea.id, status: e.target.value as IdeaStatus })
                  }
                >
                  {IDEA_STATUS_ORDER.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </Select>
              </Card>
            ))
          )}
        </div>
      ) : (
        <Matrix ideas={sorted} />
      )}

      <CreateIdeaDialog boardId={boardId} open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}

function Matrix({ ideas }: { ideas: Idea[] }) {
  return (
    <Card className="p-6">
      <div className="relative mx-auto aspect-square w-full max-w-xl">
        {/* Quadrant grid */}
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 rounded-lg border border-border">
          <div className="border-b border-r border-border bg-status-done/5 p-2 text-xs text-muted">
            Big bets
          </div>
          <div className="border-b border-border bg-status-todo/5 p-2 text-right text-xs text-muted">
            Quick wins
          </div>
          <div className="border-r border-border p-2 text-xs text-muted">Time sinks</div>
          <div className="p-2 text-right text-xs text-muted">Maybes</div>
        </div>
        {/* Axis labels */}
        <span className="absolute -left-6 top-1/2 -translate-y-1/2 -rotate-90 text-xs font-medium text-muted">
          Impact →
        </span>
        <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-medium text-muted">
          ← Effort
        </span>
        {/* Dots */}
        {ideas.map((idea) => {
          const left = ((5 - idea.effort) / 4) * 100;
          const bottom = ((idea.impact - 1) / 4) * 100;
          return (
            <div
              key={idea.id}
              className="absolute -translate-x-1/2 translate-y-1/2"
              style={{ left: `${left}%`, bottom: `${bottom}%` }}
              title={`${idea.title} — impact ${idea.impact}, effort ${idea.effort}`}
            >
              <div className="flex items-center gap-1 rounded-full border border-border bg-card px-2 py-1 shadow-card">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-accent text-[10px] font-bold text-accent-fg">
                  {idea.votes}
                </span>
                <span className="max-w-[120px] truncate text-xs font-medium">{idea.title}</span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function CreateIdeaDialog({
  boardId,
  open,
  onClose,
}: {
  boardId: string;
  open: boolean;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [impact, setImpact] = useState(3);
  const [effort, setEffort] = useState(3);

  const create = trpc.discovery.ideas.create.useMutation({
    onSuccess: async () => {
      await utils.discovery.ideas.list.invalidate({ boardId });
      setTitle('');
      setDescription('');
      setImpact(3);
      setEffort(3);
      onClose();
    },
  });

  return (
    <Modal open={open} onClose={onClose} ariaLabel="New idea">
      <ModalHeader>
        <h2 className="text-lg font-semibold">New idea</h2>
      </ModalHeader>
      <ModalBody>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="idea-title">Title</Label>
            <Input
              id="idea-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Add dark mode"
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="idea-desc">Description</Label>
            <Textarea
              id="idea-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Why does this matter?"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="idea-impact">Impact (1-5)</Label>
              <Select
                id="idea-impact"
                value={impact}
                onChange={(e) => setImpact(Number(e.target.value))}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="idea-effort">Effort (1-5)</Label>
              <Select
                id="idea-effort"
                value={effort}
                onChange={(e) => setEffort(Number(e.target.value))}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
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
          disabled={!title.trim()}
          onClick={() => create.mutate({ boardId, title, description, impact, effort })}
        >
          Create idea
        </Button>
      </ModalFooter>
    </Modal>
  );
}
