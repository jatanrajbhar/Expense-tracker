import { useState, useRef } from 'react';
import { createExpense } from '../api';

const SUGGESTED_CATEGORIES = [
  'Food',
  'Transport',
  'Housing',
  'Healthcare',
  'Entertainment',
  'Shopping',
  'Utilities',
  'Other',
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function newIdempotencyKey() {
  return crypto.randomUUID();
}

const EMPTY = { amount: '', category: '', description: '', date: today() };

export default function ExpenseForm({ onCreated }) {
  const [fields, setFields] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle'); // idle | submitting | success | error
  const [serverError, setServerError] = useState('');

  // One key per form session; reset after successful save.
  const idempotencyKey = useRef(newIdempotencyKey());

  function validate(f) {
    const errs = {};
    const amount = Number(f.amount);
    if (!f.amount || !Number.isFinite(amount) || amount <= 0) {
      errs.amount = 'Enter a positive amount';
    }
    if (!f.category.trim()) errs.category = 'Category is required';
    if (!f.date) errs.date = 'Date is required';
    return errs;
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setFields((prev) => ({ ...prev, [name]: value }));
    // Clear field-level error on change
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate(fields);
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    setStatus('submitting');
    setServerError('');

    try {
      await createExpense(
        {
          amount: fields.amount,
          category: fields.category.trim(),
          description: fields.description.trim(),
          date: fields.date,
        },
        idempotencyKey.current
      );

      // Success: reset form and rotate the idempotency key so the next
      // submission is treated as a new expense, not a duplicate.
      idempotencyKey.current = newIdempotencyKey();
      setFields(EMPTY);
      setErrors({});
      setStatus('success');
      onCreated();

      // Clear success banner after 2 s
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err) {
      setServerError(err.message);
      setStatus('error');
    }
  }

  const submitting = status === 'submitting';

  return (
    <form onSubmit={handleSubmit} noValidate>
      {status === 'success' && (
        <div className="alert alert-success">Saved.</div>
      )}
      {status === 'error' && (
        <div className="alert alert-error">{serverError}</div>
      )}

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="amount">Amount (₹)</label>
          <input
            id="amount"
            name="amount"
            type="number"
            min="0.01"
            step="0.01"
            placeholder="0.00"
            value={fields.amount}
            onChange={handleChange}
            disabled={submitting}
            className={errors.amount ? 'input-error' : ''}
          />
          {errors.amount && <span className="field-error">{errors.amount}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="date">Date</label>
          <input
            id="date"
            name="date"
            type="date"
            value={fields.date}
            onChange={handleChange}
            disabled={submitting}
            className={errors.date ? 'input-error' : ''}
          />
          {errors.date && <span className="field-error">{errors.date}</span>}
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="category">Category</label>
        <input
          id="category"
          name="category"
          type="text"
          list="category-suggestions"
          placeholder="e.g. Food"
          value={fields.category}
          onChange={handleChange}
          disabled={submitting}
          className={errors.category ? 'input-error' : ''}
          autoComplete="off"
        />
        <datalist id="category-suggestions">
          {SUGGESTED_CATEGORIES.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        {errors.category && <span className="field-error">{errors.category}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="description">Description</label>
        <input
          id="description"
          name="description"
          type="text"
          placeholder="Optional note"
          value={fields.description}
          onChange={handleChange}
          disabled={submitting}
        />
      </div>

      <button type="submit" className="btn-primary" disabled={submitting}>
        {submitting ? 'Recording…' : 'Record'}
      </button>
    </form>
  );
}
