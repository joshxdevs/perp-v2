# Perp-V2: High-Performance Perpetual Futures Exchange

A decoupled, fault-tolerant perpetual futures exchange backend built with Node.js, TypeScript, Redis Streams, and PostgreSQL.

This project implements a high-throughput trading architecture where the HTTP API, the matching engine, and database persistence are completely decoupled to ensure maximum performance, independent scalability, and crash-safety.

## Architecture

The system is designed as a monorepo consisting of three independent microservices and two shared packages:

```mermaid
graph TD
    Client[Client/Trader] -->|HTTP POST /order| API[API Server]
    API -->|CREATE_ORDER| RedisInput[(Redis Stream: orders:input)]
    RedisInput -->|xreadgroup| Engine[Matching Engine]
    Engine -->|ORDER_FILLED| RedisOutput[(Redis Stream: orders:output)]
    RedisOutput -->|xreadgroup| DBWorker[DB Worker]
    
    API -.->|Read/Write Pending Orders| Postgres[(PostgreSQL)]
    DBWorker -.->|Atomic Fills & Positions| Postgres
```

### Microservices
- **`apps/api`**: An Express.js REST API that handles authentication, wallet funding, and order validation. It writes pending orders to the database and queues them in Redis.
- **`apps/engine`**: A pure, single-threaded matching engine. It consumes orders from Redis, matches them in a highly optimized in-memory orderbook, and publishes fills/cancellations to an output stream.
- **`apps/db-worker`**: A dedicated worker that consumes the output stream and persists fills, updates order statuses, and upserts user positions using atomic database transactions.

### Shared Packages
- **`packages/db`**: Contains the Prisma schema, migrations, and the generated Prisma Client.
- **`packages/redis`**: Contains the Upstash Redis client and strict TypeScript definitions for all stream messages.

## Core Features

- **Decoupled Engine**: The matching engine performs zero blocking network I/O (no database queries) during the matching loop, enabling ultra-low latency order matching.
- **O(1) Orderbook**: Custom in-memory orderbook utilizing Hash Maps (`Map<number, Order[]>`) for O(1) price level lookups and Binary Search arrays for O(log N) price level insertions.
- **Fault Tolerance via Redis Streams**: Uses Redis `xreadgroup` (Consumer Groups). If any service crashes, unacknowledged messages are safely retained in the Pending Entries List (PEL) and reprocessed upon restart. Zero data loss.
- **Atomic Transactions**: The `db-worker` uses strict Prisma `$transaction` blocks to ensure that order status updates, fill creations, and position upserts happen entirely or not at all.
- **Idempotency**: Schema-level `@@unique` constraints ensure that redelivered stream messages (e.g., after a worker crash) do not result in duplicate positions.
- **Monorepo Structure**: Built with NPM Workspaces for seamless code sharing and dependency management.

## Tech Stack

- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL (via Neon)
- **Message Broker**: Upstash Redis (REST-based)
- **ORM**: Prisma
- **Validation**: Zod
- **Auth**: JWT & bcrypt

## Getting Started

### Prerequisites
- Node.js (v18+)
- A Neon PostgreSQL database
- An Upstash Redis database

### 1. Installation
Clone the repository and install dependencies from the root directory:
```bash
git clone <repository-url>
cd perp-v2
npm install
```

### 2. Environment Variables
You need to set up `.env` files in three locations: `apps/api/.env`, `apps/engine/.env`, and `apps/db-worker/.env`. 

Example `.env` structure:
```env
# Database (Neon)
DATABASE_URL="postgres://user:pass@host/dbname?sslmode=require"

# Redis (Upstash) - MUST be the REST URL (https://), not the rediss:// URL
UPSTASH_REDIS_URL="https://YOUR_UPSTASH_ENDPOINT.upstash.io"
UPSTASH_REDIS_TOKEN="YOUR_UPSTASH_TOKEN"

# Auth
JWT_SECRET="your_jwt_secret_key"
PORT=3000 # Only needed for apps/api
```

### 3. Database Setup
Push the schema to your database and generate the Prisma client:
```bash
cd packages/db
npx prisma migrate dev
npx prisma generate
```

### 4. Running the Exchange
To run the full exchange, you must start all three services concurrently in separate terminal windows.

**Terminal 1 (API):**
```bash
cd apps/api
npm run dev
```

**Terminal 2 (Engine):**
```bash
cd apps/engine
npm run dev
```

**Terminal 3 (DB Worker):**
```bash
cd apps/db-worker
npm run dev
```

## 📖 API Endpoints

- `POST /auth/signup` - Register a new trader.
- `POST /auth/signin` - Authenticate and receive a JWT.
- `POST /user/onramp` - Add collateral to your account.
- `GET /user/positions` - View active positions.
- `POST /order` - Place a limit or market order.
- `DELETE /order/:orderId` - Cancel a pending order.

## What's Next?
- **Phase 6**: Funding Rates and Liquidation Engine implementation.
- **Phase 7**: WebSocket server for real-time orderbook and trade stream updates to the frontend.
