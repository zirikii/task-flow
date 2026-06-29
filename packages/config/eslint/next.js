import { FlatCompat } from '@eslint/eslintrc';
import prettier from 'eslint-config-prettier';

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

/**
 * Shared ESLint flat config for the Next.js web app.
 *
 * Built on Next's own `next/core-web-vitals` + `next/typescript` shareable
 * configs (bridged into flat config via FlatCompat). Next owns the parser and
 * TypeScript rule setup here, which avoids parser conflicts that arise when
 * layering a second `@typescript-eslint` config on top.
 *
 * @type {import('eslint').Linter.Config[]}
 */
export const nextConfig = [
  {
    ignores: [
      'dist/**',
      '.next/**',
      '.turbo/**',
      'coverage/**',
      'node_modules/**',
      'playwright-report/**',
      'test-results/**',
      'next-env.d.ts',
    ],
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
    },
  },
  {
    files: ['**/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  prettier,
];

export default nextConfig;
