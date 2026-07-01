'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar, Button, cn } from '@taskflow/ui';
import { trpc } from './trpc';
import { useMe } from './auth';
import { useActiveWorkspace } from './workspace';
import { PRODUCTS, productById } from './products';
import { Spinner } from './Spinner';

/** The Atlassian-style 9-dot app switcher: a grid of links to every product. */
export function AppSwitcher({ currentId }: { currentId?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label="Switch product"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="grid h-9 w-9 place-items-center rounded-md text-muted hover:bg-border/50 hover:text-fg"
      >
        <span className="grid grid-cols-3 gap-[3px]">
          {Array.from({ length: 9 }).map((_, i) => (
            <span key={i} className="h-[3px] w-[3px] rounded-full bg-current" />
          ))}
        </span>
      </button>

      {open ? (
        <div className="absolute left-0 top-11 z-50 w-80 rounded-lg border border-border bg-card p-2 shadow-modal">
          <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted">
            Your apps
          </p>
          <div className="grid grid-cols-3 gap-1">
            {PRODUCTS.map((product) => (
              <a
                key={product.id}
                href={product.url}
                className={cn(
                  'flex flex-col items-center gap-1.5 rounded-md p-2 text-center hover:bg-border/40',
                  product.id === currentId ? 'bg-border/40' : '',
                )}
              >
                <span
                  className="grid h-10 w-10 place-items-center rounded-lg text-sm font-bold text-white"
                  style={{ backgroundColor: product.accent }}
                >
                  {product.short}
                </span>
                <span className="text-xs font-medium leading-tight text-fg">{product.name}</span>
              </a>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * The shared top bar + auth guard for a product app. Renders the app switcher,
 * product title, workspace switcher and user menu, then the page content. When
 * the visitor is signed out it redirects to /login.
 */
export function ProductChrome({
  productId,
  children,
  actions,
}: {
  productId: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  const router = useRouter();
  const me = useMe();
  const utils = trpc.useUtils();
  const { workspaces, workspaceId, setWorkspaceId } = useActiveWorkspace();
  const product = productById(productId);

  const logout = trpc.auth.logout.useMutation({
    onSuccess: async () => {
      await utils.invalidate();
      router.replace('/login');
    },
  });

  useEffect(() => {
    if (me.isSuccess && me.data === null) router.replace('/login');
  }, [me.isSuccess, me.data, router]);

  if (me.isLoading) return <Spinner label="Loading…" />;
  if (!me.data) return <Spinner />;

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-card px-3">
        <AppSwitcher currentId={productId} />
        <div className="flex items-center gap-2">
          <span
            className="grid h-7 w-7 place-items-center rounded-md text-xs font-bold text-white"
            style={{ backgroundColor: product?.accent ?? '#1868db' }}
          >
            {product?.short ?? '?'}
          </span>
          <span className="text-lg font-semibold">{product?.name ?? 'App'}</span>
        </div>

        <div className="ml-auto flex items-center gap-3">
          {actions}
          {workspaces.length > 0 ? (
            <select
              aria-label="Switch workspace"
              className="rounded-md border border-border bg-bg px-2 py-1.5 text-sm font-medium"
              value={workspaceId ?? ''}
              onChange={(event) => setWorkspaceId(event.target.value)}
            >
              {workspaces.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>
                  {workspace.name}
                </option>
              ))}
            </select>
          ) : null}
          <div className="flex items-center gap-2">
            <Avatar name={me.data.name} />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => logout.mutate()}
              isLoading={logout.isPending}
            >
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
