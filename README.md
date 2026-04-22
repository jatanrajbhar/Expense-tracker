# Expense Tracker

A full-stack personal finance tool — React frontend, Vercel serverless API,
PostgreSQL database via Supabase.

---

## Live deployment: step-by-step

### Step 1 — Set up the database (Supabase)

You will need this SQL schema — copy it now so it is ready to paste in step 4:

```sql
create table expenses (
  id               uuid        primary key default gen_random_uuid(),
  amount_cents     integer     not null check (amount_cents > 0),
  category         text        not null check (char_length(category) > 0),
  description      text        not null default '',
  date             date        not null,
  created_at       timestamptz not null default now(),
  idempotency_key  text        unique
);

create index on expenses (category);
create index on expenses (date desc);
create index on expenses (idempotency_key);
```

1. Go to [supabase.com](https://supabase.com) and create a free account.
2. Click **New project**, give it a name (e.g. `expense-tracker`), set a
   database password, and choose a region close to you.
3. Wait ~2 minutes for the project to provision.
4. In the left sidebar go to **SQL Editor → New query**, paste the schema
   above, and click **Run**.
5. Go to **Project Settings → API** in the left sidebar.
6. Copy and save two values — you will need them in Step 3:
   - **Project URL** (looks like `https://xxxx.supabase.co`)
   - **service_role** secret key (under *Project API keys* — **not** the
     anon / public key)

> **Security note:** The service role key bypasses Row Level Security and must
> only ever be used server-side (inside Vercel functions). Never expose it to
> the browser or commit it to version control.

---

### Step 2 — Push the code to GitHub

1. Create a new **private** repository on [github.com](https://github.com).
2. In your project folder, run:

```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

---

### Step 3 — Deploy to Vercel

You will add these two environment variables during the Vercel setup below:

| Name                        | Value                             |
| --------------------------- | --------------------------------- |
| `SUPABASE_URL`              | Project URL copied in Step 1      |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key copied in Step 1 |

1. Go to [vercel.com](https://vercel.com) and sign in with your GitHub account.
2. Click **Add New → Project** and import your GitHub repository.
3. Vercel detects `vercel.json` automatically — leave all framework settings
   as-is.
4. Click **Environment Variables** and add the two variables from the table
   above.
5. Click **Deploy**. The build takes about one minute.
6. Vercel gives you a live URL such as `https://expense-tracker-xyz.vercel.app`.

---

### Step 4 — Verify it works

Open the Vercel URL in a browser:

- Add a test expense — it should appear in the list immediately.
- Refresh the page — the expense persists (stored in the database, not the
  browser).
- In your Supabase dashboard go to **Table Editor → expenses** to see the raw
  rows.

---

## Local development

Run the Express backend (uses a local JSON file — no cloud database needed):

```bash
cd backend
npm install
npm start        # http://localhost:3001
```

Run the frontend (Vite proxies `/api/*` to the Express backend):

```bash
cd frontend
npm install
npm run dev      # http://localhost:5173
```

Run the backend tests:

```bash
cd backend
npm test
```

---

## Project structure

```text
.
├── api/                         Vercel serverless functions (PostgreSQL)
│   ├── expenses.js              GET + POST /api/expenses
│   └── expenses/
│       └── categories.js        GET /api/expenses/categories
├── backend/                     Express server for local development (JSON file)
│   ├── server.js
│   ├── db.js
│   └── tests/
├── frontend/                    React + Vite
│   ├── src/
│   │   ├── App.jsx
│   │   ├── api.js               all fetch calls live here
│   │   └── components/
│   └── vite.config.js
├── package.json                 root deps (supabase-js) consumed by Vercel functions
├── vercel.json                  build and output configuration
└── README.md
```

### How the two backends relate

| Environment | Backend                   | Database              |
| ----------- | ------------------------- | --------------------- |
| Local dev   | Express (`backend/`)      | `expenses.json` file  |
| Production  | Vercel functions (`api/`) | PostgreSQL (Supabase) |

The frontend always fetches `/api/expenses`. In development, Vite's proxy
strips the `/api` prefix and forwards the request to `localhost:3001` (Express).
In production, Vercel routes `/api/*` directly to the matching serverless
function.

---

## API reference

| Method | Path                       | Description                            |
| ------ | -------------------------- | -------------------------------------- |
| `POST` | `/api/expenses`            | Create an expense                      |
| `GET`  | `/api/expenses`            | List (`?category=Food&sort=date_desc`) |
| `GET`  | `/api/expenses/categories` | Distinct category list                 |

POST body:

```json
{
  "amount": "250.00",
  "category": "Food",
  "description": "Lunch",
  "date": "2024-03-15"
}
```

Send `X-Idempotency-Key: <uuid>` to make the request safe to retry.

---

## Key design decisions

### PostgreSQL in production, JSON file locally

The Supabase-hosted PostgreSQL instance is the production database. The local
JSON file store avoids any network dependency during development and keeps
tests fast and isolated. Both expose the same HTTP interface (same URL paths,
same JSON shapes) so the frontend code is identical in both environments.

### Money as integer cents

`amount_cents INTEGER` in Postgres eliminates all IEEE 754 floating-point
representation issues (`0.1 + 0.2 !== 0.3` in JavaScript). Division by 100
only happens at the display layer.

### Idempotency keys

The client generates a `crypto.randomUUID()` key when the form mounts and
sends it as `X-Idempotency-Key`. Both backends check this key before inserting
and return the existing record on a duplicate. The key rotates only after a
confirmed success, making it safe to double-click Submit, refresh mid-flight,
or retry after a network timeout.

The race condition (two requests with the same key arriving simultaneously) is
handled by catching Postgres error code `23505` (unique constraint violation)
and returning the already-committed row.

### Vercel serverless functions

Each API route is a plain CommonJS module that exports an
`async function handler(req, res)`. No framework overhead. Vercel auto-detects
the `api/` directory and deploys each file as its own isolated function.

---

## Trade-offs

- **No authentication.** All expenses are global. Adding auth would mean
  scoping rows by `user_id`; Supabase Auth with RLS policies handles this well.
- **No pagination.** Acceptable for a personal tracker; straightforward to add
  with a range or cursor query.
- **No DELETE / PATCH.** Both are simple to add.
- **Local and production use different backends.** The JSON file is not synced
  to the cloud database. Use `vercel dev` (Vercel CLI) if you want to run the
  serverless functions locally against the real database.

---

## Intentionally omitted

- Auth and multi-user support
- Pagination
- Offline / service-worker support
- Visual spending charts
- Docker or self-hosted deployment configuration
