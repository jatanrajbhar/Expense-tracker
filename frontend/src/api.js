// In development, Vite proxies /api/* → http://localhost:3001/* (Express).
// In production, Vercel serves /api/* from the serverless functions in /api/.
const BASE = '/api';

async function handleResponse(res) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function fetchExpenses({ category = '', sort = '' } = {}) {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  if (sort) params.set('sort', sort);
  const qs = params.size ? `?${params}` : '';
  return handleResponse(await fetch(`${BASE}/expenses${qs}`));
}

export async function createExpense(data, idempotencyKey) {
  return handleResponse(
    await fetch(`${BASE}/expenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(data),
    })
  );
}

export async function fetchCategories() {
  return handleResponse(await fetch(`${BASE}/expenses/categories`));
}
