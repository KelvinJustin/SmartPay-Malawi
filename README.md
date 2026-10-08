<p align="center">
  <img src="assets/logo.png" alt="SmartPay Malawi" width="500">
</p>

# SmartPay Malawi

**SmartPay Malawi** is an API-first payment gateway project focused on providing a unified integration layer for online payments in Malawi.

The project is being built with a modular backend architecture designed to integrate with multiple payment providers while giving merchants a consistent API, payment lifecycle, webhook handling, and transaction management experience.

> **Status:** 🚧 Early development

## Overview

SmartPay aims to simplify payment integration for businesses by providing a single API instead of requiring merchants to integrate independently with multiple payment providers.

The system is being designed around:

* Unified payment APIs
* Multiple payment provider integrations
* Payment lifecycle management
* Webhook processing
* Idempotent payment operations
* Transaction tracking
* Reconciliation
* Merchant integrations
* Background job processing
* Secure API design

The project is initially focused on the **Malawian payment ecosystem**.

## Architecture

The backend is being developed as a modular application with the following core components:

```text
                    Merchant Application
                           │
                           ▼
                    SmartPay API
                           │
             ┌─────────────┼─────────────┐
             │             │             │
             ▼             ▼             ▼
        Payments       Webhooks      Merchants
             │
             ▼
      Payment Providers
             │
       ┌─────┼─────┐
       ▼     ▼     ▼
    Airtel  TNM   Banks
    Money   Mpamba
             │
             ▼
       Reconciliation
```

Background processing will use Redis and BullMQ where asynchronous processing is required.

## Technology Stack

### Backend

* **TypeScript**
* **NestJS**
* **PostgreSQL**
* **Prisma**
* **Redis**
* **BullMQ**
* **Vitest**

### Infrastructure

* **Docker**
* **Docker Compose**

### Planned Frontend

* **React**

The frontend is separate from the core payment API and will be introduced as the project develops.

## Project Structure

The repository is currently based on a NestJS application structure and will evolve as the system is developed.

```text
smart-pay-malawi/
├── src/
├── test/
├── prisma/
├── Dockerfile
├── compose.yaml
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

The final structure will follow a modular architecture around business domains rather than organizing the application solely by technical layer.

## Getting Started

### Prerequisites

Install the following before running the project:

* Node.js
* npm
* Git
* Docker

PostgreSQL and Redis can be provided through Docker during development.

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

Create a local environment file:

```bash
cp .env.example .env
```

Configure the required environment variables before starting the application.

> Never commit `.env` or other files containing credentials, API keys, secrets, or private keys.

### Development

Start the application in development mode:

```bash
npm run start:dev
```

The API will run on the configured application port.

### Docker

The project will use Docker to provide a consistent development and deployment environment.

Once the Docker configuration is in place:

```bash
docker compose up --build
```

This will provide the application infrastructure required by the project.

## Testing

Run unit tests:

```bash
npm run test
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

SmartPay is being developed around several core principles:

### API First

Payment functionality is exposed through well-defined APIs so that web, mobile, and other client applications can integrate with SmartPay independently of the backend implementation.

### Provider Agnostic

Merchant integrations should not need to understand the implementation details of individual payment providers.

```text
Merchant
   │
   ▼
SmartPay API
   │
   ├── Provider A
   ├── Provider B
   └── Provider C
```

### Reliability

Payment operations must account for unreliable networks, provider failures, duplicate requests, delayed callbacks, and asynchronous processing.

### Idempotency

Payment operations should be designed to prevent duplicate transactions when the same request is submitted more than once.

### Reconciliation

Internal transaction records should be reconcilable against payment-provider records to identify discrepancies and ensure accurate financial state.

### Security

Payment-related credentials, API keys, signatures, and sensitive transaction data must be handled securely throughout the system.

## Development Status

The project is currently in its foundational development stage.

### Completed

* [x] NestJS application initialized
* [x] Initial project documentation

### Planned

* [ ] PostgreSQL integration
* [ ] Prisma configuration
* [ ] Database schema
* [ ] Authentication and authorization
* [ ] Merchant management
* [ ] Payment API
* [ ] Payment state machine
* [ ] Provider abstraction
* [ ] Webhook processing
* [ ] Idempotency
* [ ] Redis integration
* [ ] BullMQ background jobs
* [ ] Transaction reconciliation
* [ ] Docker development environment
* [ ] Provider integrations
* [ ] API documentation
* [ ] Production deployment

## License

This repository is **proprietary** and is not currently distributed as open-source software.

The source code and associated intellectual property are owned by the project owner. No permission is granted to copy, modify, distribute, sublicense, or commercially use the software without explicit authorization.

## Project

**SmartPay Malawi**

Payment infrastructure for the Malawian digital economy.
