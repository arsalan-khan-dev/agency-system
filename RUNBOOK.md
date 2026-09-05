# Runbook — Running the Agency System (Browser-Sandbox / No-Docker Mode)

This runbook documents the actual, verified-working procedure for getting
the app running from a fresh snapshot in this sandbox mode (no Docker, no
persistent background processes across tool calls — see MEMORY.md KI-001).
"Deployed" here means "documented and repeatable," not "always-on" — this
sandbox does not keep a server running between chat turns.

## Prerequisites

- Node.js 22.x (already present in this sandbox)
- PostgreSQL 16 (installed via apt in this sandbox; see below)
- npm registry access (registry.npmjs.org — already allowlisted)

## 1. Start PostgreSQL

PostgreSQL has no systemd in this sandbox and must be started manually.
**It does not stay running between separate tool/shell invocations** —
always run this first, every time:

```bash
service postgresql start
# wait ~2s, then verify:
su postgres -c "pg_isready"
```

If PostgreSQL was never installed on this machine:

```bash
apt-get update -qq
apt-get install -y -qq postgresql postgresql-contrib
service postgresql start
su postgres -c "psql -c \"ALTER USER postgres PASSWORD 'postgres';\""
su postgres -c "psql -c \"CREATE DATABASE agency_system;\""
```

## 2. Environment variables

Copy `.env.example` to `.env` in `apps/api/` if not already present:

```bash
cd apps/api
cp .env.example .env
```

Key variables (see `.env.example` for the full/current list):
- `DATABASE_URL` — `postgres://postgres:postgres@localhost:5432/agency_system`
- `SESSION_SECRET` — any non-empty string for dev; rotate for real use
- `PORT` — defaults to 4000
- `PUPPETEER_EXECUTABLE_PATH` — **only needed if PDF generation fails** to
  find a Chrome binary automatically (see KI-005 / ADR-011). Check first:
  ```bash
  find /home/*/.cache/puppeteer/chrome -name chrome -type f 2>/dev/null
  ```
  If found, PDF generation should work without setting this. If not found,
  either run `npx puppeteer browsers install chrome` in `apps/api/` (requires
  network access to Google's CDN, which may not be allowlisted) or accept
  that PDF generation will fail with a clear 400 error rather than crash.

## 3. Install dependencies

```bash
cd apps/api && npm install --no-audit --no-fund
cd ../web && npm install --no-audit --no-fund
```

## 4. Run database migrations (in order)

```bash
cd apps/api
npx typeorm-ts-node-commonjs migration:run -d src/config/data-source.ts
```

This runs all migrations currently in `src/migrations/` in timestamp order:
`InitialSchema` → `PricingAndEstimation` → `ClientAndQuotation` →
`ProjectsAndFinancials`. Re-running this command is safe — TypeORM tracks
applied migrations in the `migrations` table and skips ones already run.

## 5. Seed reference data

```bash
npx ts-node -T src/seed.ts          # roles + dev admin user
npx ts-node -T src/seed-pricing.ts  # sample pricing profile/rules + project type
```

Dev admin credentials: `admin@agency.local` / `ChangeMe123!` — **not for
real use; rotate or remove before any production deployment** (KI-002).

## 6. Build both apps

```bash
cd apps/api && npx nest build
cd ../web && npx next build
```

## 7. Run both apps

In this sandbox, run each in the foreground of its own verification block
(background processes don't survive across separate tool calls — see
KI-001). On a real machine with a persistent terminal, run each normally
in its own terminal/tab, or with a process manager:

```bash
# Terminal 1
cd apps/api && node dist/main.js

# Terminal 2
cd apps/web && npx next start -p 3000
```

The web app proxies `/api/v1/*` requests to `http://localhost:4000` (see
`apps/web/next.config.js`), so both must be running for the frontend to
work end-to-end.

## 8. Verify

```bash
curl -s -c /tmp/cookies.txt -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@agency.local","password":"ChangeMe123!"}'
```

Should return a 200 with the admin user's id/email/role. If this works,
the full stack (Postgres → API → session auth) is functioning.

## What "deployment" does NOT mean here

- No Docker/Compose (ADR-006) — the sandbox environment doesn't have a
  container runtime, and this is intentional per the Runtime Environment
  Rule, not a shortcut.
- No process manager keeping the app alive between sandbox tool calls —
  each verification in earlier phases started the server, tested it, and
  stopped it within one shell invocation. A real server/dev machine would
  use `pm2`, `systemd`, or similar to keep both processes alive.
- No CI/CD pipeline — none was requested for Phase 1, and none exists yet.

## Real-deployment gaps (do not treat this runbook as production-ready)

- Session secret, dev admin password, and DB credentials are all
  placeholder/dev values.
- PDF generation's Chrome binary is discovered opportunistically (ADR-011)
  rather than vendored/pinned — a genuinely fresh production host would
  need an explicit, reliable Chrome install step.
- No backups, no restore testing, no TLS termination — all still required
  per MEMORY.md Section 13 before any real deployment.
