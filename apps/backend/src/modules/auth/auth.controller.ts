/**
 * Auth Controller — Phone OTP endpoints
 *
 * POST /api/auth/send-otp    { phone: "+919876543210" }
 * POST /api/auth/verify-otp  { phone: "+919876543210", code: "123456" }
 */

import { Router, Request, Response } from 'express';
import { sendOtp, verifyOtp, verifyOtpAndCreateFirebaseToken } from './auth.service';

export const authRouter = Router();

authRouter.post('/send-otp', async (req: Request, res: Response) => {
  const { phone } = req.body;
  if (!phone || typeof phone !== 'string' || phone.length < 8) {
    return res.status(400).json({ success: false, error: 'A valid phone number is required.' });
  }
  try {
    const result = await sendOtp(phone);
    return res.json({ success: true, ...result });
  } catch (err: any) {
    console.error('[auth/send-otp]', err.message);
    return res.status(500).json({ success: false, error: err.message || 'Failed to send OTP.' });
  }
});

authRouter.post('/verify-otp', async (req: Request, res: Response) => {
  const { phone, code } = req.body;
  if (!phone || !code) {
    return res.status(400).json({ success: false, error: 'phone and code are required.' });
  }
  try {
    const result = await verifyOtp(phone, String(code));
    return res.json({ success: true, ...result });
  } catch (err: any) {
    console.error('[auth/verify-otp]', err.message);
    return res.status(500).json({ success: false, error: err.message || 'Failed to verify OTP.' });
  }
});

/**
 * POST /api/auth/phone-login   { phone, code }
 *
 * Verifies the Twilio OTP, looks up the user's Firebase UID from the
 * Firestore phoneIndex, and returns a Firebase custom token.
 * The client calls signInWithCustomToken(auth, customToken) to complete login.
 *
 * Required Railway env vars:
 *   FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 */
authRouter.post('/phone-login', async (req: Request, res: Response) => {
  const { phone, code } = req.body;
  if (!phone || !code) {
    return res.status(400).json({ success: false, error: 'phone and code are required.' });
  }
  try {
    const result = await verifyOtpAndCreateFirebaseToken(phone, String(code));
    if (!result.valid) {
      return res.status(400).json({ success: false, error: 'Invalid or expired OTP.' });
    }
    return res.json({ success: true, customToken: result.customToken, email: result.email });
  } catch (err: any) {
    console.error('[auth/phone-login]', err.message);
    return res.status(500).json({ success: false, error: err.message || 'Phone login failed.' });
  }
});
