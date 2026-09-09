# [Project name]

_Replace the heading above with the project's name, and this line with one sentence describing what this app does for users._

## Run & Operate

- `pnpm dev` — run the API server and the wedplan frontend together (each loads its own `.env` automatically, no manual `source` needed)
- `pnpm seed` — seed a default admin user (`SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD`, defaults to `admin@wedplan.test` / `changeme123`) and default Asoebi catalog items if none exist yet
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- Required env: copy `.env.example` to `.env` at the repo root and set `MONGODB_URI` (include the database name, e.g. `.../wedplan`) — shared by the API server and `pnpm seed`. Per-package `PORT`/`BASE_PATH` env vars live in `artifacts/api-server/.env` and `artifacts/wedplan/.env`.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: MongoDB (native `mongodb` driver, no ORM)
- Auth: custom email/password with scrypt hashing and Mongo-backed session cookies (no third-party auth provider)
- Validation: Zod (`zod/v4`)
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

_Populate as you build — short repo map plus pointers to the source-of-truth file for DB schema, API contracts, theme files, etc._

## Architecture decisions

_Populate as you build — non-obvious choices a reader couldn't infer from the code (3-5 bullets)._

## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

- All repository updates must go only to `SunnyAgaga/main0new` on the `MGUPDATE` branch. Do not push project updates to another repository or branch.

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
