/**
 * Twilio OTP Service
 *
 * Uses Twilio Verify API to send and check phone OTPs.
 *
 * OPTION A - API Key auth (recommended for production):
 *   TWILIO_ACCOUNT_SID        - Main account SID (AC...)
 *   TWILIO_API_KEY_SID        - API Key SID (SK...)
 *   TWILIO_API_KEY_SECRET     - API Key Secret
 *   TWILIO_VERIFY_SERVICE_SID - Verify Service SID (VA...)
 *
 * OPTION B - Account SID + Auth Token (simpler, works out of the box):
 *   TWILIO_ACCOUNT_SID        - Main account SID (AC...)
 *   TWILIO_AUTH_TOKEN         - Auth Token from Twilio Console
 *   TWILIO_VERIFY_SERVICE_SID - Verify Service SID (VA...)
 */
import twilio from 'twilio';
import { getAdminAuth, getAdminFirestore } from '../../lib/firebaseAdmin';
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const apiKeySid = process.env.TWILIO_API_KEY_SID;
const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
// Log credential config on startup (without exposing secrets)
console.log('[Twilio] Config check:');
console.log('  TWILIO_ACCOUNT_SID        :', accountSid ? accountSid.slice(0, 6) + '...' : 'NOT SET');
console.log('  TWILIO_API_KEY_SID        :', apiKeySid ? apiKeySid.slice(0, 6) + '...' : 'NOT SET');
console.log('  TWILIO_API_KEY_SECRET     :', apiKeySecret ? '***set***' : 'NOT SET');
console.log('  TWILIO_AUTH_TOKEN         :', authToken ? '***set***' : 'NOT SET');
console.log('  TWILIO_VERIFY_SERVICE_SID :', verifyServiceSid ? verifyServiceSid.slice(0, 6) + '...' : 'NOT SET');
// Lazy-initialise the Twilio client so the server still boots without creds.
let _client = null;
function getClient() {
    if (_client)
        return _client;
    if (apiKeySid && apiKeySecret && accountSid) {
        // Option A: API Key auth (more secure - rotate keys without changing password)
        console.log('[Twilio] Initialising with API Key auth (SK...)');
        _client = twilio(apiKeySid, apiKeySecret, { accountSid });
    }
    else if (accountSid && authToken) {
        // Option B: AccountSID + AuthToken (simpler, works directly from Twilio console)
        console.log('[Twilio] Initialising with AccountSID + AuthToken auth');
        _client = twilio(accountSid, authToken);
    }
    else {
        const missing = [];
        if (!accountSid)
            missing.push('TWILIO_ACCOUNT_SID');
        if (!authToken)
            missing.push('TWILIO_AUTH_TOKEN (for Option B)');
        if (!apiKeySid)
            missing.push('TWILIO_API_KEY_SID (for Option A)');
        if (!apiKeySecret)
            missing.push('TWILIO_API_KEY_SECRET (for Option A)');
        throw new Error(`Twilio credentials not configured. Missing: ${missing.join(', ')}.\n` +
            'Set TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN in Railway Variables (Option B - simplest)\n' +
            'OR set TWILIO_ACCOUNT_SID + TWILIO_API_KEY_SID + TWILIO_API_KEY_SECRET (Option A).');
    }
    return _client;
}
/**
 * Send a 6-digit OTP to the given phone number via Twilio Verify.
 * @param phone - E.164 format, e.g. "+919876543210"
 */
export async function sendOtp(phone) {
    if (!verifyServiceSid) {
        console.error('[Twilio] TWILIO_VERIFY_SERVICE_SID is not set - cannot send OTP');
        throw new Error('TWILIO_VERIFY_SERVICE_SID is not set. ' +
            'Create a Verify Service in Twilio Console → Verify → Services and add the SID to Railway Variables.');
    }
    const normalized = normalizePhone(phone);
    console.log('[Twilio/sendOtp] Sending OTP to', masked(normalized), '(service:', verifyServiceSid.slice(0, 8) + '...)');
    try {
        const verification = await getClient().verify.v2
            .services(verifyServiceSid)
            .verifications
            .create({ to: normalized, channel: 'sms', customFriendlyName: 'Bizmation' });
        console.log('[Twilio/sendOtp] Verification status:', verification.status, '| SID:', verification.sid);
        return {
            sent: verification.status === 'pending',
            message: `OTP sent to ${masked(normalized)}`,
        };
    }
    catch (err) {
        console.error('[Twilio/sendOtp] Error:', err?.status, err?.code, err?.message);
        console.error('[Twilio/sendOtp] More info:', err?.moreInfo);
        throw err;
    }
}
/**
 * Verify the OTP code entered by the user.
 * @param phone - E.164 format
 * @param code  - 6-digit code
 */
export async function verifyOtp(phone, code) {
    if (!verifyServiceSid) {
        throw new Error('TWILIO_VERIFY_SERVICE_SID is not set.');
    }
    const normalized = normalizePhone(phone);
    console.log('[Twilio/verifyOtp] Checking code for', masked(normalized));
    try {
        const check = await getClient().verify.v2
            .services(verifyServiceSid)
            .verificationChecks
            .create({ to: normalized, code });
        console.log('[Twilio/verifyOtp] Check status:', check.status, '| SID:', check.sid);
        return {
            valid: check.status === 'approved',
            message: check.status === 'approved' ? 'Phone verified' : 'Invalid or expired OTP',
        };
    }
    catch (err) {
        console.error('[Twilio/verifyOtp] Error:', err?.status, err?.code, err?.message);
        throw err;
    }
}
// ── helpers ───────────────────────────────────────────────────────────────────
/** Ensure E.164 format: +91XXXXXXXXXX */
function normalizePhone(phone) {
    const raw = phone.trim().replace(/\s+/g, '');
    if (raw.startsWith('+'))
        return raw;
    // Default to India country code if no + prefix
    return `+91${raw.replace(/^0/, '')}`;
}
/** Mask phone for logs/messages: +91*****6789 */
function masked(phone) {
    return phone.slice(0, 3) + '*'.repeat(Math.max(0, phone.length - 7)) + phone.slice(-4);
}
/**
 * Verify OTP via Twilio, then look up the user in Firestore phoneIndex and
 * return a Firebase custom token so the client can call signInWithCustomToken().
 */
export async function verifyOtpAndCreateFirebaseToken(phone, code) {
    // 1. Verify the OTP with Twilio
    const { valid } = await verifyOtp(phone, code);
    if (!valid)
        return { valid: false };
    // 2. Look up Firebase UID from Firestore phoneIndex
    const normalized = normalizePhone(phone);
    let uid;
    let email;
    try {
        const snap = await getAdminFirestore()
            .collection('phoneIndex')
            .doc(normalized)
            .get();
        if (snap.exists) {
            uid = snap.data()?.uid;
            email = snap.data()?.email;
        }
    }
    catch (err) {
        console.error('[verifyOtpAndCreateFirebaseToken] Firestore lookup failed:', err?.message);
        throw new Error('Account lookup failed. Please try again.');
    }
    if (!uid) {
        throw new Error('No Bizmation account is linked to this phone number. ' +
            'Please create an account first.');
    }
    // 3. Issue a Firebase custom token for the found UID
    const customToken = await getAdminAuth().createCustomToken(uid);
    return { valid: true, customToken, email };
}
//# sourceMappingURL=auth.service.js.map