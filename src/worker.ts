/// <reference path="../worker-configuration.d.ts" />

const ALLOWED = new Set([
  'https://fetchmoji.com',
  'http://localhost:4321'
]);

const PROTECTED_PATHS = new Set([
  '.tar',
  '.bin',
]);

function isProtectedPath(path: string) {
  for (const protectedPath of PROTECTED_PATHS) {
    if (path.includes(protectedPath)) {
      return true;
    }
  }

  return false;
}

export default {
  async fetch(request: Request, env: { ASSETS: Fetcher }) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');
    const allowed = origin && ALLOWED.has(origin);

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
      if (allowed) headers['Access-Control-Allow-Origin'] = origin!;
      return new Response(null, { status: 204, headers });
    }

    // Serve static assets (compiled Astro) and, if needed, add CORS
    let res = await env.ASSETS.fetch(request); // returns the static file (cached), if it exists
    if (allowed && isProtectedPath(url.pathname)) {
      res = new Response(res.body, res);                 // clone to mutate headers
      res.headers.set('Access-Control-Allow-Origin', origin!);
      res.headers.append('Vary', 'Origin');
      // If you need cookies/auth across origins:
      // res.headers.set('Access-Control-Allow-Credentials', 'true');
    }
    return res;
  }
};