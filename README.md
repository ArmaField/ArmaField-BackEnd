# ARMAFIELD Backend

Game backend and admin panel for the [ARMAFIELD](https://reforger.armaplatform.com/workshop/68FA258A6C74CE73-ArmaField) mod for Arma Reforger.

Built with Next.js 16, PostgreSQL, Prisma, Auth.js (Steam OpenID) and bundled with Caddy for automatic HTTPS.

## What it does

- **Game API** (`/api/connect`, `/api/loadout`, `/api/items`, `/api/purchase`, `/api/stats/*`, ...) - called by the Arma Reforger Server to manage players, loadouts, XP, purchases and statistics.
- **Admin panel** - manage servers, weapons, attachments, gadgets, grenades, players, roles, backups; all via a web UI with Steam login.
- **Test mode** - stateless mode that returns a default loadout from static data without touching the database, useful for local testing and the public playground.
- **Scheduled backups** - automatic PostgreSQL dumps on a cron schedule (local DB only).

## Public test backend

You don't need to deploy anything just to try the mod. The mod ships with a default config that points at **[test.armafield.gg](https://test.armafield.gg)** and a built-in server token. This is a dedicated public instance running with `ARMAFIELD_TEST_MODE` - no database, no persistence, everyone gets the default loadout and infinite XP.

Use it to:
- Verify the mod installs and connects correctly.
- Test custom maps / missions without setting up your own backend.
- Playtest loadouts, XP flow, purchases (purchases are fake - state resets on every request).

For real servers with persistent player progression you'll want your own backend - see [deployment](#production-deployment) below.

## Two deployment modes

The stack runs under Docker Compose. The `db` service is **opt-in** via a profile.

1. **Local database** (self-contained, easy for test/dev/small servers):
   ```
   docker compose --profile local-db up -d --build
   ```
   Spins up `app` + `db` (PostgreSQL 16) + `caddy`. Data persists in `./data/postgres`.

2. **External database** (recommended for production - RDS, Supabase, managed Postgres, etc.):
   Set `DATABASE_URL` in `.env`, then:
   ```
   docker compose up -d --build
   ```
   Only `app` + `caddy` start. The `db` service stays dormant. Backups are disabled - you are responsible for managing them yourself (decide whether you need them, set up S3 / another storage, your provider's snapshots, etc.).

---

## Local development

Requires Node.js 22+ and PostgreSQL 16 running locally (or Docker).

```
git clone https://github.com/ArmaField/ArmaField-BackEnd.git
cd ArmaField-BackEnd
npm install
cp .env.example .env.local
```

Fill `.env.local`:
```
DATABASE_URL=postgres://armafield:armafield@localhost:5432/armafield
AUTH_SECRET=<generate with: openssl rand -base64 32>
STEAM_API_KEY=<from https://steamcommunity.com/dev/apikey>
```

Run migrations and seed, then start the dev server:
```
npx prisma migrate deploy
npx tsx prisma/seed.ts
npm run dev:https
```

Open [https://localhost:3000](https://localhost:3000).

**Important:** use `dev:https` (not plain `dev`). Arma Reforger's HTTP client only accepts HTTPS - game requests to `http://` will fail. The `dev:https` script uses Next.js `--experimental-https` which generates a self-signed certificate, so you'll see a browser security warning on first visit (accept it). For production, Caddy handles real Let's Encrypt certificates automatically.

### Test mode (no database required for game API)

Add to `.env.local`:
```
ARMAFIELD_TEST_MODE=enabled-i-know-what-i-am-doing
```

In test mode all game API endpoints return stateless mock data built from `src/lib/test-loadout-data.ts`. No DB writes. The admin panel runs without Steam authentication and displays default roles, categories, weapons, etc. from the same static data.

---

## Production deployment

The stack is Docker-based so it runs on any Linux distribution with Docker + Docker Compose v2. Only step 2 (base system setup) differs between distros - see [other distros](#other-distros) below.

### 1. DNS

Create an A-record pointing your domain at the server's public IP. If using Cloudflare, start with **"DNS only"** (grey cloud) - the orange proxy breaks Let's Encrypt's HTTP challenge on first certificate issue. You can enable proxy (orange cloud) after the certificate is issued; set SSL/TLS mode to **Full (strict)**.

### 2. Base setup (Ubuntu / Debian)

```
apt update && apt upgrade -y
apt install -y curl git ufw
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
```

### 3. Docker

```
curl -fsSL https://get.docker.com | sh
docker login    # optional, but recommended to avoid Docker Hub rate limits
```

### 4. Clone

```
cd /opt
git clone https://github.com/ArmaField/ArmaField-BackEnd.git armafield
cd armafield
```

### 5. Configure

```
cp .env.example .env
nano .env
```

Minimum required:
```
DOMAIN=your-domain.example.com
AUTH_SECRET=<openssl rand -base64 32>
STEAM_API_KEY=<your-key>

# Either set DATABASE_URL for external Postgres:
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# ... or leave it commented to use the bundled Postgres container.
POSTGRES_PASSWORD=<strong-random-password>
```

### 6. Start

External database:
```
docker compose up -d --build
```

Local database:
```
docker compose --profile local-db up -d --build
```

The first build takes 3–5 minutes. Subsequent rebuilds are much faster thanks to Docker layer cache.

### 7. Verify

```
docker compose ps
docker compose logs -f app
curl https://your-domain.example.com/api/health
```

Expected `/api/health` response:
```json
{ "status": "ok", "database": "connected", "testMode": false, ... }
```

Open `https://your-domain.example.com/login` and sign in with Steam. **The first user to sign in becomes the Super Admin automatically.**

### Other distros

Only step 2 (base setup) changes - steps 3-7 are identical. `get.docker.com` works on all major distros.

**Fedora / RHEL / Rocky / AlmaLinux:**
```
dnf update -y
dnf install -y curl git firewalld
systemctl enable --now firewalld
firewall-cmd --permanent --add-service=ssh
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --reload
```

**Arch Linux:**
```
pacman -Syu --noconfirm
pacman -S --noconfirm curl git ufw
ufw allow SSH && ufw allow 80/tcp && ufw allow 443/tcp
ufw --force enable
```

**Cloud-provider firewalls:** if your host has a separate firewall at the provider level (Hetzner Cloud Firewall, DigitalOcean Cloud Firewall, AWS Security Group, GCP VPC firewall, etc.), also allow ports 22, 80, 443 there - OS-level firewall is not enough.

---

## Configuration reference

| Variable | Required | Description |
|---|---|---|
| `DOMAIN` | yes | Domain Caddy serves (`test.armafield.gg`, `localhost`, etc.). Used for HTTPS cert issuance. |
| `AUTH_SECRET` | yes | Secret for Auth.js session signing. Generate with `openssl rand -base64 32`. |
| `STEAM_API_KEY` | yes* | Steam Web API key for admin login. Get at https://steamcommunity.com/dev/apikey. |
| `DATABASE_URL` | no* | External Postgres URL. If unset, docker-compose falls back to the local `db` service. |
| `POSTGRES_PASSWORD` | no | Password for the bundled Postgres container (ignored with external DB). |
| `ARMAFIELD_TEST_MODE` | no | Set to `enabled-i-know-what-i-am-doing` to enable stateless test mode. |
| `LOG_LEVEL` | no | `debug`, `info` (default), `warn`, `error`. |

- `STEAM_API_KEY` is used for Admin Panel login, so in `ARMAFIELD_TEST_MODE` it's not required.
- `AUTH_URL`, `AUTH_TRUST_HOST` and internal port settings are configured automatically by docker-compose.

---

## Admin panel

After the first Steam login the user gets **Super Admin** role automatically. From there:

- **Settings → System** - view DB type (local/external), app version, domain, log level; run idempotent seed (creates default roles, categories, weapons, attachments, gadgets, grenades from vanilla game); reset the database (wipes all data, reseeds defaults).
- **Servers** - register game servers. Each server gets a Bearer token. Paste this token into `profile\ArmaField\Systems\BackendSettings.json` config so the Arma Reforger server can authenticate with the backend.
- **Loadouts** - manage weapon categories, weapons, attachments, gadgets, grenades (prices, defaults, per-class availability, attachment bindings).
- **Players** - inspect profiles, XP, unlocks; grant/revoke items.
- **Users / Roles** - manage admin accounts and permissions.
- **Backups** - manual backup / restore / retention policy (local DB only).

### Seed & reset

"Run initial seed" is idempotent - safe to press multiple times. It uses `upsert`, so existing data is not duplicated.

"Reset database" truncates **all** user data and re-creates defaults. Confirmation modal is required. Not available in test mode or with external DB.

---

## Updates

```
cd /opt/armafield
git pull
docker compose up -d --build
```

Database migrations run automatically on container start via `npx prisma migrate deploy` (in `Dockerfile`'s `CMD`). Existing data is preserved.

## Backups (local DB only)

- Automated daily dumps to `./data/backups/` on a cron schedule (configurable in Settings → Backups).
- Retention policy (daily + weekly) is enforced after each scheduled run.
- Manual backup / restore available from the admin panel.
- With external DB, the built-in scheduler is disabled and the Backups page shows a notice. You handle backups yourself - whether to do them at all, and how (S3, object storage, provider snapshots, your own cron, etc.) is entirely up to you.

## Architecture

- **Next.js 16** with App Router, Webpack build, React 19 Server Components
- **Prisma 7** with `@prisma/adapter-pg` (PgBouncer-compatible)
- **Auth.js v5** with custom Steam OpenID provider
- **Caddy 2** as reverse proxy with automatic Let's Encrypt
- **node-cron** for backup scheduling
- **next-intl** for languages i18n
- **shadcn/ui** + Tailwind 4 for the admin UI

## License

[MIT](./LICENSE) © ARMAFIELD