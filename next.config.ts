import type { NextConfig } from 'next';
import { resolve } from 'node:path';

const nextConfig = {
  outputFileTracingRoot: resolve(__dirname),
  eslint: {
    ignoreDuringBuilds: true
  }
} as NextConfig;

export default nextConfig;
