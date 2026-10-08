# Development Setup

> **Status:** Draft
> **Last Updated:** October 2026

This document explains how to set up the SmartPay Malawi development environment locally.

## 1. Development Stack

The current development environment consists of:

| Component               | Technology      |
| ----------------------- | --------------- |
| Runtime                 | Node.js 24+     |
| Language                | TypeScript      |
| Backend                 | NestJS          |
| Database                | PostgreSQL      |
| ORM                     | Prisma 7        |
| Database Hosting        | Neon PostgreSQL |
| Cache / Infrastructure  | Redis           |
| Testing                 | Vitest          |
| Containers              | Docker          |
| Container Orchestration | Docker Compose  |

PostgreSQL is hosted through **Neon** during development. The local Docker environment runs the SmartPay API and Redis.

---

## 2. Prerequisites

Install the following:

* Node.js 24+
* npm
* Git
* Docker
* Docker Compose

Verify the installations:

```bash
node --version
npm --version
git --version
docker --version
docker compose version
```

The exact Docker installation may differ between operating systems. Docker Desktop is not required if Docker Engine and Compose are available through another environment such as WSL.

---

## 3. Clone the Repository

Clone the repository:

```bash
git clone https://github.com/KelvinJustin/SmartPay-Malawi.git
cd SmartPay-Malawi
```

---

## 4. Install Dependencies

Install the project dependencies:

```bash
npm install
```

Do not commit `node_modules` to the repository.

---

## 5. Environment Configuration

Create a local environment file from the example:

```bash
cp .env.example .env
```

On Windows PowerShell, the equivalent is:

```powershell
Copy-Item .env.example .env
```

The `.env` file contains local development configuration and must not be committed.

At minimum, configure the database and Redis connection details required by the application.

Example:

```env
DATABASE_URL="your-neon-database-url"

REDIS_HOST="localhost"
REDIS_PORT="6379"

PORT="3000"
```

> The exact environment variables may change as the application develops. Refer to `.env.example` as the source of truth for required configuration.

---

## 6. Database

SmartPay currently uses a shared **Neon PostgreSQL development database**.

The database is not included in Docker Compose.

```text
SmartPay API
     │
     ▼
   Prisma
     │
     ▼
Neon PostgreSQL
```

After configuring `DATABASE_URL`, Prisma commands can be run from the project root.

Generate the Prisma client:

```bash
npx prisma generate
```

When database schema changes are introduced, use the appropriate Prisma migration or schema workflow defined by the project.

For full details on Prisma 7 driver adapters, NestJS `DatabaseService`, migrations, and best practices, see the dedicated guide:
* [Database Setup & Prisma 7 Guide](../database/setup.md)

Do not commit database credentials or other secrets.

---

## 7. Running Without Docker

The API can be run directly from Node.js:

```bash
npm run start:dev
```

This starts NestJS in development/watch mode.

The API runs on:

```text
http://localhost:3000
```

The exact port can be changed through the environment configuration.

---

## 8. Running With Docker

Docker Compose is the recommended development environment.

Start the application and Redis:

```bash
docker compose up --build
```

The development architecture is:

```text
                 Neon PostgreSQL
                       ▲
                       │
                 SmartPay API
                       │
                       ▼
                Redis Container
```

The API source directory is mounted into the container during development.

NestJS watches the source files and recompiles changes automatically.

### Start in the background

```bash
docker compose up -d
```

### View logs

```bash
docker compose logs -f
```

View only the API logs:

```bash
docker compose logs -f api
```

### Stop the environment

```bash
docker compose down
```

### Rebuild containers

Use a rebuild when changing dependencies, the Dockerfile, or other container configuration:

```bash
docker compose build
docker compose up
```

---

## 9. Development Workflow

A typical development session is:

```text
1. Pull the latest changes
        │
        ▼
2. Install/update dependencies if required
        │
        ▼
3. Configure .env
        │
        ▼
4. Start Docker Compose
        │
        ▼
5. Develop and test
        │
        ▼
6. Run tests
        │
        ▼
7. Commit changes
        │
        ▼
8. Push to GitHub
```

Before starting work:

```bash
git pull
```

Start the development environment:

```bash
docker compose up
```

After making changes, run the relevant tests:

```bash
npm run test
```

Then check the repository:

```bash
git status
```

---

## 10. Testing

Run the unit test suite:

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

Tests should be added alongside new functionality rather than being postponed until the end of a feature.

---

## 11. Common Docker Commands

Check running containers:

```bash
docker compose ps
```

View API logs:

```bash
docker compose logs -f api
```

View Redis logs:

```bash
docker compose logs -f redis
```

Restart the API:

```bash
docker compose restart api
```

Stop and remove the development containers:

```bash
docker compose down
```

Stop the environment and remove its named volumes:

```bash
docker compose down -v
```

> Be careful with `-v`. It removes Docker-managed volumes associated with the Compose project.

---

## 12. Git Workflow

The repository uses the `main` branch for the current development workflow.

Before starting work:

```bash
git pull
```

After making changes:

```bash
git status
git add .
git commit -m "TYPE: description"
git push
```

Example:

```bash
git add .
git commit -m "FEAT: add payment module"
git push
```

Keep commits focused on a logical change rather than combining unrelated changes.

---

## 13. Environment and Security Rules

Never commit:

* `.env`
* Database credentials
* API keys
* Provider credentials
* Private keys
* Authentication secrets
* Webhook signing secrets

The repository should contain `.env.example` with placeholder values where configuration needs to be documented.

```text
.env.example    → committed
.env            → local only
```

If a secret is accidentally committed, removing it from the latest commit is not sufficient if it has already been pushed. The affected credential should be considered compromised and rotated.

---

## 14. Troubleshooting

### API container does not start

Check the logs:

```bash
docker compose logs -f api
```

Then verify:

* Environment variables
* Database connection
* Redis availability
* Node/npm dependencies
* Docker build output

### Changes are not being detected

Confirm that the API is running through the development command:

```bash
npm run start:dev
```

or through Docker Compose:

```bash
docker compose up
```

The Docker development configuration mounts the source code into the container and configures TypeScript file watching for the containerized development environment.

### Prisma client is unavailable

Run:

```bash
npx prisma generate
```

Then restart the development environment if necessary.

### Redis is unavailable

Check:

```bash
docker compose ps
```

and:

```bash
docker compose logs redis
```

Redis should report that it is ready to accept connections.

---

## 15. Development Environment Summary

```text
┌─────────────────────────────────────────────┐
│              Development Machine            │
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │           Docker Compose              │  │
│  │                                       │  │
│  │  ┌─────────────┐    ┌─────────────┐  │  │
│  │  │ SmartPay API│    │    Redis    │  │  │
│  │  │   NestJS    │◄──►│             │  │  │
│  │  └──────┬──────┘    └─────────────┘  │  │
│  └─────────┼─────────────────────────────┘  │
│            │                                │
└────────────┼────────────────────────────────┘
             │
             ▼
      Neon PostgreSQL
```

The development environment intentionally keeps the infrastructure simple:

* **NestJS** runs the API.
* **Redis** runs locally through Docker.
* **PostgreSQL** is provided by Neon.
* **Prisma** manages database access.
* **Docker Compose** provides a consistent local development environment.
* **Vitest** provides automated testing.

As the platform develops, this document should be updated when the development workflow or infrastructure changes.
