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
/**
 * Send a 6-digit OTP to the given phone number via Twilio Verify.
 * @param phone - E.164 format, e.g. "+919876543210"
 */
export declare function sendOtp(phone: string): Promise<{
    sent: boolean;
    message: string;
}>;
/**
 * Verify the OTP code entered by the user.
 * @param phone - E.164 format
 * @param code  - 6-digit code
 */
export declare function verifyOtp(phone: string, code: string): Promise<{
    valid: boolean;
    message: string;
}>;
/**
 * Verify OTP via Twilio, then look up the user in Firestore phoneIndex and
 * return a Firebase custom token so the client can call signInWithCustomToken().
 */
export declare function verifyOtpAndCreateFirebaseToken(phone: string, code: string): Promise<{
    valid: boolean;
    customToken?: string;
    email?: string;
}>;
//# sourceMappingURL=auth.service.d.ts.map