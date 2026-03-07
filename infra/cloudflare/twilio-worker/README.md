# twilio-worker

This worker exposes two endpoints used by the frontend to send and verify Twilio SMS OTP codes:

- `POST /api/auth/send-otp`  { phone: "+91..." }
- `POST /api/auth/verify-otp` { phone: "+91...", code: "123456" }

Set these secrets via `wrangler secret put` before deploying:
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_VERIFY_SERVICE_SID`
