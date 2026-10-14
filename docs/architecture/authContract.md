# SmartPay Malawi — Authentication API Contract

**Document:** Authentication API Contract
**Backend:** NestJS REST API
**Frontend:** Separate React application
**Development API URL:** `http://localhost:3000`
**Authentication:** JWT in an HTTP-only cookie

---

## 1. Authentication Overview

SmartPay uses a **two-step MFA flow** followed by cookie-based JWT authentication.

- **Step 1** (`POST /auth/login`): validates email/password and emails a one-time 6-digit code.
- **Step 2** (`POST /auth/verify-login`): validates the OTP and issues the `access_token` HTTP-only cookie.

Email must be verified via `POST /auth/verify-email` before login is permitted.

The JWT strategy accepts tokens from two sources: the `access_token` cookie, or an `Authorization: Bearer <token>` header. Browser clients should rely on the cookie.

### Endpoint Table

| Method | Endpoint | Purpose | Auth Required |
|---|---|---|---|
| `POST` | `/auth/register` | Create a merchant account | No |
| `POST` | `/auth/verify-email` | Verify email address with OTP | No |
| `POST` | `/auth/login` | Step 1: validate credentials, send OTP | No |
| `POST` | `/auth/verify-login` | Step 2: validate OTP, issue JWT cookie | No |
| `GET` | `/auth/me` | Retrieve current merchant identity | Yes |
| `POST` | `/auth/logout` | Clear the auth cookie | Yes |

All endpoints are protected by `ArcjetGuard` (rate limiting, bot detection) at the controller level. `/auth/me` stacks `ArcjetGuard` then `JwtAuthGuard` explicitly — order matters, Arcjet runs first.

### Frontend Security Requirements

The frontend must **not**:
- Store JWTs in `localStorage` or `sessionStorage`.
- Expect the JWT in a response body.
- Attempt to read the HTTP-only cookie via JavaScript.
- Assume authentication succeeded from step 1 of login alone — the cookie is only issued after step 2.

The frontend must:
- Include credentials on every request that sends or receives the cookie.
- Call `GET /auth/me` on application start to restore authentication state.
- Treat `401 Unauthorized` on any protected endpoint as an authentication failure.
- Clear in-memory merchant identity after logout.
- Distinguish authentication failures from network and server errors.

---

## 2. Endpoint Specifications

### 2.1 Register

**`POST /auth/register`**

**Request body:**
```json
{
  "name": "Example Business",
  "email": "merchant@example.com",
  "password": "ExamplePassword123!",
  "phone": "+265991234567"
}
```

**Successful response — `201 Created`:**
```json
{
  "message": "Registration successful. Check your email for the verification code.",
  "email": "merchant@example.com"
}
```

**Errors:**

| Status | Meaning |
|---|---|
| `400 Bad Request` | Validation failed |
| `409 Conflict` | Email or phone already registered |

**Frontend behavior:**
1. Validate fields before submitting.
2. On success, inform the merchant to check their email and redirect to the verify-email step.
3. Registration does not create an authenticated session.

---

### 2.2 Verify Email

**`POST /auth/verify-email`**

Must be completed before the merchant can log in.

**Request body:**
```json
{
  "email": "merchant@example.com",
  "code": "123456"
}
```

**Successful response — `200 OK`:**
```json
{
  "message": "Email verified successfully"
}
```

If the email is already verified, the backend returns `{ "message": "Email is already verified" }` — this is treated as success.

**Errors:**

| Status | Meaning |
|---|---|
| `400 Bad Request` | Validation failed |
| `401 Unauthorized` | Code invalid, expired, or 5 failed attempts reached |

**Notes:**
- Codes are valid for 10 minutes.
- After 5 failed attempts the challenge is locked — the merchant must re-register or request a new code.

---

### 2.3 Login — Step 1

**`POST /auth/login`**

Validates email and password, then emails a 6-digit OTP to the merchant. **No cookie is issued here.**

**Request body:**
```json
{
  "email": "merchant@example.com",
  "password": "ExamplePassword123!"
}
```

**Successful response — `201 Created`:**
```json
{
  "message": "Login verification code sent",
  "email": "merchant@example.com"
}
```

**Errors:**

| Status | Meaning |
|---|---|
| `400 Bad Request` | Validation failed |
| `401 Unauthorized` | Invalid credentials, or email not yet verified |
| `503 Service Unavailable` | OTP email could not be sent |

**Frontend behavior:**
1. Submit credentials with `credentials: 'include'`.
2. On success, advance the UI to the OTP entry step — do not navigate to the dashboard yet.
3. On `401`, display a generic invalid credentials message (do not distinguish "wrong password" from "no account").
4. On `503`, tell the merchant the code could not be sent and allow retry.

---

### 2.4 Login — Step 2 (Verify Login)

**`POST /auth/verify-login`**

Validates the OTP. On success the backend issues the `access_token` cookie.

**Request body:**
```json
{
  "email": "merchant@example.com",
  "code": "123456"
}
```

**Successful response — `201 Created`** + `Set-Cookie: access_token=<jwt>`:
```json
{
  "accessToken": "eyJ..."
}
```

> ⚠️ The `accessToken` field in the body is a known inconsistency — the contract intention is cookie-only delivery. The frontend should rely on the cookie and ignore the body token. Confirm with the backend team whether the body field will be removed.

**Errors:**

| Status | Meaning |
|---|---|
| `400 Bad Request` | Validation failed |
| `401 Unauthorized` | Code invalid, expired, or 5 failed attempts reached |

**Notes:**
- Codes expire after 10 minutes.
- After 5 failed attempts the challenge is locked.
- Calling `POST /auth/login` again invalidates any outstanding code and issues a fresh one.

**Frontend behavior:**
1. Submit with `credentials: 'include'`.
2. On success, call `GET /auth/me` to retrieve the merchant identity, then navigate to the dashboard.
3. Do not parse or store the `accessToken` body field — use the cookie.

---

### 2.5 Get Current Merchant

**`GET /auth/me`**

Returns the identity attached to the current JWT. Called on app start to restore session state.

**Successful response — `200 OK`:**
```json
{
  "userId": "0664cc3a-5a3e-43ec-8fd3-9f04ed3cf31d",
  "email": "merchant@example.com"
}
```

> Note: `jti` and `exp` are present in the JWT payload but are stripped by `JwtStrategy.validate()` before being attached to `request.user`. They are not returned here.

**Errors:**

| Status | Meaning |
|---|---|
| `401 Unauthorized` | Cookie missing, token invalid, token expired, or token revoked |
| `500 Internal Server Error` | Unexpected backend failure |

**Session restoration behavior:**
1. Show a loading state before the check completes.
2. Call `GET /auth/me` with `credentials: 'include'` on every app start / page refresh.
3. `200` → store the identity in memory, render the protected route.
4. `401` → mark session unauthenticated, render the public route.
5. Network or `5xx` error → handle separately; do not treat as a session expiry.

---

### 2.6 Logout

**`POST /auth/logout`**

Clears the `access_token` cookie. Requires a valid JWT.

> ⚠️ **Known issue:** The controller clears the cookie and returns early — it does not call `authService.logout()`, so the JWT is **not added to the revoked-token table**. A copied token remains usable until it expires naturally. Raise with the backend team.

**Successful response — `200 OK`:**
```json
{
  "message": "Logged out successfully"
}
```

**Errors:**

| Status | Meaning |
|---|---|
| `401 Unauthorized` | No valid JWT present |

**Frontend behavior:**
1. Send `POST /auth/logout` with `credentials: 'include'`.
2. On success, clear in-memory merchant identity and navigate to the login page.
3. Do not attempt to delete or overwrite the cookie from JavaScript.

---

## 3. Cookie Configuration

| Property | Development | Production |
|---|---|---|
| Name | `access_token` | `access_token` |
| `httpOnly` | `true` | `true` |
| `secure` | `false` | `true` |
| `sameSite` | `lax` | `lax` (confirm for deployment topology) |
| `path` | `/` | `/` |

Cookie lifetime and JWT expiration are separate controls — both must be configured to match the intended session duration.

---

## 4. Frontend Request Configuration

### 4.1 API Base URL

```env
VITE_API_URL=http://localhost:3000
```

```typescript
const API_URL = import.meta.env.VITE_API_URL;
```

### 4.2 Sending Credentials

All requests that send or receive the auth cookie must include:

```typescript
const response = await fetch(`${API_URL}/auth/me`, {
  method: 'GET',
  credentials: 'include',
});
```

Apply `credentials: 'include'` to: login (both steps), verify-email, session restoration, logout, and all protected API requests.

### 4.3 CORS Requirements

The backend must:
- Allow the exact frontend origin (e.g. `http://localhost:5173` in development).
- Enable credentialed requests (`Access-Control-Allow-Credentials: true`).
- Never use `Access-Control-Allow-Origin: *` for credentialed requests.

---

## 5. Error Handling

| Status | Meaning | Frontend behavior |
|---|---|---|
| `200 OK` | Success | Process response |
| `201 Created` | Resource created (NestJS POST default) | Process response |
| `400 Bad Request` | Validation failed | Display field errors |
| `401 Unauthorized` | Auth missing or invalid | Handle per endpoint |
| `409 Conflict` | Duplicate registration | Offer login or different email |
| `503 Service Unavailable` | OTP email send failed | Prompt retry |
| `500 Internal Server Error` | Unexpected failure | Generic error, allow retry |

---

## 6. Known Issues and Deviations from Original Contract

| # | Issue | Location |
|---|---|---|
| 1 | Login is two steps (step 1 + step 2); original contract described a single-step login | `POST /auth/login`, `POST /auth/verify-login` |
| 2 | `verifyLogin` returns `{ accessToken }` in the body alongside the cookie | `POST /auth/verify-login` |
| 3 | Controller logout does not call `authService.logout()` — revoked-token table is never written | `POST /auth/logout` |
| 4 | `jti` is absent from `request.user` but `authService.logout()` expects it — would panic if wired up | `AuthService.logout`, `AuthController.logout` |
| 5 | `verifyEmail` uses unguarded `update()` on failed attempts; `verifyLogin` uses the safer guarded `updateMany()` | `AuthService.verifyEmail` |

---

## 7. Scope

### Implemented and covered
- Merchant registration
- Email verification (OTP)
- Two-step MFA login
- Cookie-based JWT authentication
- Session restoration (`/auth/me`)
- Logout (cookie clearing)
- Token revocation table (implemented in service, not yet wired to controller)

### Not yet covered
- Password reset
- Refresh-token rotation and revocation
- Merchant profile updates
- Merchant approval and account-status management
- API-key management
- Payment creation and hosted checkout
- Transaction status and reconciliation
- Webhook management
- Merchant settlements and withdrawals

---

## 8. Acceptance Tests

- [ ] A merchant can register successfully.
- [ ] Invalid registration data returns `400`.
- [ ] Duplicate email or phone returns `409`.
- [ ] Unverified merchant cannot log in — receives `401`.
- [ ] Valid email verification code marks the account verified.
- [ ] Invalid or expired verification code returns `401`.
- [ ] Valid credentials trigger an OTP email (step 1).
- [ ] Invalid credentials return `401` with a generic message.
- [ ] Valid OTP issues the `access_token` cookie (step 2).
- [ ] Invalid or expired OTP returns `401`.
- [ ] 5 consecutive wrong OTPs lock the challenge.
- [ ] `/auth/me` returns merchant identity with a valid cookie.
- [ ] Page refresh restores session while the token is valid.
- [ ] Missing, invalid, or expired token returns `401` on protected endpoints.
- [ ] Logout clears the cookie.
- [ ] `/auth/me` returns `401` after logout.
- [ ] Network failures are handled separately from auth failures.
- [ ] Credentialed CORS works from the configured React origin.