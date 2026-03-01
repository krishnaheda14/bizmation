# Supabase Setup Guide — Bizmation

> **No Amazon RDS is used.** This project uses Supabase as the sole database.
> This guide covers creating the project, running the schema, and wiring up credentials.

---

## What you need to give me (required before we can run the app)

Once you create the Supabase project (steps below), collect these four values and paste them wherever the guide says `<placeholder>`:

| Value | Where to find it |
|---|---|
| **Project URL** | Dashboard → Project Settings → API → Project URL |
| **Anon / public key** | Dashboard → Project Settings → API → `anon` `public` |
| **Service role key** | Dashboard → Project Settings → API → `service_role` `secret` |
| **DB password** | The password you chose when creating the project (can be reset if forgotten) |
| **DB connection string** | Dashboard → Project Settings → Database → Connection string → URI (Session mode, port 5432) |
| **Region** | Dashboard → Project Settings → General → Region |

> Keep the **service role key** strictly server-side. Never put it in `.env` files that ship to the browser or commit it to git.

---

## Step 1 — Create a Supabase project

1. Go to [https://app.supabase.com](https://app.supabase.com) and sign in (create a free account if needed).
2. Click **New project**.
3. Fill in:
   - **Name**: `bizmation` (or `bizmation-prod` / `bizmation-dev`)
   - **Database password**: choose a strong password, **save it now** — you'll need it for `DATABASE_URL`
   - **Region**: choose the region closest to where your backend will be hosted (e.g. `ap-south-1` for India)
4. Click **Create new project** and wait ~2 minutes for provisioning.

---

## Step 2 — Run the database schema

The full schema lives at `apps/backend/scripts/migrate.sql`.
It creates all tables, indexes, triggers, and functions.

### Option A — Supabase SQL Editor (easiest)

1. Open your project in the Supabase dashboard.
2. Click **SQL Editor** in the left sidebar.
3. Click **New query**.
4. Copy-paste the entire contents of `apps/backend/scripts/migrate.sql`.
5. Click **Run** (or press `Ctrl+Enter`).
6. You should see `Success. No rows returned` for each statement.

### Option B — psql from your machine (Windows)

Install `psql` if needed:

```powershell
# Option: via Chocolatey
choco install postgresql --params '/Password:notused'

# or download the PostgreSQL installer from https://www.postgresql.org/download/windows/
# and add C:\Program Files\PostgreSQL\<version>\bin to your PATH
```

Then run:

```powershell
# Replace the placeholders with your real values from Supabase Dashboard
$env:PGPASSWORD = "<db-password>"
psql `
  --host=db.<project-ref>.supabase.co `
  --port=5432 `
  --username=postgres `
  --dbname=postgres `
  --file="apps\backend\scripts\migrate.sql"
```

You should see a series of `CREATE TABLE`, `CREATE INDEX`, `CREATE FUNCTION`, `CREATE TRIGGER` messages with no errors.

---

## Step 3 — Create your environment files

### Backend (`apps/backend/.env`)

Copy the example:

```powershell
Copy-Item apps\backend\.env.example apps\backend\.env
```

Open `apps\backend\.env` and fill in:

```env
NODE_ENV=development
PORT=3000

SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
SUPABASE_ANON_KEY=<your-anon-key>

# Session-mode pooler connection string (from Dashboard → Settings → Database → Connection string)
DATABASE_URL=postgresql://postgres.<project-ref>:<db-password>@aws-0-<region>.pooler.supabase.com:5432/postgres

DB_POOL_MAX=10

JWT_SECRET=<generate-with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">

AI_SERVICES_URL=http://localhost:8000
```

#### Generate a JWT secret quickly

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Web App (`apps/web-app/.env`)

```powershell
Copy-Item apps\web-app\.env.example apps\web-app\.env
```

Open `apps\web-app\.env` and fill in:

```env
VITE_API_URL=http://localhost:3000
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

---

## Step 4 — Install dependencies

```powershell
# From the repo root
npm install
```

`@supabase/supabase-js` has already been added to both `apps/backend/package.json` and `apps/web-app/package.json`.

---

## Step 5 — Run the backend

```powershell
cd apps\backend
npm run dev
```

A successful start looks like:

```
🚀 Server running on port 3000
📊 Environment: development
⏰ Gold rate update cron job started
```

Then verify the DB connection:

```powershell
curl http://localhost:3000/health
```

Expected response:

```json
{ "status": "healthy", "timestamp": "...", "service": "jewelry-backend" }
```

---

## Step 6 — Run the web app

```powershell
cd apps\web-app
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## Step 7 — Verify all tables exist in Supabase

1. Supabase Dashboard → **Table Editor**
2. You should see all tables:
   `shops`, `users`, `metal_lots`, `products`, `customers`, `invoices`,
   `transactions`, `transaction_items`, `gold_rates`, `sync_queue`,
   `audit_logs`, `catalog_items`

---

## Connection string formats explained

Supabase gives you two kinds of connection strings under **Settings → Database → Connection string**:

| Mode | Port | Use for |
|---|---|---|
| **Session pooler** | `5432` | Standard queries, long-lived connections (use this for the backend `pg` Pool) |
| **Transaction pooler** | `6543` | Many short-lived connections, serverless functions |

The format is:

```
postgresql://postgres.<project-ref>:<db-password>@aws-0-<region>.pooler.supabase.com:<port>/postgres
```

For direct connection (no pooler, useful for `psql` or running migrations):

```
postgresql://postgres:<db-password>@db.<project-ref>.supabase.co:5432/postgres
```

---

## Row Level Security (RLS)

The schema creates tables without RLS enabled by default because the backend uses the **service role key** which bypasses RLS entirely. This is the recommended approach when all DB access goes through your own Express backend.

If you later want direct browser-to-Supabase queries using the anon key, enable RLS and create policies for each table:

```sql
-- Example: only allow users to read their own shop's products
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shop members can read" ON products
  FOR SELECT USING (shop_id = auth.jwt() ->> 'shop_id');
```

---

## Backups

Supabase Pro plan includes daily automated backups with PITR (point-in-time recovery).
Free plan: manual backups only.

To create a manual backup at any time:

```powershell
$env:PGPASSWORD = "<db-password>"
pg_dump `
  --host=db.<project-ref>.supabase.co `
  --port=5432 `
  --username=postgres `
  --format=custom `
  --file="backup_$(Get-Date -Format 'yyyy-MM-dd').dump" `
  postgres
```

---

## Supabase connection limits by plan

| Plan | Max DB connections | Recommended `DB_POOL_MAX` |
|---|---|---|
| Free | 60 | 10 |
| Pro | 200 | 20 |
| Team/Enterprise | custom | as needed |

---

## File reference

| File | Purpose |
|---|---|
| `apps/backend/.env.example` | Backend env template |
| `apps/web-app/.env.example` | Web-app env template |
| `apps/backend/src/services/database/DatabaseService.ts` | pg Pool with SSL for Supabase |
| `apps/backend/src/lib/supabaseAdmin.ts` | Server-side Supabase admin client |
| `apps/web-app/src/lib/supabase.ts` | Browser-side Supabase anon client |
| `apps/backend/scripts/migrate.sql` | Full DB schema — run once in Supabase |
| `docker-compose.yml` | No postgres container — uses Supabase directly |

---

## Quick checklist

- [ ] Created Supabase project (Step 1)
- [ ] Ran `migrate.sql` in SQL Editor (Step 2)
- [ ] Created `apps/backend/.env` with all values (Step 3)
- [ ] Created `apps/web-app/.env` with all values (Step 3)
- [ ] Ran `npm install` from repo root (Step 4)
- [ ] Backend starts and `/health` returns `healthy` (Step 5)
- [ ] All 12 tables visible in Supabase Table Editor (Step 7)
