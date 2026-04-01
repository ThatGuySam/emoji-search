/// <reference path="../worker-configuration.d.ts" />

const ALLOWED = new Set([
  'https://fetchmoji.com',
  'https://seo-preview.fetchmoji.com',
  'https://emoji.samcarlton.com',
  'http://localhost:4321'
]);

const PROTECTED_PATHS = new Set([
  '.tar',
  '.bin',
]);

const CDN_ORIGIN = 'https://cdn.fetchmoji.com';
const DB_PROXY_PREFIX = '/proxy/db/';
const MODEL_PROXY_PREFIX = '/proxy/models/';

function isProtectedPath(path: string) {
  for (const protectedPath of PROTECTED_PATHS) {
    if (path.includes(protectedPath)) {
      return true;
    }
  }

  return false;
}

function getProxyTarget(pathname: string) {
  if (pathname.startsWith(DB_PROXY_PREFIX)) {
    return `${CDN_ORIGIN}/db/${pathname.slice(DB_PROXY_PREFIX.length)}`;
  }

  if (pathname.startsWith(MODEL_PROXY_PREFIX)) {
    return `${CDN_ORIGIN}/${pathname.slice(MODEL_PROXY_PREFIX.length)}`;
  }

  return null;
}

export default {
  async fetch(request: Request, env: {
    ASSETS: Fetcher;
    PREVIEW_NOINDEX?: string;
  }) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');
    const allowed = origin && ALLOWED.has(origin);
    const proxyTarget = getProxyTarget(url.pathname);

    // Preflight
    if (request.method === 'OPTIONS') {
      const reqMethod  = request.headers.get('Access-Control-Request-Method');
      if (!reqMethod) return new Response(null, { status: 204 }); // not a CORS preflight
      const headers: Record<string, string> = {
        'Access-Control-Allow-Methods': 'GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': request.headers.get('Access-Control-Request-Headers') || '',
        'Access-Control-Max-Age': '86400',
        'Vary': 'Origin, Access-Control-Request-Method, Access-Control-Request-Headers'
      };
      if (allowed) headers['Access-Control-Allow-Origin'] = origin;
      return new Response(null, { status: 204, headers });
    }

    // Serve proxied CDN assets or compiled Astro output.
    let res = proxyTarget
      ? await fetch(
          new Request(proxyTarget, request),
        )
      : await env.ASSETS.fetch(request);

    // Clone response to add headers
    res = new Response(res.body, res);

    // Enable cross-origin isolation for SharedArrayBuffer
    // (required for ONNX Runtime multi-threading)
    res.headers.set(
      'Cross-Origin-Opener-Policy',
      'same-origin'
    );
    res.headers.set(
      'Cross-Origin-Embedder-Policy',
      'require-corp'
    );

    // Add CORS headers for protected paths
    if (
      allowed &&
      (isProtectedPath(url.pathname) ||
        proxyTarget != null)
    ) {
      res.headers.set(
        'Access-Control-Allow-Origin',
        origin
      );
      res.headers.append('Vary', 'Origin');
    }

    // Prevent indexing of preview deployments.
    if (env.PREVIEW_NOINDEX === 'true') {
      res.headers.set(
        'X-Robots-Tag',
        'noindex, nofollow'
      );
    }

    return res;
  }
};
