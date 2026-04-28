# AssesAI — Adaptive Assessment Platform

An adaptive quiz platform that adjusts question difficulty in real time using item-response theory and an AI-powered explanation layer.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Zustand, TanStack Query, Vite |
| Backend | Node.js, Express 5, PostgreSQL (pg), MongoDB (Mongoose) |
| Auth | JWT (access token in memory) + httpOnly refresh token cookie, Argon2id hashing, Redis blacklist |
| AI | Groq API (Llama / Mixtral) via OpenAI-compatible SDK |
| Cache | Redis (ioredis) |
| Containerisation | Docker + docker-compose |

## Prerequisites

- Node.js >= 20
- Docker + Docker Compose (for PostgreSQL, MongoDB, Redis)
- A [Groq API key](https://console.groq.com)

## Setup

### 1. Clone

```bash
git clone https://github.com/your-org/assesai.git
cd assesai
```

### 2. Configure environment variables

```bash
cp backend/.env.example backend/.env
# Edit backend/.env and fill in all required values
```

### 3. Start infrastructure (PostgreSQL, MongoDB, Redis)

```bash
cd backend
docker-compose up -d
```

### 4. Install dependencies

```bash
# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 5. Run database migrations

```bash
cd backend
# Apply PostgreSQL migrations in order
psql "$DATABASE_URL" -f src/migrations/001_create_auth_tables.sql
psql "$DATABASE_URL" -f src/migrations/002_create_quiz_tables.sql
```

### 6. Seed data

```bash
cd backend
node src/seeds/technologies.seed.js
node src/seeds/questions.seed.js
```

### 7. Start the servers

```bash
# Backend (port 3000)
cd backend && npm run dev

# Frontend (port 5173)
cd frontend && npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Running Tests

```bash
cd backend
npm test
```

Tests use `TEST_DATABASE_URL` defined in `backend/.env`. Make sure the test database exists before running.

## Project Structure

```
assesai/
├── backend/
│   ├── src/
│   │   ├── config/          # DB, Redis, AI client setup
│   │   ├── middleware/       # Auth, rate limiting, RBAC, validation
│   │   ├── modules/          # Feature modules (auth, quiz, ai, results)
│   │   ├── repositories/     # Data-access layer
│   │   ├── seeds/            # Seed scripts
│   │   ├── tests/            # Jest integration tests
│   │   └── utils/            # Shared helpers and error classes
│   ├── .env.example
│   └── docker-compose.yml
└── frontend/
    └── src/
        ├── api/              # Axios instance with refresh interceptor
        ├── features/         # Page-level components (auth, quiz, results)
        ├── store/            # Zustand stores
        └── utils/            # Token decoder, helpers
```
