# WedPlan

Wedding platform — a public site where guests RSVP, order Aso Ebi and send gifts, plus an
admin dashboard.

```
backend/     Express 5 API + MongoDB (also serves the built frontend)
frontend/    React 19 + Vite
shared/      Zod schemas + OpenAPI spec
```

## Run locally

```bash
npm install
docker run -d --name wedplan-mongo -p 27017:27017 mongo:7   # or use Atlas
cp .env.example .env
npm run seed        # first time — creates the admin login
npm run dev
```

Open **http://localhost:5173** (not 8080 — Vite proxies `/api` to the backend).
Sign in at `/sign-in` with `admin@wedplan.test` / `changeme123`.

## Configuration

`.env` in the repo root. The app loads it on startup — no flags needed.

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | yes | Connection string |
| `MONGODB_DB` | yes | Database name — `MONGODB_DB`, not `MONGODB_DB_NAME` |
| `PORT` | yes | Backend port |
| `NODE_ENV` | no | `production` for JSON logs |
| `LOG_LEVEL` | no | Default `info` |
| `FRONTEND_PORT` | no | Vite dev port, default 5173 |

Flutterwave keys are **not** env vars — they live in the database, set from
`/dashboard/payments`.

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Both dev servers |
| `npm run build` | Build both |
| `npm run start` | Run the built app |
| `npm run seed` | Create admin user + sample data |
| `npm run typecheck` | Typecheck all workspaces |
| `npm run codegen` | Regenerate API client from `shared/openapi.yaml` |

Target one workspace with `-w`, e.g. `npm run build -w @wedplan/backend`.

## Deploy

Ubuntu VM, one port behind nginx. The backend serves the API *and* the frontend, so it's
a single process.

**Prerequisites**

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs nginx git
sudo npm i -g pm2
```

**Deploy**

```bash
git clone <repo-url> /var/www/wedplan
cd /var/www/wedplan
npm install
cp .env.example .env && nano .env          # MONGODB_URI, MONGODB_DB, PORT=8080
npm run build

SEED_ADMIN_EMAIL=you@example.com SEED_ADMIN_PASSWORD='strong-password' npm run seed

pm2 start backend/dist/index.mjs --name wedplan
pm2 save && pm2 startup                     # run the command it prints
```

Verify: `curl localhost:8080/api/healthz` → `{"status":"ok"}`

**nginx** — `/etc/nginx/sites-available/wedplan`:

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    client_max_body_size 25m;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -sf /etc/nginx/sites-available/wedplan /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

sudo certbot --nginx -d yourdomain.com --redirect
sudo ufw allow OpenSSH && sudo ufw allow 'Nginx Full' && sudo ufw enable
```

**Redeploy**

```bash
cd /var/www/wedplan && git pull
npm install && npm run build
pm2 restart wedplan
```

`pm2 status` · `pm2 logs wedplan` · `pm2 restart wedplan` (needed after editing `.env`)

## Troubleshooting

**Page loads, no data** — in dev you opened 8080 instead of 5173, or the backend is down.
Check `curl localhost:8080/api/healthz`.

**`MONGODB_URI must be set`** — no `.env` in the repo root.

**Atlas won't connect (TLS error / `ReplicaSetNoPrimary`)** — your IP isn't allowlisted.
Atlas → Network Access. Free clusters also auto-pause when idle.

**Dashboard returns 401** — not signed in, or no admin user yet (`npm run seed`).

**API client changes don't apply** — `shared/src/generated/` is generated. Edit
`shared/openapi.yaml` and run `npm run codegen`.

---

See [CLAUDE.md](CLAUDE.md) for architecture and conventions before making changes.
