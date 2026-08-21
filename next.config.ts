import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  output: 'export',
  images: { unoptimized: true }, // Required for static export
  eslint: { ignoreDuringBuilds: true }, // Speed up local iteration
  typescript: { ignoreBuildErrors: true },

  // Instructs Next.js 15 to completely skip bundling these Node-native packages on the server
  serverExternalPackages: ["sharp", "onnxruntime-node"],

  // ─────────────────────────────────────────────────────────────────────────
  // Tauri Runtime Module Stubs & Binary Exclusions
  // During the Next.js static export (npm run build), webpack resolves
  // @tauri-apps/* imports to thin no-op stubs. At runtime inside the Tauri
  // WebView, the isTauriRuntime() guard in security-vault.ts ensures these
  // stubs are never called — only the real dynamic imports run.
  webpack: (config, { isServer, webpack }) => {
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /^(sharp|onnxruntime-node)$/
        })
      );
      
      // Also ignore .node files entirely
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /\.node$/
        })
      );

    if (!isServer) {
      config.resolve.fallback = {
        ...(config.resolve.fallback || {}),
        fs: false,
        'fs/promises': false,
        path: false,
        os: false,
        crypto: false,
        sharp: false,
        'onnxruntime-node': false,
      };
      
      const tauriStub = path.resolve(__dirname, 'src/lib/tauri-stubs.ts');
      config.resolve.alias = {
        ...(config.resolve.alias as Record<string, string> | undefined ?? {}),
        // Remove the '$' anchor to ensure we kill the entire package resolution tree for the client
        "sharp": false,
        "onnxruntime-node": false,
        // Tauri stubs
        '@tauri-apps/plugin-stronghold': tauriStub,
        '@tauri-apps/api/path': tauriStub,
        '@tauri-apps/api$': tauriStub,
      };
    }
    
    return config;
  },
};

export default nextConfig;
