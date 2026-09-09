# WedPlan

Wedding platform: a public event site where guests RSVP and order Aso Ebi, plus an
organiser dashboard for tracking guests, payments and team members.

## Layout

```
backend/     Express 5 API + MongoDB access + seed script
frontend/    React 19 + Vite SPA
shared/      Zod schemas, OpenAPI spec, orval codegen config
```

Three npm workspaces. `shared` is imported by both sides as `@wedplan/shared`, which is
why it exists as its own package rather than living in one of them.

## Run

```bash
npm install
docker run -d --name wedplan-mongo -p 27017:27017 mongo:7   # or point at Atlas
cp .env.example .env

npm run build          # backend + frontend
npm run dev            # both dev servers
```

Open **http://localhost:5173** — not 8080. Vite proxies `/api` to the backend, so the
app and API share an origin in development.

| Command | Does |
|---|---|
| `npm run dev` | backend + frontend dev servers |
| `npm run build` | build both |
| `npm run start` | run the built backend |
| `npm run seed` | seed demo data |
| `npm run typecheck` | typecheck every workspace |
| `npm run codegen` | regenerate the API client from `shared/openapi.yaml` |

Target a single workspace with `-w`, e.g. `npm run build -w @wedplan/backend`.

## Environment

Root `.env`, read by the backend via `node --env-file-if-exists`.

| Var | Required | Notes |
|---|---|---|
| `MONGODB_URI` | yes | throws on startup if missing |
| `MONGODB_DB` | yes | database name |
| `PORT` | yes | backend port (8080 in dev) |
| `BASE_PATH` | yes | `/` for a root domain |
| `NODE_ENV` | no | `production` enables JSON logs |
| `LOG_LEVEL` | no | defaults to `info` |

Vite does **not** read `.env` for `PORT`/`BASE_PATH` — its own `.env` handling only
covers `VITE_`-prefixed client vars. The frontend dev/build scripts need them as real
shell env vars.

## Architecture

- The API mounts everything under `/api` and does **not** serve the frontend build. In
  development Vite's proxy joins them; in production put a reverse proxy in front, or
  add `express.static` to the backend.
- Data access lives in `backend/src/db`. Collections are created on demand — there is no
  migration step.
- `shared/src/generated` is produced by orval from `shared/openapi.yaml`. Don't hand-edit
  it; change the spec and run `npm run codegen`.
- Payments go through Flutterwave (`/api/checkout/*`, `/api/webhooks/flutterwave`).
- Auth is session-based via `/api/auth/login`. Only `/api/admin/*` requires it.

## Gotchas

- **Express 5**: `app.get('*')` throws (`Missing parameter name`). Use `'/*splat'`, or an
  `app.use()` middleware — and note `'/*splat'` does not match `/` itself.
- **Path alias**: `@/` maps to `src/` in both `backend` and `frontend`.
- After changing `.env`, restart the backend — it reads the file once at startup.
