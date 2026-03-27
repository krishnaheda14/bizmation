function normalizeBase(base) {
    return base.trim().replace(/\/$/, '');
}
function buildTargetUrl(base, incoming) {
    const normalizedBase = normalizeBase(base);
    const incomingPath = incoming.pathname;
    // Incoming route is always /api/* because this file is mounted at functions/api/[[path]].ts
    // Avoid creating /api/api/* when base already ends with /api.
    if (normalizedBase.endsWith('/api') && incomingPath.startsWith('/api/')) {
        return `${normalizedBase}${incomingPath.slice(4)}${incoming.search}`;
    }
    return `${normalizedBase}${incomingPath}${incoming.search}`;
}
export const onRequest = async (context) => {
    const backendBase = String(context.env.BACKEND_API_BASE_URL || '').trim();
    if (!backendBase) {
        return new Response(JSON.stringify({
            success: false,
            error: 'BACKEND_API_BASE_URL is not configured for Cloudflare Pages Functions',
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store',
            },
        });
    }
    const incomingUrl = new URL(context.request.url);
    const targetUrl = buildTargetUrl(backendBase, incomingUrl);
    const upstreamHeaders = new Headers(context.request.headers);
    upstreamHeaders.set('x-forwarded-host', incomingUrl.host);
    upstreamHeaders.set('x-forwarded-proto', incomingUrl.protocol.replace(':', ''));
    upstreamHeaders.delete('host');
    const upstreamResponse = await fetch(targetUrl, {
        method: context.request.method,
        headers: upstreamHeaders,
        body: context.request.body,
        redirect: 'manual',
    });
    const responseHeaders = new Headers(upstreamResponse.headers);
    responseHeaders.set('Cache-Control', 'no-store');
    return new Response(upstreamResponse.body, {
        status: upstreamResponse.status,
        statusText: upstreamResponse.statusText,
        headers: responseHeaders,
    });
};
//# sourceMappingURL=%5B%5Bpath%5D%5D.js.map