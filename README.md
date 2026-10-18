 <p align="center">
  <img src="assets/logo.png" alt="SmartPay Malawi" width="500">
</p>

# SmartPay Malawi

**An API-first payment gateway under development for the Malawian digital economy.**

SmartPay Malawi is being developed to provide merchants with a unified integration point for accepting and managing digital payments through multiple payment providers. The long-term goal is to simplify payment integration while providing consistent transaction handling, merchant management, and settlement infrastructure.

The project currently focuses on its foundational backend: merchant authentication, business profile management, KYC onboarding, and administrator review workflows.

> **Development status:** Foundational backend implemented; payment processing and provider integrations are not yet implemented.

## Table of Contents

- [Overview](#overview)
- [Current Capabilities](#current-capabilities)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [API Overview](#api-overview)
- [Data Model](#data-model)
- [Testing](#testing)
- [Security](#security)
- [Documentation](#documentation)
- [Development Roadmap](#development-roadmap)
- [Repository](#repository)
- [License](#license)

## Overview

Payment integrations can require merchants to work with different provider APIs, authentication mechanisms, payment flows, callbacks, and transaction states.

SmartPay aims to abstract these differences behind a consistent API, initially focusing on Malawi's digital payment ecosystem, including Airtel Money and TNM Mpamba.

The application is being built as a **modular monolith** using NestJS, TypeScript, PostgreSQL, and Prisma.

The current development priority is to establish secure authentication, merchant onboarding, administrative controls, and reliable data management before implementing the payment-processing core.

## Current Capabilities

The following functionality is implemented in the current backend.

### Merchant authentication

- Merchant registration and password hashing.
- Email verification using one-time passwords (OTPs).
- Password-based login followed by email OTP verification.
- JWT-based authentication using HTTP-only cookies.
- Authenticated session retrieval and logout.
- Database-backed token revocation.

### Merchant profiles and KYC onboarding

- Automatic creation of a merchant profile during registration.
- Retrieval and updating of the authenticated merchant's business profile.
- Business types for individuals, sole traders, partnerships, limited companies, and NGOs.
- Business profile validation before submission.
- Business-type-specific required and optional KYC document policies.
- Submission validation that excludes rejected, expired, and superseded documents.
- Controlled profile status transitions.
- Review-history records for application status changes.
- Support for correcting and resubmitting rejected applications.

**Document upload limitation:** The backend manages KYC document records and validation, but the actual file-upload and cloud-storage workflow is not yet implemented.

### Administrator authentication and access control

- Separate administrator authentication, independent of merchant accounts.
- Internal administrator provisioning through a command-line script.
- Password verification and active-account checks.
- Short-lived JWT sessions stored in HTTP-only cookies.
- Database-backed administrator token revocation.
- Role-based authorization through NestJS guards and decorators.

The current administrator roles are:

| Role | Intended responsibility |
|---|---|
| `SUPER_ADMIN` | Platform administration |
| `COMPLIANCE` | Merchant KYC review and approval |
| `OPERATIONS` | Operational workflows |
| `SUPPORT` | Support access |

The merchant application endpoints currently authorize `SUPER_ADMIN` and `COMPLIANCE`. The existence of other roles does not mean their operational workflows have already been implemented.

### Administrator merchant review

- Paginated listing of merchant applications awaiting review or already under review.
- Retrieval of individual applications, associated documents, and review history.
- Transition from `SUBMITTED` to `UNDER_REVIEW`.
- Approval validation against business-type-specific document requirements.
- Rejection with a required reason.
- Exclusion of superseded documents from current-document eligibility checks.
- Conditional database updates to protect against concurrent status transitions.
- Transactional status changes and audit-history writes.

### Supporting infrastructure

- PostgreSQL integration through Prisma.
- Prisma schema and database migrations.
- SMTP-based email delivery.
- Arcjet request protection, including shield, bot detection, and rate limiting.
- A Docker-based development environment with a Redis service.
- Automated tests using Vitest.

Redis is included in the development infrastructure, but a complete application-level background-job workflow has not yet been implemented.

## Architecture

SmartPay uses a modular monolith: business responsibilities are separated into NestJS modules but run within one backend application.

### Current architecture

```text
                 Client Applications
                         |
                         v
                 NestJS API (/v1)
                         |
        +----------------+----------------+
        |                |                |
        v                v                v
      Auth            Merchants          Admin
        |                |                |
        |                |                v
        |                |             Admin Auth
        |                |                |
        +----------------+----------------+
                         |
                         v
                   Database Module
                         |
                         v
                PostgreSQL + Prisma

        Supporting modules:
        - Email / SMTP
        - Arcjet request protection
```

The application modules are registered through `src/app.module.ts`. The global API version prefix is `/v1`.

### Module responsibilities

| Module | Responsibility |
|---|---|
| `auth` | Merchant registration, email verification, login, session handling, and logout |
| `merchants` | Merchant profiles, KYC requirements, submission validation, and profile lifecycle |
| `admin-auth` | Administrator login, session handling, and logout |
| `admin` | Merchant application review, approval, rejection, and review-history recording |
| `database` | Prisma Client and PostgreSQL connection lifecycle |
| `email` | SMTP transport and outgoing verification and login emails |
| `arcjet` | Request protection and rate limiting |
| `scripts` | Internal operational scripts, including administrator provisioning |

### Planned payment architecture

The following is the intended direction, not a description of functionality that already exists.

```text
               Merchant Integration
                       |
                       v
                  SmartPay API
                       |
                       v
              Payment Orchestration
                       |
             +---------+---------+
             |                   |
             v                   v
       Provider Adapters    Transaction Store
             |
       +-----+------+
       |            |
       v            v
  Airtel Money   TNM Mpamba
       |
       v
 Provider Callbacks / Status Queries
       |
       v
 Reconciliation and Settlement
```

The payment orchestration layer, provider adapters, payment transaction lifecycle, webhook processing, and reconciliation workflows remain planned components.

## Technology Stack

### Backend

- **TypeScript** — application language.
- **NestJS 12** — modular backend framework.
- **Node.js 24** — JavaScript runtime.
- **PostgreSQL** — relational database.
- **Prisma 7** — ORM and schema/migration tooling.
- **Vitest** — automated testing.
- **Nodemailer** — SMTP email delivery.
- **Arcjet** — request protection.

### Development infrastructure

- **Docker** — containerized development.
- **Docker Compose** — API and Redis development services.
- **Redis** — development infrastructure for future caching and asynchronous workloads.
- **GitHub Actions** — CI workflow.

### Planned technologies and components

- React for separate merchant-facing and hosted-checkout interfaces.
- BullMQ for background job processing.
- Airtel Money and TNM Mpamba provider integrations.
- Payment transaction orchestration and idempotency.
- Webhook delivery, retries, and reconciliation.
- A robust ledger and settlement workflow.

The frontend is not currently part of the NestJS backend build. It will be developed and built separately.

## Project Structure

The current repository is organized into NestJS modules, Prisma schema and migrations, automated tests, and technical documentation.

```text
smart-pay-malawi/
├── src/
│   ├── admin/
│   │   ├── admin.controller.ts
│   │   ├── admin.service.ts
│   │   ├── admin.module.ts
│   │   └── *.spec.ts
│   ├── admin-auth/
│   │   ├── admin-auth.controller.ts
│   │   ├── admin-auth.service.ts
│   │   ├── admin-jwt-auth.guard.ts
│   │   ├── admin-roles.guard.ts
│   │   ├── admin-roles.decorator.ts
│   │   └── dto/
│   ├── auth/
│   ├── merchants/
│   │   ├── dto/
│   │   ├── document-requirements.ts
│   │   └── *.spec.ts
│   ├── database/
│   ├── email/
│   ├── arcjet/
│   ├── scripts/
│   │   └── create-admin.ts
│   ├── generated/
│   │   └── prisma/
│   ├── app.module.ts
│   └── main.ts
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── docs/
│   ├── architecture/
│   ├── api/
│   ├── business/
│   └── development/
├── test/
├── Dockerfile
├── docker-compose.yml
├── .dockerignore
├── .env.example
├── package.json
├── prisma7.config.ts
├── vitest.config.ts
└── README.md
```

Individual modules generally separate controllers, services, DTOs, guards, and tests according to their responsibilities.

The Prisma Client is generated into `src/generated/prisma/` according to the Prisma generator configuration. Generated files should be treated as build artifacts rather than hand-maintained source code.

## Getting Started

### Prerequisites

Install the following:

- Node.js 24 or a compatible Node.js 24+ release.
- npm.
- Git.
- Docker and Docker Compose, if using the containerized development environment.
- Access to a PostgreSQL database.

### Installation

Clone the repository:

```bash
git clone https://github.com/KelvinJustin/SmartPay-Malawi.git
cd SmartPay-Malawi
```

Install dependencies:

```bash
npm ci
```

If you intentionally change dependency versions and need to update the lockfile, use `npm install` instead.

### Environment configuration

Create a local environment file:

```bash
cp .env.example .env
```

On Windows PowerShell, use:

```powershell
Copy-Item .env.example .env
```

Configure the values required by the application and your selected development environment.

Important configuration includes:

- `DATABASE_URL` — PostgreSQL connection string.
- `PORT` and `NODE_ENV` — application runtime configuration.
- `JWT_SECRET` and the configured JWT expiry.
- `OTP_SECRET` — OTP HMAC secret.
- `ENCRYPTION_SALT` — bcrypt work factor, as read by the authentication code.
- SMTP settings — `SMTP_SERVER`, `SMTP_PORT`, `SMTP_USER`, `SMTP_API_KEY`, and `SMTP_FROM`.
- `ARCJET_KEY` — Arcjet API key.
- `FRONTEND_URL` — allowed frontend origin for credentialed CORS requests.

Use the exact variable names expected by the current application code. The environment example should be kept synchronized with those names.

> Never commit `.env` files, real credentials, API keys, private keys, JWT secrets, or production database connection strings.

### Start the API in development

Generate the Prisma Client if required:

```bash
npx prisma generate
npx prisma migrate deploy
```

Start NestJS in watch mode:

```bash
npm run start:dev
```

The API listens on the configured port, which defaults to `3000`. API routes use the `/v1` prefix.

### Start the Docker development environment

The repository contains a Docker Compose configuration for the API and Redis.

```bash
docker compose up --build
```

The API is exposed on port `3000`, and Redis is exposed on port `6379`. The application uses the `.env` file for environment configuration.

Stop the services with:

```bash
docker compose down
```

The development Compose setup mounts the source code into the API container and uses NestJS watch mode. It is a development environment, not a production deployment configuration.

PostgreSQL must also be reachable through the configured `DATABASE_URL`; the Compose file does not provision a PostgreSQL container.

### Build the backend

Compile the NestJS application:

```bash
npm run build
```

The compiled JavaScript is written to the configured build output directory, normally `dist/`.

To start the compiled backend:

```bash
npm run start:prod
```

A successful build does not deploy the application. Deployment requires a configured runtime environment, database, secrets, and any other required services.

## API Overview

All routes use the `/v1` prefix. Authentication is enforced through guards on protected endpoints.

### Merchant authentication

The `auth` module provides merchant registration and email-verification/login flows, including session retrieval and logout.

The authentication flow uses email OTP verification. Merchant registration is separate from administrator account provisioning.

### Merchant profiles

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/v1/merchants/profile` | Retrieve the authenticated merchant's profile and document records |
| `PATCH` | `/v1/merchants/profile` | Update editable business profile fields |
| `POST` | `/v1/merchants/profile/submit` | Submit an eligible profile for administrative review |

These routes require merchant authentication.

### Administrator authentication

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/v1/admin-auth/login` | Authenticate an administrator |
| `POST` | `/v1/admin-auth/logout` | Revoke the current administrator session |
| `GET` | `/v1/admin-auth/me` | Retrieve the authenticated administrator |

The administrator JWT is stored in an HTTP-only cookie rather than returned in the login response body. There is intentionally no public administrator registration endpoint.

### Administrator merchant review

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/v1/admin/merchant-applications` | List paginated applications awaiting review or under review |
| `GET` | `/v1/admin/merchant-applications/:profileId` | Retrieve an application and its related records |
| `POST` | `/v1/admin/merchant-applications/:profileId/start-review` | Move a submitted application into review |
| `POST` | `/v1/admin/merchant-applications/:profileId/approve` | Approve an eligible application |
| `POST` | `/v1/admin/merchant-applications/:profileId/reject` | Reject an application with a reason |

These endpoints require an authenticated administrator and the permitted role. The current application-review routes allow `SUPER_ADMIN` and `COMPLIANCE`.

For request and response details, consult the module documentation and the DTOs and controllers in the source code.

## Data Model

The Prisma schema currently establishes the identity, onboarding, KYC, review-history, and initial ledger structures.

| Model | Purpose |
|---|---|
| `Merchant` | Merchant identity and authentication fields |
| `Admin` | Administrator identity, role, and account status |
| `OtpChallenge` | Email verification and login OTP challenges |
| `RevokedToken` | Merchant JWT revocation records |
| `AdminRevokedToken` | Administrator JWT revocation records |
| `MerchantProfile` | Business details and onboarding status |
| `MerchantDocument` | KYC document metadata, review status, expiry, and supersession |
| `MerchantReviewHistory` | Audit trail of merchant profile status transitions |
| `MerchantLedger` | Initial merchant available and pending balance structure |

### Merchant onboarding lifecycle

```text
PENDING_SUBMISSION
        |
        v
    SUBMITTED
        |
        v
   UNDER_REVIEW
      /     \
     v       v
 APPROVED  REJECTED
              |
              v
      Correct and resubmit
```

`SUSPENDED` is also defined as an account status.

The merchant profile lifecycle and document-review lifecycle are distinct. A profile's approval depends on the configured requirements for its business type and the validity of its current documents.

### Ledger status

The current `MerchantLedger` model stores available and pending balances as integer tambala, with MWK as the default currency.

This is a **foundational placeholder**, not a complete payment ledger. Payment transaction records, immutable double-entry postings, settlement processing, and withdrawal workflows have not yet been implemented.

## Testing

The backend uses Vitest for automated tests.

Run the complete test suite:

```bash
npm run test
```

Run tests in watch mode:

```bash
npm run test:watch
```

Run tests with coverage:

```bash
npm run test:cov
```

Run end-to-end tests using the configured E2E test configuration:

```bash
npm run test:e2e
```

Build the application:

```bash
npm run build
```

The current development checkpoint has **143 passing tests across 12 test files**. Test counts may change as the application evolves. The tests cover authentication, merchant profile workflows, document requirements, administrator authentication, application review, controllers, and supporting services.

Unit tests using mocked database operations do not, by themselves, prove PostgreSQL transaction rollback behavior or validate every production integration. Those require appropriate integration tests.

## Security

Security is a core design consideration for the payment gateway.

Current implementation includes:

- Bcrypt password hashing.
- Email OTP challenges with HMAC-protected codes.
- OTP expiry and attempt limits.
- JWT authentication and database-backed token revocation.
- HTTP-only authentication cookies.
- Separate merchant and administrator authentication.
- Administrator role-based access control.
- Conditional status updates for important application transitions.
- Transactional writes for status changes and review-history records.
- Arcjet shield, bot detection, and fixed-window rate limiting.
- Environment-based secrets and database credentials.

Further hardening is required as the payment-processing layer is developed. In particular, production deployment, payment idempotency, provider callback verification, durable retry handling, reconciliation, monitoring, and comprehensive integration testing remain future work.

## Documentation

Technical and development documentation is maintained in [`docs/`](./docs/).

| Documentation | Contents |
|---|---|
| [Architecture](./docs/architecture/) | Module responsibilities, data flow, and design decisions |
| [Admin module](./docs/architecture/adminModule.md) | Merchant application review and approval workflows |
| [Admin authentication](./docs/architecture/AdminAuthModule.md) | Administrator sessions and authorization |
| [Merchant module](./docs/architecture/merchantModule.md) | Profiles, KYC requirements, and application submission |
| [API](./docs/api/) | API design and endpoint documentation |
| [Business](./docs/business/) | Product requirements and payment-domain planning |
| [Development](./docs/development/) | Setup, configuration, and development workflow |

Documentation should describe implemented behavior separately from proposed functionality and remain synchronized with the source code.

## Development Roadmap

### Implemented foundations

- [x] NestJS and TypeScript backend.
- [x] PostgreSQL and Prisma integration.
- [x] Database schema and migrations for merchant onboarding and administrator workflows.
- [x] Merchant registration and email verification.
- [x] Email OTP login verification.
- [x] Merchant JWT sessions and token revocation.
- [x] Merchant profile management.
- [x] Business-type-specific KYC document requirements.
- [x] Merchant application submission and resubmission validation.
- [x] Administrator authentication and internal account provisioning.
- [x] Administrator role-based access control.
- [x] Application listing and review workflows.
- [x] Document approval checks, including superseded-document handling.
- [x] Application status audit history.
- [x] SMTP email integration and Arcjet request protection.
- [x] Automated tests for implemented modules.

### Planned work

- [ ] Actual KYC file upload, secure storage, and retrieval.
- [ ] Merchant-facing frontend.
- [ ] Payment transaction schema and lifecycle.
- [ ] Payment orchestration and provider adapter interfaces.
- [ ] Airtel Money integration.
- [ ] TNM Mpamba integration.
- [ ] Hosted checkout.
- [ ] Merchant API credentials and integration SDK.
- [ ] Idempotency for payment operations.
- [ ] Verified provider callbacks and webhook delivery.
- [ ] Retry policies and asynchronous job processing.
- [ ] Double-entry ledger and financial transaction invariants.
- [ ] Settlement and withdrawal workflows.
- [ ] Provider reconciliation and exception handling.
- [ ] Production monitoring, operational alerting, and deployment hardening.
- [ ] Expanded database integration and end-to-end tests.

## Repository

**SmartPay Malawi**

Repository: [github.com/KelvinJustin/SmartPay-Malawi](https://github.com/KelvinJustin/SmartPay-Malawi)

The project is intended to become payment infrastructure for the Malawian digital economy. Development is ongoing, and the current repository represents the foundational backend rather than a complete production payment gateway.

## License

This repository is proprietary and is marked `UNLICENSED` in `package.json`.

The source code and associated intellectual property are owned by the project owner. No permission is granted to copy, modify, distribute, sublicense, or commercially use the software without explicit authorization.
