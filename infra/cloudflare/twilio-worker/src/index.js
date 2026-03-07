function corsHeaders(origin) {
    const allowed = ['https://bizmation.pages.dev', 'https://bizmation.com', 'http://localhost:5173', 'http://localhost:4173'];
    // For debugging / Pages integration: if the browser sends an Origin header, echo it back.
    // This prevents CORS mismatch blocking when Pages origin differs slightly.
    const allowOrigin = origin || allowed[0];
    return {
        'Access-Control-Allow-Origin': allowOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Vary': 'Origin',
        'Content-Type': 'application/json'
    };
}
function jsonResponse(body, status = 200, origin = null) {
    return new Response(JSON.stringify(body), { status, headers: corsHeaders(origin) });
}
function basicAuthHeader(accountSid, authToken) {
    // btoa available in Workers
    return 'Basic ' + btoa(`${accountSid}:${authToken}`);
}
export default {
    async fetch(request, env) {
        const origin = request.headers.get('Origin');
        console.log(`[TwilioWorker] ${request.method} ${new URL(request.url).pathname} from Origin: ${origin}`);
        const url = new URL(request.url);
        if (request.method === 'OPTIONS')
            return new Response(null, { status: 204, headers: corsHeaders(origin) });
        if (url.pathname === '/api/auth/send-otp' && request.method === 'POST') {
            const body = await request.json().catch(() => ({}));
            const phone = String(body?.phone || '').trim();
            if (!phone)
                return jsonResponse({ success: false, error: 'phone required' }, 400);
            const acc = env.TWILIO_ACCOUNT_SID;
            const token = env.TWILIO_AUTH_TOKEN;
            const service = env.TWILIO_VERIFY_SERVICE_SID;
            if (!acc || !token || !service)
                return jsonResponse({ success: false, error: 'Twilio not configured' }, 500);
            const twilioUrl = `https://verify.twilio.com/v2/Services/${service}/Verifications`;
            const payload = new URLSearchParams({ To: phone, Channel: 'sms' });
            try {
                const resp = await fetch(twilioUrl, { method: 'POST', body: payload, headers: { Authorization: basicAuthHeader(acc, token), 'Content-Type': 'application/x-www-form-urlencoded' } });
                const json = await resp.json().catch(() => null);
                console.log('[TwilioWorker] send-otp response', resp.status, json);
                if (!resp.ok)
                    return jsonResponse({ success: false, error: json?.message || json || `HTTP ${resp.status}` }, 500, origin);
                return jsonResponse({ success: true, sid: json?.sid, status: json?.status }, 200, origin);
            }
            catch (err) {
                return jsonResponse({ success: false, error: String(err?.message || err) }, 500);
            }
        }
        if (url.pathname === '/api/auth/verify-otp' && request.method === 'POST') {
            const body = await request.json().catch(() => ({}));
            const phone = String(body?.phone || '').trim();
            const code = String(body?.code || '').trim();
            if (!phone || !code)
                return jsonResponse({ success: false, error: 'phone and code required' }, 400);
            const acc = env.TWILIO_ACCOUNT_SID;
            const token = env.TWILIO_AUTH_TOKEN;
            const service = env.TWILIO_VERIFY_SERVICE_SID;
            if (!acc || !token || !service)
                return jsonResponse({ success: false, error: 'Twilio not configured' }, 500);
            const twilioUrl = `https://verify.twilio.com/v2/Services/${service}/VerificationCheck`;
            const payload = new URLSearchParams({ To: phone, Code: code });
            try {
                const resp = await fetch(twilioUrl, { method: 'POST', body: payload, headers: { Authorization: basicAuthHeader(acc, token), 'Content-Type': 'application/x-www-form-urlencoded' } });
                const json = await resp.json().catch(() => null);
                console.log('[TwilioWorker] verify-otp response', resp.status, json);
                if (!resp.ok)
                    return jsonResponse({ success: false, error: json?.message || json || `HTTP ${resp.status}` }, 500, origin);
                return jsonResponse({ success: true, status: json?.status, valid: json?.status === 'approved' }, 200, origin);
            }
            catch (err) {
                return jsonResponse({ success: false, error: String(err?.message || err) }, 500);
            }
        }
        // root/info endpoint
        if (url.pathname === '/' && request.method === 'GET') {
            const configured = Boolean(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_VERIFY_SERVICE_SID);
            return jsonResponse({ status: 'ok', worker: 'twilio-otp-worker', configured, required_env: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_VERIFY_SERVICE_SID'] }, 200, origin);
        }
        return jsonResponse({ error: 'Not found', path: url.pathname, method: request.method }, 404, origin);
    },
};
//# sourceMappingURL=index.js.map