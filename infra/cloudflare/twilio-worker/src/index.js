// ─── Firebase custom token (RS256 JWT signed via Web Crypto) ─────────────────
function b64url(data) {
    const str = typeof data === 'string' ? data : String.fromCharCode(...new Uint8Array(data));
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
async function createFirebaseCustomToken(uid, env) {
    const iat = Math.floor(Date.now() / 1000);
    const header = { alg: 'RS256', typ: 'JWT' };
    const payload = {
        iss: env.FIREBASE_CLIENT_EMAIL,
        sub: env.FIREBASE_CLIENT_EMAIL,
        aud: 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdToolkit',
        iat,
        exp: iat + 3600,
        uid,
    };
    const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
    // Strip PEM headers and decode to DER bytes
    const pem = env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
    const pemBody = pem
        .replace(/-----BEGIN PRIVATE KEY-----/g, '')
        .replace(/-----END PRIVATE KEY-----/g, '')
        .replace(/\s+/g, '');
    const der = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));
    const cryptoKey = await crypto.subtle.importKey('pkcs8', der.buffer, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
    const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, new TextEncoder().encode(signingInput));
    return `${signingInput}.${b64url(sig)}`;
}
// ─── Firestore REST API - read phoneIndex (public reads allowed) ──────────────
async function lookupPhoneIndex(phone, projectId) {
    const encodedPhone = encodeURIComponent(phone);
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/phoneIndex/${encodedPhone}`;
    const resp = await fetch(url);
    if (!resp.ok)
        return {};
    const doc = await resp.json();
    return {
        uid: doc?.fields?.uid?.stringValue,
        email: doc?.fields?.email?.stringValue,
    };
}
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
            const payload = new URLSearchParams({ To: phone, Channel: 'sms', CustomFriendlyName: 'Bizmation' });
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
        /**
         * POST /api/auth/phone-login  { phone, code }
         *
         * 1. Verifies Twilio OTP
         * 2. Looks up UID in Firestore phoneIndex (public read)
         * 3. Returns a Firebase custom token - client calls signInWithCustomToken()
         *
         * Required worker secrets (wrangler secret put <NAME>):
         *   FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
         */
        if (url.pathname === '/api/auth/phone-login' && request.method === 'POST') {
            const body = await request.json().catch(() => ({}));
            const phone = String(body?.phone || '').trim();
            const code = String(body?.code || '').trim();
            if (!phone || !code)
                return jsonResponse({ success: false, error: 'phone and code required' }, 400, origin);
            const acc = env.TWILIO_ACCOUNT_SID;
            const token = env.TWILIO_AUTH_TOKEN;
            const service = env.TWILIO_VERIFY_SERVICE_SID;
            if (!acc || !token || !service)
                return jsonResponse({ success: false, error: 'Twilio not configured' }, 500, origin);
            if (!env.FIREBASE_PROJECT_ID || !env.FIREBASE_CLIENT_EMAIL || !env.FIREBASE_PRIVATE_KEY) {
                return jsonResponse({ success: false, error: 'Firebase service account not configured on worker. Add FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY secrets.' }, 500, origin);
            }
            // 1. Verify OTP with Twilio
            const twilioUrl = `https://verify.twilio.com/v2/Services/${service}/VerificationCheck`;
            const twilioPayload = new URLSearchParams({ To: phone, Code: code });
            let twilioJson;
            try {
                const resp = await fetch(twilioUrl, {
                    method: 'POST', body: twilioPayload,
                    headers: { Authorization: basicAuthHeader(acc, token), 'Content-Type': 'application/x-www-form-urlencoded' },
                });
                twilioJson = await resp.json().catch(() => null);
                console.log('[TwilioWorker] phone-login verify response', resp.status, twilioJson);
                if (!resp.ok)
                    return jsonResponse({ success: false, error: twilioJson?.message || `OTP check HTTP ${resp.status}` }, 400, origin);
            }
            catch (err) {
                return jsonResponse({ success: false, error: 'OTP verification failed: ' + String(err?.message || err) }, 500, origin);
            }
            if (twilioJson?.status !== 'approved') {
                return jsonResponse({ success: false, error: 'Invalid or expired OTP.' }, 400, origin);
            }
            // 2. Look up UID from Firestore phoneIndex
            let uid;
            let email;
            try {
                const idx = await lookupPhoneIndex(phone, env.FIREBASE_PROJECT_ID);
                uid = idx.uid;
                email = idx.email;
            }
            catch (err) {
                console.error('[TwilioWorker] Firestore lookup error:', err?.message);
                return jsonResponse({ success: false, error: 'Account lookup failed. Please try again.' }, 500, origin);
            }
            if (!uid) {
                return jsonResponse({
                    success: false,
                    error: 'No Bizmation account is linked to this phone number. Please create an account first.',
                }, 404, origin);
            }
            // 3. Sign Firebase custom token with service account private key
            let customToken;
            try {
                customToken = await createFirebaseCustomToken(uid, env);
            }
            catch (err) {
                console.error('[TwilioWorker] Custom token error:', err?.message);
                return jsonResponse({ success: false, error: 'Failed to create login token: ' + String(err?.message || err) }, 500, origin);
            }
            return jsonResponse({ success: true, customToken, email }, 200, origin);
        }
        // root/info endpoint
        if (url.pathname === '/' && request.method === 'GET') {
            const configured = Boolean(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_VERIFY_SERVICE_SID);
            const firebaseConfigured = Boolean(env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY);
            return jsonResponse({
                status: 'ok', worker: 'twilio-otp-worker', configured, firebaseConfigured,
                required_env: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_VERIFY_SERVICE_SID'],
                required_firebase_env: ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'],
            }, 200, origin);
        }
        return jsonResponse({ error: 'Not found', path: url.pathname, method: request.method }, 404, origin);
    },
};
//# sourceMappingURL=index.js.map