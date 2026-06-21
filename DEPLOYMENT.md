# Deploying AssesAI

This is the runbook for putting AssesAI online: the **API + PostgreSQL + Redis**
on [Render](https://render.com) (via the included `render.yaml` Blueprint) and
the **frontend** on [Vercel](https://vercel.com) (or Netlify). Everything here
requires logging into your own accounts and clicking deploy, so these are steps
only you can perform.

The repo already contains the config: `render.yaml` (API + managed Postgres +
managed Key Value), `frontend/vercel.json`, and `frontend/netlify.toml`.

---

## 0. Before you start

You'll need:

- A **Groq API key** — https://console.groq.com (free tier is fine).
- A **Render** account and a **Vercel** (or Netlify) account.
- This repo pushed to GitHub (Render and Vercel both deploy from your repo).

The two services talk across different domains, so two values must agree:

| Value           | Lives on  | Must be set to                                  |
| --------------- | --------- | ----------------------------------------------- |
| `VITE_API_URL`  | Frontend  | the API's URL **with `/api`** appended          |
| `CLIENT_ORIGIN` | API       | the frontend's URL (no trailing slash)          |

Because each needs the other's URL, deploy the **API first**, then the
frontend, then come back and set `CLIENT_ORIGIN`.

---

## 1. Deploy the API on Render (Blueprint)

1. Push this branch to GitHub if you haven't.
2. In the Render dashboard: **New → Blueprint**, and connect this repository.
   Render reads `render.yaml` at the repo root and shows three resources to
   create: `assesai-api`, `assesai-postgres`, `assesai-keyvalue`.
3. You'll be prompted for the `sync: false` values:
   - `GROQ_API_KEY` — paste your Groq key.
   - `CLIENT_ORIGIN` — you don't know the frontend URL yet; enter a placeholder
     like `https://example.com` for now (you'll fix it in step 3).
   - `ADMIN_EMAIL` / `ADMIN_PASSWORD` — optional. Set them if you want the
     admin-only `/api/ai/generate` endpoint; otherwise leave blank.
   - `JWT_ACCESS_SECRET` is generated automatically (`generateValue: true`).
4. Click **Apply / Deploy Blueprint**. On first boot the API container runs
   migrations and seeds the 288-question bank automatically (the
   `dockerCommand` in `render.yaml` does `migrate → seed → start`).
5. When it's live, note the API URL, e.g. `https://assesai-api.onrender.com`.
   Confirm `https://assesai-api.onrender.com/health` returns OK.

> The region in `render.yaml` is `singapore`; change all three resources to the
> same region if you prefer one closer to you. Free PostgreSQL expires 30 days
> after creation — upgrade the database before then to keep your data.

---

## 2. Deploy the frontend on Vercel

1. In Vercel: **Add New → Project**, import this repo.
2. Set **Root Directory** to `frontend`. Vercel auto-detects Vite; `vercel.json`
   already pins the build (`vite build`), output (`dist`), and the SPA rewrite.
3. Add an **Environment Variable**:
   - `VITE_API_URL` = your API URL **plus `/api`**, e.g.
     `https://assesai-api.onrender.com/api`
4. Deploy. Note the frontend URL, e.g. `https://assesai.vercel.app`.

**Netlify instead?** Import the repo, set base directory to `frontend`, add the
same `VITE_API_URL` env var. `netlify.toml` supplies the build command and SPA
redirect.

---

## 3. Wire the two together

1. Back in Render → `assesai-api` → **Environment**, set:
   - `CLIENT_ORIGIN` = your real frontend URL, e.g. `https://assesai.vercel.app`
     (comma-separate if you also want Vercel preview URLs to work).
2. Save and let the API redeploy.

That's it — the refresh cookie is configured for cross-site use automatically
(`SameSite=None; Secure` in production), so login/refresh/logout work across the
two domains. If you ever serve both from the *same* site, set
`COOKIE_SAMESITE=lax` on the API instead.

---

## 4. (Optional) Enable AI question generation

`/api/ai/generate` is admin-only. To use it:

1. On Render → `assesai-api` → Environment, set `ADMIN_EMAIL` and
   `ADMIN_PASSWORD`, then redeploy. The seed step promotes that user to admin on
   every boot (idempotent).
2. Log in with those credentials to get an access token, then call
   `POST /api/ai/generate`. Generated questions are saved with
   `status = 'pending_review'`; promote them to `active` in the database when
   you're happy with them.

---

## 5. Smoke test

- [ ] `GET /health` on the API returns OK.
- [ ] Register and log in from the deployed frontend.
- [ ] Start a quiz, answer several questions, reach a result screen.
- [ ] Answer enough correctly to get promoted to **advanced** — the quiz should
      keep serving harder questions (the old dead-end bug is gone).
- [ ] Trigger an AI explanation on a wrong answer (it streams in).
- [ ] Refresh the page mid-session; you stay logged in (refresh cookie works).

> Free Render web services cold-start after inactivity, so the very first
> request after idle can take ~30–60s. Worth knowing before you demo it live.

---

## 6. Update the GitHub repo description (do this yourself)

The current description mentions "IRT-inspired scoring" and "MongoDB", neither of
which matches the code. Replace the **About** blurb on the GitHub repo page with
something like:

> Adaptive quiz platform with transparent heuristic difficulty adaptation and
> streamed AI explanations. Node/Express + React, single PostgreSQL + Redis,
> server-authoritative scoring, JWT refresh-token rotation.

Suggested topics/tags: `react`, `nodejs`, `express`, `postgresql`, `redis`,
`jwt`, `adaptive-learning`, `docker`.

---

## 7. Record the demo GIF (do this yourself)

A short clip on the README does more than any paragraph. Record a **20–30s**
screen capture of one full run:

1. Log in → start a quiz.
2. Answer a few questions (include one wrong answer so the streamed AI
   explanation shows up).
3. Land on the result screen.

Save it as `docs/demo.gif`, then uncomment the image line near the top of
`README.md`. Tools: Kap or Gifox (macOS), ScreenToGif (Windows), or Peek (Linux);
keep it under ~5 MB so it loads fast on GitHub.

---

## Troubleshooting

- **Login works but you get logged out on refresh** → `CLIENT_ORIGIN` on the API
  doesn't exactly match the frontend origin, or you're on HTTP. The cross-site
  cookie needs HTTPS on both sides (Render and Vercel both provide it).
- **CORS errors in the browser console** → `CLIENT_ORIGIN` must list the exact
  frontend origin (scheme + host, no trailing slash, no path).
- **Frontend calls 404 / hit the wrong host** → `VITE_API_URL` must include the
  `/api` suffix and is baked in at build time, so re-deploy the frontend after
  changing it.
- **AI endpoints return 401/empty** → check `GROQ_API_KEY` is set on the API.
