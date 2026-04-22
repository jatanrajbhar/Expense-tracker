const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const os = require('os');
const fs = require('fs');
const path = require('path');
const supertest = require('supertest');

let app;
let tmpFile;

before(() => {
  // Point the store at a temp file before loading the app so no real data
  // is touched and tests are fully isolated.
  tmpFile = path.join(os.tmpdir(), `expense-test-${Date.now()}.json`);
  const store = require('../db');
  store.setPath(tmpFile);
  app = require('../server');
});

after(() => {
  fs.rmSync(tmpFile, { force: true });
  fs.rmSync(tmpFile + '.tmp', { force: true });
  delete require.cache[require.resolve('../db')];
  delete require.cache[require.resolve('../server')];
});

beforeEach(() => {
  // Reset store to empty state before each test
  fs.writeFileSync(tmpFile, JSON.stringify({ expenses: [], idempotencyIndex: {} }), 'utf8');
});

const api = () => supertest(app);

// ---------------------------------------------------------------------------
// POST /expenses
// ---------------------------------------------------------------------------

describe('POST /expenses', () => {
  it('creates an expense and returns 201', async () => {
    const res = await api()
      .post('/expenses')
      .send({ amount: '12.50', category: 'Food', description: 'Lunch', date: '2024-03-15' });

    assert.equal(res.status, 201);
    assert.equal(res.body.amount, 12.5);
    assert.equal(res.body.amount_cents, 1250);
    assert.equal(res.body.category, 'Food');
    assert.equal(res.body.description, 'Lunch');
    assert.equal(res.body.date, '2024-03-15');
    assert.ok(res.body.id);
    assert.ok(res.body.created_at);
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await api().post('/expenses').send({ category: 'Food' });
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });

  it('returns 400 for a non-positive amount', async () => {
    const res = await api()
      .post('/expenses')
      .send({ amount: '-5', category: 'Food', date: '2024-03-15' });
    assert.equal(res.status, 400);
  });

  it('returns 400 for zero amount', async () => {
    const res = await api()
      .post('/expenses')
      .send({ amount: '0', category: 'Food', date: '2024-03-15' });
    assert.equal(res.status, 400);
  });

  it('is idempotent: same key returns the original record, not a duplicate', async () => {
    const key = 'idem-key-abc';
    const payload = { amount: '10.00', category: 'Transport', date: '2024-03-15' };

    const first = await api().post('/expenses').set('X-Idempotency-Key', key).send(payload);
    assert.equal(first.status, 201);

    const second = await api().post('/expenses').set('X-Idempotency-Key', key).send(payload);
    assert.equal(second.status, 200);
    assert.equal(second.body.id, first.body.id);

    const { expenses } = JSON.parse(fs.readFileSync(tmpFile, 'utf8'));
    assert.equal(expenses.length, 1);
  });

  it('handles floating-point amounts without rounding error', async () => {
    const res = await api()
      .post('/expenses')
      .send({ amount: '10.10', category: 'Food', date: '2024-01-01' });
    assert.equal(res.status, 201);
    assert.equal(res.body.amount_cents, 1010);
  });
});

// ---------------------------------------------------------------------------
// GET /expenses
// ---------------------------------------------------------------------------

const GET_SEED = {
  expenses: [
    { id: 'a', amount_cents: 500,  category: 'Food',      description: 'Lunch',  date: '2024-01-10', created_at: '2024-01-10T12:00:00Z' },
    { id: 'b', amount_cents: 2000, category: 'Transport', description: 'Uber',   date: '2024-01-15', created_at: '2024-01-15T09:00:00Z' },
    { id: 'c', amount_cents: 800,  category: 'Food',      description: 'Dinner', date: '2024-01-05', created_at: '2024-01-05T19:00:00Z' },
  ],
  idempotencyIndex: {},
};

describe('GET /expenses', () => {
  // Re-seed after the global beforeEach reset fires
  beforeEach(() => {
    fs.writeFileSync(tmpFile, JSON.stringify(GET_SEED), 'utf8');
  });

  it('returns all expenses', async () => {
    const res = await api().get('/expenses');
    assert.equal(res.status, 200);
    assert.equal(res.body.length, 3);
  });

  it('filters by category', async () => {
    const res = await api().get('/expenses?category=Food');
    assert.equal(res.status, 200);
    assert.equal(res.body.length, 2);
    assert.ok(res.body.every((e) => e.category === 'Food'));
  });

  it('sorts by date descending when sort=date_desc', async () => {
    const res = await api().get('/expenses?sort=date_desc');
    assert.equal(res.status, 200);
    const dates = res.body.map((e) => e.date);
    const expected = [...dates].sort((a, b) => b.localeCompare(a));
    assert.deepEqual(dates, expected);
  });
});

// ---------------------------------------------------------------------------
// GET /expenses/categories
// ---------------------------------------------------------------------------

describe('GET /expenses/categories', () => {
  beforeEach(() => {
    const state = {
      expenses: [
        { id: 'd', amount_cents: 100, category: 'Food',    description: '', date: '2024-01-01', created_at: '2024-01-01T00:00:00Z' },
        { id: 'e', amount_cents: 200, category: 'Housing', description: '', date: '2024-01-02', created_at: '2024-01-02T00:00:00Z' },
      ],
      idempotencyIndex: {},
    };
    fs.writeFileSync(tmpFile, JSON.stringify(state), 'utf8');
  });

  it('returns sorted distinct categories', async () => {
    const res = await api().get('/expenses/categories');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body));
    assert.ok(res.body.includes('Food'));
    assert.ok(res.body.includes('Housing'));
    const sorted = [...res.body].sort();
    assert.deepEqual(res.body, sorted);
  });
});
