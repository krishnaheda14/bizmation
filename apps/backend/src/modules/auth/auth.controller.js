/**
 * Auth Controller — Phone OTP endpoints
 *
 * POST /api/auth/send-otp    { phone: "+919876543210" }
 * POST /api/auth/verify-otp  { phone: "+919876543210", code: "123456" }
 */
import { Router } from 'express';
import { sendOtp, verifyOtp } from './auth.service';
export const authRouter = Router();
authRouter.post('/send-otp', async (req, res) => {
    const { phone } = req.body;
    if (!phone || typeof phone !== 'string' || phone.length < 8) {
        return res.status(400).json({ success: false, error: 'A valid phone number is required.' });
    }
    try {
        const result = await sendOtp(phone);
        return res.json({ success: true, ...result });
    }
    catch (err) {
        console.error('[auth/send-otp]', err.message);
        return res.status(500).json({ success: false, error: err.message || 'Failed to send OTP.' });
    }
});
authRouter.post('/verify-otp', async (req, res) => {
    const { phone, code } = req.body;
    if (!phone || !code) {
        return res.status(400).json({ success: false, error: 'phone and code are required.' });
    }
    try {
        const result = await verifyOtp(phone, String(code));
        return res.json({ success: true, ...result });
    }
    catch (err) {
        console.error('[auth/verify-otp]', err.message);
        return res.status(500).json({ success: false, error: err.message || 'Failed to verify OTP.' });
    }
});
//# sourceMappingURL=auth.controller.js.map