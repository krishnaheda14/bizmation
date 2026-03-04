/**
 * Twilio OTP Service
 *
 * Uses Twilio Verify API to send and check phone OTPs.
 *
 * Required environment variables (set in Railway / .env — never commit):
 *   TWILIO_ACCOUNT_SID       — Main account SID (AC...)
 *   TWILIO_API_KEY_SID       — API Key SID (SK...)
 *   TWILIO_API_KEY_SECRET    — API Key Secret
 *   TWILIO_VERIFY_SERVICE_SID — Verify Service SID (VA...)
 */

import twilio from 'twilio';

const accountSid       = process.env.TWILIO_ACCOUNT_SID!;
const apiKeySid        = process.env.TWILIO_API_KEY_SID!;
const apiKeySecret     = process.env.TWILIO_API_KEY_SECRET!;
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID!;

// Lazy-initialise the Twilio client so the server still boots without creds
// (sends a console.warn instead of crashing)
let _client: ReturnType<typeof twilio> | null = null;

function getClient(): ReturnType<typeof twilio> {
  if (_client) return _client;
  if (!accountSid || !apiKeySid || !apiKeySecret) {
    throw new Error('TWILIO_ACCOUNT_SID, TWILIO_API_KEY_SID and TWILIO_API_KEY_SECRET must be set to use phone OTP.');
  }
  _client = twilio(apiKeySid, apiKeySecret, { accountSid });
  return _client;
}

/**
 * Send a 6-digit OTP to the given phone number via Twilio Verify.
 * @param phone - E.164 format, e.g. "+919876543210"
 */
export async function sendOtp(phone: string): Promise<{ sent: boolean; message: string }> {
  if (!verifyServiceSid) {
    throw new Error('TWILIO_VERIFY_SERVICE_SID is not set.');
  }
  const normalized = normalizePhone(phone);
  const verification = await getClient().verify.v2
    .services(verifyServiceSid)
    .verifications
    .create({ to: normalized, channel: 'sms' });

  return {
    sent: verification.status === 'pending',
    message: `OTP sent to ${masked(normalized)}`,
  };
}

/**
 * Verify the OTP code entered by the user.
 * @param phone - E.164 format
 * @param code  - 6-digit code
 */
export async function verifyOtp(
  phone: string, code: string
): Promise<{ valid: boolean; message: string }> {
  if (!verifyServiceSid) {
    throw new Error('TWILIO_VERIFY_SERVICE_SID is not set.');
  }
  const normalized = normalizePhone(phone);
  const check = await getClient().verify.v2
    .services(verifyServiceSid)
    .verificationChecks
    .create({ to: normalized, code });

  return {
    valid: check.status === 'approved',
    message: check.status === 'approved' ? 'Phone verified' : 'Invalid or expired OTP',
  };
}

// ── helpers ───────────────────────────────────────────────────────────────────

/** Ensure E.164 format: +91XXXXXXXXXX */
function normalizePhone(phone: string): string {
  const raw = phone.trim().replace(/\s+/g, '');
  if (raw.startsWith('+')) return raw;
  // Default to India country code if no + prefix
  return `+91${raw.replace(/^0/, '')}`;
}

/** Mask phone for logs/messages: +91*****6789 */
function masked(phone: string): string {
  return phone.slice(0, 3) + '*'.repeat(Math.max(0, phone.length - 7)) + phone.slice(-4);
}
