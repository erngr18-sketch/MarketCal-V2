import type { NextConfig } from 'next';
import { resolve } from 'node:path';

const nextConfig: NextConfig = {
  outputFileTracingRoot: resolve(__dirname),
  eslint: {
    ignoreDuringBuilds: true
  }
};

export default nextConfig;
