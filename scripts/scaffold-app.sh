#!/usr/bin/env bash
# Scaffolds a product app under apps/<dir> that plugs into @taskflow/app-kit.
# Usage: scaffold-app.sh <dir> <pkgName> <port> <productId> <productName> [extra]
#   extra: space-separated flags — "markdown" adds react-markdown, "dnd" adds @dnd-kit.
set -euo pipefail

DIR="$1"; PKG="$2"; PORT="$3"; PID="$4"; PNAME="$5"; EXTRA="${6:-}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="$ROOT/apps/$DIR"
mkdir -p "$APP/src/app/login" "$APP/src/app/signup"

EXTRA_DEPS=""
if [[ "$EXTRA" == *markdown* ]]; then
  EXTRA_DEPS+='    "react-markdown": "10.1.0",\n'
fi
if [[ "$EXTRA" == *dnd* ]]; then
  EXTRA_DEPS+='    "@dnd-kit/core": "6.3.1",\n    "@dnd-kit/sortable": "10.0.0",\n    "@dnd-kit/utilities": "3.2.2",\n'
fi

cat > "$APP/package.json" <<JSON
{
  "name": "$PKG",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev -p $PORT",
    "build": "next build",
    "start": "next start -p $PORT",
    "typecheck": "tsc --noEmit -p tsconfig.json",
    "lint": "eslint . --max-warnings 0"
  },
  "dependencies": {
$(printf "%b" "$EXTRA_DEPS")    "@taskflow/api": "workspace:*",
    "@taskflow/app-kit": "workspace:*",
    "@taskflow/types": "workspace:*",
    "@taskflow/ui": "workspace:*",
    "@tanstack/react-query": "5.101.2",
    "@trpc/client": "11.18.0",
    "@trpc/react-query": "11.18.0",
    "@trpc/server": "11.18.0",
    "next": "15.5.19",
    "react": "19.2.7",
    "react-dom": "19.2.7",
    "superjson": "2.2.6",
    "zod": "4.4.3"
  },
  "devDependencies": {
    "@taskflow/config": "workspace:*",
    "@types/node": "^22.12.0",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "autoprefixer": "10.5.2",
    "eslint": "9.39.4",
    "eslint-config-next": "15.5.19",
    "postcss": "8.5.16",
    "tailwindcss": "3.4.19",
    "typescript": "5.9.3"
  }
}
JSON

cat > "$APP/next.config.ts" <<'TS'
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@taskflow/ui', '@taskflow/types', '@taskflow/app-kit'],
};

export default nextConfig;
TS

cat > "$APP/tailwind.config.cjs" <<'CJS'
/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require('@taskflow/config/tailwind/preset')],
  content: [
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
    '../../packages/app-kit/src/**/*.{ts,tsx}',
  ],
};
CJS

cat > "$APP/postcss.config.cjs" <<'CJS'
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
CJS

cat > "$APP/tsconfig.json" <<'JSON'
{
  "extends": "@taskflow/config/tsconfig/nextjs.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    },
    "types": ["node"]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules", ".next", "dist"]
}
JSON

cat > "$APP/eslint.config.js" <<'JS'
import { nextConfig } from '@taskflow/config/eslint/next';

const config = [
  ...nextConfig,
  {
    settings: {
      next: {
        rootDir: import.meta.dirname,
      },
    },
  },
];

export default config;
JS

cat > "$APP/next-env.d.ts" <<'TS'
/// <reference types="next" />
/// <reference types="next/image-types/global" />

// NOTE: This file should not be edited
// see https://nextjs.org/docs/app/api-reference/config/typescript for more information.
TS

cat > "$APP/src/app/globals.css" <<'CSS'
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  color-scheme: light;
}

body {
  @apply bg-bg text-fg antialiased;
}
CSS

cat > "$APP/src/app/providers.tsx" <<'TSX'
'use client';

export { Providers } from '@taskflow/app-kit';
TSX

cat > "$APP/src/app/layout.tsx" <<TSX
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: '$PNAME',
  description: '$PNAME — part of the TaskFlow suite.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-bg text-fg">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
TSX

cat > "$APP/src/app/login/page.tsx" <<TSX
'use client';

import { LoginView } from '@taskflow/app-kit';

export default function LoginPage() {
  return <LoginView productName="$PNAME" />;
}
TSX

cat > "$APP/src/app/signup/page.tsx" <<TSX
'use client';

import { SignupView } from '@taskflow/app-kit';

export default function SignupPage() {
  return <SignupView productName="$PNAME" />;
}
TSX

# Placeholder home page (overwritten per product).
cat > "$APP/src/app/page.tsx" <<TSX
'use client';

import { ProductChrome } from '@taskflow/app-kit';

export default function Page() {
  return (
    <ProductChrome productId="$PID">
      <div className="p-8">$PNAME</div>
    </ProductChrome>
  );
}
TSX

echo "scaffolded apps/$DIR ($PKG) on port $PORT"
