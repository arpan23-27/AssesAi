# AssesAI - Adaptive Assessment Platform
![CI](https://github.com/arpan23-27/AssesAi/actions/workflows/ci.yml/badge.svg)
An adaptive quiz platform that targets a learner's weakest concept, adjusts
question difficulty in real time using a transparent heuristic, and streams
AI-generated explanations for wrong answers.

The whole platform runs on a **single PostgreSQL database** plus Redis. All
answer grading and scoring happen on the server â€” the client is never trusted.

## Tech stack

| Layer            | Technology                                                    |
| ---------------- | ------------------------------------------------------------- |
| Frontend         | React 19, Zustand, TanStack Query, Vite                       |
| Backend          | Node.js, Express 5                                            |
| Database         | PostgreSQL (relational tables + JSONB for the question bank)  |
| Cache / sessions | Redis (access-token blacklist + AI explanation cache)        |
| Auth             | JWT access token + httpOnly refresh cookie, Argon2id          |
| AI               | Groq API (Llama / Mixtral) via the OpenAI-compatible SDK      |
| Tooling          | Docker Compose, ESLint, Prettier, Husky, Jest, GitHub Actions |

## Quick start (one command)

Prerequisites: Docker + Docker Compose, and a [Groq API key](https://console.groq.com).

```bash
git clone https://github.com/arpan23-27/AssesAi.git
cd AssesAi
cp .env.example .env          # then set JWT_ACCESS_SECRET and GROQ_API_KEY
docker compose up --build
```

That brings up PostgreSQL, Redis, and the API. On boot the API container runs
migrations and seeds the question bank automatically, then starts on
**http://localhost:3000** (health check at `/health`).

Generate a JWT secret with:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Frontend (separate dev server)

The single-page app talks to the API at `http://localhost:3000`:

```bash
cd frontend
npm install
npm run dev      # http://localhost:5173
```

### Trying the API

Import `postman_collection.json` into Postman. Run **Auth â†’ Login** first (its
test script stores the access token); the quiz and results requests reuse it
and chain `sessionId` / `questionId` automatically.

## Design choices & tradeoffs

**One database (PostgreSQL), not two.** The question bank originally lived in
MongoDB while everything else lived in Postgres. For a project of this size that
is operational overhead with no payoff: a question has a fixed shape, and the
only semi-structured fields (`options`, generation `metadata`) are stored as
**JSONB**. Consolidating also made the scoring query a single SQL JOIN between
`session_answers` and `questions` â€” impossible when the two sides of that join
lived in different engines.

**Server-authoritative scoring.** The client never sends a score. `correctCount`
and `score_percent` are recomputed from the `session_answers` table when a
session is completed, and each answer is graded on the server against the stored
`correct_index`. The correct answer is stripped from every question before it
leaves the API.

**Answers bound to the active session.** Each session tracks the
`current_question_id` that was served. An answer is rejected if it doesn't match
that question, if the question was already answered, or if it belongs to a
different technology â€” closing the door on IDOR and score tampering.

**Heuristic adaptation, not IRT.** Difficulty is driven by a transparent,
unit-tested rule: three correct answers in a row promote the learner one tier,
two wrong in a row demote one tier. Within a tier, the question whose difficulty
score is closest to the learner's running ability is chosen, and the weakest
concept is targeted first. This is deliberately a readable heuristic rather than
a calibrated psychometric model â€” it keeps latency low and behaviour explainable.

**Refresh-token rotation.** Refresh tokens are single-use: every refresh issues a
new token and revokes the old one. Reuse of an already-revoked token revokes the
entire token family for that user. Token hashes are stored in PostgreSQL (not
Redis) so the revocation history survives restarts and supports reuse detection;
Redis holds only the short-lived access-token blacklist.

## API surface

| Method | Path                              | Auth   | Notes                                 |
| ------ | --------------------------------- | ------ | ------------------------------------- |
| POST   | `/api/auth/register`              | â€”      | Argon2id password hashing             |
| POST   | `/api/auth/login`                 | â€”      | Returns access token + refresh cookie |
| POST   | `/api/auth/refresh`               | cookie | Rotates the refresh token             |
| POST   | `/api/auth/logout`                | yes    | Revokes refresh token, blacklists JTI |
| POST   | `/api/quiz/sessions`              | yes    | Start a session                       |
| POST   | `/api/quiz/sessions/:id/answer`   | yes    | Graded server-side                    |
| POST   | `/api/quiz/sessions/:id/complete` | yes    | Score recomputed from the database    |
| GET    | `/api/results/sessions/:id`       | yes    | Session result                        |
| GET    | `/api/results/mastery`            | yes    | Per-concept mastery                   |
| POST   | `/api/ai/explain`                 | yes    | SSE; gated to genuinely-wrong answers |
| POST   | `/api/ai/generate`                | admin  | Generate a new question               |

Every request body and path parameter is validated with Zod; all errors flow
through a single Express error-handling middleware that returns a consistent
JSON shape (`{ error: { code, message, details } }`). AI endpoints are
rate-limited per user to protect Groq API credits.

## Running tests

```bash
cd backend
npm test          # adaptive unit tests + auth integration (login -> refresh -> logout)
```

The adaptive-logic tests are pure and need no infrastructure. The auth
integration tests require PostgreSQL and Redis; CI provisions both as service
containers.

## Code quality

- **ESLint + Prettier** for both backend and frontend.
- **Husky + lint-staged** run ESLint and Prettier on staged files before every commit.
- **GitHub Actions** lints both packages, checks formatting, and runs the backend
  test suite against real Postgres and Redis containers on every push.

Install the git hooks once at the repo root:

```bash
npm install        # runs husky setup via the prepare script
```

## Known limitations & future scope

- **Option order is not shuffled per learner.** The server is the source of truth
  for correctness, but a fixed option order makes "the answer is always B"
  memorisable. A server-side shuffle that remembers the permutation per served
  question is the right fix.
- **SSE streaming does not scale horizontally.** AI explanations stream from a
  single instance; a shared pub/sub layer would be needed to run multiple API
  replicas behind a load balancer.
- **Difficulty tiering is coarse.** Promotion/demotion thresholds are fixed
  constants. A calibrated model (true IRT, or Bayesian knowledge tracing) would
  adapt more smoothly, at the cost of latency and explainability.
- **No admin UI for question review.** AI-generated questions land in
  `pending_review` status but must currently be promoted to `active` directly in
  the database.

## Project structure

```
AssesAi/
â”œâ”€â”€ docker-compose.yml          # one-command app + postgres + redis
â”œâ”€â”€ postman_collection.json
â”œâ”€â”€ .github/workflows/ci.yml
â”œâ”€â”€ backend/
â”‚   â””â”€â”€ src/
â”‚       â”œâ”€â”€ config/             # db, redis, AI client
â”‚       â”œâ”€â”€ middleware/         # auth, validation, rate limiting, RBAC, errors
â”‚       â”œâ”€â”€ migrations/         # ordered SQL (run by src/migrate.js)
â”‚       â”œâ”€â”€ modules/            # auth, quiz, ai, results
â”‚       â”œâ”€â”€ repositories/       # data-access layer (all PostgreSQL)
â”‚       â”œâ”€â”€ seeds/              # technologies + question bank
â”‚       â”œâ”€â”€ tests/              # Jest unit + integration tests
â”‚       â””â”€â”€ migrate.js          # idempotent migration runner
â””â”€â”€ frontend/
    â””â”€â”€ src/
        â”œâ”€â”€ api/                # axios instance with refresh interceptor
        â”œâ”€â”€ features/           # auth, quiz, results pages
        â””â”€â”€ store/              # Zustand stores
```

