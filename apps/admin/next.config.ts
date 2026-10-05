import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  // Builds always run from apps/admin; the monorepo root is needed to trace workspace packages.
  outputFileTracingRoot: path.join(process.cwd(), '../..'),
  poweredByHeader: false,
  transpilePackages: [
    '@resource-manager/api-client',
    '@resource-manager/types',
    '@resource-manager/schemas',
  ],
};

export default nextConfig;
