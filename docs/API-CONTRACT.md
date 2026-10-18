# TirfMarket API Contract

**Version:** 1.1.0 (2026-10-18)

> **MANDATORY RULE:** Any change to a route path, request field, response field, or HTTP status code in the backend code MUST update this file and the changelog below in the same commit. The frontend relies strictly on this contract.

---

## Changelog

- **v1.1.0 (2026-10-18):**
  - Added `itemCode` (`string | null`) to `GET /api/deals/nearby` items (13 fields total per item).
  - Added `redemptionCode` (`string`) to `GET /api/orders/:id` for orders in `"paid"` status.
  - Added `tinNumber` (required, 5 to 20 digits) and `tillNumber` (optional, 5 to 6 digits) to `POST /api/merchants/register`.
  - Added `POST /api/merchant/redeem` endpoint: validates voucher redemption codes (`{ code }`), requires Bearer token, returns `{ orderId, dealTitle, itemCode, amount, redeemedAt }`, with 401 Unauthorized, 404 Not Found, and 409 Conflict.
- **v1.0.0 (2026-10-17):**
  - Published comprehensive API contract verified against local server execution (`STORE=memory`, `MPESA_MODE=mock`, `AUTH_MODE=dev`).
  - Confirmed `GET /api/merchant/stats` response shape: `{ merchantId, dealsRedeemed, cashlessSales, pending, failed, recent: [ { orderId, dealTitle, amount, receipt, paidAt } ] }`.
  - Documented customer flows, merchant onboarding/auth flows, new-merchant limits, error shapes, and rate limits.
  - Documented unsupported features ("NOT available") and Render free-plan cold start behaviors.

---

## Architecture, Global Settings & Behaviors

### 1. CORS Rules
- Allowed origins are determined by the `CORS_ORIGIN` environment variable on the server.
- If `CORS_ORIGIN` is empty, unset, or `*`, all origins are permitted.
- If set to a comma-separated list of URLs (e.g. `https://tirfmarket.et,http://localhost:5173`), requests from those exact origins (ignoring trailing slashes) are accepted.
- Allowed request headers: `Content-Type`, `Authorization`, `x-admin-key`.

### 2. Accepted Phone Number Format
- Accepted phone inputs: `09XXXXXXXX`, `07XXXXXXXX`, `+2519XXXXXXXX`, `+2517XXXXXXXX`, `002519XXXXXXXX`, `002517XXXXXXXX`, `9XXXXXXXX`, `7XXXXXXXX`.
- Server normalizes numbers into 12-digit Ethiopian format: `251XXXXXXXXX`.
- Rejections (returns `400`): Addis Ababa landlines (`011...`), international numbers, numbers in series other than 7 or 9, or strings with invalid lengths/characters.

### 3. Mock Mode Behavior (`MPESA_MODE=mock`)
- **Simulated STK Push**: In mock mode, the service triggers a simulated payment callback after `MOCK_DELAY_MS` (default ~4 seconds in production config, 150ms in unit tests).
- **Simulated Failure**: Any phone number ending in `0000` (e.g. `0911000000` or `251911000000`) fails automatically with `ResultCode: 1` (`"The balance is insufficient for the transaction"`), transitioning the order to `failed`.
- **Simulated Success**: All other phone numbers succeed (`ResultCode: 0`, `"Mock success"`), transitioning the order to `paid` with receipt `MOCK_ws_CO_...`.
- **Instant Result Helper**: `POST /api/orders/:id/mock-result` allows manually forcing `'paid'` or `'failed'` for demo testing.

### 4. New-Merchant Limits
For the first **7 days** after a merchant is approved (`now - approved_at < 7 days`):
1. **Max Active Deals**: Maximum **3 active deals** concurrently.
2. **Max Discount**: Maximum discount of **50%** (regular limit: up to 90%).
3. **Max Expiry Window**: Deal expiry can be at most **7 days** in the future (regular limit: up to 30 days).
4. **Deal Creation Limit**: Maximum 20 deal creations per hour per merchant.

### 5. Hosting & Infrastructure Behavior
- **Free-Plan Cold Start**: When deployed on free cloud tiers (such as Render), the server spins down after inactivity. The first HTTP request may experience a cold start latency of **30 to 60 seconds**. The frontend should set client-side request timeouts accordingly (at least 60s) or show a friendly connecting indicator.
- **Rate Limit Response (429)**: Standard rate limiting is enforced per route. Exceeding any rate limit returns HTTP `429 Too Many Requests` with a JSON payload: `{"error": "Too many requests..."}`.

---

## Flows

### (a) Claim and Pay Flow
1. **Browse Nearby Deals**: Customer frontend queries `GET /api/deals/nearby?lat=...&lon=...`.
2. **Initiate Order**: User taps "Claim deal" and inputs their M-PESA phone number. Frontend sends `POST /api/orders` with `{ dealId, phone }`.
3. **Handle Initial Response**:
   - Server returns `201 Created` with `{ id, dealId, merchantId, phone, amount, status: "pending", checkoutRequestId, createdAt }`.
   - Frontend stores the returned order `id`.
4. **Prompt Customer**: Display a modal: *"Check your phone and enter your M-PESA PIN"*.
5. **Poll Order Status**: Frontend polls `GET /api/orders/:id` every **2 seconds**:
   - While `status === "pending"` or `"created"`: continue polling.
   - When `status === "paid"`: stop polling. Display success screen with `mpesaReceipt`, `paidAmount`, and `updatedAt`.
   - When `status === "failed"`: stop polling. Display `failureReason` and allow user to retry.
6. **Demo / Mock Testing**: When developing against mock mode, frontend can call `POST /api/orders/:id/mock-result` with `{ "outcome": "paid" }` or `{ "outcome": "failed" }` to instantly trigger the callback.

### (b) Merchant Onboarding & Management Flow
1. **Registration**: Prospective shop calls `POST /api/merchants/register` with shop details, coordinates, and storefront photo base64 data URL. Response status is `201 Created` with `{ merchantId, status: "pending" }`.
2. **Request Login Code**: Merchant enters email to log in: `POST /api/merchant/auth/request` with `{ email }`. Server always returns `200 OK` (`{"ok": true, "message": "..."}`). An OTP code is emailed (or `000000` in dev mode).
3. **Verify Code**: Merchant submits code: `POST /api/merchant/auth/verify` with `{ email, code }`. Returns `200 OK` with `{ token }`.
4. **Store Token**: Frontend stores `token` in memory or secure client storage and attaches it to subsequent requests as `Authorization: Bearer <token>`.
5. **Check Approval State**: Frontend calls `GET /api/merchant/me`. If `status === "pending"`, display *"Your shop is currently under review by our admin team"*.
6. **Post Deals**: Once approved, merchant posts deals via `POST /api/merchant/deals` (respecting new-merchant limits).
7. **Manage Deals**: Merchant lists deals (`GET /api/merchant/deals`), pauses/resumes deals (`PATCH /api/merchant/deals/:id`), or deletes/deactivates deals (`DELETE /api/merchant/deals/:id`).
8. **View Dashboard Stats**: Merchant views live sales and redemption counts via `GET /api/merchant/stats`.

---

## Features NOT Available (Do Not Build Against These)

The backend currently DOES NOT support and will return errors for:
1. **No Merchant List Route**: There is no public endpoint to list all shops or browse shops by category.
2. **No Public Merchant Stats**: `GET /api/merchants/:id/stats` is disabled by default and returns `404 Not found`. Frontend must use authenticated `GET /api/merchant/stats`.
3. **No expiryDate in Nearby Results**: `GET /api/deals/nearby` intentionally omits `expiryDate` (only verified active deals are returned).
4. **No Customer Accounts**: Customers have no logins, passwords, profiles, or saved payment methods. Everything is keyed by M-PESA phone number per order.
5. **No Search Route**: There is no text search endpoint (e.g. `/api/search?q=coffee`). Filtering must be performed client-side on the nearby deals array.
6. **No Cart / Multi-Deal Checkout**: The API processes exactly **one deal per order**.
7. **No Ratings or Customer Photos**: No endpoints exist for reviews, ratings, or user-uploaded photos.

---

## Public & Customer API Routes

### 1. Health Check
`GET /health`
- **Auth:** None (Public)
- **Request Body:** None
- **Rate Limit:** None
- **Success (200 OK):**
```json
{
  "ok": true,
  "mode": "mock",
  "store": "memory"
}
```
- **Errors:** None.

---

### 2. List Demo Deals
`GET /api/deals`
- **Auth:** None (Public)
- **Request Body:** None
- **Rate Limit:** None
- **Success (200 OK):**
```json
[
  {
    "id": "deal-1",
    "merchantId": "m1",
    "merchantName": "Bole Highland Cafe",
    "category": "cafe",
    "title": "20% off any coffee + pastry",
    "price": 200,
    "discountPct": 20,
    "finalAmount": 160,
    "lat": 9.0018,
    "lon": 38.7812
  }
]
```
- **Errors:**
  - `500 Internal Server Error`: `{"error": "Failed to fetch deals"}`

---

### 3. Hyperlocal Nearby Deals
`GET /api/deals/nearby`
- **Auth:** None (Public)
- **Query Parameters:**
  - `lat` *(number, required)*: User latitude (-90 to 90).
  - `lon` *(number, required)*: User longitude (-180 to 180).
  - `radius` *(number, optional)*: Search radius in meters (1 to 5000, default: 2000).
- **Rate Limit:** None
- **Success (200 OK):**
```json
[
  {
    "dealId": "deal-1",
    "title": "20% off any coffee + pastry",
    "price": 200,
    "discountPct": 20,
    "finalAmount": 160,
    "merchantId": "m1",
    "merchantName": "Bole Highland Cafe",
    "category": "cafe",
    "lat": 9.0018,
    "lon": 38.7812,
    "distanceMeters": 160,
    "verified": true,
    "itemCode": null
  }
]
```
- **Errors:**
  - `400 Bad Request`: `{"error": "lat and lon query params required"}`
  - `400 Bad Request`: `{"error": "lat and lon must be valid coordinates"}`
  - `400 Bad Request`: `{"error": "radius must be a positive number up to 5000 meters"}`
  - `500 Internal Server Error`: `{"error": "Failed to fetch nearby deals"}`

---

### 4. Create Order (Claim Deal & Trigger STK Push)
`POST /api/orders`
- **Auth:** None (Public)
- **Rate Limit:** 5 requests per minute per IP (configurable via `RATE_LIMIT_PER_MIN`).
- **Request Body (`application/json`):**
  - `dealId` *(string, required)*: UUID or ID of active unexpired deal.
  - `phone` *(string, required)*: Ethiopian mobile number (e.g. `"0911223344"`).
- **Success (201 Created):**
```json
{
  "id": "e037b51b-0925-4127-b08e-5b2326b47c0b",
  "dealId": "deal-1",
  "merchantId": "m1",
  "dealTitle": "20% off any coffee + pastry",
  "phone": "251911223344",
  "amount": 160,
  "status": "pending",
  "createdAt": "2026-10-17T07:13:00.000Z",
  "checkoutRequestId": "mock_ws_CO_sample_123"
}
```
- **Errors:**
  - `400 Bad Request`: `{"error": "Invalid phone number. Use e.g. 0911223344, 0700404709, +251..., or 00251..."}`
  - `404 Not Found`: `{"error": "Deal not available"}`
  - `429 Too Many Requests`: `{"error": "Too many order requests, please try again after a minute."}`
  - `502 Bad Gateway`: `{"error": "<m-pesa gateway error>", "order": { ... }}`

---

### 5. Poll Order Status
`GET /api/orders/:id`
- **Auth:** None (Public)
- **Rate Limit:** None
- **Path Parameter:** `:id` (Order UUID)
- **Success (200 OK):**
```json
{
  "id": "e037b51b-0925-4127-b08e-5b2326b47c0b",
  "dealId": "deal-1",
  "merchantId": "m1",
  "dealTitle": "20% off any coffee + pastry",
  "phone": "251911223344",
  "amount": 160,
  "status": "paid",
  "createdAt": "2026-10-17T07:13:00.000Z",
  "checkoutRequestId": "mock_ws_CO_sample_123",
  "mpesaReceipt": "MOCKFORCED",
  "paidAmount": 160,
  "redemptionCode": "TIRF-7B2C9A",
  "failureReason": null,
  "updatedAt": "2026-10-17T07:13:04.000Z"
}
```
- **Errors:**
  - `404 Not Found`: `{"error": "Order not found"}`

---

### 6. Force Mock Order Result (Demo Only)
`POST /api/orders/:id/mock-result`
- **Auth:** None (Public, enabled only when `MPESA_MODE=mock`)
- **Request Body (`application/json`, optional):**
  - `outcome` *(string, optional)*: `"paid"` (default) or `"failed"`.
- **Success (200 OK):** Returns refreshed order object with status updated.
- **Errors:**
  - `404 Not Found`: `{"error": "Not available"}` (returned if server is in sandbox/live mode)
  - `404 Not Found`: `{"error": "Order not found"}`

---

### 7. Report a Deal
`POST /api/deals/:id/report`
- **Auth:** None (Public)
- **Rate Limit:** 10 reports per hour per IP.
- **Path Parameter:** `:id` (Deal UUID)
- **Request Body (`application/json`, optional):**
  - `reason` *(string, optional)*: Explanation for reporting (e.g. `"Shop closed"`).
- **Success (200 OK):**
```json
{
  "ok": true,
  "reportCount": 1
}
```
- **Errors:**
  - `404 Not Found`: `{"error": "Deal not found"}`
  - `429 Too Many Requests`: `{"error": "Too many reports from this IP. Please try again later."}`

---

## Merchant API Routes

### 8. Merchant Registration
`POST /api/merchants/register`
- **Auth:** None (Public)
- **Rate Limit:** 3 registrations per hour per IP.
- **Request Body (`application/json`, max payload 2 MB):**
  - `shopName` *(string, required)*: 2 to 60 characters.
  - `ownerName` *(string, required)*: 2 to 60 characters.
  - `licenseNumber` *(string, required)*: 4 to 40 characters.
  - `tinNumber` *(string, required)*: Digits only, 5 to 20 characters (spaces/dashes stripped).
  - `tillNumber` *(string, optional)*: Digits only, 5 to 6 characters.
  - `email` *(string, required)*: Valid email address.
  - `ownerPhone` *(string, required)*: Valid Ethiopian mobile number.
  - `mpesaPhone` *(string, required)*: Valid Ethiopian mobile number for payouts.
  - `category` *(string, required)*: One of `cafe`, `restaurant`, `bakery`, `grocery`, `tailor`, `pharmacy`, `salon`, `electronics`, `other`.
  - `lat` *(number, required)*: Number in range [8.80, 9.15].
  - `lon` *(number, required)*: Number in range [38.60, 38.95].
  - `photo` *(string data URL, required)*: Base64 data URL (`data:image/jpeg;base64,...`, `png`, or `webp`), max 1.5 MB decoded. Magic bytes verified.
- **Success (201 Created):**
```json
{
  "merchantId": "9b1c114e-cd84-412d-abae-c1800353f091",
  "status": "pending"
}
```
- **Errors:**
  - `400 Bad Request`: Validation error messages:
    - `{"error": "shopName must be between 2 and 60 characters"}`
    - `{"error": "ownerName must be between 2 and 60 characters"}`
    - `{"error": "licenseNumber must be between 4 and 40 characters"}`
    - `{"error": "Invalid email address format"}`
    - `{"error": "Invalid ownerPhone number"}`
    - `{"error": "Invalid mpesaPhone number"}`
    - `{"error": "category must be one of: cafe, restaurant, bakery, grocery, tailor, pharmacy, salon, electronics, other"}`
    - `{"error": "Coordinates must be within Addis Ababa (lat 8.80..9.15, lon 38.60..38.95)"}`
    - `{"error": "Storefront photo is required"}`
    - `{"error": "Photo must be a JPEG, PNG, or WebP image data URL"}`
    - `{"error": "Photo exceeds maximum size of 1.5 MB decoded"}`
    - `{"error": "Photo magic bytes do not match a valid JPEG, PNG, or WebP file"}`
  - `409 Conflict`: `{"error": "A shop with these details already exists. Contact support if this is yours."}`
  - `429 Too Many Requests`: `{"error": "Too many registration requests from this IP. Please try again after an hour."}`
  - `500 Internal Server Error`: `{"error": "Failed to upload storefront photo"}`

---

### 9. Request Login OTP Code
`POST /api/merchant/auth/request`
- **Auth:** None (Public)
- **Rate Limit:** 5 requests per hour per email, 20 requests per hour per IP.
- **Request Body (`application/json`):**
  - `email` *(string, required)*: Registered email address.
- **Success (200 OK):**
```json
{
  "ok": true,
  "message": "If an account exists for this email, a verification code has been sent."
}
```
- **Errors:**
  - `400 Bad Request`: `{"error": "Invalid email address"}`
  - `429 Too Many Requests`: `{"error": "Too many login requests for this email. Try again later."}`
  - `429 Too Many Requests`: `{"error": "Too many login requests from this IP. Please try again after an hour."}`

---

### 10. Verify Login OTP Code
`POST /api/merchant/auth/verify`
- **Auth:** None (Public)
- **Rate Limit:** Max 5 wrong attempts per email per 15 minutes.
- **Request Body (`application/json`):**
  - `email` *(string, required)*: Registered email address.
  - `code` *(string, required)*: Verification code (`000000` in dev mode for demo emails).
- **Success (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.example_merchant_token"
}
```
- **Errors:**
  - `400 Bad Request`: `{"error": "Email and verification code are required"}`
  - `401 Unauthorized`: `{"error": "Invalid verification code"}`
  - `429 Too Many Requests`: `{"error": "Too many failed verification attempts. Please wait 15 minutes."}`
  - `500 Internal Server Error`: `{"error": "Auth service not configured"}`

---

### 11. Merchant Profile & Status
`GET /api/merchant/me`
- **Auth:** Merchant (`Authorization: Bearer <token>`)
- **Rate Limit:** None
- **Success (200 OK):**
```json
{
  "id": "9b1c114e-cd84-412d-abae-c1800353f091",
  "name": "Docs Example Cafe",
  "shopName": "Docs Example Cafe",
  "category": "cafe",
  "email": "docs-merchant@tirfmarket.et",
  "ownerName": "Abebe Kebede",
  "ownerPhone": "251933112233",
  "mpesaPhone": "251933112233",
  "licenseNumber": "LIC-DOCS-001",
  "storefrontPhotoPath": "merchants/photo-123.png",
  "status": "approved",
  "rejectionReason": null,
  "approvedAt": "2026-10-17T07:13:00.000Z",
  "createdIp": "127.0.0.1",
  "lat": 9.006,
  "lon": 38.786,
  "createdAt": "2026-10-17T07:13:00.000Z"
}
```
- **Errors:**
  - `401 Unauthorized`: `{"error": "Unauthorized: missing authorization header"}`
  - `401 Unauthorized`: `{"error": "Unauthorized: missing bearer token"}`
  - `401 Unauthorized`: `{"error": "Unauthorized: invalid or expired session token"}`
  - `401 Unauthorized`: `{"error": "Unauthorized: invalid token"}`
  - `401 Unauthorized`: `{"error": "Merchant account not found"}`

---

### 12. Create Merchant Deal
`POST /api/merchant/deals`
- **Auth:** Merchant (`Authorization: Bearer <token>`, requires `status === 'approved'`)
- **Rate Limit:** 20 creations per hour per merchant.
- **Request Body (`application/json`):**
  - `title` *(string, required)*: 3 to 80 characters.
  - `price` *(integer, required)*: Integer between 1 and 100,000 ETB.
  - `discountPct` *(integer, required)*: Integer between 1 and 90 (max 50 for new merchants).
  - `expiryDate` *(string ISO timestamp, required)*: Future date within 30 days (max 7 days for new merchants).
- **Success (201 Created):**
```json
{
  "id": "6f5a7b45-124e-4f57-8099-9f9a6ee751ba",
  "merchantId": "9b1c114e-cd84-412d-abae-c1800353f091",
  "merchantName": "Docs Example Cafe",
  "category": "cafe",
  "title": "Docs Special Latte & Croissant",
  "price": 180,
  "discountPct": 20,
  "finalAmount": 144,
  "expiryDate": "2026-10-22T07:13:00.000Z",
  "isActive": true,
  "reportCount": 0,
  "createdAt": "2026-10-17T07:13:00.000Z"
}
```
- **Errors:**
  - `400 Bad Request`:
    - `{"error": "title must be between 3 and 80 characters"}`
    - `{"error": "price must be an integer between 1 and 100000"}`
    - `{"error": "discountPct must be an integer between 1 and 90"}`
    - `{"error": "expiryDate must be a valid ISO date string"}`
    - `{"error": "expiryDate must be in the future"}`
    - `{"error": "expiryDate must be within 30 days"}`
    - `{"error": "New merchants can offer a maximum discount of 50%"}`
    - `{"error": "New merchants can set deal expiry up to 7 days only"}`
    - `{"error": "New merchants are limited to 3 active deals"}`
  - `401 Unauthorized`: (Missing or invalid Bearer token)
  - `403 Forbidden`: `{"error": "Merchant is not approved", "status": "pending"}`
  - `429 Too Many Requests`: `{"error": "Deal creation limit reached (maximum 20 deals per hour)"}`

---

### 13. List Merchant's Own Deals
`GET /api/merchant/deals`
- **Auth:** Merchant (`Authorization: Bearer <token>`, requires `status === 'approved'`)
- **Rate Limit:** None
- **Success (200 OK):**
```json
[
  {
    "id": "6f5a7b45-124e-4f57-8099-9f9a6ee751ba",
    "merchantId": "9b1c114e-cd84-412d-abae-c1800353f091",
    "merchantName": "Docs Example Cafe",
    "category": "cafe",
    "title": "Docs Special Latte & Croissant",
    "price": 180,
    "discountPct": 20,
    "finalAmount": 144,
    "expiryDate": "2026-10-22T07:13:00.000Z",
    "isActive": true,
    "reportCount": 0,
    "createdAt": "2026-10-17T07:13:00.000Z"
  }
]
```
- **Errors:**
  - `401 Unauthorized`
  - `403 Forbidden`: `{"error": "Merchant is not approved", "status": "pending"}`

---

### 14. Pause or Resume a Deal
`PATCH /api/merchant/deals/:id`
- **Auth:** Merchant (`Authorization: Bearer <token>`, requires `status === 'approved'`)
- **Path Parameter:** `:id` (Deal UUID)
- **Request Body (`application/json`):**
  - `isActive` *(boolean, required)*: `true` to activate/resume, `false` to pause.
- **Success (200 OK):**
```json
{
  "id": "6f5a7b45-124e-4f57-8099-9f9a6ee751ba",
  "merchantId": "9b1c114e-cd84-412d-abae-c1800353f091",
  "merchantName": "Docs Example Cafe",
  "category": "cafe",
  "title": "Docs Special Latte & Croissant",
  "price": 180,
  "discountPct": 20,
  "finalAmount": 144,
  "expiryDate": "2026-10-22T07:13:00.000Z",
  "isActive": false,
  "reportCount": 0,
  "createdAt": "2026-10-17T07:13:00.000Z"
}
```
- **Errors:**
  - `400 Bad Request`: `{"error": "isActive must be a boolean"}`
  - `401 Unauthorized`
  - `403 Forbidden`
  - `404 Not Found`: `{"error": "Deal not found"}`

---

### 15. Deactivate Deal
`DELETE /api/merchant/deals/:id`
- **Auth:** Merchant (`Authorization: Bearer <token>`, requires `status === 'approved'`)
- **Path Parameter:** `:id` (Deal UUID)
- **Behavior:** Soft-deactivates the deal by setting `isActive = false`.
- **Success (200 OK):**
```json
{
  "ok": true
}
```
- **Errors:**
  - `401 Unauthorized`
  - `403 Forbidden`
  - `404 Not Found`: `{"error": "Deal not found"}`

---

### 16. Merchant Dashboard Stats
`GET /api/merchant/stats`
- **Auth:** Merchant (`Authorization: Bearer <token>`, requires `status === 'approved'`)
- **Rate Limit:** None
- **Success (200 OK):**
```json
{
  "merchantId": "9b1c114e-cd84-412d-abae-c1800353f091",
  "dealsRedeemed": 1,
  "cashlessSales": 144,
  "pending": 0,
  "failed": 0,
  "recent": [
    {
      "orderId": "e037b51b-0925-4127-b08e-5b2326b47c0b",
      "dealTitle": "Docs Special Latte & Croissant",
      "amount": 144,
      "receipt": "MOCKFORCED",
      "paidAt": "2026-10-17T07:13:04.000Z"
    }
  ]
}
```
- **Errors:**
  - `401 Unauthorized`
  - `403 Forbidden`
  - `500 Internal Server Error`: `{"error": "Failed to fetch merchant stats"}`

---

### 17. Redeem Customer Deal Code
`POST /api/merchant/redeem`
- **Auth:** Merchant (`Authorization: Bearer <token>`, requires `status === 'approved'`)
- **Rate Limit:** None
- **Request Body (`application/json`):**
  - `code` *(string, required)*: Redemption code presented by customer at counter.
- **Success (200 OK):**
```json
{
  "orderId": "e037b51b-0925-4127-b08e-5b2326b47c0b",
  "dealTitle": "Docs Special Latte & Croissant",
  "itemCode": null,
  "amount": 144,
  "redeemedAt": "2026-10-18T07:13:00.000Z"
}
```
- **Errors:**
  - `400 Bad Request`: `{"error": "Redemption code is required"}`
  - `401 Unauthorized`: `{"error": "Unauthorized: missing authorization header"}`
  - `403 Forbidden`: `{"error": "Merchant is not approved"}`
  - `404 Not Found`: `{"error": "Code not found for this shop"}`
  - `409 Conflict`: `{"error": "This code was already used"}`
  - `500 Internal Server Error`: `{"error": "Failed to redeem code"}`

---

## Not for the Frontend (Admin & Webhook Routes)

These endpoints are strictly for internal administration and Safaricom payment webhooks. The customer/merchant frontend should not call them.

| Method | Path | Auth Header | Description |
|---|---|---|---|
| GET | `/admin`, `/admin/` | None (Server requires `ADMIN_KEY` configured) | Serves admin console HTML (`public/admin.html`) with `X-Robots-Tag: noindex, nofollow` |
| GET | `/admin.js` | None (Server requires `ADMIN_KEY` configured) | Serves admin script (`public/admin.js`) |
| GET | `/api/admin/merchants` | `x-admin-key: <key>` | Lists merchants by status query `?status=pending\|approved\|suspended\|rejected` |
| POST | `/api/admin/merchants/:id/approve` | `x-admin-key: <key>` | Approves a merchant account |
| POST | `/api/admin/merchants/:id/reject` | `x-admin-key: <key>` | Rejects merchant with body `{ "reason": "..." }` |
| POST | `/api/admin/merchants/:id/suspend` | `x-admin-key: <key>` | Suspends an approved merchant with body `{ "reason": "..." }` |
| GET | `/api/admin/flagged-deals` | `x-admin-key: <key>` | Lists deals with 3 or more reports |
| POST | `/mpesa/callback/:secret` | URL Param `:secret` | Webhook called asynchronously by Safaricom M-PESA servers |
| GET | `/api/merchants/:id/stats` | None | Deprecated public route. Disabled by default (`ALLOW_PUBLIC_STATS=false`), returns 404 |
