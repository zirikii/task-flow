'use client';

import { useEffect, useState } from 'react';
import { ProductChrome, Spinner, trpc, useActiveWorkspace } from '@taskflow/app-kit';
import type { PullRequestStatus } from '@taskflow/types';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Input,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Textarea,
} from '@taskflow/ui';

const STATUS_META: Record<PullRequestStatus, { label: string; color: string }> = {
  OPEN: { label: 'Open', color: '#0c66e4' },
  MERGED: { label: 'Merged', color: '#8270db' },
  DECLINED: { label: 'Declined', color: '#e2483d' },
};

export default function BitbucketPage() {
  const { workspaceId } = useActiveWorkspace();
  return (
    <ProductChrome productId="bitbucket">
      {workspaceId ? (
        <Workspace workspaceId={workspaceId} />
      ) : (
        <div className="p-8 text-muted">Loading workspace…</div>
      )}
    </ProductChrome>
  );
}

function Workspace({ workspaceId }: { workspaceId: string }) {
  const repos = trpc.bitbucket.repos.list.useQuery({ workspaceId });
  const [repoId, setRepoId] = useState<string | null>(null);
  const [createRepoOpen, setCreateRepoOpen] = useState(false);

  useEffect(() => {
    if (!repoId && repos.data && repos.data.length > 0) setRepoId(repos.data[0]!.id);
  }, [repos.data, repoId]);

  if (repos.isLoading) return <Spinner label="Loading repositories…" />;

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)]">
      <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-card">
        <div className="flex items-center justify-between border-b border-border p-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">
            Repositories
          </span>
          <button
            type="button"
            onClick={() => setCreateRepoOpen(true)}
            className="rounded px-1.5 text-lg leading-none text-muted hover:bg-border/40 hover:text-fg"
            aria-label="Create repository"
          >
            +
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-2">
          {(repos.data ?? []).map((repo) => (
            <button
              key={repo.id}
              type="button"
              onClick={() => setRepoId(repo.id)}
              className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm ${
                repoId === repo.id ? 'bg-accent-subtle text-accent' : 'hover:bg-border/40'
              }`}
            >
              <span className="truncate">{repo.name}</span>
              {repo.openPullRequests > 0 ? (
                <span className="rounded-full bg-border/70 px-1.5 text-[10px] font-semibold text-muted">
                  {repo.openPullRequests}
                </span>
              ) : null}
            </button>
          ))}
          {repos.data && repos.data.length === 0 ? (
            <p className="px-2 py-1.5 text-sm text-muted">No repositories yet.</p>
          ) : null}
        </nav>
      </aside>

      <section className="min-w-0 flex-1">
        {repoId ? (
          <RepoView repositoryId={repoId} />
        ) : (
          <div className="p-10 text-center text-muted">
            <p>Create a repository to get started.</p>
            <Button className="mt-3" onClick={() => setCreateRepoOpen(true)}>
              Create a repository
            </Button>
          </div>
        )}
      </section>

      <CreateRepoDialog
        workspaceId={workspaceId}
        open={createRepoOpen}
        onClose={() => setCreateRepoOpen(false)}
        onCreated={(id) => setRepoId(id)}
      />
    </div>
  );
}

function RepoView({ repositoryId }: { repositoryId: string }) {
  const repo = trpc.bitbucket.repos.get.useQuery({ repositoryId });
  const [status, setStatus] = useState<PullRequestStatus | 'ALL'>('OPEN');
  const [createOpen, setCreateOpen] = useState(false);
  const [openPrId, setOpenPrId] = useState<string | null>(null);
  const prs = trpc.bitbucket.pullRequests.list.useQuery({
    repositoryId,
    status: status === 'ALL' ? undefined : status,
  });

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-xl font-semibold">{repo.data?.name ?? 'Repository'}</h1>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          + Create pull request
        </Button>
      </div>
      {repo.data?.description ? (
        <p className="mb-1 text-sm text-muted">{repo.data.description}</p>
      ) : null}
      <p className="mb-4 text-xs text-muted">
        Default branch <code className="rounded bg-border/50 px-1">{repo.data?.defaultBranch}</code>
        {repo.data?.language ? ` · ${repo.data.language}` : ''}
      </p>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {(['OPEN', 'MERGED', 'DECLINED', 'ALL'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              status === s
                ? 'border-accent bg-accent-subtle text-accent'
                : 'border-border text-muted hover:text-fg'
            }`}
          >
            {s === 'ALL' ? 'All' : STATUS_META[s].label}
          </button>
        ))}
      </div>

      {prs.isLoading ? (
        <Spinner label="Loading pull requests…" />
      ) : (
        <Card className="divide-y divide-border">
          {(prs.data ?? []).length === 0 ? (
            <p className="p-4 text-sm text-muted">No pull requests here.</p>
          ) : (
            (prs.data ?? []).map((pr) => (
              <button
                key={pr.id}
                type="button"
                onClick={() => setOpenPrId(pr.id)}
                className="flex w-full items-center gap-3 p-3 text-left hover:bg-border/30"
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: STATUS_META[pr.status].color }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    #{pr.number} {pr.title}
                  </span>
                  <span className="block text-xs text-muted">
                    {pr.sourceBranch} → {pr.targetBranch} · {pr.author.name}
                  </span>
                </span>
                {pr.approvals > 0 ? (
                  <Badge dotColor="#22a06b">{pr.approvals} approved</Badge>
                ) : null}
                <Badge variant="outline">{STATUS_META[pr.status].label}</Badge>
              </button>
            ))
          )}
        </Card>
      )}

      <CreatePrDialog
        repositoryId={repositoryId}
        defaultBranch={repo.data?.defaultBranch ?? 'main'}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(id) => setOpenPrId(id)}
      />
      <PrDetailModal pullRequestId={openPrId} onClose={() => setOpenPrId(null)} />
    </div>
  );
}

function PrDetailModal({
  pullRequestId,
  onClose,
}: {
  pullRequestId: string | null;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const detail = trpc.bitbucket.pullRequests.get.useQuery(
    { pullRequestId: pullRequestId ?? '' },
    { enabled: pullRequestId !== null },
  );
  const [comment, setComment] = useState('');

  const invalidate = async () => {
    await Promise.all([
      utils.bitbucket.pullRequests.get.invalidate({ pullRequestId: pullRequestId ?? '' }),
      utils.bitbucket.pullRequests.list.invalidate(),
      utils.bitbucket.repos.list.invalidate(),
    ]);
  };

  const approve = trpc.bitbucket.pullRequests.approve.useMutation({ onSuccess: invalidate });
  const merge = trpc.bitbucket.pullRequests.merge.useMutation({ onSuccess: invalidate });
  const decline = trpc.bitbucket.pullRequests.decline.useMutation({ onSuccess: invalidate });
  const addComment = trpc.bitbucket.pullRequests.comment.useMutation({
    onSuccess: async () => {
      setComment('');
      await invalidate();
    },
  });

  const pr = detail.data;

  return (
    <Modal open={pullRequestId !== null} onClose={onClose} ariaLabel="Pull request" className="max-w-2xl">
      <ModalHeader>
        <h2 className="text-lg font-semibold">
          {pr ? `#${pr.number} ${pr.title}` : 'Pull request'}
        </h2>
      </ModalHeader>
      <ModalBody>
        {!pr ? (
          <Spinner />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline" dotColor={STATUS_META[pr.status].color}>
                {STATUS_META[pr.status].label}
              </Badge>
              <span className="text-sm text-muted">
                <code className="rounded bg-border/50 px-1">{pr.sourceBranch}</code> →{' '}
                <code className="rounded bg-border/50 px-1">{pr.targetBranch}</code>
              </span>
            </div>

            {pr.description ? (
              <p className="whitespace-pre-wrap rounded-md bg-bg p-3 text-sm">{pr.description}</p>
            ) : null}

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase text-muted">Approvals</span>
              {pr.approvedBy.length > 0 ? (
                pr.approvedBy.map((user) => (
                  <span key={user.id} className="flex items-center gap-1">
                    <Avatar name={user.name} size="sm" />
                  </span>
                ))
              ) : (
                <span className="text-sm text-muted">None yet</span>
              )}
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                Comments
              </p>
              <div className="flex flex-col gap-2">
                {pr.comments.map((c) => (
                  <div key={c.id} className="flex gap-2">
                    <Avatar name={c.author.name} size="sm" />
                    <div className="rounded-md bg-bg px-3 py-2">
                      <p className="text-xs font-medium">{c.author.name}</p>
                      <p className="text-sm">{c.body}</p>
                    </div>
                  </div>
                ))}
                {pr.comments.length === 0 ? (
                  <p className="text-sm text-muted">No comments yet.</p>
                ) : null}
              </div>
              <div className="mt-3 flex gap-2">
                <Input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Leave a comment…"
                />
                <Button
                  isLoading={addComment.isPending}
                  disabled={!comment.trim()}
                  onClick={() => addComment.mutate({ pullRequestId: pr.id, body: comment })}
                >
                  Comment
                </Button>
              </div>
            </div>
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        {pr && pr.status === 'OPEN' ? (
          <>
            <Button
              variant="ghost"
              isLoading={decline.isPending}
              onClick={() => decline.mutate({ pullRequestId: pr.id })}
            >
              Decline
            </Button>
            <Button
              variant="secondary"
              isLoading={approve.isPending}
              onClick={() => approve.mutate({ pullRequestId: pr.id })}
            >
              {pr.hasApproved ? 'Approved ✓' : 'Approve'}
            </Button>
            <Button isLoading={merge.isPending} onClick={() => merge.mutate({ pullRequestId: pr.id })}>
              Merge
            </Button>
          </>
        ) : (
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        )}
      </ModalFooter>
    </Modal>
  );
}

function CreateRepoDialog({
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
  const [language, setLanguage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const create = trpc.bitbucket.repos.create.useMutation({
    onSuccess: async (repo) => {
      await utils.bitbucket.repos.list.invalidate({ workspaceId });
      onCreated(repo.id);
      setName('');
      setLanguage('');
      onClose();
    },
    onError: (err) => setError(err.message),
  });

  return (
    <Modal open={open} onClose={onClose} ariaLabel="Create repository">
      <ModalHeader>
        <h2 className="text-lg font-semibold">Create repository</h2>
      </ModalHeader>
      <ModalBody>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="repo-name">Name</Label>
            <Input id="repo-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="web-app" autoFocus />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="repo-lang">Language</Label>
            <Input id="repo-lang" value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="TypeScript" />
          </div>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          isLoading={create.isPending}
          disabled={!name.trim()}
          onClick={() => {
            setError(null);
            create.mutate({ workspaceId, name, language });
          }}
        >
          Create
        </Button>
      </ModalFooter>
    </Modal>
  );
}

function CreatePrDialog({
  repositoryId,
  defaultBranch,
  open,
  onClose,
  onCreated,
}: {
  repositoryId: string;
  defaultBranch: string;
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const utils = trpc.useUtils();
  const [title, setTitle] = useState('');
  const [sourceBranch, setSourceBranch] = useState('');
  const [description, setDescription] = useState('');

  const create = trpc.bitbucket.pullRequests.create.useMutation({
    onSuccess: async (pr) => {
      await Promise.all([
        utils.bitbucket.pullRequests.list.invalidate({ repositoryId }),
        utils.bitbucket.repos.list.invalidate(),
      ]);
      onCreated(pr.id);
      setTitle('');
      setSourceBranch('');
      setDescription('');
      onClose();
    },
  });

  return (
    <Modal open={open} onClose={onClose} ariaLabel="Create pull request">
      <ModalHeader>
        <h2 className="text-lg font-semibold">Create pull request</h2>
      </ModalHeader>
      <ModalBody>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pr-title">Title</Label>
            <Input id="pr-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add login page" autoFocus />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pr-source">Source branch</Label>
            <Input id="pr-source" value={sourceBranch} onChange={(e) => setSourceBranch(e.target.value)} placeholder="feat/login" />
          </div>
          <p className="text-xs text-muted">
            Merging into <code className="rounded bg-border/50 px-1">{defaultBranch}</code>
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pr-desc">Description</Label>
            <Textarea id="pr-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          isLoading={create.isPending}
          disabled={!title.trim() || !sourceBranch.trim()}
          onClick={() =>
            create.mutate({ repositoryId, title, sourceBranch, targetBranch: defaultBranch, description })
          }
        >
          Create
        </Button>
      </ModalFooter>
    </Modal>
  );
}
