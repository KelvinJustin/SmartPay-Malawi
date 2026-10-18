# Merchants Module

## 1. Overview

The `merchants` module manages merchant business profiles and the initial Know Your Customer (KYC) application workflow for Solaris Malawi.

It allows authenticated merchants to:

- Retrieve their business profile and uploaded document records.
- Update their business details while preparing an application.
- Submit their application for administrative review.
- Correct and resubmit an application after rejection.

The module uses NestJS, Prisma, and PostgreSQL. It relies on the existing merchant authentication system to identify the merchant making each request.

**Important:** This module currently manages profile data and document records. It does not implement the actual document upload or cloud-storage workflow.

## 2. Responsibilities

The module is responsible for:

- Retrieving the authenticated merchant's profile.
- Updating editable business profile fields.
- Enforcing profile status restrictions.
- Checking required document types before submission.
- Validating business name and business type.
- Transitioning eligible profiles to `SUBMITTED`.
- Recording profile status transitions in `MerchantReviewHistory`.
- Using a database transaction to keep submission and its audit record consistent.

Administrator review, approval, and rejection are handled by the separate `admin` module.

## 3. Endpoints

All endpoints use the `/v1` API prefix and require merchant authentication through `JwtAuthGuard`.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/v1/merchants/profile` | Retrieve the current merchant's profile and documents |
| PATCH | `/v1/merchants/profile` | Update editable profile details |
| POST | `/v1/merchants/profile/submit` | Submit the application for review |

The controller obtains the merchant ID through `@CurrentUser('userId')`. The client does not need to send a merchant ID in the request body or URL.

### 3.1 Get Merchant Profile

**Endpoint**

`GET {{baseUrl}}/v1/merchants/profile`

**Request body:** None.

**Authentication:** Required.

**Purpose**

Retrieves the authenticated merchant's profile, including its associated document records.

**Successful response — HTTP 200**

The returned profile includes fields from the `MerchantProfile` database model and a `documents` array.

The exact fields depend on the Prisma schema and the records in the database. For example, the response may include:

```json
{
  "merchantId": "merchant-uuid",
  "businessName": "Example Trading",
  "businessType": "SOLE_TRADER",
  "accountStatus": "PENDING_SUBMISSION",
  "documents": []
}
```

This is an illustrative response, not a guarantee of the exact field set or values.

If no profile exists, the service returns HTTP 404 Not Found.

### 3.2 Update Merchant Profile

**Endpoint**

`PATCH {{baseUrl}}/v1/merchants/profile`

**Request headers**

`Content-Type: application/json`

**Request body**

The request must contain fields accepted by `UpdateProfileDto`. For example, assuming these fields are permitted by the DTO:

```json
{
  "businessName": "Example Trading",
  "businessType": "SOLE_TRADER"
}
```

Only send fields supported by the actual DTO and its validation rules.

**Purpose**

Updates the authenticated merchant's editable profile fields.

**Profile status restrictions**

Profile updates are permitted only when the application is in one of these states:

- `PENDING_SUBMISSION`
- `REJECTED`

Updates are rejected for profiles in other states. Merchants cannot use this endpoint to change approval-related fields such as `accountStatus`, `approvedAt`, or `approvedById`.

**Possible responses**

- `200 OK` — profile updated.
- `400 Bad Request` — profile status does not permit editing, or the DTO fails validation.
- `401 Unauthorized` — authentication is missing or invalid.
- `404 Not Found` — profile does not exist.

### 3.3 Submit Merchant Application

**Endpoint**

`POST {{baseUrl}}/v1/merchants/profile/submit`

**Request body:** None.

**Authentication:** Required.

**Purpose**

Validates the merchant's profile and document records, then submits the application for administrative review.

**Submission requirements**

Before submission, the service verifies that:

1. A profile exists.
2. The profile status is `PENDING_SUBMISSION` or `REJECTED`.
3. A business type has been selected.
4. A non-empty business name has been provided.
5. Required document types have been uploaded and have not been rejected or expired.
6. Required documents have not passed their recorded expiry dates.

Pending documents may satisfy the initial submission check. They do not automatically qualify for application approval: administrators must verify the documents as part of the review workflow.

**Successful response — HTTP 200**

The service returns the updated profile after changing its status to `SUBMITTED`.

**Status transitions**

```text
PENDING_SUBMISSION ──> SUBMITTED

REJECTED ────────────> SUBMITTED
```

During the transaction, the service:

1. Conditionally updates the profile status.
2. Sets `submittedAt`.
3. Clears the previous `rejectionReason`.
4. Creates a `MerchantReviewHistory` entry.
5. Returns the updated profile.

If the status changes before the update succeeds, the operation is rejected rather than silently overwriting the competing change.

## 4. Business Types and Document Requirements

The document policy helper in `document-requirements.ts` defines required and optional document types for each business category.

| Business type | Required documents | Optional documents |
|---|---|---|
| `INDIVIDUAL` | National ID front and back | Tax certificate, proof of address |
| `SOLE_TRADER` | National ID front and back | Business registration, tax certificate, proof of address |
| `PARTNERSHIP` | National ID front and back, business registration | Tax certificate, proof of address, director ID |
| `LIMITED_COMPANY` | National ID front and back, business registration, tax certificate, director ID | Proof of address |
| `NGO` | National ID front and back, business registration, director ID | Tax certificate, proof of address |

The `getDocumentRequirements()` helper returns copies of the required and optional arrays to prevent callers from accidentally modifying the underlying policy.

Submission validation uses `getDocumentRequirements()` as the shared source of required document types, consistent with admin approval.

These are initial development rules, not definitive legal requirements for Malawi. Confirm the final policy with the relevant compliance and legal stakeholders before production use.

## 5. Document Validation Rules

The current submission implementation considers a document eligible for satisfying a required type when:

- Both `supersededAt` and `supersededByDocumentId` are null.
- Its status is not `REJECTED`.
- Its status is not `EXPIRED`.
- It has no expiry date, or its expiry date is in the future.

This means a document with status `PENDING` can satisfy the submission-stage check.

Superseded documents are excluded from submission validation, consistent with admin approval. They remain in the database for history and do not satisfy required document types.

The service validates document records; it does not prove that a real file exists, is authentic, or has been securely stored.

## 6. Application Lifecycle

The merchant module supports the initial submission and resubmission stages.

```text
PENDING_SUBMISSION
        |
        | Merchant submits application
        v
    SUBMITTED
        |
        | Administrator starts review
        v
   UNDER_REVIEW
      /     \
     /       \
 APPROVED   REJECTED
                |
                | Merchant corrects application
                | and resubmits
                v
            SUBMITTED
```

The `admin` module is responsible for starting reviews, approving applications, and rejecting applications.

A merchant cannot directly set the profile status to `APPROVED` or `UNDER_REVIEW` through the profile update endpoint.

## 7. Review History and Transactions

The service creates `MerchantReviewHistory` entries when a merchant successfully submits or resubmits an application.

Each submission history entry records:

- The profile ID.
- The previous status.
- The new status.
- The actor type (`MERCHANT`).
- The actor ID.

The profile update and review-history creation occur within one Prisma transaction. This ensures that either both operations commit or both roll back if an operation fails.

The history model is also used by the admin workflow to record review, approval, and rejection transitions.

## 8. Testing with Bruno

Set your Bruno environment variable:

```text
baseUrl = http://localhost:3000
```

Adjust the value to match your running API.

### Test 1 — Retrieve Profile

- Method: `GET`
- URL: `{{baseUrl}}/v1/merchants/profile`
- Body: None.

Log in as a merchant first and ensure Bruno sends the merchant authentication cookie.

Verify that the correct merchant's profile and documents are returned.

### Test 2 — Update Profile

- Method: `PATCH`
- URL: `{{baseUrl}}/v1/merchants/profile`
- Body: JSON.

Example:

```json
{
  "businessName": "Example Trading",
  "businessType": "SOLE_TRADER"
}
```

Use a merchant whose profile is in `PENDING_SUBMISSION` or `REJECTED`, and ensure the fields are accepted by `UpdateProfileDto`.

Verify that the profile changes are persisted.

### Test 3 — Submit Application

- Method: `POST`
- URL: `{{baseUrl}}/v1/merchants/profile/submit`
- Body: None.

Before submitting, ensure that the profile has a business name, a business type, and all required document records for the current submission policy.

Verify that the status changes to `SUBMITTED` and that a corresponding review-history record is created.

### Test 4 — Submission with Missing Requirements

Attempt to submit a profile without a business type, business name, or required document.

Verify that the request fails with HTTP 400 Bad Request and that the profile status does not change.

### Test 5 — Update After Submission

Attempt to update a profile whose status is `SUBMITTED` or `UNDER_REVIEW`.

Verify that the request fails with HTTP 400 Bad Request.

### Test 6 — Resubmit a Rejected Application

Use a profile with status `REJECTED`.

1. Update the permitted business details.
2. Ensure the required document records are valid.
3. Submit the application again.
4. Verify that its status becomes `SUBMITTED`, the old rejection reason is cleared, and a new review-history entry is created.

### Test 7 — Unauthenticated Access

Call any merchant endpoint without a valid authentication cookie.

Verify that the request returns HTTP 401 Unauthorized.

### Test 8 — Transaction Rollback

Using an integration test with a real test database, deliberately cause the review-history insertion to fail during submission.

Verify that the profile status remains unchanged and that no partial submission is committed.

Mock-based unit tests alone cannot prove PostgreSQL transaction rollback behaviour.

## 9. Current Scope and Limitations

The module currently handles profile retrieval, editing, and submission, including validation that excludes superseded documents. It does not yet provide:

- Document upload endpoints.
- Cloud object-storage integration.
- File type, size, and content validation.
- Malware scanning.
- Merchant-facing document replacement endpoints; supersession is already supported in document records and submission validation.
- Merchant-facing document status management.
- Merchant-facing rejection feedback workflows beyond profile retrieval and resubmission.
- A definitive, compliance-approved Malawi KYC document policy.

These should be implemented or confirmed as the project progresses.

## 11. Summary

The `merchants` module provides the initial business-profile and KYC submission workflow for Solaris Malawi. It controls when merchants may edit their profiles, checks required document records, and records successful application submissions transactionally.

Administrator review and final approval remain separate responsibilities. Submission and admin approval use the shared document policy and exclude superseded documents. Pending current documents may satisfy submission requirements, while approval requires approved current documents.
