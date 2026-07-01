import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@taskflow/ui', '@taskflow/types', '@taskflow/app-kit'],
};

export default nextConfig;
