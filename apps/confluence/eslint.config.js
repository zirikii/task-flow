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
