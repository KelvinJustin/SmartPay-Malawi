# Database Setup & Prisma 7 Guide

> **Project:** SmartPay Malawi  
> **Status:** Active  
> **Last Updated:** October 2026  

This guide provides a comprehensive walkthrough for setting up, configuring, migrating, and querying the database in the SmartPay Malawi project using **PostgreSQL** and **Prisma ORM 7**.

---

## 1. Overview & Architecture

SmartPay Malawi uses:
* **Database Engine:** PostgreSQL (hosted remotely on Neon for development and staging).
* **ORM:** Prisma ORM 7 (`prisma-client` generator, ESM-first).
* **Driver Adapter:** `@prisma/adapter-pg` (Prisma 7 requirement for PostgreSQL).
* **Framework Integration:** NestJS (`DatabaseModule` providing `DatabaseService`).

```text
┌────────────────────────────────────────────────────────┐
│                      NestJS App                        │
│                                                        │
│  [Feature Service]  ──►  [DatabaseService]            │
│                              │                         │
│                              ▼                         │
│                     PrismaClient (v7)                  │
│                              │                         │
│                              ▼                         │
│                     PrismaPg Driver Adapter            │
└──────────────────────────────┬─────────────────────────┘
                               │ TCP / SSL Connection
                               ▼
                    ┌─────────────────────┐
                    │   Neon PostgreSQL   │
                    └─────────────────────┘
```

---

## 2. Environment Configuration

### Step 1: Set `DATABASE_URL`

Ensure your root `.env` file defines `DATABASE_URL` with your Neon PostgreSQL connection string:

```env
DATABASE_URL="postgresql://<user>:<password>@<neon-host>/<database>?sslmode=require"
```

> **Security Note:** Never commit your `.env` file to version control. Use `.env.example` as a template.

### Step 2: Prisma CLI Configuration (`prisma7.config.ts`)

In **Prisma 7**, the datasource `url` property is no longer placed in `schema.prisma`. Instead, Prisma CLI reads database URLs from `prisma7.config.ts`:

```typescript
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
```

---

## 3. Schema & Client Generation

### Schema Structure (`prisma/schema.prisma`)

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
}

model Testmsg {
  id      Int    @id @default(autoincrement())
  message String
}
```

#### Why `output = "../src/generated/prisma"`?
NestJS compiles TypeScript using `tsconfig.build.json`, which specifies `"rootDir": "./src"`. Keeping the generated Prisma client inside `src/generated/prisma` guarantees:
1. `nest build` succeeds without TS6059 (`File is not under rootDir`) errors.
2. Full path auto-completion inside your NestJS codebase.
3. Clean separation; `src/generated/` is ignored by Git in `.gitignore`.

### Generating the Client

Whenever you modify `prisma/schema.prisma`, regenerate the client:

```bash
npx prisma generate
```

---

## 4. Database Migrations

### Creating & Applying Migrations (Development)

To generate a new SQL migration and immediately apply it to your database:

```bash
npx prisma migrate dev --name <migration_name>
```

Example:
```bash
npx prisma migrate dev --name add_user_account_table
```

This will:
1. Create a timestamped SQL migration file in `prisma/migrations/`.
2. Execute the migration against your database.
3. Automatically run `prisma generate` to update the TypeScript client.

### Applying Existing Migrations (CI / Production)

For production deployment or CI environments:

```bash
npx prisma migrate deploy
```

### Prototyping Without Migrations (`db push`)

For quick local experiments or temporary schemas without saving migration files:

```bash
npx prisma db push
```

### Visualizing Data with Prisma Studio

To view and edit database records in a browser UI:

```bash
npx prisma studio
```
Opens automatically on `http://localhost:5555`.

---

## 5. NestJS Integration

### Database Service (`src/database/database.service.ts`)

In Prisma 7, PostgreSQL requires the `@prisma/adapter-pg` driver adapter passed to `super({ adapter })`:

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

@Injectable()
export class DatabaseService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL,
    });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

### Database Module (`src/database/database.module.ts`)

`DatabaseModule` makes `DatabaseService` available across the app:

```typescript
import { Module } from '@nestjs/common';
import { DatabaseService } from './database.service.js';

@Module({
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
```

### Using Database in Feature Modules

#### 1. Import `DatabaseModule` in your feature module:
```typescript
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { TestApiController } from './test_api.controller.js';
import { TestApiService } from './test_api.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [TestApiController],
  providers: [TestApiService],
})
export class TestApiModule {}
```

#### 2. Inject `DatabaseService` into your service:
```typescript
import { Injectable } from '@nestjs/common';
import type { TestmsgCreateInput, TestmsgUpdateInput } from '../generated/prisma/models.js';
import { DatabaseService } from '../database/database.service.js';

@Injectable()
export class TestApiService {
  constructor(private readonly prisma: DatabaseService) {}

  async create(data: TestmsgCreateInput) {
    return this.prisma.testmsg.create({ data });
  }

  async findAll() {
    return this.prisma.testmsg.findMany();
  }

  async findOne(id: number) {
    return this.prisma.testmsg.findUnique({
      where: { id },
    });
  }

  async update(id: number, data: TestmsgUpdateInput) {
    return this.prisma.testmsg.update({
      where: { id },
      data,
    });
  }

  async remove(id: number) {
    return this.prisma.testmsg.delete({
      where: { id },
    });
  }
}
```

---

## 6. Prisma 7 Conventions & Gotchas

### 1. Dedicated Entrypoints
Prisma 7 separates client classes from model types:
* **Client & Namespace:** `../generated/prisma/client.js` (`PrismaClient`, `Prisma`)
* **Model Inputs & Types:** `../generated/prisma/models.js` (`<Model>CreateInput`, `<Model>UpdateInput`)

> ❌ **Incorrect (v6 style):** `Prisma.TestmsgCreateInput` from `client.js`  
> ✅ **Correct (v7 style):** `import type { TestmsgCreateInput } from '../generated/prisma/models.js'`

### 2. Explicit `.js` Extensions for NodeNext
This project uses `"moduleResolution": "nodenext"` and `"type": "module"`. All relative imports in TypeScript files must include the `.js` extension (e.g. `import ... from '../generated/prisma/client.js'`).

---

## 7. Running with Docker Compose

When running via Docker:

```bash
docker compose up --build
```

* The `api` container connects directly to your Neon PostgreSQL instance via `DATABASE_URL` loaded from `.env`.
* If schema migrations were generated, ensure `npx prisma generate` was run locally before building, or run:
  ```bash
  docker compose exec api npx prisma generate
  ```
* If you encounter an `EADDRINUSE` port conflict on restart, run:
  ```bash
  docker compose restart api
  ```

---

## 8. Summary Checklist for Database Setup

1. [ ] Set `DATABASE_URL` in `.env`.
2. [ ] Verify `prisma7.config.ts` points to `DATABASE_URL`.
3. [ ] Run `npx prisma generate` to build TypeScript types under `src/generated/prisma`.
4. [ ] Run `npx prisma migrate dev` to sync schema with Neon PostgreSQL.
5. [ ] Import `DatabaseModule` into any feature module needing database access.
6. [ ] Verify build passes with `npm run build`.
