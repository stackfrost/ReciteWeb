import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  output: 'export',
  images: { unoptimized: true }, // Required for static export
  eslint: { ignoreDuringBuilds: true }, // Speed up local iteration
  typescript: { ignoreBuildErrors: true },

  // ─────────────────────────────────────────────────────────────────────────
  // Tauri Runtime Module Stubs
  // During the Next.js static export (npm run build), webpack resolves
  // @tauri-apps/* imports to thin no-op stubs. At runtime inside the Tauri
  // WebView, the isTauriRuntime() guard in security-vault.ts ensures these
  // stubs are never called — only the real dynamic imports run.
  // ─────────────────────────────────────────────────────────────────────────
  webpack: (config) => {
    const tauriStub = path.resolve(__dirname, 'src/lib/tauri-stubs.ts');
    config.resolve.alias = {
      ...(config.resolve.alias as Record<string, string> | undefined ?? {}),
      '@tauri-apps/plugin-stronghold': tauriStub,
      '@tauri-apps/api/path': tauriStub,
      '@tauri-apps/api': tauriStub,
    };
    return config;
  },
};

export default nextConfig;
