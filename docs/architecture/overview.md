# SmartPay Architecture Overview

> **Status:** Draft
> **Last Updated:** October 2026

## 1. Purpose

This document describes the high-level technical architecture of **SmartPay Malawi**.

SmartPay is an API-first payment gateway and integration layer that provides merchants with a unified interface for interacting with multiple payment providers in the Malawian payment ecosystem.

The architecture is designed around four primary goals:

* **Provider abstraction** — hide provider-specific implementation details from merchants.
* **Reliability** — handle failures, retries, delayed callbacks, and asynchronous payment completion.
* **Consistency** — normalize different provider behaviors into a common internal payment model.
* **Extensibility** — allow additional payment providers and capabilities to be introduced without redesigning the core system.

---

## 2. Architectural Style

SmartPay is being developed as a **modular monolith**.

The application runs as a single backend deployment, while its internal functionality is separated into well-defined business modules.

```text
                    SmartPay API
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
   Merchants         Payments         Webhooks
                         │
                         ▼
                Provider Abstraction
                         │
            ┌────────────┼────────────┐
            ▼            ▼            ▼
         Airtel         TNM         Banks
         Money         Mpamba
```

A modular monolith is currently preferred over microservices because the project is in its early development stage and does not yet require independently deployed services.

The architecture should maintain clear module boundaries so that individual components can be extracted into separate services later if there is a genuine operational reason to do so.

---

## 3. High-Level System

The core system consists of the SmartPay API, PostgreSQL, Redis, and external payment providers.

```text
                         Merchant
                            │
                            │ HTTPS
                            ▼
                    ┌───────────────┐
                    │  SmartPay API │
                    │    NestJS     │
                    └───────┬───────┘
                            │
             ┌──────────────┼──────────────┐
             │              │              │
             ▼              ▼              ▼
        Merchant         Payment        Webhook
         Module          Module         Module
                            │
                            ▼
                    Provider Abstraction
                     │       │       │
                     ▼       ▼       ▼
                  Airtel    TNM     Banks
                   Money   Mpamba
                            │
                            ▼
                       PostgreSQL
                            ▲
                            │
                         Prisma
                            │
                            ▼
                          Redis
```

PostgreSQL is the primary persistent datastore.

Redis provides infrastructure capabilities such as caching and is available for asynchronous workloads and other short-lived state where appropriate.

The development environment currently uses **Neon PostgreSQL** as the hosted PostgreSQL database and **Docker Compose** for the API and Redis development environment.

---

## 4. Core Components

### 4.1 SmartPay API

The SmartPay API is the primary entry point for merchant applications.

It is responsible for:

* Authentication and authorization
* Request validation
* Merchant operations
* Payment initiation
* Payment status queries
* Webhook handling
* Idempotency
* API error handling
* Exposing a consistent interface to merchants

The API should remain independent of individual payment-provider implementations.

---

### 4.2 Merchant Module

The Merchant module manages entities and functionality related to businesses integrating with SmartPay.

Potential responsibilities include:

* Merchant registration
* Merchant credentials
* API keys
* Merchant configuration
* Provider configuration
* Merchant transaction access

The exact merchant model will evolve as the business requirements are finalized.

---

### 4.3 Payment Module

The Payment module represents the core business domain.

It manages the lifecycle of payments initiated through SmartPay.

A simplified lifecycle is:

```text
Initiated
    │
    ▼
Processing
    │
    ├──────────────► Failed
    │
    ▼
Successful
    │
    ▼
Funds Awaiting Settlement
    │
    ▼
Settled
```

Provider-specific statuses should not leak directly into the merchant-facing API.

Instead, SmartPay should maintain a normalized internal payment state model and map provider-specific responses into that model.

---

### 4.4 Provider Abstraction

The provider layer isolates external payment-provider implementations from the rest of the application.

Conceptually:

```text
                 Payment Module
                       │
                       ▼
              Provider Interface
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
     Airtel Money   TNM Mpamba    Bank
      Adapter        Adapter      Adapter
```

Each provider adapter is responsible for provider-specific concerns such as:

* Authentication
* Request formatting
* Provider API calls
* Response parsing
* Callback handling
* Provider-specific error handling
* Provider status mapping

The payment domain should depend on the abstraction rather than directly depending on a specific provider.

This allows additional providers to be added without changing merchant-facing payment functionality.

---

## 5. Webhook Processing

Payment providers may notify SmartPay asynchronously after a payment has been initiated.

A typical flow is:

```text
Merchant
   │
   ▼
SmartPay
   │
   ▼
Provider
   │
   │ Payment processing
   │
   ▼
Provider Webhook
   │
   ▼
SmartPay Webhook Handler
   │
   ▼
Payment State Update
   │
   ▼
Merchant Notification
```

Webhook processing must account for:

* Duplicate callbacks
* Invalid signatures
* Delayed callbacks
* Out-of-order events
* Provider retries
* Unknown transactions

Webhook handling should therefore be **idempotent** and should not assume that callbacks will arrive exactly once or in the expected order.

---

## 6. Data Layer

PostgreSQL is the primary persistent datastore.

Prisma provides the application data-access layer and database schema management.

```text
NestJS Application
        │
        ▼
      Prisma
        │
        ▼
   PostgreSQL
```

Persistent records are expected to include entities such as:

* Merchants
* Payments
* Transactions
* Provider operations
* Webhook events
* Idempotency records
* Settlement information
* Reconciliation records

The final schema will be defined as the individual business domains are implemented.

---

## 7. Redis

Redis provides fast, short-lived data storage and infrastructure capabilities.

Potential uses include:

* Caching
* Rate limiting
* Temporary state
* Distributed locks
* Background job infrastructure

Redis should not become the authoritative source for financial transaction records.

Critical payment and transaction state must remain durably persisted in PostgreSQL.

---

## 8. Background Processing

Some payment operations are inherently asynchronous.

Examples include:

* Processing provider callbacks
* Retrying failed provider requests
* Sending merchant webhooks
* Reconciliation
* Settlement processing
* Other long-running operations

Where background job processing becomes necessary, **BullMQ** will be introduced on top of Redis.

```text
SmartPay API
     │
     ▼
   Redis
     │
     ▼
  BullMQ
     │
     ▼
 Worker
     │
     ├── Provider retry
     ├── Webhook delivery
     └── Reconciliation
```

BullMQ is intentionally not treated as a core dependency until concrete asynchronous workflows require it.

---

## 9. Reliability Principles

Payment infrastructure must assume that external systems can fail.

SmartPay should account for:

* Network failures
* Provider downtime
* Request timeouts
* Duplicate requests
* Duplicate webhooks
* Delayed responses
* Partial failures
* Temporary service unavailability

The architecture therefore favors:

* Explicit payment states
* Durable transaction records
* Idempotent operations
* Controlled retries
* Timeout handling
* Provider-independent state management
* Reconciliation

---

## 10. Idempotency

Payment initiation and other state-changing operations should support idempotency.

A simplified request flow is:

```text
Merchant Request
       │
       ▼
Idempotency Check
       │
   ┌───┴────┐
   │        │
 Exists   New Request
   │        │
   ▼        ▼
Return    Process
Existing    │
Result      ▼
         Save Result
```

This prevents accidental duplicate transactions when merchants retry requests because of network failures, timeouts, or uncertain responses.

Webhook processing should use the same principle to prevent duplicate provider callbacks from producing duplicate state transitions or side effects.

---

## 11. Reconciliation

Provider responses and SmartPay records may occasionally become inconsistent.

Reconciliation provides a mechanism for detecting and resolving these discrepancies.

```text
SmartPay Transactions
          │
          ▼
    Reconciliation
          ▲
          │
Provider Transactions
```

Potential reconciliation outcomes include:

```text
Matched
Missing
Mismatched
Requires Review
```

Reconciliation is particularly important for payment systems because a successful provider transaction should not depend solely on the availability or correctness of a single callback.

---

## 12. Security Boundaries

The SmartPay API is exposed to merchant applications, while provider integrations communicate with external payment networks.

```text
Merchant
   │
 HTTPS
   ▼
SmartPay API
   │
   ├── Authentication
   ├── Authorization
   ├── Validation
   └── Rate Limiting
   │
   ▼
Provider Layer
   │
   ▼
External Providers
```

Sensitive information should be protected throughout the system.

This includes:

* API credentials
* Provider credentials
* Authentication tokens
* Webhook secrets
* Payment information
* Database credentials

Secrets must be supplied through environment configuration or an appropriate secrets-management mechanism and must never be committed to source control.

---

## 13. Development Infrastructure

The current development environment is intentionally lightweight.

```text
                    Development Machine
                           │
                    Docker Compose
                     ┌─────┴─────┐
                     │           │
                     ▼           ▼
                SmartPay API   Redis
                     │
                     │
                     ▼
               Neon PostgreSQL
```

The API and Redis run through Docker Compose.

PostgreSQL is provided through the shared Neon development database rather than a local PostgreSQL container.

This keeps the local development environment lightweight while allowing the team to work against a shared development database.

---

## 14. Frontend Separation

The SmartPay frontend is intentionally separate from the payment API.

```text
                ┌──────────────┐
                │ React Client │
                └──────┬───────┘
                       │
                       │ HTTPS
                       ▼
                ┌──────────────┐
                │ SmartPay API │
                └──────────────┘
```

The backend remains API-first so that different clients can consume the same payment infrastructure.

Potential clients include:

* Merchant web applications
* Merchant mobile applications
* Internal administration tools
* Other systems integrating through the SmartPay API

---

## 15. Architectural Direction

The architecture is intentionally designed to evolve.

The immediate priority is to establish a reliable modular backend rather than prematurely introduce distributed infrastructure.

The expected progression is:

```text
Modular Monolith
       │
       ▼
Provider Abstraction
       │
       ▼
Reliable Payment Lifecycle
       │
       ▼
Asynchronous Processing
       │
       ▼
Reconciliation
       │
       ▼
Production Infrastructure
```

Microservices, additional infrastructure, and other distributed-system patterns should only be introduced when the scale or operational requirements justify their complexity.

---

## 16. Key Architectural Principles

The current architecture follows these principles:

1. **API first** — merchant integrations communicate through a consistent API.
2. **Provider agnostic** — provider-specific logic remains isolated.
3. **Modular** — business domains have clear boundaries.
4. **Persistent** — financial state is stored durably.
5. **Idempotent** — retries must not create duplicate transactions.
6. **Asynchronous where appropriate** — long-running work should not unnecessarily block API requests.
7. **Reconciliable** — SmartPay records must be verifiable against provider records.
8. **Secure by design** — credentials and sensitive payment information require explicit protection.
9. **Simple until necessary** — infrastructure complexity should be introduced only when the system requires it.
10. **Extensible** — new payment providers should be addable without redesigning the core payment domain.
