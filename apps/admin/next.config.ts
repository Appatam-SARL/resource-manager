import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@resource-manager/api-client',
    '@resource-manager/types',
    '@resource-manager/schemas',
  ],
};

export default nextConfig;
