# WedPlan Wedding Platform

WedPlan helps couples host a beautiful, organised wedding experience with guest registration, RSVP tracking, campaign planning, Aso Ebi ordering, and payment progress in one place.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — source of truth for the WedPlan API and generated client hooks.
- `lib/db/src/schema/wedding.ts` — wedding, guest, notification, Aso Ebi, and order persistence models.
- `artifacts/api-server/src/routes/wedding.ts` — endpoint handlers and first-run example data.
- `artifacts/wedplan/src/` — guest-facing wedding site and organizer dashboard routes.
- `artifacts/wedplan/src/pages/Settings.tsx` — editable public-page copy, hero background selection, and workspace menu labels.
- `artifacts/wedplan/src/pages/CheckIn.tsx` — QR-linked guest arrival confirmation for the white-wedding date.

## Architecture decisions

- The public event site and organizer workspace share the same wedding data and API, so guest activity is immediately visible to the planning team.
- The first release stores notification campaigns and payment/order progress internally; live delivery or payment collection should be connected through a provider before production use.
- Seed data is added on first API use so the preview starts with a realistic, usable wedding workspace.
- Wedding settings are stored as calendar-date strings, keeping the displayed wedding day stable across timezones.
- Guest arrival check-in is gated by the white-wedding calendar date in the Africa/Lagos timezone and requires the registered email address.

## Product

- A wedding homepage with a live event countdown, venue details, RSVP registration, and Aso Ebi browsing.
- A workspace for tracking guests, attendance progress, communications, Aso Ebi stock and orders, and collected order payments.
- A settings page that publishes edits to wedding copy, the hero image, and all workspace navigation labels.
- A printable QR code that opens a protected event-day guest check-in page.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
