'use client';

import { useEffect, useMemo, useState } from 'react';
import { ProductChrome, Spinner, trpc, useActiveWorkspace } from '@taskflow/app-kit';
import type { PageNode } from '@taskflow/types';
import {
  Button,
  Input,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Textarea,
} from '@taskflow/ui';
import { Markdown } from '../components/Markdown';

interface TreeItem extends PageNode {
  children: TreeItem[];
}

function buildTree(nodes: PageNode[]): TreeItem[] {
  const byId = new Map<string, TreeItem>();
  nodes.forEach((node) => byId.set(node.id, { ...node, children: [] }));
  const roots: TreeItem[] = [];
  byId.forEach((item) => {
    if (item.parentId && byId.has(item.parentId)) byId.get(item.parentId)!.children.push(item);
    else roots.push(item);
  });
  return roots;
}

export default function ConfluencePage() {
  const { workspaceId } = useActiveWorkspace();
  return (
    <ProductChrome productId="confluence">
      {workspaceId ? (
        <Workspace workspaceId={workspaceId} />
      ) : (
        <div className="p-8 text-muted">Loading workspace…</div>
      )}
    </ProductChrome>
  );
}

function Workspace({ workspaceId }: { workspaceId: string }) {
  const spaces = trpc.confluence.spaces.list.useQuery({ workspaceId });
  const [spaceId, setSpaceId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [createSpaceOpen, setCreateSpaceOpen] = useState(false);
  const [createPageOpen, setCreatePageOpen] = useState(false);
  const [createParentId, setCreateParentId] = useState<string | null>(null);
  const utils = trpc.useUtils();

  useEffect(() => {
    if (!spaceId && spaces.data && spaces.data.length > 0) setSpaceId(spaces.data[0]!.id);
  }, [spaces.data, spaceId]);

  const tree = trpc.confluence.pages.tree.useQuery(
    { spaceId: spaceId ?? '' },
    { enabled: Boolean(spaceId) },
  );

  useEffect(() => {
    if (!tree.data) return;
    if (tree.data.length === 0) {
      setActiveId(null);
      return;
    }
    if (!activeId || !tree.data.some((p) => p.id === activeId)) {
      setActiveId(tree.data[0]!.id);
    }
  }, [tree.data, activeId]);

  const items = useMemo(() => buildTree(tree.data ?? []), [tree.data]);

  if (spaces.isLoading) return <Spinner label="Loading spaces…" />;

  function openCreatePage(parentId: string | null) {
    setCreateParentId(parentId);
    setCreatePageOpen(true);
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)]">
      <aside className="flex w-72 shrink-0 flex-col border-r border-border bg-card">
        <div className="border-b border-border p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">Space</span>
            <button
              type="button"
              onClick={() => setCreateSpaceOpen(true)}
              className="rounded px-1.5 text-lg leading-none text-muted hover:bg-border/40 hover:text-fg"
              aria-label="Create space"
            >
              +
            </button>
          </div>
          {spaces.data && spaces.data.length > 0 ? (
            <select
              className="w-full rounded-md border border-border bg-bg px-2 py-1.5 text-sm font-medium"
              value={spaceId ?? ''}
              onChange={(event) => {
                setSpaceId(event.target.value);
                setActiveId(null);
              }}
            >
              {spaces.data.map((space) => (
                <option key={space.id} value={space.id}>
                  {space.name}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-sm text-muted">No spaces yet.</p>
          )}
        </div>

        {spaceId ? (
          <div className="flex-1 overflow-y-auto p-3">
            <Button
              variant="secondary"
              size="sm"
              className="mb-2 w-full"
              onClick={() => openCreatePage(null)}
            >
              + New page
            </Button>
            {tree.isLoading ? (
              <p className="px-2 py-1 text-sm text-muted">Loading…</p>
            ) : items.length === 0 ? (
              <p className="px-2 py-1 text-sm text-muted">No pages yet.</p>
            ) : (
              <TreeList
                items={items}
                activeId={activeId}
                onSelect={setActiveId}
                onAddChild={openCreatePage}
              />
            )}
          </div>
        ) : null}
      </aside>

      <section className="min-w-0 flex-1">
        {!spaceId ? (
          <div className="p-10 text-center text-muted">
            <p>Create a space to start writing.</p>
            <Button className="mt-3" onClick={() => setCreateSpaceOpen(true)}>
              Create your first space
            </Button>
          </div>
        ) : activeId ? (
          <PageView pageId={activeId} />
        ) : (
          <div className="p-10 text-center text-muted">
            <p>Select a page or create one to get started.</p>
            <Button className="mt-3" onClick={() => openCreatePage(null)}>
              Create a page
            </Button>
          </div>
        )}
      </section>

      <CreateSpaceDialog
        workspaceId={workspaceId}
        open={createSpaceOpen}
        onClose={() => setCreateSpaceOpen(false)}
        onCreated={(id) => {
          setSpaceId(id);
          setActiveId(null);
        }}
      />
      {spaceId ? (
        <CreatePageDialog
          spaceId={spaceId}
          parentId={createParentId}
          open={createPageOpen}
          onClose={() => setCreatePageOpen(false)}
          onCreated={async (id) => {
            await utils.confluence.pages.tree.invalidate({ spaceId });
            setActiveId(id);
          }}
        />
      ) : null}
    </div>
  );
}

function TreeList({
  items,
  activeId,
  onSelect,
  onAddChild,
  depth = 0,
}: {
  items: TreeItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onAddChild: (parentId: string) => void;
  depth?: number;
}) {
  return (
    <ul className="flex flex-col gap-0.5">
      {items.map((item) => (
        <li key={item.id}>
          <div
            className={`group flex items-center gap-1 rounded-md pr-1 ${
              activeId === item.id ? 'bg-accent-subtle text-accent' : 'hover:bg-border/40'
            }`}
          >
            <button
              type="button"
              onClick={() => onSelect(item.id)}
              className="flex-1 truncate py-1.5 text-left text-sm"
              style={{ paddingLeft: `${depth * 12 + 8}px` }}
            >
              {item.title}
            </button>
            <button
              type="button"
              onClick={() => onAddChild(item.id)}
              className="hidden rounded px-1.5 text-sm leading-none text-muted hover:bg-border/60 hover:text-fg group-hover:block"
              aria-label={`Add subpage to ${item.title}`}
            >
              +
            </button>
          </div>
          {item.children.length > 0 ? (
            <TreeList
              items={item.children}
              activeId={activeId}
              onSelect={onSelect}
              onAddChild={onAddChild}
              depth={depth + 1}
            />
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function PageView({ pageId }: { pageId: string }) {
  const utils = trpc.useUtils();
  const page = trpc.confluence.pages.get.useQuery({ pageId });
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const update = trpc.confluence.pages.update.useMutation({
    onSuccess: async () => {
      await utils.confluence.pages.get.invalidate({ pageId });
      await utils.confluence.pages.tree.invalidate();
      setEditing(false);
    },
  });

  useEffect(() => {
    if (page.data) {
      setTitle(page.data.title);
      setBody(page.data.body);
    }
    setEditing(false);
  }, [page.data?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (page.isLoading || !page.data) return <Spinner label="Loading page…" />;

  return (
    <article className="mx-auto max-w-3xl px-8 py-8">
      {editing ? (
        <div className="flex flex-col gap-3">
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="text-2xl font-bold"
            aria-label="Page title"
          />
          <Textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={20}
            className="font-mono text-sm"
            aria-label="Page body (markdown)"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button isLoading={update.isPending} onClick={() => update.mutate({ pageId, title, body })}>
              Save
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-3xl font-bold">{page.data.title}</h1>
            <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
              Edit
            </Button>
          </div>
          <p className="mt-1 text-xs text-muted">
            By {page.data.author.name} · updated {new Date(page.data.updatedAt).toLocaleDateString()}
          </p>
          <div className="mt-4">
            {page.data.body.trim() ? (
              <Markdown>{page.data.body}</Markdown>
            ) : (
              <p className="text-muted">This page is empty. Click Edit to add content.</p>
            )}
          </div>
        </>
      )}
    </article>
  );
}

function CreateSpaceDialog({
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
  const [key, setKey] = useState('');
  const [error, setError] = useState<string | null>(null);

  const create = trpc.confluence.spaces.create.useMutation({
    onSuccess: async (space) => {
      await utils.confluence.spaces.list.invalidate({ workspaceId });
      onCreated(space.id);
      setName('');
      setKey('');
      onClose();
    },
    onError: (err) => setError(err.message),
  });

  return (
    <Modal open={open} onClose={onClose} ariaLabel="Create space">
      <ModalHeader>
        <h2 className="text-lg font-semibold">Create space</h2>
      </ModalHeader>
      <ModalBody>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="space-name">Name</Label>
            <Input
              id="space-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Engineering"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="space-key">Key</Label>
            <Input
              id="space-key"
              value={key}
              onChange={(event) => setKey(event.target.value.toUpperCase())}
              placeholder="ENG"
            />
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
          onClick={() => {
            setError(null);
            create.mutate({ workspaceId, name, key });
          }}
        >
          Create
        </Button>
      </ModalFooter>
    </Modal>
  );
}

function CreatePageDialog({
  spaceId,
  parentId,
  open,
  onClose,
  onCreated,
}: {
  spaceId: string;
  parentId: string | null;
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [title, setTitle] = useState('');

  const create = trpc.confluence.pages.create.useMutation({
    onSuccess: (page) => {
      onCreated(page.id);
      setTitle('');
      onClose();
    },
  });

  return (
    <Modal open={open} onClose={onClose} ariaLabel="Create page">
      <ModalHeader>
        <h2 className="text-lg font-semibold">{parentId ? 'Create subpage' : 'Create page'}</h2>
      </ModalHeader>
      <ModalBody>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="page-title">Title</Label>
          <Input
            id="page-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Getting started"
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
          disabled={!title.trim()}
          onClick={() => create.mutate({ spaceId, parentId, title })}
        >
          Create
        </Button>
      </ModalFooter>
    </Modal>
  );
}
