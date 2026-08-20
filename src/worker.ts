interface Env {
  ASSETS: Fetcher;
}

const CANONICAL_HOST = 'chefevidence.music';

function redirect(url: URL): Response {
  return Response.redirect(url.toString(), 301);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    let changed = false;

    if (url.protocol === 'http:') {
      url.protocol = 'https:';
      changed = true;
    }

    if (url.hostname.startsWith('www.') || url.hostname.endsWith('.workers.dev')) {
      url.hostname = CANONICAL_HOST;
      changed = true;
    }

    // Collapse /index.html variants onto the directory URL (301, not asset 307).
    if (/\/index\.html\/?$/i.test(url.pathname)) {
      url.pathname = url.pathname.replace(/\/index\.html\/?$/i, '/') || '/';
      changed = true;
    }

    // Prefer trailing-slash HTML URLs so Google sees one permanent target.
    const hasExtension = /\.[a-zA-Z0-9]+$/.test(url.pathname);
    if (url.pathname !== '/' && !url.pathname.endsWith('/') && !hasExtension) {
      url.pathname = `${url.pathname}/`;
      changed = true;
    }

    if (changed) {
      return redirect(url);
    }

    const response = await env.ASSETS.fetch(request);
    const contentType = response.headers.get('content-type') || '';

    if (!contentType.includes('text/html')) {
      return response;
    }

    const headers = new Headers(response.headers);
    const canonical = new URL(url.pathname + url.search, `https://${CANONICAL_HOST}`).href;
    headers.set('Link', `<${canonical}>; rel="canonical"`);

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
