import globals from 'globals';
import { baseConfig } from './base.js';

/**
 * Shared ESLint flat config for React component libraries (e.g. packages/ui).
 * @type {import('eslint').Linter.Config[]}
 */
export const reactConfig = [
  ...baseConfig,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
];

export default reactConfig;
