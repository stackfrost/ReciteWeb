import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  images: { unoptimized: true }, // Required for static export
  eslint: { ignoreDuringBuilds: true }, // Speed up local iteration
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
