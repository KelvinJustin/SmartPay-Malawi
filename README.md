<p align="center">
  <img src="assets/logo.png" alt="SmartPay Malawi" width="500">
</p>

# SmartPay Malawi

**SmartPay Malawi** is an API-first payment gateway and integration layer designed to simplify online payments in Malawi.

The platform is being developed as a modular backend that provides merchants with a unified API for initiating and managing payments across multiple payment providers, while abstracting provider-specific implementation details.

> **Status:** 🚧 Early development

## Table of Contents

* [Overview](#overview)
* [Core Capabilities](#core-capabilities)
* [Architecture](#architecture)
* [Technology Stack](#technology-stack)
* [Project Structure](#project-structure)
* [Getting Started](#getting-started)

  * [Prerequisites](#prerequisites)
  * [Installation](#installation)
  * [Environment Variables](#environment-variables)
  * [Development](#development)
  * [Docker Development](#docker-development)
* [Testing](#testing)
* [Development Principles](#development-principles)

  * [API First](#api-first)
  * [Provider Agnostic](#provider-agnostic)
  * [Reliability](#reliability)
  * [Idempotency](#idempotency)
  * [Reconciliation](#reconciliation)
  * [Security](#security)
* [Documentation](#documentation)
* [Development Status](#development-status)

  * [Completed](#completed)
  * [In Progress / Planned](#in-progress--planned)
* [Repository](#repository)
* [License](#license)

## Documentation

Detailed technical, architectural, business, and development documentation is maintained in [`docs/`](./docs/).

| Documentation                        | Description                                                                 |
| ------------------------------------ | --------------------------------------------------------------------------- |
| [Architecture](./docs/architecture/) | System architecture, modules, data flow, and technical decisions            |
| [API](./docs/api/)                   | API design, endpoints, authentication, payments, and webhooks               |
| [Business](./docs/business/)         | Product definition, payment lifecycle, providers, and business requirements |
| [Development](./docs/development/)   | Development setup, environment configuration, testing, and team workflow    |

> Documentation is being developed alongside the platform and will expand as the architecture and product requirements become more defined.

## Overview

Integrating online payments can require businesses to work with multiple payment providers, each with different APIs, payment flows, callbacks, and transaction states.

SmartPay aims to provide a single integration point between merchants and payment providers.

```text
Merchant Application
        │
        ▼
   SmartPay API
        │
        ▼
Payment Abstraction
        │
   ┌────┼────┐
   ▼    ▼    ▼
Airtel TNM  Banks
Money Mpamba
   │    │    │
   └────┼────┘
        ▼
 Provider Responses
        │
        ▼
 Reconciliation
```

The platform is initially focused on the **Malawian payment ecosystem**, with the architecture designed to accommodate additional providers over time.

## Core Capabilities

SmartPay is being designed around:

* Unified payment APIs
* Merchant integrations
* Payment lifecycle management
* Multiple payment provider integrations
* Provider abstraction
* Webhook processing
* Idempotent payment operations
* Transaction tracking
* Reconciliation
* Secure API design
* Background processing for asynchronous operations

The intended payment lifecycle is broadly:

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
Settled / Withdrawn
```

Actual provider-specific states will be normalized into SmartPay's internal payment state model.

## Architecture

SmartPay is being developed as a **modular monolith**, with business domains separated into independent modules within the same backend application.

```text
                    Merchant Application
                           │
                           ▼
                    ┌─────────────┐
                    │ SmartPay API│
                    └──────┬──────┘
                           │
             ┌─────────────┼─────────────┐
             │             │             │
             ▼             ▼             ▼
        Payments       Merchants      Webhooks
             │
             ▼
      Provider Abstraction
             │
       ┌─────┼─────┐
       ▼     ▼     ▼
    Airtel  TNM   Banks
    Money   Mpamba
       │     │     │
       └─────┼─────┘
             ▼
       Reconciliation
```

Redis is used for infrastructure-level caching and is available for asynchronous workloads. **BullMQ will be introduced where background job processing is required.**

PostgreSQL is currently provided through a hosted development database, with Prisma used as the database ORM and schema management layer.

## Technology Stack

### Backend

* **TypeScript**
* **NestJS**
* **PostgreSQL**
* **Prisma**
* **Redis**
* **Vitest**

### Infrastructure

* **Docker**
* **Docker Compose**

### Planned

* **BullMQ** — background job processing
* **React** — separate frontend application

The frontend will remain separate from the core payment API.

## Project Structure

The repository currently follows a standard NestJS structure and will evolve into a domain-oriented modular architecture.

```text
smart-pay-malawi/
├── src/
├── test/
├── prisma/
├── generated/
├── docs/
│   ├── architecture/
│   ├── api/
│   ├── business/
│   └── development/
├── Dockerfile
├── compose.yaml
├── .dockerignore
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

As the system grows, the `src/` directory will be organized around business domains rather than purely technical layers.

## Getting Started

### Prerequisites

Install:

* Node.js 24+
* npm
* Git
* Docker

The project uses Docker for the local application and Redis development environment.

PostgreSQL is currently provided through a hosted development database.

### Installation

Clone the repository:

```bash
git clone https://github.com/KelvinJustin/SmartPay-Malawi.git
cd SmartPay-Malawi
```

Install dependencies:

```bash
npm install
```

### Environment Variables

Create a local environment file from the example:

```bash
cp .env.example .env
```

Configure the required variables before starting the application.

At minimum, the development environment requires the database connection and Redis configuration.

> **Never commit `.env` or files containing credentials, API keys, secrets, private keys, or provider credentials.**

### Development

Run the API directly with Node:

```bash
npm run start:dev
```

The API will start on the configured application port.

### Docker Development

The recommended development environment uses Docker Compose:

```bash
docker compose up --build
```

The development environment consists of:

```text
                 Neon PostgreSQL
                       ▲
                       │
                 SmartPay API
                       │
                       ▼
                Redis Container
```

The API source code is mounted into the container during development, allowing NestJS to watch the source files and recompile changes automatically.

To stop the development environment:

```bash
docker compose down
```

To rebuild the API after dependency or Dockerfile changes:

```bash
docker compose build
docker compose up
```

## Testing

Run unit tests:

```bash
npm run test
```

Run tests in watch mode:

```bash
npm run test:watch
```

Run end-to-end tests:

```bash
npm run test:e2e
```

Run tests with coverage:

```bash
npm run test:cov
```

## Development Principles

### API First

Payment functionality is exposed through well-defined APIs so that web, mobile, and other client applications can integrate with SmartPay independently of the underlying implementation.

### Provider Agnostic

Merchant integrations should not need to understand the implementation details of individual payment providers.

```text
Merchant
   │
   ▼
SmartPay API
   │
   ▼
Provider Abstraction
   │
   ├── Airtel Money
   ├── TNM Mpamba
   └── Banks
```

Provider-specific authentication, request formats, responses, callbacks, and implementation details should remain isolated within provider integrations.

### Reliability

Payment systems must account for:

* Unreliable networks
* Provider failures
* Duplicate requests
* Delayed callbacks
* Provider timeouts
* Asynchronous payment completion
* Partial failures

The system should therefore favor explicit transaction states, retries where appropriate, and durable records.

### Idempotency

Payment operations must prevent duplicate transactions when the same request is submitted multiple times.

Idempotency will be particularly important for payment initiation, webhook processing, and retryable operations.

### Reconciliation

SmartPay's internal transaction records should be reconcilable against provider records.

Reconciliation is intended to identify discrepancies between:

```text
SmartPay Records
       │
       │
       ▼
Provider Records
       │
       ▼
Reconciliation
       │
       ├── Matched
       ├── Missing
       ├── Mismatched
       └── Requires Review
```

### Security

Payment credentials, API keys, authentication tokens, webhook signatures, and sensitive transaction data must be handled securely.

Secrets should be provided through environment configuration or an appropriate secrets-management system rather than committed to source control.

## Development Status

SmartPay is currently in its foundational development stage.

### Completed

* [x] NestJS application initialized
* [x] TypeScript backend configured
* [x] Prisma 7 configured
* [x] PostgreSQL development database configured
* [x] Redis development container
* [x] Docker development environment
* [x] Docker Compose configuration
* [x] Environment configuration
* [x] Initial project documentation

### In Progress / Planned

* [ ] Database schema
* [ ] Authentication and authorization
* [ ] Merchant management
* [ ] Payment API
* [ ] Payment state machine
* [ ] Provider abstraction
* [ ] Provider integrations
* [ ] Webhook processing
* [ ] Idempotency
* [ ] Redis application integration
* [ ] BullMQ background jobs
* [ ] Transaction reconciliation
* [ ] API documentation
* [ ] Production deployment
* [ ] React frontend

## Repository

**SmartPay Malawi**

Payment infrastructure for the Malawian digital economy.

## License

This repository is **proprietary** and is not distributed as open-source software.

The source code and associated intellectual property are owned by the project owner. No permission is granted to copy, modify, distribute, sublicense, or commercially use the software without explicit authorization.
