'use client';

import { ProductChrome, PRODUCTS, useMe, useActiveWorkspace } from '@taskflow/app-kit';
import { Card } from '@taskflow/ui';

export default function HomePage() {
  const me = useMe();
  const { activeWorkspace } = useActiveWorkspace();
  const apps = PRODUCTS.filter((product) => product.id !== 'home');
  const firstName = me.data?.name?.split(' ')[0] ?? 'there';

  return (
    <ProductChrome productId="home">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-3xl font-bold">Good to see you, {firstName} 👋</h1>
        <p className="mt-1 text-muted">
          {activeWorkspace
            ? `You're working in ${activeWorkspace.name}. Jump into any product below.`
            : 'Jump into any product below.'}
        </p>

        <h2 className="mt-10 text-sm font-semibold uppercase tracking-wide text-muted">
          Your apps
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {apps.map((product) => (
            <a key={product.id} href={product.url} className="group block">
              <Card className="h-full p-5 transition-shadow group-hover:shadow-modal">
                <div className="flex items-center gap-3">
                  <span
                    className="grid h-11 w-11 place-items-center rounded-lg text-base font-bold text-white"
                    style={{ backgroundColor: product.accent }}
                  >
                    {product.short}
                  </span>
                  <span className="text-lg font-semibold group-hover:text-accent">
                    {product.name}
                  </span>
                </div>
                <p className="mt-3 text-sm text-muted">{product.tagline}</p>
              </Card>
            </a>
          ))}
        </div>
      </div>
    </ProductChrome>
  );
}
