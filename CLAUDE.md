# WedPlan

Wedding platform. A public event site where guests RSVP, order Aso Ebi and send cash
gifts, plus an admin dashboard for tracking RSVPs, payments and team members.

---

## Read this before changing anything

This repo has been restructured once already, and several past changes were later
undone. To save you rediscovering it:

- **It used to be a Replit project.** All Replit config has been deliberately removed
  (`.replit`, `.replitignore`, `replit.md`, `.agents/`, `@replit/*` vite plugins,
  `REPL_ID` gating, `.replit-artifact/` folders). **Do not re-add any of it.** If the
  repo is still being synced from Replit, that sync will fight this structure — settle
  that before doing large work here.
- **It used to use pnpm.** It is now npm workspaces, on purpose. The pnpm lockfile only
  recorded `linux-x64` builds of rollup/esbuild/tailwind-oxide/lightningcss, so
  `pnpm install` on macOS produced a broken tree that failed with
  `Cannot find module @rollup/rollup-darwin-x64`. `supportedArchitectures` did not fix
  it. **Do not migrate back to pnpm.**
- **It used to use PostgreSQL + Drizzle.** Now MongoDB. There is no migration step and
  no `drizzle.config.ts`. Don't reintroduce an ORM without a reason.
- **Clerk was added and then removed.** Auth is now hand-rolled sessions (below). Don't
  assume Clerk is present because you saw it in git history.

---

## Layout

```
backend/     Express 5 API, MongoDB access, seed script
frontend/    React 19 + Vite SPA
shared/      Zod schemas + OpenAPI spec + orval codegen
```

Three npm workspaces. `shared` exists as its own package **only** because both sides
import it (`@wedplan/shared`). Backend-only code belongs in `backend/`, frontend-only in
`frontend/` — don't add packages without that same justification.

`@/` maps to `src/` in both `backend` and `frontend`.

---

## Run

```bash
npm install
docker run -d --name wedplan-mongo -p 27017:27017 mongo:7   # or point MONGODB_URI at Atlas
cp .env.example .env
npm run build
npm run dev
```

Open **http://localhost:5173** — not 8080. Vite proxies `/api` to the backend so the app
and API share an origin in dev.

| Command | Does |
|---|---|
| `npm run dev` | both dev servers |
| `npm run build` | build both |
| `npm run start` | run the built backend |
| `npm run seed` | seed admin user + Aso Ebi items |
| `npm run typecheck` | typecheck every workspace |
| `npm run codegen` | regenerate API client from `shared/openapi.yaml` |

Single workspace: `npm run build -w @wedplan/backend`.

Seeded admin: **`admin@wedplan.test` / `changeme123`** (override with `SEED_ADMIN_EMAIL`
/ `SEED_ADMIN_PASSWORD`). Change this before any real deployment.

---

## Environment

Root `.env`, loaded by the backend via `node --env-file-if-exists`.

| Var | Required | Notes |
|---|---|---|
| `MONGODB_URI` | yes | throws on startup if missing |
| `MONGODB_DB` | yes | database name |
| `PORT` | yes | backend port (8080 in dev) |
| `BASE_PATH` | yes | `/` for a root domain |
| `NODE_ENV` | no | `production` enables JSON logs |
| `LOG_LEVEL` | no | defaults to `info` |

**Vite does not read `.env` for `PORT`/`BASE_PATH`.** Vite's `.env` handling only covers
`VITE_`-prefixed *client* vars; `vite.config.ts` reads `process.env`, which a `.env` file
does not populate. Those two must be real shell env vars — that is why the dev/build
scripts set them inline. Adding them to `.env` will not work.

**Payment keys are not env vars.** Flutterwave secret/webhook keys live in the
`payment_configs` collection, edited from the dashboard. Don't add `FLW_*` env vars.

---

## Architecture

**Two processes.** The API mounts everything under `/api` and does **not** serve the
frontend build. Vite's proxy joins them in dev. In production either put a reverse proxy
in front, or add `express.static` + an SPA fallback to `backend/src/app.ts` — a one-port
setup existed at one point and was reverted, so pick one deliberately.

**Data.** `backend/src/db/`. Collections are created on demand; there is no migration
step. Indexes are declared in `db/client.ts` and created at startup. Collections:
`users`, `sessions`, `asoebi_items`, `rsvps`, `orders`, `payment_configs`, `counters`.

Documents use **numeric `id` fields**, not Mongo `_id`, allocated by
`db/counters.ts` (`nextSequence`). This is deliberate — the OpenAPI contract types every
`id` as `number`. If you switch to `ObjectId`, you must also change `shared/openapi.yaml`,
regenerate, and update the frontend.

**Auth.** Hand-rolled. `POST /api/auth/login` verifies a scrypt hash and sets an
httpOnly `wedplan_session` cookie; `requireAuth` resolves it against the `sessions`
collection. Only `/api/admin/*` is protected — everything else is public, including all
guest flows. Bear that in mind before exposing the dashboard.

**Payments.** Flutterwave. `POST /api/checkout/flutterwave` creates a `WED-<uuid>`
reference and returns a redirect URL; `POST /api/webhooks/flutterwave` confirms it. The
webhook authenticates by comparing the `verif-hash` header to the stored secret — it is
a plain equality check, not an HMAC, so treat the stored secret as sensitive.

**Generated code.** `shared/src/generated/` is produced by orval from
`shared/openapi.yaml`. **Never hand-edit it.** Change the spec, run `npm run codegen`.

---

## Frontend

Routing is `wouter` in `frontend/src/App.tsx`. Pages in `frontend/src/pages/`:
`/` (home), `/rsvp`, `/cart`, `/gift`, `/sign-in`, `/dashboard`, `/dashboard/payments`,
`/dashboard/team`.

UI is shadcn/ui + Tailwind v4 in `src/components/ui/`. Those files carry inline comments
marking local deviations from stock shadcn — keep them when editing.

API calls go through the generated hooks from `@/api`, which use relative `/api/...`
paths and never set a base URL. **The frontend therefore requires same-origin with the
API.** That is why the Vite proxy exists, and why production needs a reverse proxy or
single-port serving.

---

## Gotchas that have actually bitten

- **Express 5**: `app.get('*')` throws at startup (`Missing parameter name at index 1`).
  Use `'/*splat'` — and note `'/*splat'` does **not** match `/` itself, so a naive SPA
  fallback 404s the homepage. An `app.use()` middleware avoids both.
- **Restart after schema/index changes.** Pooled connections cache stale state; changes
  can appear to have no effect until the process restarts.
- **MongoDB Atlas TLS alert 80 / `ReplicaSetNoPrimary`** means your IP is not in Atlas
  → Network Access, not a bad password. Free clusters also auto-pause when idle.
- **`.env` changes need a backend restart** — it is read once at startup.
- Don't run `npm audit fix --force`; it will happily downgrade or bump majors here.

---

## Conventions

- Add an endpoint: route file in `backend/src/routes/`, register in `routes/index.ts`,
  add it to `shared/openapi.yaml`, then `npm run codegen`.
- Add a collection: schema + accessor in `backend/src/db/schema/`, export from
  `db/index.ts`, add indexes to `db/client.ts`.
- Validate request bodies with the Zod schemas from `@wedplan/shared` — every existing
  route does, keep it that way.
- Log via the `pino` logger (`req.log` inside handlers), not `console.log`.
