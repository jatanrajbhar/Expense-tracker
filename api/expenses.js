const { createClient } = require('@supabase/supabase-js');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function db() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  }
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

function parseAmountCents(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

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

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

module.exports = async function handler(req, res) {
  // ---------------------------------------------------------------------------
  // GET /api/expenses
  // ---------------------------------------------------------------------------
  if (req.method === 'GET') {
    let client;
    try { client = db(); } catch (e) {
      return res.status(500).json({ error: e.message });
    }

    const { category, sort } = req.query;

    let query = client.from('expenses').select('*');
    if (category) query = query.eq('category', category);

    query = sort === 'date_desc'
      ? query.order('date', { ascending: false }).order('created_at', { ascending: false })
      : query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data.map(formatExpense));
  }

  // ---------------------------------------------------------------------------
  // POST /api/expenses
  // ---------------------------------------------------------------------------
  if (req.method === 'POST') {
    let client;
    try { client = db(); } catch (e) {
      return res.status(500).json({ error: e.message });
    }

    const idempotencyKey = req.headers['x-idempotency-key'] || null;

    // Return the existing record if this key was already processed
    if (idempotencyKey) {
      const { data: existing } = await client
        .from('expenses')
        .select('*')
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle();
      if (existing) return res.status(200).json(formatExpense(existing));
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

    const { data, error } = await client
      .from('expenses')
      .insert({
        amount_cents: amountCents,
        category: category.trim(),
        description: (description ?? '').trim(),
        date,
        idempotency_key: idempotencyKey,
      })
      .select()
      .single();

    if (error) {
      // Postgres unique constraint violation — another request with the same
      // idempotency key committed first; return that record instead.
      if (error.code === '23505' && idempotencyKey) {
        const { data: cached } = await client
          .from('expenses')
          .select('*')
          .eq('idempotency_key', idempotencyKey)
          .maybeSingle();
        if (cached) return res.status(200).json(formatExpense(cached));
      }
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json(formatExpense(data));
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
