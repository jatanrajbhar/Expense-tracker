# Fenmo — Expense Tracker

A personal finance tracker with a ticket-receipt aesthetic. Log expenses, filter by period, and print a receipt-style summary.

**Live:** https://expense-tracker-nine-mu-69.vercel.app/

## Tech Stack

- **Frontend** — React 18, Vite, IBM Plex Mono
- **Backend (local)** — Node.js, Express, JSON file store
- **Backend (production)** — Vercel Serverless Functions, Supabase (PostgreSQL)

## Features

- Add expenses with amount, category, date, and description
- Filter by Day / Week / Month / All
- Filter by category
- Running total per period
- Print-friendly receipt layout
- Idempotent form submission (safe to retry)
- Rupee (₹) currency formatting

## Project Structure

```text
.
├── frontend/               React + Vite app
│   ├── api/                Vercel serverless functions
│   │   ├── expenses.js     GET + POST /api/expenses
│   │   └── expenses/
│   │       └── categories.js  GET /api/expenses/categories
│   ├── public/
│   │   └── favicon.svg
│   └── src/
│       ├── App.jsx
│       ├── App.css
│       ├── api.js
│       └── components/
│           └── TicketLogo.jsx
├── backend/                Express server for local development
│   ├── server.js
│   ├── db.js
│   └── tests/
├── vercel.json
└── README.md
```

## Local Development

### 1. Start the backend

```bash
cd backend
npm install
npm start
```

Runs on `http://localhost:3001`. Uses a local `expenses.json` file — no database required.

### 2. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Runs on `http://localhost:5173`. Vite proxies `/api/*` to the Express backend.

### 3. Run backend tests

```bash
cd backend
npm test
```

## API

| Method | Path                       | Description            |
| ------ | -------------------------- | ---------------------- |
| GET    | `/api/expenses`            | List all expenses      |
| POST   | `/api/expenses`            | Create an expense      |
| GET    | `/api/expenses/categories` | Distinct category list |

Optional query params: `?category=Food`, `?sort=date_desc`

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

## Database Schema

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
```

## Environment Variables

Required for production:

| Variable                    | Description                      |
| --------------------------- | -------------------------------- |
| `SUPABASE_URL`              | Supabase project URL             |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role secret key |

## License

MIT
