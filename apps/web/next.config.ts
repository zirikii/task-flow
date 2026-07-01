import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Internal workspace packages ship TS source and are compiled by Next.
  transpilePackages: ['@taskflow/ui', '@taskflow/types', '@taskflow/app-kit'],
};

export default nextConfig;
