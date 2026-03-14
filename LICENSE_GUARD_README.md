# License Guard Implementation Guide

## Overview

The **License Guard** system is a production-ready payment/license verification layer that protects your StemSplit application and ensures monetization. It combines a beautiful cyberpunk/HUD-styled UI with robust backend validation and Stripe integration.

## Components

### 1. **LicenseGuard.tsx** - Main Component
The primary wrapper component that:
- ✅ Checks localStorage for cached license keys on mount
- ✅ Displays a full-screen overlay if no valid license found
- ✅ Provides neon-styled input for license key entry
- ✅ Shows loading state during verification
- ✅ Renders children (your app) only when licensed
- ✅ Opens Stripe checkout in a popup window

**Location:** `src/components/LicenseGuard.tsx`

**Usage in Layout:**
```tsx
import { LicenseGuard } from '@/components/LicenseGuard';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <LicenseGuard>
          {children}
        </LicenseGuard>
      </body>
    </html>
  );
}
```

### 2. **License Validation API** - Backend
Server-side validation endpoint that:
- ✅ Validates license key format
- ✅ Checks against license database
- ✅ Verifies expiration dates
- ✅ Returns tier and features
- ✅ Implements rate limiting (5 attempts/minute per IP)
- ✅ Logs all validation attempts

**Location:** `src/app/api/license/validate/route.ts`

**Request:**
```json
POST /api/license/validate
{
  "license_key": "STEM-XXXX-XXXX-XXXX-XXXX"
}
```

**Response (Valid):**
```json
{
  "isValid": true,
  "tier": "pro",
  "email": "user@example.com",
  "expiresAt": "2027-12-31T23:59:59Z",
  "features": ["Batch processing", "HD output", ...],
  "daysRemaining": 706
}
```

**Response (Invalid):**
```json
{
  "isValid": false,
  "error": "License key not found. Please check and try again."
}
```

### 3. **license-utils.ts** - Helper Functions
Utility library providing:
- `validateLicenseFormat()` - Client-side format check
- `getLicenseInfo()` - Read license from localStorage
- `isLicenseExpired()` - Check expiration
- `clearLicense()` - Logout
- `getStripeCheckoutUrl()` - Build Stripe link
- `initializeLicenseGuard()` - App startup verification
- `logLicenseEvent()` - Analytics tracking

**Location:** `src/lib/license-utils.ts`

### 4. **Success/Cancel Pages**
Post-payment pages:
- `src/app/license/success/page.tsx` - Shows license key after purchase
- `src/app/license/cancel/page.tsx` - Handles cancelled payments

## Integration Steps

### Step 1: Install Dependencies
```bash
npm install framer-motion next
```

### Step 2: Configure Environment Variables
Copy `.env.local.example` to `.env.local` and fill in:

```env
# Stripe Configuration
NEXT_PUBLIC_STRIPE_CHECKOUT_URL=https://checkout.stripe.com/pay/cs_live_XXXXX
NEXT_PUBLIC_STRIPE_PRICE_PRO=price_1234567890abcdef
NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE=price_0987654321fedcba
STRIPE_SECRET_KEY=sk_live_your_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Optional
NEXT_PUBLIC_SUPPORT_EMAIL=support@stemsplit.com
NEXT_PUBLIC_ENFORCE_LICENSE=true
```

### Step 3: Update Root Layout
Wrap your app with `LicenseGuard`:

```tsx
// src/app/layout.tsx
import { LicenseGuard } from '@/components/LicenseGuard';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <LicenseGuard>
          {children}
        </LicenseGuard>
      </body>
    </html>
  );
}
```

### Step 4: Update License Database
Replace the mock database in `route.ts` with your real database:

```typescript
// In /api/license/validate/route.ts
// Replace LICENSE_DATABASE Map with actual database query

async function validateLicenseFromDB(key: string) {
  const result = await db.query(
    'SELECT * FROM licenses WHERE key = ? AND active = true',
    [key]
  );
  
  if (!result) return null;
  
  const expiresAt = new Date(result.expires_at);
  if (new Date() > expiresAt) return null;
  
  return result;
}
```

### Step 5: Set Up Stripe Webhooks
Configure webhook handler for payment confirmations:

```typescript
// src/app/api/webhooks/stripe/route.ts
export async function POST(req: NextRequest) {
  const event = await stripe.webhooks.constructEvent(
    body,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  );

  if (event.type === 'charge.succeeded') {
    // Generate license key
    // Send to customer email
    // Mark as active in database
  }
}
```

## License Key Format

**Format:** `STEM-XXXX-XXXX-XXXX-XXXX`
- Prefix: `STEM`
- 4 segments of 4 alphanumeric characters
- Uppercase only (normalized)
- Example: `STEM-A1B2-C3D4-E5F6-G7H8`

## Testing

### Test License Keys (Mock Database)
```
Pro Tier:  STEM-TEST-1234-5678-9ABC (expires 2027-12-31)
Free Tier: STEM-DEMO-0000-0000-DEMO (expires 2026-12-31)
```

### Enable Demo Mode
For development/testing without real payments:

```env
NEXT_PUBLIC_DEMO_MODE=true
NEXT_PUBLIC_DEMO_LICENSE_KEY=STEM-DEMO-0000-0000-DEMO
```

### Manual Testing Workflow
1. Clear localStorage: `localStorage.clear()`
2. Reload app - License Guard appears
3. Enter test license key
4. Click "VERIFY LICENSE"
5. App content loads on success

## Security Considerations

### ✅ Best Practices Implemented
- Rate limiting (5 attempts/minute per IP)
- Server-side validation required
- localStorage check for UX (but not security)
- Expiration date verification
- Inactive license detection
- Comprehensive error logging

### ⚠️ Production Recommendations
1. **Replace Mock Database** - Use PostgreSQL/MongoDB with encrypted keys
2. **Implement Signature Verification** - Sign license keys with HMAC
3. **Add License Revocation Checks** - Query latest status on each segment separation
4. **Use HTTPS Only** - Never transmit over HTTP
5. **Rotate Stripe Keys** - Regularly update webhook secrets
6. **Monitor Failed Attempts** - Alert on suspicious patterns
7. **Implement Logout** - Clear license on logout/app uninstall

## Revenue Flow

### Tier Structure
```
Free      - $0     → Basic features
Pro       - $29.99/mo → Batch processing, HD output
Enterprise - $99.99/mo → Unlimited processing, API access
```

### License Lifecycle
1. User clicks "PURCHASE LICENSE"
2. Stripe checkout modal opens
3. User completes payment → Webhook triggered
4. License key generated → Email sent
5. User enters key in LicenseGuard
6. Backend validates → Saved to localStorage
7. App unlocks premium features

## Monitoring & Analytics

Track these events for business insights:
- `verify_attempt` - User tries to verify
- `verify_success` - License validated
- `verify_failed` - Invalid key entered
- `purchase_click` - User clicks "Purchase"

Events are logged to console and sent to `POST /api/analytics/license` (if enabled).

## Troubleshooting

### License Guard Shows "No License"
**Issue:** Valid license saved but not detected
- Clear localStorage: `localStorage.clear()`
- Check browser console for validation errors
- Verify API response: `POST /api/license/validate`

### Stripe Checkout Won't Open
**Issue:** Popup blocked or URL invalid
- Check `NEXT_PUBLIC_STRIPE_CHECKOUT_URL` in .env.local
- Browser may block popups - show notification to user
- Test with `window.open()` directly

### Rate Limiting Blocking Attempts
**Issue:** "Too many validation attempts"
- Limit is 5 per minute per IP
- Wait 60 seconds before retrying
- Check if user behind proxy/VPN (might share IP)

### License Expires But Still Works
**Issue:** Cached localStorage not expired
- Add expiration check on app startup
- Implement license refresh before expiration
- Show warning 7 days before expiration

## API Reference

### License Validation Endpoint
```
POST /api/license/validate
Content-Type: application/json

{
  "license_key": "STEM-XXXX-XXXX-XXXX-XXXX"
}

Returns:
{
  "isValid": boolean,
  "tier": "free|pro|enterprise",
  "email": string,
  "expiresAt": ISO8601 string,
  "features": string[],
  "daysRemaining": number,
  "error": string (if not valid)
}
```

## Files Overview

```
src/
├── components/
│   └── LicenseGuard.tsx          # Main guard component
├── lib/
│   └── license-utils.ts           # Helper functions
├── app/
│   ├── layout.tsx                 # Root layout with guard
│   ├── api/license/
│   │   └── validate/route.ts      # Validation endpoint
│   └── license/
│       ├── success/page.tsx       # Post-purchase page
│       └── cancel/page.tsx        # Cancelled payment page
└── .env.local.example             # Environment template
```

## Next Steps

1. ✅ Set up Stripe account and get API keys
2. ✅ Configure `.env.local`
3. ✅ Implement real database for licenses
4. ✅ Set up Stripe webhooks for payment confirmation
5. ✅ Add email service for license key delivery
6. ✅ Test complete flow end-to-end
7. ✅ Monitor analytics and revenue metrics

---

**Last Updated:** February 2026
**Version:** 1.0.0
