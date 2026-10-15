# SmartPay Malawi — Merchant API Reference

> **Auth:** All endpoints require a valid JWT sent as an `httpOnly` cookie (`access_token`) or `Authorization: Bearer <token>` header.

---

## How Authentication Works

After login or email verification, the server sets an `httpOnly` cookie called `access_token`. Every subsequent request sends it automatically. If you are testing in Postman, copy the token and send it as `Authorization: Bearer <token>` instead.

---

---

## Account Endpoints

### DELETE /auth/account

Soft-deletes the authenticated merchant's account. The account is marked as deleted but no data is removed — financial records, audit trails, and KYC documents are preserved for reconciliation.

After deletion:
- All future requests with the existing JWT are immediately rejected
- The merchant profile is suspended so it cannot be approved or used for payouts
- The account cannot be recovered through the API

**Request:** No body needed.

**Response 200:**
```json
{
  "message": "Account deleted successfully"
}
```

**Errors:**
| Status | Message | Reason |
|--------|---------|--------|
| 401 | Unauthorized | JWT missing or expired |
| 401 | Account not found | Account already deleted |

## Profile Endpoints

### GET /merchants/profile

Fetch the authenticated merchant's full profile including their uploaded documents and settlement accounts.

**Request:** No body needed.

**Response 200:**
```json
{
  "id": "7b8f9e01-1234-4a5b-8c6d-9e0f1a2b3c4d",
  "merchantId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "businessName": "",
  "tradingName": null,
  "businessType": "INDIVIDUAL",
  "businessRegistrationNo": null,
  "taxIdentificationNo": null,
  "merchantCategoryCode": null,
  "industryDescription": null,
  "supportEmail": null,
  "supportPhone": null,
  "websiteUrl": null,
  "addressLine1": null,
  "addressLine2": null,
  "city": null,
  "district": null,
  "country": "MW",
  "logoUrl": null,
  "accountStatus": "PENDING_SUBMISSION",
  "rejectionReason": null,
  "approvedAt": null,
  "approvedById": null,
  "submittedAt": null,
  "createdAt": "2026-10-15T01:30:00.000Z",
  "updatedAt": "2026-10-15T01:30:00.000Z",
  "documents": [],
  "settlementAccounts": []
}
```

**Errors:**
| Status | Message | Reason |
|--------|---------|--------|
| 401 | Unauthorized | JWT missing or expired |
| 404 | Profile not found | Profile row missing — should not happen after registration |

---

### PATCH /merchants/profile

Update any business details on the profile. All fields are optional — only send what you want to change. Approval fields (`accountStatus`, `approvedAt`, `rejectionReason`) are ignored even if sent — only admins control those.

**Request body (send only the fields you want to change):**
```json
{
  "businessName": "Lakeview Retailers Ltd",
  "tradingName": "Lakeview Supermarket",
  "businessType": "LIMITED_COMPANY",
  "businessRegistrationNo": "CO-2024-98712",
  "taxIdentificationNo": "TPIN-20039182",
  "merchantCategoryCode": "5411",
  "industryDescription": "Grocery Stores and Supermarkets",
  "supportEmail": "support@lakeview.mw",
  "supportPhone": "+265991234567",
  "websiteUrl": "https://lakeview.mw",
  "addressLine1": "Victoria Avenue, Plot 14",
  "addressLine2": "Shop 4, Ground Floor",
  "city": "Blantyre",
  "district": "Blantyre"
}
```

**Field reference:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| businessName | string | No | Max 100 chars |
| tradingName | string | No | Customer-facing brand name |
| businessType | enum | No | `INDIVIDUAL`, `SOLE_TRADER`, `PARTNERSHIP`, `LIMITED_COMPANY`, `NGO` |
| businessRegistrationNo | string | No | Registrar of Companies number |
| taxIdentificationNo | string | No | MRA TPIN |
| merchantCategoryCode | string | No | 4-digit ISO MCC e.g. `5411` for grocery |
| industryDescription | string | No | Plain description of business activity |
| supportEmail | string | No | Must be valid email format |
| supportPhone | string | No | Malawian number e.g. `+265991234567` |
| websiteUrl | string | No | Must be valid URL |
| addressLine1 | string | No | Street / building |
| addressLine2 | string | No | Suite, floor, plot |
| city | string | No | e.g. Blantyre, Lilongwe |
| district | string | No | Malawian district |

**Response 200** — returns the full updated profile (same shape as GET above).

**Errors:**
| Status | Message | Reason |
|--------|---------|--------|
| 400 | Validation failed | Invalid field format e.g. bad email |
| 401 | Unauthorized | JWT missing or expired |
| 404 | Profile not found | Profile row missing |

---

### POST /merchants/profile/submit

Submit the profile for admin review. This is the merchant saying "I'm done, please check my documents." After this the profile moves to `SUBMITTED` status and waits for an admin to pick it up.

**Rules:**
- Only allowed from `PENDING_SUBMISSION` (first time) or `REJECTED` (resubmission after fixes)
- Required documents must be uploaded and not rejected before submission is allowed
- Required documents vary by `businessType`:

| Business Type | Required Documents |
|---------------|-------------------|
| INDIVIDUAL | `NATIONAL_ID_FRONT`, `NATIONAL_ID_BACK` |
| SOLE_TRADER | `NATIONAL_ID_FRONT`, `NATIONAL_ID_BACK`, `PROOF_OF_ADDRESS` |
| PARTNERSHIP | `BUSINESS_REGISTRATION`, `DIRECTOR_ID` |
| LIMITED_COMPANY | `BUSINESS_REGISTRATION`, `TAX_CERTIFICATE`, `DIRECTOR_ID` |
| NGO | `BUSINESS_REGISTRATION`, `TAX_CERTIFICATE` |

**Request:** No body needed.

**Response 200:**
```json
{
  "id": "7b8f9e01-1234-4a5b-8c6d-9e0f1a2b3c4d",
  "accountStatus": "SUBMITTED",
  "submittedAt": "2026-10-15T01:50:00.000Z",
  "rejectionReason": null,
  "...": "all other profile fields"
}
```

**Errors:**
| Status | Message | Reason |
|--------|---------|--------|
| 400 | Cannot submit from status: UNDER_REVIEW | Already submitted or approved |
| 400 | Cannot submit. The following required documents are missing or rejected: NATIONAL_ID_FRONT, NATIONAL_ID_BACK | Upload missing documents first |
| 401 | Unauthorized | JWT missing or expired |
| 404 | Profile not found | Profile row missing |

---

## Settlement Account Endpoints

### GET /merchants/settlement-accounts

List all payout destinations configured for the merchant.

**Request:** No body needed.

**Response 200:**
```json
[
  {
    "id": "e4a2d810-72cb-469b-98a2-2376189efb31",
    "profileId": "7b8f9e01-1234-4a5b-8c6d-9e0f1a2b3c4d",
    "method": "AIRTEL_MONEY",
    "isPrimary": true,
    "label": "Primary Airtel Float",
    "phoneNumber": "+265991234567",
    "bankName": null,
    "accountName": null,
    "accountNumber": null,
    "branchCode": null,
    "swiftCode": null,
    "isVerified": false,
    "verifiedAt": null,
    "createdAt": "2026-10-15T01:35:00.000Z",
    "updatedAt": "2026-10-15T01:35:00.000Z"
  }
]
```

**Errors:**
| Status | Message | Reason |
|--------|---------|--------|
| 401 | Unauthorized | JWT missing or expired |
| 404 | Profile not found | Profile row missing |

---

### POST /merchants/settlement-accounts

Add a new payout destination. The `method` field controls which other fields are required.

**Important:** Setting `isPrimary: true` automatically demotes all other accounts to non-primary. There can only ever be one primary account.

#### Mobile Money (Airtel Money or TNM Mpamba)

**Request body:**
```json
{
  "method": "AIRTEL_MONEY",
  "phoneNumber": "+265991234567",
  "label": "Main Airtel Float",
  "isPrimary": true
}
```

Use `"method": "TNM_MPAMBA"` for TNM numbers (`+26588...`).

**Field reference:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| method | enum | Yes | `AIRTEL_MONEY` or `TNM_MPAMBA` |
| phoneNumber | string | Yes | Malawian number |
| label | string | No | Friendly name e.g. "Main Airtel Float" |
| isPrimary | boolean | No | Demotes all others if true |

#### Bank Transfer

**Request body:**
```json
{
  "method": "BANK_TRANSFER",
  "bankName": "National Bank of Malawi",
  "accountName": "Lakeview Retailers Ltd",
  "accountNumber": "1002938475",
  "branchCode": "001",
  "label": "Corporate Account",
  "isPrimary": false
}
```

**Field reference:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| method | enum | Yes | `BANK_TRANSFER` |
| bankName | string | Yes | Full bank name |
| accountName | string | Yes | Name on the account |
| accountNumber | string | Yes | Account number |
| branchCode | string | No | Bank branch code |
| swiftCode | string | No | For future international payouts |
| label | string | No | Friendly name |
| isPrimary | boolean | No | Demotes all others if true |

**Response 201** — returns the created account object:
```json
{
  "id": "e4a2d810-72cb-469b-98a2-2376189efb31",
  "profileId": "7b8f9e01-1234-4a5b-8c6d-9e0f1a2b3c4d",
  "method": "AIRTEL_MONEY",
  "isPrimary": true,
  "label": "Main Airtel Float",
  "phoneNumber": "+265991234567",
  "bankName": null,
  "accountName": null,
  "accountNumber": null,
  "branchCode": null,
  "swiftCode": null,
  "isVerified": false,
  "verifiedAt": null,
  "createdAt": "2026-10-15T01:52:00.000Z",
  "updatedAt": "2026-10-15T01:52:00.000Z"
}
```

**Errors:**
| Status | Message | Reason |
|--------|---------|--------|
| 400 | Mobile money accounts require a phoneNumber | phoneNumber missing for Airtel or TNM |
| 400 | Bank transfers require bankName, accountName, and accountNumber | Required bank fields missing |
| 401 | Unauthorized | JWT missing or expired |
| 404 | Profile not found | Profile row missing |

---

### DELETE /merchants/settlement-accounts/:id

Remove a settlement account by its UUID. You can only delete your own accounts — the backend verifies ownership before deleting.

**Path parameter:** `id` — UUID of the settlement account.

**Request:** No body needed.

**Response 200:**
```json
{
  "message": "Settlement account removed"
}
```

**Errors:**
| Status | Message | Reason |
|--------|---------|--------|
| 401 | Unauthorized | JWT missing or expired |
| 404 | Settlement account not found | Account does not exist or belongs to another merchant |
| 404 | Profile not found | Profile row missing |

---

## Account Status Reference

| Status | Who Sets It | What It Means |
|--------|-------------|---------------|
| `PENDING_SUBMISSION` | System (on registration) | Default state. Merchant is filling in details and uploading documents |
| `SUBMITTED` | Merchant | Merchant has submitted for review. Profile is in the admin queue |
| `UNDER_REVIEW` | Admin | An admin has picked up the review and is actively checking documents |
| `APPROVED` | Admin | KYC passed. Merchant can process live payments |
| `REJECTED` | Admin | Documents or details failed review. `rejectionReason` explains why. Merchant can fix and resubmit |
| `SUSPENDED` | Admin | Account suspended after approval due to compliance or fraud concerns |

---

## Frontend Routing Guide

After login, call `GET /merchants/profile` and route based on `accountStatus`:

| accountStatus | Where to send the user |
|---------------|----------------------|
| `PENDING_SUBMISSION` | `/onboarding` — fill profile, upload documents, add settlement account, then submit |
| `SUBMITTED` | `/pending` — show "under review" banner, lock editing |
| `UNDER_REVIEW` | `/pending` — same as above |
| `APPROVED` | `/dashboard` — full access |
| `REJECTED` | `/onboarding` — show `rejectionReason` banner, allow edits and resubmission |
| `SUSPENDED` | `/suspended` — show suspension notice |
