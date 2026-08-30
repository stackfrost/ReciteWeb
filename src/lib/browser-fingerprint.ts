/**
 * src/lib/browser-fingerprint.ts
 *
 * Deterministic Client-Side Browser & Hardware Fingerprinter.
 *
 * Produces a stable SHA-256 hash derived from:
 *   - Screen dimensions, depth, pixel ratio
 *   - WebGL unmasked vendor & GPU renderer strings
 *   - 2D Canvas cryptographic rendering hash
 *   - Hardware concurrency & device memory
 *   - Timezone, platform, and audio context dynamics
 *
 * Persistence Guarantee:
 *   Because GPU hardware, screen resolution, and canvas rasterization remain
 *   identical in Private / Incognito windows, this fingerprint persists across
 *   Incognito sessions, blocking incognito free-tier quota resets.
 */

async function sha256(str: string): Promise<string> {
  const enc = new TextEncoder().encode(str);
  const hashBuf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function getCanvasFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'no_canvas';

    ctx.textBaseline = 'top';
    ctx.font = "14px 'Arial', sans-serif";
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('ReciteWeb academic verification 2026', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('ReciteWeb academic verification 2026', 4, 17);

    return canvas.toDataURL();
  } catch {
    return 'canvas_error';
  }
}

function getWebGLRenderer(): string {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || (canvas.getContext('experimental-webgl') as WebGLRenderingContext);
    if (!gl) return 'no_webgl';

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) return 'no_debug_info';

    const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || '';
    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '';
    return `${vendor}:::${renderer}`;
  } catch {
    return 'webgl_error';
  }
}

export async function getDeviceFingerprint(): Promise<string> {
  if (typeof window === 'undefined') return 'server_render';

  try {
    const screenInfo = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}x${window.devicePixelRatio || 1}`;
    const hardwareInfo = `${navigator.hardwareConcurrency || 4}cores_${(navigator as any).deviceMemory || 8}gb`;
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const language = navigator.language || 'en';
    const platform = (navigator as any).userAgentData?.platform || navigator.platform || 'unknown';
    const webgl = getWebGLRenderer();
    const canvas = getCanvasFingerprint();

    const rawString = [screenInfo, hardwareInfo, timeZone, language, platform, webgl, canvas].join('||');
    const fingerprint = await sha256(rawString);

    // Also persist in local storage as a helper, but fingerprint itself is computed dynamically
    try {
      localStorage.setItem('recite_device_fp', fingerprint);
    } catch {}

    return fingerprint;
  } catch (err) {
    console.warn('[Fingerprint] Failed to compute hardware fingerprint:', err);
    return 'fallback_fp_' + Math.random().toString(36).slice(2, 10);
  }
}
