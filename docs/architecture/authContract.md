# SmartPay Malawi — Frontend API Contract

**Document:** Authentication API  
**Backend:** NestJS REST API  
**Frontend:** Separate React application  
**Base URL (development):** `http://localhost:3000`  
**Authentication:** JWT stored in an HTTP-only cookie  
**API prefix:** None, unless configured elsewhere in the backend

## 1. Authentication overview

SmartPay uses cookie-based JWT authentication.

After a merchant logs in successfully, the backend sends an `access_token` cookie. The browser stores the cookie and sends it automatically with eligible requests when credentials are enabled.

The frontend must **not**:

- Store the JWT in `localStorage` or `sessionStorage`.
- Expect the JWT in the login response body.
- Attempt to read the HTTP-only cookie using JavaScript.
- Assume that a merchant is authenticated simply because a login screen was submitted successfully.

The frontend must:

- Send credentialed requests to the backend.
- Call `GET /auth/me` when the application loads to restore the authentication state.
- Treat a successful `/auth/me` response as authenticated.
- Treat a `401 Unauthorized` response as unauthenticated.
- Clear the frontend's in-memory merchant state after logout.

## 2. API endpoints

| Method | Endpoint | Purpose | Authentication |
|---|---|---|---|
| POST | `/auth/register` | Register a merchant | Not required |
| POST | `/auth/login` | Authenticate a merchant and set the cookie | Not required |
| GET | `/auth/me` | Retrieve the authenticated merchant identity | Required |
| POST | `/auth/logout` | Clear the authentication cookie | Not required to clear the cookie |

### 2.1 Register merchant

**Request**

`POST /auth/register`

Content-Type: `application/json`

```json
{
  "name": "Example Business",
  "email": "merchant@example.com",
  "password": "ExamplePassword123!",
  "phone": "+265991234567"
}
```

The request fields are:

- `name`: Merchant or business name.
- `email`: Merchant email address.
- `password`: Password supplied during registration.
- `phone`: Merchant contact number.

**Successful response**

The current backend returns the registration message and email. Standardize the message text before treating its exact wording as a permanent contract.

```json
{
  "message": "Registration successful",
  "email": "merchant@example.com"
}
```

**Expected errors**

- `400 Bad Request`: Invalid request data, if DTO validation rejects it.
- `409 Conflict`: Email is already registered.

Registration does not automatically establish a login session. The frontend should direct the merchant to log in unless the backend is deliberately changed to authenticate immediately after registration.

### 2.2 Login

**Request**

`POST /auth/login`

Content-Type: `application/json`

```json
{
  "email": "merchant@example.com",
  "password": "ExamplePassword123!"
}
```

**Successful response**

HTTP `200 OK`

```json
{
  "message": "Login successful"
}
```

The backend also sends a `Set-Cookie` response header containing the `access_token` cookie.

The JWT is not returned in the JSON response.

**Expected errors**

- `400 Bad Request`: Invalid request data, if DTO validation rejects it.
- `401 Unauthorized`: Invalid email or password.

After successful login, the frontend should request `GET /auth/me` to obtain the authenticated merchant identity.

### 2.3 Get current merchant

**Request**

`GET /auth/me`

The browser must send the authentication cookie. The backend protects this endpoint using `JwtAuthGuard`.

**Successful response**

HTTP `200 OK`

```json
{
  "userId": "0664cc3a-5a3e-43ec-8fd3-9f04ed3cf31d",
  "email": "merchant@example.com"
}
```

This is the current identity payload returned by the backend. Additional profile fields can be added later through an agreed API change.

**Expected errors**

- `401 Unauthorized`: Cookie is missing, JWT is invalid, or JWT has expired.

**Frontend behavior**

On application startup or page refresh:

1. Show a loading state while checking the session.
2. Call `GET /auth/me`.
3. If successful, set the merchant as authenticated.
4. If the response is `401`, set the merchant as unauthenticated and show the login screen or public page.
5. Handle network errors separately from authentication failures.

A network failure should not automatically be treated as proof that the session has expired.

### 2.4 Logout

**Request**

`POST /auth/logout`

No request body is required.

**Successful response**

HTTP `200 OK`

```json
{
  "message": "Logged out successfully"
}
```

The backend must clear the `access_token` cookie using matching cookie settings.

**Frontend behavior**

After a successful logout response:

1. Clear the in-memory merchant identity.
2. Update the UI to the logged-out state.
3. Navigate to the public page or login screen.

The frontend must not assume that clearing its own state removes the browser cookie; the backend is responsible for clearing it.

**Note:** Cookie removal does not revoke a previously copied JWT. The current access-token design relies on expiry unless server-side revocation is implemented.

## 3. Cookie configuration

The backend currently intends to use these settings:

| Property | Value | Purpose |
|---|---|---|
| Name | `access_token` | Cookie containing the JWT |
| `httpOnly` | `true` | Prevents JavaScript from reading the token |
| `secure` | `false` in local development; `true` in production | Requires HTTPS in production |
| `sameSite` | `lax` | Provides some cross-site request protection |
| `path` | `/` | Makes the cookie available throughout the API host |
| `maxAge` | 15 minutes | Cookie lifetime |

The JWT itself must also expire after 15 minutes to match the intended access-token lifetime.

A cookie does not make the session permanent. Refresh-token support is a separate future enhancement.

## 4. Required frontend request configuration

All requests that need to send or receive the authentication cookie must include browser credentials.

For `fetch`, use:

```javascript
credentials: 'include'
```

This applies to login, session restoration, logout, and any protected endpoint that uses cookie authentication.

The frontend must use the correct API base URL:

- **Development:** `http://localhost:3000`
- **Production:** The deployed SmartPay API URL agreed by the team.

The backend must allow the exact frontend origin through CORS and enable credentials. Credentialed CORS cannot use `Access-Control-Allow-Origin: *`.

## 5. Error-handling contract

| HTTP status | Meaning | Suggested frontend behavior |
|---|---|---|
| `200 OK` | Request succeeded | Process the response |
| `201 Created` | Resource created, such as registration under NestJS defaults | Process the response |
| `400 Bad Request` | Invalid request data | Display validation feedback |
| `401 Unauthorized` | Missing, invalid, or expired authentication | Treat as unauthenticated for protected requests |
| `409 Conflict` | Duplicate email during registration | Ask the user to use another email or log in |
| `500 Internal Server Error` | Unexpected backend failure | Show a generic error and allow retry |

The frontend should not expose raw backend stack traces or sensitive server error details to users.

## 6. Current scope and future enhancements

The current authentication contract covers merchant registration, login, identity restoration, and logout.

Not yet included in this contract:

- Refresh-token rotation and revocation.
- Password reset and email verification.
- Merchant profile updates.
- Merchant approval/status endpoints.
- API-key management.
- Payment creation, checkout, transaction status, and webhook management.

These should be documented as separate API contracts when the backend endpoints are designed.

## 7. Acceptance tests

The frontend/backend integration is ready for initial testing when:

- [ ] A merchant can register successfully.
- [ ] Duplicate registration returns `409 Conflict`.
- [ ] Valid login sets the HTTP-only cookie.
- [ ] Invalid login returns `401 Unauthorized`.
- [ ] `/auth/me` returns the merchant identity with a valid cookie.
- [ ] Refreshing the page restores the merchant identity when the JWT is still valid.
- [ ] Missing or expired authentication returns `401` on protected endpoints.
- [ ] Logout clears the cookie.
- [ ] `/auth/me` returns `401` after logout.
- [ ] The browser sends cookies correctly from the configured React origin.

**Security note:** Before production, implement and test an explicit CSRF protection strategy for state-changing cookie-authenticated endpoints. Confirm cookie settings for the actual production domain and HTTPS deployment.