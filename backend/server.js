const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const store = require('./db');

const app = express();

app.use(cors());
app.use(express.json());

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatExpense(row) {
  return {
    id: row.id,
    amount: row.amount_cents / 100,
    amount_cents: row.amount_cents,
    category: row.category,
    description: row.description,
    date: row.date,
    created_at: row.created_at,
  };
}

function parseAmountCents(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  // Round to avoid IEEE 754 drift (e.g. 10.1 * 100 → 1009.9999...)
  return Math.round(n * 100);
}

// ---------------------------------------------------------------------------
// POST /expenses
// ---------------------------------------------------------------------------

app.post('/expenses', (req, res) => {
  const idempotencyKey = req.headers['x-idempotency-key'] || null;
  const { expenses, idempotencyIndex } = store.read();

  // Return cached result for repeated requests with the same key
  if (idempotencyKey && idempotencyIndex[idempotencyKey]) {
    const cached = expenses.find((e) => e.id === idempotencyIndex[idempotencyKey]);
    if (cached) return res.status(200).json(formatExpense(cached));
  }

  const { amount, category, description, date } = req.body ?? {};

  const missing = ['amount', 'category', 'date'].filter(
    (f) => req.body?.[f] == null || req.body[f] === ''
  );
  if (missing.length) {
    return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
  }

  const amountCents = parseAmountCents(amount);
  if (!amountCents) {
    return res.status(400).json({ error: 'amount must be a positive number' });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'date must be in YYYY-MM-DD format' });
  }

  const expense = {
    id: uuidv4(),
    amount_cents: amountCents,
    category: category.trim(),
    description: (description ?? '').trim(),
    date,
    created_at: new Date().toISOString(),
  };

  expenses.push(expense);
  if (idempotencyKey) idempotencyIndex[idempotencyKey] = expense.id;
  store.write({ expenses, idempotencyIndex });

  return res.status(201).json(formatExpense(expense));
});

// ---------------------------------------------------------------------------
// GET /expenses
// ---------------------------------------------------------------------------

app.get('/expenses', (req, res) => {
  const { category, sort } = req.query;
  let { expenses } = store.read();

  if (category) {
    expenses = expenses.filter((e) => e.category === category);
  }

  if (sort === 'date_desc') {
    expenses = expenses.slice().sort((a, b) => {
      // Primary: date descending; secondary: created_at descending
      const d = b.date.localeCompare(a.date);
      return d !== 0 ? d : b.created_at.localeCompare(a.created_at);
    });
  } else {
    // Default: insertion order (newest created_at first)
    expenses = expenses.slice().sort((a, b) =>
      b.created_at.localeCompare(a.created_at)
    );
  }

  return res.json(expenses.map(formatExpense));
});

// ---------------------------------------------------------------------------
// GET /expenses/categories
// ---------------------------------------------------------------------------

app.get('/expenses/categories', (_req, res) => {
  const { expenses } = store.read();
  const categories = [...new Set(expenses.map((e) => e.category))].sort();
  return res.json(categories);
});

// ---------------------------------------------------------------------------
// Error handler
// ---------------------------------------------------------------------------

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

const PORT = process.env.PORT || 3001;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Expense Tracker API listening on http://localhost:${PORT}`);
  });
}

module.exports = app;
