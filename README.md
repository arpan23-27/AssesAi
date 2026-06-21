# AssesAI — Adaptive Assessment Platform

![CI](https://github.com/arpan23-27/AssesAi/actions/workflows/ci.yml/badge.svg)

An adaptive quiz platform that targets a learner's weakest concept, adjusts
question difficulty in real time using a transparent heuristic, and streams
AI-generated explanations for wrong answers.

**Live demo:** _coming soon_ — replace this line with your deployed URL once the
frontend is live (e.g. `https://assesai.vercel.app`).

<!--
  Demo GIF: record a 20–30s screen capture of one full quiz run (start a quiz →
  answer a few questions → get a streamed AI explanation → see the result) and
  drop it in `docs/demo.gif`, then uncomment the line below.
-->
<!-- ![AssesAI demo](docs/demo.gif) -->

## Run it in one command

Prerequisites: Docker + Docker Compose, and a [Groq API key](https://console.groq.com).

```bash
git clone https://github.com/arpan23-27/AssesAi.git
cd AssesAi
cp .env.example .env          # then set JWT_ACCESS_SECRET and GROQ_API_KEY
docker compose up --build
```

That brings up PostgreSQL, Redis, and the API. On boot the API container runs
migrations and seeds the question bank (288 questions across 4 technologies, 3
difficulty tiers each) automatically, then starts on **http://localhost:3000**
(health check at `/health`).

Generate a JWT secret with:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

The whole platform runs on a **single PostgreSQL database** plus Redis. All
answer grading and scoring happen on the server — the client is never trusted.

## Tech stack

| Layer            | Technology                                                    |
| ---------------- | ------------------------------------------------------------- |
| Frontend         | React 19, Zustand, TanStack Query, Vite                       |
| Backend          | Node.js, Express 5                                            |
| Database         | PostgreSQL (relational tables + JSONB for the question bank)  |
| Cache / sessions | Redis (access-token blacklist + AI explanation cache)        |
| Auth             | JWT access token + httpOnly refresh cookie, Argon2id          |
| AI               | Groq API (Llama 3.x) via the OpenAI-compatible SDK            |
| Tooling          | Docker Compose, ESLint, Prettier, Husky, Jest, GitHub Actions |

### Frontend (separate dev server)

The single-page app talks to the API via `VITE_API_URL` (defaults to
`http://localhost:3000/api`):

```bash
cd frontend
npm install
npm run dev      # http://localhost:5173
```

### Trying the API

Import `postman_collection.json` into Postman. Run **Auth → Login** first (its
test script stores the access token); the quiz and results requests reuse it
and chain `sessionId` / `questionId` automatically.

## Design choices & tradeoffs

**One database (PostgreSQL), not two.** The question bank originally lived in
MongoDB while everything else lived in Postgres. For a project of this size that
is operational overhead with no payoff: a question has a fixed shape, and the
only semi-structured fields (`options`, generation `metadata`) are stored as
**JSONB**. Consolidating also made the scoring query a single SQL JOIN between
`session_answers` and `questions` — impossible when the two sides of that join
lived in different engines.

**Server-authoritative scoring.** The client never sends a score. `correctCount`
and `score_percent` are recomputed from the `session_answers` table when a
session is completed, and each answer is graded on the server against the stored
`correct_index`. The correct answer is stripped from every question before it
leaves the API.

**Answers bound to the active session.** Each session tracks the
`current_question_id` that was served. An answer is rejected if it doesn't match
that question, if the question was already answered, or if it belongs to a
different technology — closing the door on IDOR and score tampering.

**Heuristic adaptation, not IRT.** Difficulty is driven by a transparent,
unit-tested rule: three correct answers in a row promote the learner one tier,
two wrong in a row demote one tier. Within a tier, the question whose difficulty
score is closest to the learner's running ability is chosen, and the weakest
concept is targeted first. If no question is available in the target tier, the
selector widens to the nearest adjacent tier rather than dead-ending, and every
session runs to a fixed length. This is deliberately a readable heuristic rather
than a calibrated psychometric model — it keeps latency low and behaviour
explainable.

**Refresh-token rotation.** Refresh tokens are single-use: every refresh issues a
new token and revokes the old one. Reuse of an already-revoked token revokes the
entire token family for that user. Token hashes are stored in PostgreSQL (not
Redis) so the revocation history survives restarts and supports reuse detection;
Redis holds only the short-lived access-token blacklist.

## API surface

| Method | Path                              | Auth   | Notes                                 |
| ------ | --------------------------------- | ------ | ------------------------------------- |
| POST   | `/api/auth/register`              | —      | Argon2id password hashing             |
| POST   | `/api/auth/login`                 | —      | Returns access token + refresh cookie |
| POST   | `/api/auth/refresh`               | cookie | Rotates the refresh token             |
| POST   | `/api/auth/logout`                | yes    | Revokes refresh token, blacklists JTI |
| POST   | `/api/quiz/sessions`              | yes    | Start a session                       |
| POST   | `/api/quiz/sessions/:id/answer`   | yes    | Graded server-side                    |
| POST   | `/api/quiz/sessions/:id/complete` | yes    | Score recomputed from the database    |
| GET    | `/api/results/sessions/:id`       | yes    | Session result                        |
| GET    | `/api/results/mastery`            | yes    | Per-concept mastery                   |
| POST   | `/api/ai/explain`                 | yes    | SSE; gated to genuinely-wrong answers |
| POST   | `/api/ai/generate`                | admin  | Generate a question (`pending_review`)|

Every request body and path parameter is validated with Zod; all errors flow
through a single Express error-handling middleware that returns a consistent
JSON shape (`{ error: { code, message, details } }`). AI endpoints are
rate-limited per user to protect Groq API credits.

The `/api/ai/generate` endpoint is admin-only. Seed an admin user by setting
`ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env` before the seed step runs (the
docker-compose boot sequence runs it automatically); generated questions are
persisted with `source = 'ai_generated'` and `status = 'pending_review'`.

## Running tests

```bash
cd backend
npm test          # adaptive unit tests + auth & quiz integration tests
```

The adaptive-logic tests are pure and need no infrastructure. The integration
tests require PostgreSQL and Redis; CI provisions both as service containers.

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
├── docker-compose.yml          # one-command app + postgres + redis
├── postman_collection.json
├── .github/workflows/ci.yml
├── backend/
│   └── src/
│       ├── config/             # db, redis, AI client
│       ├── middleware/         # auth, validation, rate limiting, RBAC, errors
│       ├── migrations/         # ordered SQL (run by src/migrate.js)
│       ├── modules/            # auth, quiz, ai, results
│       ├── repositories/       # data-access layer (all PostgreSQL)
│       ├── seeds/              # technologies + question bank + admin
│       ├── tests/              # Jest unit + integration tests
│       └── migrate.js          # idempotent migration runner
└── frontend/
    └── src/
        ├── api/                # axios instance with refresh interceptor
        ├── features/           # auth, quiz, results pages
        └── store/              # Zustand stores
```
