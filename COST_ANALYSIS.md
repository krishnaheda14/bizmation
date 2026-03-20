# COST_ANALYSIS.md

## Overview
This document provides a detailed cost breakdown for scaling the Bizmation Gold platform, covering infrastructure, third‑party services, AI hosting, and mobile app distribution.

## 1. Infrastructure Costs
### Cloudflare
- **Pages (Static Frontend Hosting)**: Free tier includes 500 k page views/month. Beyond that, $0.50 per 100 k requests.
- **Workers**: Free tier 100 k requests/day. Paid plan $5/month includes 10 M requests and 30 M ms CPU time. Additional usage: $0.30 per million requests, $0.02 per million CPU ms.
- **KV Storage**: Free 1 GB storage, 100 k reads/day, 1 k writes/day. Extra: $0.50 per GB‑month, $0.50 per million reads, $5 per million writes.
- **Durable Objects**: $0.25 per GB‑month storage, $0.10 per million reads/writes.

### Firebase (Blaze Plan)
- **Firestore**: First 1 GB storage free. After that $0.26/GB/month. Reads $0.18 per 100 k, writes $0.18 per 100 k, deletes $0.02 per 100 k.
- **Authentication**: Email/Google/SAML free up to 50 k MAUs. Phone OTP $0.013 per SMS.
- **Hosting (if used)**: Free 10 GB storage, 10 GB egress. Extra $0.026/GB storage, $0.15/GB egress.

### PostgreSQL (Managed)
- **Managed instance** (e.g., Supabase) $25/month for 8 GB storage and moderate traffic.

## 2. Third‑Party Service Costs (2026 rates)
- **Twilio Verify (OTP)**: $0.05 per successful verification + $0.0832 per SMS (India) ≈ $0.133 per OTP.
- **Razorpay Payments**: 2 % of transaction amount + 18 % GST. For a ₹10,000 purchase, fee ≈ ₹200 + GST ≈ ₹236.
- **Currency/Rate APIs**: Mostly free tier; assume $0 for modest usage.

## 3. AI Hosting (FastAPI microservice)
Assume serverless container on Render.com or Cloudflare Workers.
- **Render.com (Free tier)**: 0 USD up to 750 h/month, 512 MB RAM.
- **Paid tier**: $7/month for 1 GB RAM, 1 CPU, 100 GB bandwidth.
- **Cloudflare Workers**: Included in Workers plan; extra $0.30 per million requests.
- **GPU**: Not required for lightweight YOLOv8‑nano; CPU inference negligible cost.

## 4. Mobile App Distribution Costs
- **Apple App Store**: $99/year developer program. 30 % revenue share on paid apps (not applicable for free SaaS).
- **Google Play Store**: $25 one‑time registration. 30 % revenue share on paid apps.
- **In‑app purchase fees**: 15 % after first year for subscriptions.

## 5. Scaling Scenarios
| Scenario | Users | Monthly Transactions | Cloudflare Workers (requests) | KV reads/writes | Firestore reads/writes | Twilio OTPs | Razorpay fees |
|----------|-------|----------------------|------------------------------|----------------|-----------------------|-------------|--------------|
| Startup (0‑100 customers) | 100 | 200 transactions | 5 M (≈ $1.5) | 1 M reads, 0.1 M writes ($0.55) | 2 M reads, 0.2 M writes ($0.44) | 100 OTPs ($13) | $200 fee |
| Growth (100‑1 000 customers) | 800 | 1 600 transactions | 20 M (≈ $6) | 4 M reads, 0.5 M writes ($2.2) | 8 M reads, 1 M writes ($1.8) | 800 OTPs ($106) | $1 600 fee |
| Scale (1 000+ customers) | 5 000 | 10 000 transactions | 100 M (≈ $30) | 20 M reads, 2 M writes ($11) | 40 M reads, 5 M writes ($9) | 5 000 OTPs ($665) | $10 000 fee |

## 6. Total Monthly Cost Estimates
- **Startup**: ≈ $10 – $15 (Cloudflare + Firebase + Twilio + Razorpay fees).
- **Growth**: ≈ $30 – $45.
- **Scale**: ≈ $150 – $200.

## 7. Recommendations
1. **Stay within free tiers** for Cloudflare Workers and Firebase as long as possible.
2. **Enable budget alerts** on Firebase and Cloudflare to avoid surprise charges.
3. **Consider moving backend to Cloudflare Workers** to eliminate Railway costs entirely.
4. **Monitor OTP volume**; switch to a cheaper OTP provider if volume grows.
5. **Negotiate Razorpay custom pricing** once transaction volume exceeds ₹10 L/month.

---
*All prices are based on publicly available 2026 pricing and may vary by region or volume discounts.*
