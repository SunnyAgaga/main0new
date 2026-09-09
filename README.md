# WedPlan

A wedding platform: a public event site where guests RSVP, order Aso Ebi and send cash
gifts, plus an admin dashboard for tracking RSVPs, payments and team members.

```
backend/     Express 5 API + MongoDB
frontend/    React 19 + Vite
shared/      Zod schemas + OpenAPI spec (used by both)
```

---

## Requirements

- **Node.js 22+** — `node -v`
- **MongoDB** — either Docker locally, or a MongoDB Atlas cluster
- npm (ships with Node; this project uses npm workspaces, not pnpm or yarn)

---

## Quick start

```bash
# 1. install
npm install

# 2. start a local MongoDB (skip if using Atlas)
docker run -d --name wedplan-mongo -p 27017:27017 mongo:7

# 3. configure
cp .env.example .env

# 4. seed demo data (admin user + Aso Ebi items)
npm run seed

# 5. run
npm run dev
```

Open **<http://localhost:5173>**.

> Use port **5173**, not 8080. The frontend calls the API on relative `/api/...` paths,
> and Vite proxies those to the backend. Opening 8080 directly gives you the bare API.

Sign in at `/sign-in` with the seeded account:

```
admin@wedplan.test / changeme123
```

Change this before deploying anywhere real — set `SEED_ADMIN_EMAIL` and
`SEED_ADMIN_PASSWORD` before running `npm run seed`.

---

## Configuration

Create `.env` in the repo root:

```ini
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=wedplan
PORT=8080
BASE_PATH=/
NODE_ENV=development
LOG_LEVEL=info
```

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | yes | Connection string. The server exits on startup without it. |
| `MONGODB_DB` | yes | Database name. |
| `PORT` | yes | Port the API listens on. |
| `BASE_PATH` | yes | Path the app is served from. `/` for a root domain. |
| `NODE_ENV` | no | `production` switches logs to JSON. |
| `LOG_LEVEL` | no | `fatal`\|`error`\|`warn`\|`info`\|`debug`\|`trace`. Default `info`. |
| `FRONTEND_PORT` | no | Vite dev-server port. Default `5173`. |

Both the backend and the Vite config read this same root `.env`. Restart after editing
it — it is read once at startup.

Flutterwave payment keys are **not** environment variables. They are stored in the
database and edited from the dashboard at `/dashboard/payments`.

### Using MongoDB Atlas

Put your connection string in `MONGODB_URI`. If the server can't connect and you see a
TLS error or `ReplicaSetNoPrimary`, your IP almost certainly isn't allowlisted — add it
under **Atlas → Network Access**. Free clusters also pause themselves when idle and need
resuming.

---

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Backend and frontend dev servers together |
| `npm run build` | Build both for production |
| `npm run start` | Run the built backend |
| `npm run seed` | Create the admin user and sample Aso Ebi items |
| `npm run typecheck` | Typecheck all workspaces |
| `npm run codegen` | Regenerate the API client from `shared/openapi.yaml` |

Run against one workspace with `-w`:

```bash
npm run build -w @wedplan/backend
npm run dev   -w @wedplan/frontend
```

---

## Production

Build, then run the backend and serve the frontend.

```bash
npm install
npm run build
npm run start
```

`npm run build` emits:

- `backend/dist/` — bundled Node server
- `frontend/dist/public/` — static assets

The API does **not** serve the frontend, so put a reverse proxy in front that routes
`/api` to the backend and everything else to the static files. Minimal nginx:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    root /var/www/wedplan/frontend/dist/public;

    location /api {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri $uri/ /index.html;   # SPA fallback
    }
}
```

Add TLS with `sudo certbot --nginx -d yourdomain.com --redirect`.

Keep the API running with a process manager, e.g. pm2:

```bash
npm i -g pm2
cd backend
pm2 start dist/index.mjs --name wedplan --node-args="--env-file-if-exists=../.env"
pm2 save && pm2 startup
```

Firewall:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

---

## Troubleshooting

**The page loads but no data appears.** You opened port 8080 instead of 5173, or the
backend isn't running. Check `curl localhost:8080/api/healthz`.

**`MONGODB_URI must be set`.** No `.env` in the repo root, or it's missing that line.

**Dashboard returns 401.** You're not signed in, or the session expired. Sign in at
`/sign-in`. Run `npm run seed` if no admin user exists yet.

**Changes to the API client don't show up.** `shared/src/generated/` is generated code —
edit `shared/openapi.yaml` and run `npm run codegen` instead.

---

Contributors: see [CLAUDE.md](CLAUDE.md) for architecture, conventions, and decisions
that have already been made and reversed once.
